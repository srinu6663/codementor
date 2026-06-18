const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const os = require('os');
const db = require('../config/db');
const { logAction } = require('../middleware/audit');

// Language id → { ext, jplagLang }
const LANG_MAP = {
  java:       { ext: 'java',  jplag: 'java'   },
  python:     { ext: 'py',    jplag: 'python3' },
  javascript: { ext: 'js',    jplag: 'text'    },
  typescript: { ext: 'ts',    jplag: 'text'    },
  c:          { ext: 'c',     jplag: 'c'       },
  cpp:        { ext: 'cpp',   jplag: 'cpp'     },
};

const JPLAG_JAR = process.env.JPLAG_JAR_PATH || path.join(__dirname, '../../../jplag/jplag.jar');
const SIMILARITY_THRESHOLD = parseFloat(process.env.JPLAG_THRESHOLD || '0.70');

// ── helpers ────────────────────────────────────────────────────────────────────

function langMeta(lang) {
  return LANG_MAP[(lang || '').toLowerCase()] || { ext: 'txt', jplag: 'text' };
}

// Write one student's best submission to disk.
// Returns the file path written, or null if no submission exists.
async function writeSubmission(assignmentId, userId, problemId, rollno, workdir) {
  const { rows } = await db.query(
    `SELECT code, language
       FROM code_submissions
      WHERE user_id = $1 AND problem_id = $2 AND verdict = 'Accepted'
      ORDER BY submitted_at ASC
      LIMIT 1`,
    [userId, problemId]
  );
  if (!rows.length) return null;

  const { code, language } = rows[0];
  const { ext } = langMeta(language);
  const studentDir = path.join(workdir, String(rollno));
  fs.mkdirSync(studentDir, { recursive: true });
  const file = path.join(studentDir, `solution.${ext}`);
  fs.writeFileSync(file, code, 'utf8');
  return { file, language };
}

// Run JPlag (v5 CLI). Confirmed flags: -l <language>, -m <similarity-threshold 0..1>,
// --csv-export. NOTE: -r/--result-file is a FILE base name (JPlag appends .jplag),
// NOT a directory — and the CSV export is written relative to the working dir, so we
// run with cwd=resultsDir and look for the CSV there.
function runJPlag(submissionsDir, jplagLang, resultsDir) {
  return new Promise((resolve, reject) => {
    const java = process.env.JAVA_BIN || 'java';
    const args = [
      '-jar', JPLAG_JAR,
      submissionsDir,
      '-l', jplagLang,
      '-m', String(SIMILARITY_THRESHOLD),
      '--csv-export',
      '-r', path.join(resultsDir, 'results'), // -> results.jplag (+ CSV export)
    ];
    execFile(java, args, { timeout: 120_000, cwd: resultsDir }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

// Recursively collect every .csv produced anywhere under a directory.
function findCsvFiles(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findCsvFiles(full));
    else if (e.name.toLowerCase().endsWith('.csv')) out.push(full);
  }
  return out;
}

// Parse a JPlag CSV robustly. JPlag's exact column layout/header isn't documented and
// has varied across versions (it may include an index column, a header row, and several
// similarity metrics). Rather than assume fixed positions, we heuristically detect, per
// row: the two submission identifiers (first two non-numeric cells) and the similarity
// (the largest numeric cell in 0..1). This survives header rows and extra columns.
function parseCSV(csvPath) {
  if (!fs.existsSync(csvPath)) return [];
  const text = fs.readFileSync(csvPath, 'utf8').trim();
  if (!text) return [];
  const pairs = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/[,;]/).map(c => c.trim().replace(/^"|"$/g, ''));
    const names = [];
    let sim = -1;
    for (const c of cells) {
      const num = Number(c);
      if (c !== '' && !Number.isNaN(num) && num >= 0 && num <= 1) {
        if (num > sim) sim = num;             // similarity metric (avg/max), 0..1
      } else if (c && Number.isNaN(num)) {
        if (names.length < 2) names.push(c);  // submission identifiers
      }
    }
    if (names.length === 2 && sim >= 0 && sim >= SIMILARITY_THRESHOLD) {
      pairs.push({ studentA: names[0], studentB: names[1], similarity: sim });
    }
  }
  return pairs;
}

// ── exported controllers ───────────────────────────────────────────────────────

