const db = require('../config/db');
const { ALL_PLATFORMS, LIVE_PLATFORMS, fetchPlatform } = require('../utils/codingPlatforms');

// ── List the current user's saved profiles ──────────────────────────────────────
exports.getMine = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT platform, handle, solved, rating, max_rating, extra, sync_status, last_synced
         FROM coding_profiles WHERE user_id = $1 ORDER BY platform`,
      [req.user.id]
    );
    res.json({ success: true, data: rows, livePlatforms: LIVE_PLATFORMS, allPlatforms: ALL_PLATFORMS });
  } catch (e) {
    console.error('Profiles getMine error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Add / update / remove a handle (empty handle removes it) ─────────────────────
exports.setHandle = async (req, res) => {
  try {
    const { platform } = req.body;
    let { handle } = req.body;
    if (!ALL_PLATFORMS.includes(platform)) {
      return res.status(400).json({ success: false, error: 'Unsupported platform' });
    }
    handle = typeof handle === 'string' ? handle.trim().slice(0, 80) : '';

    if (!handle) {
      await db.query('DELETE FROM coding_profiles WHERE user_id = $1 AND platform = $2', [req.user.id, platform]);
      return res.json({ success: true, data: { platform, removed: true } });
    }

    await db.query(
      `INSERT INTO coding_profiles (user_id, platform, handle, sync_status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (user_id, platform)
       DO UPDATE SET handle = $3, sync_status = 'pending'`,
      [req.user.id, platform, handle]
    );
    res.json({ success: true, data: { platform, handle } });
  } catch (e) {
    console.error('Profiles setHandle error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Sync the current user's live-platform stats ──────────────────────────────────
exports.syncMine = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT platform, handle FROM coding_profiles WHERE user_id = $1', [req.user.id]
    );
    const results = [];
    for (const p of rows) {
      if (!LIVE_PLATFORMS.includes(p.platform)) {
        results.push({ platform: p.platform, status: 'link-only' });
        continue;
      }
      try {
        const stats = await fetchPlatform(p.platform, p.handle);
        await db.query(
          `UPDATE coding_profiles
              SET solved = $1, rating = $2, max_rating = $3, extra = $4,
                  sync_status = 'ok', last_synced = NOW()
            WHERE user_id = $5 AND platform = $6`,
          [stats.solved || 0, stats.rating, stats.max_rating, JSON.stringify(stats.extra || {}), req.user.id, p.platform]
        );
        results.push({ platform: p.platform, status: 'ok', solved: stats.solved, rating: stats.rating });
      } catch (err) {
        await db.query(
          `UPDATE coding_profiles SET sync_status = 'error', last_synced = NOW() WHERE user_id = $1 AND platform = $2`,
          [req.user.id, p.platform]
        );
        results.push({ platform: p.platform, status: 'error', error: err.message });
      }
    }
    res.json({ success: true, data: results });
  } catch (e) {
    console.error('Profiles syncMine error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Unified leaderboard (aggregated across platforms), optional cohort filter ────
exports.getLeaderboard = async (req, res) => {
  try {
    const params = [];
    const conds = [`u.role = 'student'`];
    if (req.query.department) { params.push(req.query.department); conds.push(`u.department = $${params.length}`); }
    if (req.query.section)    { params.push(String(req.query.section).toUpperCase()); conds.push(`u.section = $${params.length}`); }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 300);

    const { rows } = await db.query(`
      SELECT u.id, u.name, u.department, u.section,
             COALESCE(SUM(cp.solved), 0)::int AS total_solved,
             MAX(CASE WHEN cp.platform = 'codeforces' THEN cp.rating END)::int AS cf_rating,
             COUNT(cp.id)::int AS platforms,
             jsonb_object_agg(cp.platform, cp.solved) FILTER (WHERE cp.platform IS NOT NULL) AS by_platform
        FROM users u
        JOIN coding_profiles cp ON cp.user_id = u.id
       WHERE ${conds.join(' AND ')}
       GROUP BY u.id, u.name, u.department, u.section
       ORDER BY total_solved DESC, cf_rating DESC NULLS LAST
       LIMIT ${limit}
    `, params);

    res.json({
      success: true,
      data: rows.map((r, i) => ({
        rank: i + 1,
        userId: r.id, name: r.name, department: r.department, section: r.section,
        totalSolved: r.total_solved, cfRating: r.cf_rating, platforms: r.platforms,
        byPlatform: r.by_platform || {},
      })),
    });
  } catch (e) {
    console.error('Profiles leaderboard error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
