const db = require('../config/db');

// ── Elo / Codeforces-style rating engine ──────────────────────────────────────
//
// We treat a contest as a round-robin of pairwise games. For every ordered pair
// of distinct participants (i, j) we compute player i's expected score against j
// using the logistic Elo formula, then compare it to the actual outcome
// (1 = i ranked above j, 0.5 = tie, 0 = i ranked below j). The participant's new
// rating is their seed rating plus K times the (actual − expected) sum, averaged
// over all opponents.
//
//   E_ij      = 1 / (1 + 10^((R_j − R_i) / 400))
//   S_ij      = 1 if rank_i < rank_j (better), 0.5 if equal, 0 otherwise
//   delta_i   = K * Σ_j (S_ij − E_ij) / (n − 1)
//   newR_i    = round(R_i + delta_i)
//
// K = 40 (moderately reactive; standard for active rating systems).
//
// `participants` is an array of { user_id, rating, rank } where lower rank == better
// standing. Returns an array of { user_id, old_rating, new_rating, rank }.
const K_FACTOR = 40;

const computeEloUpdates = (participants) => {
  const n = participants.length;
  if (n === 0) return [];
  // A single participant has no opponents — rating is unchanged.
  if (n === 1) {
    const p = participants[0];
    return [{ user_id: p.user_id, old_rating: p.rating, new_rating: p.rating, rank: p.rank }];
  }

  return participants.map((self) => {
    let expected = 0;
    let actual = 0;
    for (const opp of participants) {
      if (opp.user_id === self.user_id) continue;
      expected += 1 / (1 + Math.pow(10, (opp.rating - self.rating) / 400));
      if (self.rank < opp.rank) actual += 1;
      else if (self.rank === opp.rank) actual += 0.5;
      // self.rank > opp.rank contributes 0
    }
    const delta = (K_FACTOR * (actual - expected)) / (n - 1);
    const newRating = Math.round(self.rating + delta);
    return {
      user_id: self.user_id,
      old_rating: self.rating,
      new_rating: newRating,
      rank: self.rank,
    };
  });
};

// ── Build final standings from contest_submissions ────────────────────────────
// ACM scoring identical to getScoreboard: solved DESC, penalty ASC.
// First Accepted submission per (user, problem) counts; earlier WAs add 20-min
// penalties. Only non-virtual submissions are counted toward official rating.
const buildStandings = async (contestId, contestStartsAt) => {
  const { rows: subs } = await db.query(
    `SELECT cs.user_id, cs.problem_id, cs.verdict, cs.submitted_at
       FROM contest_submissions cs
      WHERE cs.contest_id = $1 AND cs.is_virtual = FALSE
      ORDER BY cs.submitted_at ASC`,
    [contestId]
  );

  const board = {};
  for (const sub of subs) {
    const uid = sub.user_id;
    if (!board[uid]) board[uid] = { user_id: uid, solved: 0, penalty: 0, problems: {} };
    const entry = board[uid];
    const pid = sub.problem_id;
    if (!entry.problems[pid]) entry.problems[pid] = { accepted: false, attempts: 0 };
    const p = entry.problems[pid];
    if (p.accepted) continue;

    p.attempts++;
    if (sub.verdict === 'Accepted') {
      p.accepted = true;
      const minutesFromStart = Math.floor((new Date(sub.submitted_at) - new Date(contestStartsAt)) / 60000);
      const penalty = (p.attempts - 1) * 20 + minutesFromStart;
      entry.solved++;
      entry.penalty += penalty;
    }
  }

  const standings = Object.values(board).sort((a, b) =>
    b.solved !== a.solved ? b.solved - a.solved : a.penalty - b.penalty
  );

  // Assign competition ranks (ties share a rank).
  let rank = 0;
  let lastSolved = null;
  let lastPenalty = null;
  standings.forEach((entry, idx) => {
    if (entry.solved !== lastSolved || entry.penalty !== lastPenalty) {
      rank = idx + 1;
      lastSolved = entry.solved;
      lastPenalty = entry.penalty;
    }
    entry.rank = rank;
  });

  return standings;
};

