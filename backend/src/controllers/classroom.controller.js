const crypto = require('crypto');
const db = require('../config/db');

// Unambiguous alphabet (no 0/O/1/I) for human-typeable join codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const makeCode = (len = 6) => {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
};

const generateUniqueCode = async () => {
  for (let i = 0; i < 8; i++) {
    const code = makeCode(6);
    const { rows } = await db.query('SELECT 1 FROM classrooms WHERE join_code = $1', [code]);
    if (!rows.length) return code;
  }
  // Extremely unlikely fallback
  return makeCode(8);
};

// ── Faculty: create a classroom ────────────────────────────────────────────────
exports.createClassroom = async (req, res) => {
  try {
    const { name, department, section } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Class name is required' });
    }
    if (name.trim().length > 120) {
      return res.status(400).json({ success: false, error: 'Class name must be ≤ 120 characters.' });
    }
    const code = await generateUniqueCode();
    const { rows: [c] } = await db.query(
      `INSERT INTO classrooms (faculty_id, name, department, section, join_code)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, name.trim(), department?.trim() || null, section?.trim()?.toUpperCase() || null, code]
    );
    res.status(201).json({ success: true, data: { ...c, member_count: 0 } });
  } catch (e) {
    console.error('Create classroom error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── List classrooms (role-aware) ───────────────────────────────────────────────
exports.listClassrooms = async (req, res) => {
  try {
    const isFaculty = req.user.role === 'faculty' || req.user.role === 'admin';
    if (isFaculty) {
      const { rows } = await db.query(
        `SELECT c.*, COUNT(cm.user_id)::int AS member_count
           FROM classrooms c
           LEFT JOIN classroom_members cm ON cm.classroom_id = c.id
          WHERE c.faculty_id = $1
          GROUP BY c.id
          ORDER BY c.created_at DESC`,
        [req.user.id]
      );
      return res.json({ success: true, data: rows });
    }
    // Student: classrooms they've joined
    const { rows } = await db.query(
      `SELECT c.id, c.name, c.department, c.section, c.created_at,
              u.name AS faculty_name, cm.joined_at
         FROM classroom_members cm
         JOIN classrooms c ON c.id = cm.classroom_id
         JOIN users u ON u.id = c.faculty_id
        WHERE cm.user_id = $1
        ORDER BY cm.joined_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('List classrooms error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Student: join by code ──────────────────────────────────────────────────────
exports.joinClassroom = async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, error: 'Join code is required' });

    const { rows: [c] } = await db.query(
      `SELECT c.id, c.name, u.name AS faculty_name
         FROM classrooms c JOIN users u ON u.id = c.faculty_id
        WHERE c.join_code = $1`,
      [code]
    );
    if (!c) return res.status(404).json({ success: false, error: 'Invalid join code' });

    await db.query(
      `INSERT INTO classroom_members (classroom_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [c.id, req.user.id]
    );
    res.json({ success: true, data: { id: c.id, name: c.name, faculty_name: c.faculty_name } });
  } catch (e) {
    console.error('Join classroom error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ── Faculty: members of a classroom ────────────────────────────────────────────
exports.getMembers = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: [owner] } = await db.query(
      'SELECT 1 FROM classrooms WHERE id = $1 AND faculty_id = $2', [id, req.user.id]
    );
    if (!owner) return res.status(404).json({ success: false, error: 'Classroom not found' });

    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.roll_no, u.department, u.section, cm.joined_at
         FROM classroom_members cm
         JOIN users u ON u.id = cm.user_id
        WHERE cm.classroom_id = $1
        ORDER BY u.name ASC`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('Classroom members error:', e.message);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};
