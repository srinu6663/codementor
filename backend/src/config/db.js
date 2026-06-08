const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Utility to run queries
const query = (text, params) => pool.query(text, params);

const scaffoldDatabase = async () => {
  try {
    // Scaffold Users Table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'student',
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Scaffold Problems Table
    await query(`
      CREATE TABLE IF NOT EXISTS problems (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(10),
        tags TEXT[],
        created_by UUID REFERENCES users(id),
        time_limit INTEGER DEFAULT 2,
        memory_limit INTEGER DEFAULT 256
      );
    `);

    // Scaffold Test Cases Table (essential for judging)
    await query(`
      CREATE TABLE IF NOT EXISTS test_cases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
        input_data TEXT NOT NULL,
        expected_output TEXT NOT NULL,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Scaffold Submissions Table
    await query(`
      CREATE TABLE IF NOT EXISTS code_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        problem_id UUID REFERENCES problems(id),
        code TEXT NOT NULL,
        language VARCHAR(20),
        verdict VARCHAR(20),
        runtime INTEGER,
        memory INTEGER,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Scaffold Assignments Table
    await query(`
      CREATE TABLE IF NOT EXISTS assignments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        faculty_id UUID REFERENCES users(id),
        title VARCHAR(200) NOT NULL,
        deadline TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Scaffold Assignment Problems Table
    await query(`
      CREATE TABLE IF NOT EXISTS assignment_problems (
        assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
        problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
        PRIMARY KEY (assignment_id, problem_id)
      );
    `);

    console.log('✅ Database tables initialized successfully.');
  } catch (error) {
    console.error('❌ Failed to initialize database tables:', error);
  }
};

module.exports = {
  query,
  pool,
  scaffoldDatabase,
};