// ── Faculty/admin: recompute ratings for a finished contest ────────────────────
// Idempotency guard: if rating_history rows already exist for this contest we
// refuse to recompute, since re-running would double-apply the Elo deltas to the
// stored users.rating. To re-run, the existing rating_history rows for the
// contest must be deleted first.
exports.recomputeForContest = async (req, res) => {
  try {
    const { id: contestId } = req.params;

    const { rows: [contest] } = await db.query(
      'SELECT id, starts_at FROM contests WHERE id = $1',
      [contestId]
    );
    if (!contest) return res.status(404).json({ success: false, error: 'Contest not found' });

    const { rows: [existing] } = await db.query(
      'SELECT COUNT(*)::int AS cnt FROM rating_history WHERE contest_id = $1',
      [contestId]
    );
    if (existing.cnt > 0) {
      return res.status(409).json({
        success: false,
        error: 'Ratings have already been computed for this contest. Delete its rating_history rows to recompute.',
      });
    }

    const standings = await buildStandings(contestId, contest.starts_at);
    if (standings.length === 0) {
      return res.status(400).json({ success: false, error: 'No submissions to rate for this contest.' });
    }

    // Seed each participant with their current users.rating.
    const userIds = standings.map(s => s.user_id);
    const { rows: ratingRows } = await db.query(
      'SELECT id, rating FROM users WHERE id = ANY($1)',
      [userIds]
    );
    const ratingMap = new Map(ratingRows.map(r => [String(r.id), r.rating]));

    const participants = standings.map(s => ({
      user_id: s.user_id,
      rating: ratingMap.has(String(s.user_id)) ? ratingMap.get(String(s.user_id)) : 1200,
      rank: s.rank,
    }));

    const updates = computeEloUpdates(participants);

    // Persist new ratings + history rows atomically.
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (const u of updates) {
        await client.query('UPDATE users SET rating = $1 WHERE id = $2', [u.new_rating, u.user_id]);
        await client.query(
          `INSERT INTO rating_history (user_id, contest_id, old_rating, new_rating, rank)
           VALUES ($1, $2, $3, $4, $5)`,
          [u.user_id, contestId, u.old_rating, u.new_rating, u.rank]
        );
      }
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    const results = updates
      .map(u => ({ ...u, delta: u.new_rating - u.old_rating }))
      .sort((a, b) => a.rank - b.rank);

    res.json({ success: true, data: { contest_id: contestId, participants: results.length, results } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Get a single user's current rating + history ───────────────────────────────
exports.getUserRating = async (req, res) => {
  try {
    const { userId } = req.params;

    const { rows: [user] } = await db.query(
      'SELECT id, name, rating FROM users WHERE id = $1',
      [userId]
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const { rows: history } = await db.query(
      `SELECT rh.id, rh.contest_id, c.title AS contest_title,
              rh.old_rating, rh.new_rating, rh.rank, rh.created_at
         FROM rating_history rh
         LEFT JOIN contests c ON c.id = rh.contest_id
        WHERE rh.user_id = $1
        ORDER BY rh.created_at ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        user_id: user.id,
        name: user.name,
        rating: user.rating,
        history: history.map(h => ({
          id: h.id,
          contest_id: h.contest_id,
          contest_title: h.contest_title,
          old_rating: h.old_rating,
          new_rating: h.new_rating,
          delta: h.new_rating - h.old_rating,
          rank: h.rank,
          created_at: h.created_at,
        })),
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Rating leaderboard ─────────────────────────────────────────────────────────
exports.getRatingLeaderboard = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.rating,
              COUNT(DISTINCT rh.contest_id) AS contests_participated
         FROM users u
         LEFT JOIN rating_history rh ON rh.user_id = u.id
        GROUP BY u.id, u.name, u.rating
        ORDER BY u.rating DESC, u.name ASC
        LIMIT 100`
    );

    const data = rows.map((r, index) => ({
      id: r.id,
      rank: index + 1,
      name: r.name,
      rating: r.rating,
      contestsParticipated: parseInt(r.contests_participated, 10) || 0,
    }));

    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Exported for unit testing / reuse.
exports.computeEloUpdates = computeEloUpdates;
