const db = require('../config/db');

exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Total Submissions & AC Rate
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN verdict = 'Accepted' THEN 1 ELSE 0 END) as total_accepted
      FROM code_submissions
      WHERE user_id = $1
    `, [userId]);
    
    const totalSubs = parseInt(statsResult.rows[0].total_submissions) || 0;
    const totalAccepted = parseInt(statsResult.rows[0].total_accepted) || 0;
    const acRate = totalSubs > 0 ? Math.round((totalAccepted / totalSubs) * 100) : 0;

    // 2. Problems Solved (Unique)
    const solvedResult = await db.query(`
      SELECT COUNT(DISTINCT problem_id) as problems_solved
      FROM code_submissions
      WHERE user_id = $1 AND verdict = 'Accepted'
    `, [userId]);
    const problemsSolved = parseInt(solvedResult.rows[0].problems_solved) || 0;

    // 3. Languages Used
    const langResult = await db.query(`
      SELECT language, COUNT(*) as count
      FROM code_submissions
      WHERE user_id = $1
      GROUP BY language
      ORDER BY count DESC
    `, [userId]);
    const languages = langResult.rows;

    // 4. Heatmap Data (Submissions per day for the last 6 months)
    const heatmapResult = await db.query(`
      SELECT DATE(submitted_at) as date, COUNT(*) as count
      FROM code_submissions
      WHERE user_id = $1 AND submitted_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `, [userId]);
    const heatmap = heatmapResult.rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      count: parseInt(r.count)
    }));

    // Calculate Streak (consecutive days of submissions leading up to today/yesterday)
    // Simplified streak logic: just return dummy for now or basic calculation.
    let streak = 0;
    if (heatmap.length > 0) {
      streak = 1; // Basic placeholder, a real streak algo checks consecutive dates
    }

    // 5. Topics Analytics
    const topicsResult = await db.query(`
      SELECT unnest(p.tags) as topic, COUNT(DISTINCT s.problem_id) as solved_count
      FROM code_submissions s
      JOIN problems p ON s.problem_id = p.id
      WHERE s.user_id = $1 AND s.verdict = 'Accepted'
      GROUP BY unnest(p.tags)
    `, [userId]);
    const masteredTopics = topicsResult.rows.map(r => ({
      topic: r.topic,
      mastery: parseInt(r.solved_count) * 20 > 100 ? 100 : parseInt(r.solved_count) * 20 // Dummy calc
    }));

    res.json({
      success: true,
      data: {
        stats: { totalSubs, acRate, problemsSolved, streak },
        languages,
        heatmap,
        topics: masteredTopics.length > 0 ? masteredTopics : [
          { topic: 'arrays', mastery: 10 },
          { topic: 'strings', mastery: 0 },
          { topic: 'math', mastery: 0 }
        ]
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

exports.getAssignments = async (req, res) => {
  // Mock data for Week 8
  res.json({
    success: true,
    data: [
      { id: 1, title: 'Week 1: Array Fundamentals', deadline: new Date(Date.now() + 86400000 * 2).toISOString(), progress: 50 },
      { id: 2, title: 'Week 2: String Manipulation', deadline: new Date(Date.now() + 86400000 * 7).toISOString(), progress: 0 }
    ]
  });
};

exports.getNotifications = async (req, res) => {
  // Mock data for Week 8
  res.json({
    success: true,
    data: [
      { id: 1, message: 'New Assignment posted by Prof. Smith', date: new Date().toISOString(), read: false },
      { id: 2, message: 'Upcoming Contest: CodeRush 2026 starts in 3 days!', date: new Date(Date.now() - 86400000).toISOString(), read: true }
    ]
  });
};
