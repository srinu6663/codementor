const db = require('../config/db');

const VALID_MODES = ['public', 'frozen', 'hidden'];

// ── Faculty: create contest ────────────────────────────────────────────────────

exports.createContest = async (req, res) => {
  try {
    const { title, description, starts_at, ends_at, problem_ids = [],
            scoreboard_mode = 'public', freeze_at = null } = req.body;

    if (!title || !starts_at || !ends_at) {
      return res.status(400).json({ success: false, error: 'title, starts_at, ends_at are required' });
    }
    if (!VALID_MODES.includes(scoreboard_mode)) {
      return res.status(400).json({ success: false, error: 'scoreboard_mode must be public | frozen | hidden' });
    }
    if (new Date(ends_at) <= new Date(starts_at)) {
      return res.status(400).json({ success: false, error: 'ends_at must be after starts_at' });
    }
    if (scoreboard_mode === 'frozen' && !freeze_at) {
      return res.status(400).json({ success: false, error: 'freeze_at is required for frozen mode' });
    }

    const { rows: [contest] } = await db.query(
      `INSERT INTO contests (faculty_id, title, description, starts_at, ends_at, scoreboard_mode, freeze_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [req.user.id, title, description || null, starts_at, ends_at, scoreboard_mode, freeze_at || null]
    );

    for (let i = 0; i < problem_ids.length; i++) {
      await db.query(
        `INSERT INTO contest_problems (contest_id, problem_id, sort_order) VALUES ($1,$2,$3)
         ON CONFLICT DO NOTHING`,
        [contest.id, problem_ids[i], i]
      );
    }

    res.status(201).json({ success: true, data: contest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: update scoreboard mode ───────────────────────────────────────────

exports.updateScoreboardMode = async (req, res) => {
  try {
    const { id } = req.params;
    const { scoreboard_mode, freeze_at } = req.body;

    if (!VALID_MODES.includes(scoreboard_mode)) {
      return res.status(400).json({ success: false, error: 'scoreboard_mode must be public | frozen | hidden' });
    }

    const { rows } = await db.query(
      `UPDATE contests
          SET scoreboard_mode = $1, freeze_at = $2
        WHERE id = $3 AND faculty_id = $4
        RETURNING id, scoreboard_mode, freeze_at`,
      [scoreboard_mode, freeze_at || null, id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Contest not found' });

    res.json({ success: true, data: rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Public: list contests ─────────────────────────────────────────────────────

exports.listContests = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.id, c.title, c.description, c.starts_at, c.ends_at,
              c.scoreboard_mode, c.freeze_at, c.created_at,
              u.name AS host_name,
              COUNT(DISTINCT cp.problem_id) AS problem_count,
              COUNT(DISTINCT cr.user_id)    AS registrant_count
         FROM contests c
         JOIN users u ON u.id = c.faculty_id
         LEFT JOIN contest_problems cp ON cp.contest_id = c.id
         LEFT JOIN contest_registrations cr ON cr.contest_id = c.id
        GROUP BY c.id, u.name
        ORDER BY c.starts_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Public: get single contest ────────────────────────────────────────────────

exports.getContest = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [contest] } = await db.query(
      `SELECT c.*, u.name AS host_name
         FROM contests c JOIN users u ON u.id = c.faculty_id
        WHERE c.id = $1`,
      [id]
    );
    if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

    const { rows: problems } = await db.query(
      `SELECT p.id, p.title, p.difficulty, p.tags, cp.sort_order
         FROM contest_problems cp
         JOIN problems p ON p.id = cp.problem_id
        WHERE cp.contest_id = $1
        ORDER BY cp.sort_order`,
      [id]
    );

    res.json({ success: true, data: { ...contest, problems } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Public: register for contest ──────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      `INSERT INTO contest_registrations (contest_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Public: scoreboard ────────────────────────────────────────────────────────
// Scoreboard rules:
//   mode=public  → always show live standings
//   mode=frozen  → show standings up to freeze_at; after freeze, own row is live, rest are frozen
//   mode=hidden  → faculty sees live; students see nothing during contest, live after end

exports.getScoreboard = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    const { rows: [contest] } = await db.query(
      'SELECT * FROM contests WHERE id = $1', [id]
    );
    if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

    const now = new Date();
    const contestOver = now > new Date(contest.ends_at);
    const isFaculty = requesterRole === 'faculty' || requesterRole === 'admin'
                      || String(contest.faculty_id) === String(requesterId);

    // Hidden mode: students see nothing during contest
    if (contest.scoreboard_mode === 'hidden' && !isFaculty && !contestOver) {
      return res.json({ success: true, data: [], hidden: true });
    }

    // Cutoff time for frozen mode
    let cutoff = null;
    if (contest.scoreboard_mode === 'frozen' && !isFaculty && !contestOver) {
      cutoff = contest.freeze_at ? new Date(contest.freeze_at) : null;
    }

    // Build scoreboard — ACM style: sorted by (problems solved DESC, total penalty ASC)
    const { rows: problems } = await db.query(
      `SELECT problem_id FROM contest_problems WHERE contest_id = $1 ORDER BY sort_order`,
      [id]
    );
    const problemIds = problems.map(p => p.problem_id);

    // All accepted submissions (respecting cutoff for frozen)
    const { rows: allSubs } = await db.query(
      `SELECT cs.user_id, cs.problem_id, cs.verdict, cs.penalty_minutes, cs.submitted_at,
              u.name, u.email
         FROM contest_submissions cs
         JOIN users u ON u.id = cs.user_id
        WHERE cs.contest_id = $1
        ORDER BY cs.submitted_at ASC`,
      [id]
    );

    // Aggregate per user
    const board = {};
    for (const sub of allSubs) {
      const uid = sub.user_id;
      if (!board[uid]) {
        board[uid] = {
          user_id: uid, name: sub.name, email: sub.email,
          solved: 0, penalty: 0, problems: {},
          is_frozen_row: false,
        };
      }
      const entry = board[uid];
      const pid   = sub.problem_id;
      if (!entry.problems[pid]) entry.problems[pid] = { accepted: false, attempts: 0, penalty: 0 };
      const p = entry.problems[pid];
      if (p.accepted) continue; // already solved — ignore later subs

      // In frozen mode, non-faculty see subs only up to cutoff
      const isOwn = uid === requesterId;
      const subTime = new Date(sub.submitted_at);
      if (cutoff && !isOwn && subTime > cutoff) {
        entry.is_frozen_row = true;
        continue;
      }

      p.attempts++;
      if (sub.verdict === 'Accepted') {
        p.accepted = true;
        const minutesFromStart = Math.floor((subTime - new Date(contest.starts_at)) / 60000);
        p.penalty = (p.attempts - 1) * 20 + minutesFromStart; // 20-min penalty per WA
        entry.solved++;
        entry.penalty += p.penalty;
      }
    }

    const rows = Object.values(board).sort((a, b) =>
      b.solved !== a.solved ? b.solved - a.solved : a.penalty - b.penalty
    );

    const frozen = contest.scoreboard_mode === 'frozen' && !isFaculty && !contestOver
      && cutoff && now > cutoff;

    res.json({
      success: true,
      data: rows,
      problem_ids: problemIds,
      scoreboard_mode: contest.scoreboard_mode,
      frozen,
      freeze_at: contest.freeze_at,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Feature 6: Virtual participation ─────────────────────────────────────────

exports.startVirtual = async (req, res) => {
  try {
    const { id: contestId } = req.params;
    const userId = req.user.id;

    const { rows: [contest] } = await db.query(
      'SELECT id, ends_at FROM contests WHERE id = $1', [contestId]
    );
    if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });
    if (new Date() < new Date(contest.ends_at)) {
      return res.status(400).json({ success: false, error: 'Contest is still running — join the live contest instead' });
    }

    const { rows: [vp] } = await db.query(
      `INSERT INTO virtual_participations (contest_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (contest_id, user_id) DO UPDATE SET started_at = virtual_participations.started_at
       RETURNING *`,
      [contestId, userId]
    );
    res.json({ success: true, data: vp });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Personal virtual scoreboard — shows only this user's virtual submissions
exports.getVirtualScoreboard = async (req, res) => {
  try {
    const { id: contestId } = req.params;
    const userId = req.user.id;

    const { rows: [vp] } = await db.query(
      'SELECT * FROM virtual_participations WHERE contest_id = $1 AND user_id = $2',
      [contestId, userId]
    );
    if (!vp) return res.status(404).json({ success: false, error: 'No virtual participation found. Start one first.' });

    const { rows: problems } = await db.query(
      `SELECT problem_id FROM contest_problems WHERE contest_id = $1 ORDER BY sort_order`,
      [contestId]
    );

    const { rows: subs } = await db.query(
      `SELECT problem_id, verdict, penalty_minutes, virtual_elapsed_minutes, submitted_at
         FROM contest_submissions
        WHERE contest_id = $1 AND user_id = $2 AND is_virtual = TRUE
        ORDER BY submitted_at ASC`,
      [contestId, userId]
    );

    const board = {};
    let totalSolved = 0;
    let totalPenalty = 0;

    for (const sub of subs) {
      const pid = sub.problem_id;
      if (!board[pid]) board[pid] = { accepted: false, attempts: 0, penalty: 0, elapsed: 0 };
      const p = board[pid];
      if (p.accepted) continue;
      p.attempts++;
      if (sub.verdict === 'Accepted') {
        p.accepted = true;
        p.elapsed  = sub.virtual_elapsed_minutes || 0;
        p.penalty  = (p.attempts - 1) * 20 + p.elapsed;
        totalSolved++;
        totalPenalty += p.penalty;
      }
    }

    res.json({
      success: true,
      data: {
        started_at: vp.started_at,
        problem_ids: problems.map(p => p.problem_id),
        problems: board,
        solved: totalSolved,
        penalty: totalPenalty,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