exports.runPlagiarism = async (req, res) => {
  const { id: assignmentId } = req.params;

  // 1. Verify assignment exists and belongs to this faculty
  const { rows: [assignment] } = await db.query(
    `SELECT a.id, a.faculty_id, a.deadline
       FROM assignments a
      WHERE a.id = $1 AND a.faculty_id = $2
      LIMIT 1`,
    [assignmentId, req.user.id]
  );
  if (!assignment) {
    return res.status(404).json({ success: false, error: 'Assignment not found' });
  }

  // 2. Check JPlag JAR exists
  if (!fs.existsSync(JPLAG_JAR)) {
    return res.status(503).json({
      success: false,
      error: `JPlag JAR not found at ${JPLAG_JAR}. See docs/PLAGIARISM_SETUP.md.`,
    });
  }

  // 3. Fetch all problems in assignment
  const { rows: apRows } = await db.query(
    `SELECT ap.problem_id, p.title
       FROM assignment_problems ap
       JOIN problems p ON p.id = ap.problem_id
      WHERE ap.assignment_id = $1`,
    [assignmentId]
  );
  if (!apRows.length) {
    return res.status(400).json({ success: false, error: 'Assignment has no problems' });
  }

  // 4. Fetch all enrolled students
  const { rows: students } = await db.query(
    `SELECT DISTINCT cs.user_id, u.name, u.email
       FROM code_submissions cs
       JOIN users u ON u.id = cs.user_id
      WHERE cs.problem_id = ANY($1::uuid[])`,
    [apRows.map(r => r.problem_id)]
  );

  if (students.length < 2) {
    return res.status(400).json({ success: false, error: 'Need at least 2 student submissions' });
  }

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'jplag-'));
  const submissionsDir = path.join(workdir, 'submissions');
  const resultsDir = path.join(workdir, 'results');
  fs.mkdirSync(submissionsDir, { recursive: true });
  fs.mkdirSync(resultsDir,    { recursive: true });

  let detectedLang = 'java';
  const emailToId = {};
  try {
    // 5. Write each student's first accepted submission for each problem
    for (const problem of apRows) {
      for (const student of students) {
        const rollno = student.email.split('@')[0];
        const result = await writeSubmission(
          assignmentId, student.user_id, problem.problem_id,
          `${rollno}_${problem.problem_id.slice(0, 8)}`, submissionsDir
        );
        if (result) {
          detectedLang = langMeta(result.language).jplag;
          emailToId[rollno] = student.user_id;
        }
      }
    }

    // 6. Run JPlag
    await runJPlag(submissionsDir, detectedLang, resultsDir);

    // 7. Parse the CSV export. Its exact name/location isn't guaranteed across JPlag
    // versions, so scan the whole work dir for any .csv and take the first that yields pairs.
    let pairs = [];
    const csvFiles = findCsvFiles(workdir);
    for (const f of csvFiles) {
      const parsed = parseCSV(f);
      if (parsed.length) { pairs = parsed; break; }
    }
    if (!pairs.length && csvFiles.length === 0) {
      console.warn('JPlag produced no CSV — check the JPlag version supports --csv-export and the JAR is valid.');
    }

    // 8. Persist to DB (replace old results for this assignment)
    await db.query('DELETE FROM plagiarism_results WHERE assignment_id = $1', [assignmentId]);

    const upsertPromises = pairs.map(pair => {
      // student key is rollno prefix (or composite if per-problem)
      const idA = emailToId[pair.studentA.split('_')[0]] || null;
      const idB = emailToId[pair.studentB.split('_')[0]] || null;
      if (!idA || !idB) return Promise.resolve();
      return db.query(
        `INSERT INTO plagiarism_results
           (assignment_id, student_a, student_b, similarity, language)
         VALUES ($1,$2,$3,$4,$5)`,
        [assignmentId, idA, idB, pair.similarity * 100, detectedLang]
      );
    });
    await Promise.all(upsertPromises);

    logAction(req, 'plagiarism.run', `assignment ${assignmentId} → ${pairs.length} pairs`);
    res.json({
      success: true,
      data: { pairs_found: pairs.length, threshold: SIMILARITY_THRESHOLD },
    });
  } finally {
    // Cleanup temp dir
    fs.rmSync(workdir, { recursive: true, force: true });
  }
};

