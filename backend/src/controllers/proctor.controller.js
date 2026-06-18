const db = require('../config/db');

const ALLOWED_EVENTS = new Set([
  'tab_switch', 'fullscreen_exit', 'fullscreen_enter', 'paste', 'copy',
  'blur', 'devtools', 'exam_start', 'auto_submit',
]);

// ── Student client records a proctoring event ──────────────────────────────────
exports.recordEvent = async (req, res) => {
  try {
    const { assignment_id, problem_id, event_type, detail } = req.body;
    if (!event_type || !ALLOWED_EVENTS.has(event_type)) {
      return res.status(400).json({ success: false, error: 'Invalid event_type' });
    }
    await db.query(
      `INSERT INTO proctor_events (user_id, assignment_id, problem_id, event_type, detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, assignment_id || null, problem_id || null, event_type,
       typeof detail === 'string' ? detail.slice(0, 300) : null]
    );
    res.json({ success: true });
  } catch (e) {
    console.error('Proctor event error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: per-student proctoring report for an assignment ────────────────────
exports.getAssignmentReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership: only the assignment's faculty (or an admin) may view its proctor report.
    const { rows: own } = await db.query(
      `SELECT 1 FROM assignments WHERE id = $1 AND (faculty_id = $2 OR $3 = 'admin')`,
      [id, req.user.id, req.user.role]
    );
    if (!own.length) return res.status(404).json({ success: false, error: 'Assignment not found' });

    const { rows } = await db.query(
      `SELECT pe.user_id, u.name, u.email, u.roll_no,
              pe.event_type, COUNT(*)::int AS cnt, MAX(pe.created_at) AS last_at
         FROM proctor_events pe
         JOIN users u ON u.id = pe.user_id
        WHERE pe.assignment_id = $1
        GROUP BY pe.user_id, u.name, u.email, u.roll_no, pe.event_type`,
      [id]
    );

    // Pivot into per-student summaries.
    const byUser = {};
    for (const r of rows) {
      if (!byUser[r.user_id]) {
        byUser[r.user_id] = {
          user_id: r.user_id, name: r.name, email: r.email, rollNo: r.roll_no,
          counts: {}, total: 0, lastAt: null,
        };
      }
      const u = byUser[r.user_id];
      u.counts[r.event_type] = r.cnt;
      // Flaggable events (exclude benign enters/starts) contribute to the total.
      if (!['fullscreen_enter', 'exam_start', 'copy'].includes(r.event_type)) u.total += r.cnt;
      if (!u.lastAt || new Date(r.last_at) > new Date(u.lastAt)) u.lastAt = r.last_at;
    }

    const report = Object.values(byUser)
      .map(u => ({
        ...u,
        tabSwitches:     u.counts.tab_switch || 0,
        fullscreenExits: u.counts.fullscreen_exit || 0,
        pastes:          u.counts.paste || 0,
        risk: u.total >= 8 ? 'high' : u.total >= 3 ? 'medium' : 'low',
      }))
      .sort((a, b) => b.total - a.total);

    res.json({ success: true, data: report });
  } catch (e) {
    console.error('Proctor report error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