exports.getPlagiarismResults = async (req, res) => {
  const { id: assignmentId } = req.params;

  const { rows: [assignment] } = await db.query(
    `SELECT id FROM assignments WHERE id = $1 AND faculty_id = $2`,
    [assignmentId, req.user.id]
  );
  if (!assignment) {
    return res.status(404).json({ success: false, error: 'Assignment not found' });
  }

  const { rows } = await db.query(
    `SELECT pr.id, pr.similarity, pr.language, pr.ran_at,
            ua.name AS student_a_name, ua.email AS student_a_email,
            ub.name AS student_b_name, ub.email AS student_b_email
       FROM plagiarism_results pr
       JOIN users ua ON ua.id = pr.student_a
       JOIN users ub ON ub.id = pr.student_b
      WHERE pr.assignment_id = $1
      ORDER BY pr.similarity DESC`,
    [assignmentId]
  );

  res.json({ success: true, data: rows });
};

// Plagiarism summary across all of this faculty's assignments — for the
// overview list and a per-assignment trend chart.
exports.getPlagiarismOverview = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.id, a.title, a.deadline, a.created_at,
             COUNT(pr.id) AS pairs,
             COALESCE(ROUND(AVG(pr.similarity), 1), 0) AS avg_sim,
             COALESCE(MAX(pr.similarity), 0) AS max_sim,
             MAX(pr.ran_at) AS last_ran
        FROM assignments a
        LEFT JOIN plagiarism_results pr ON pr.assignment_id = a.id
       WHERE a.faculty_id = $1
       GROUP BY a.id, a.title, a.deadline, a.created_at
       ORDER BY a.created_at ASC
    `, [req.user.id]);

    const data = rows.map(r => ({
      id: r.id,
      title: r.title,
      deadline: r.deadline,
      pairs: parseInt(r.pairs) || 0,
      avgSim: Number(r.avg_sim) || 0,
      maxSim: Number(r.max_sim) || 0,
      lastRan: r.last_ran,
    }));
    res.json({ success: true, data });
  } catch (error) {
    console.error('Plagiarism Overview Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch plagiarism overview' });
  }
};

// Side-by-side code for a flagged pair: fetch each student's first accepted
// submission for every problem in the assignment so faculty can see the evidence.
exports.getPairDiff = async (req, res) => {
  try {
    const { id: assignmentId, pairId } = req.params;

    // Ownership check.
    const { rows: [assignment] } = await db.query(
      `SELECT id FROM assignments WHERE id = $1 AND faculty_id = $2`,
      [assignmentId, req.user.id]
    );
    if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });

    const { rows: [pair] } = await db.query(
      `SELECT pr.student_a, pr.student_b, pr.similarity, pr.language,
              ua.name AS a_name, ua.email AS a_email,
              ub.name AS b_name, ub.email AS b_email
         FROM plagiarism_results pr
         JOIN users ua ON ua.id = pr.student_a
         JOIN users ub ON ub.id = pr.student_b
        WHERE pr.id = $1 AND pr.assignment_id = $2`,
      [pairId, assignmentId]
    );
    if (!pair) return res.status(404).json({ success: false, error: 'Pair not found' });

    const { rows: probs } = await db.query(
      `SELECT ap.problem_id, p.title
         FROM assignment_problems ap
         JOIN problems p ON p.id = ap.problem_id
        WHERE ap.assignment_id = $1`,
      [assignmentId]
    );

    const fetchCode = async (userId, problemId) => {
      const { rows } = await db.query(
        `SELECT code, language FROM code_submissions
          WHERE user_id = $1 AND problem_id = $2 AND verdict = 'Accepted'
          ORDER BY submitted_at ASC LIMIT 1`,
        [userId, problemId]
      );
      return rows[0] || null;
    };

    const problems = [];
    for (const pr of probs) {
      const a = await fetchCode(pair.student_a, pr.problem_id);
      const b = await fetchCode(pair.student_b, pr.problem_id);
      if (a || b) {
        problems.push({
          title: pr.title,
          language: a?.language || b?.language || pair.language || 'text',
          codeA: a?.code || null,
          codeB: b?.code || null,
        });
      }
    }

    res.json({
      success: true,
      data: {
        similarity: Number(pair.similarity),
        studentA: { name: pair.a_name, email: pair.a_email },
        studentB: { name: pair.b_name, email: pair.b_email },
        problems,
      },
    });
  } catch (error) {
    console.error('Pair Diff Error:', error);
    res.status(500).json({ success: false, error: 'Failed to load pair comparison' });
  }
};
