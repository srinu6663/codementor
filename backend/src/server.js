const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const submissionRoutes = require('./routes/submissions.routes');
const problemRoutes = require('./routes/problems.routes');
const db = require('./config/db');

// Initialize Worker
require('./workers/judge.worker');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev')); // Logger

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', require('./routes/student.routes'));
app.use('/api/faculty', require('./routes/faculty.routes'));
app.use('/api', submissionRoutes);
app.use('/api/problems', problemRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeMentor API is running' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  // Initialize Database tables
  await db.scaffoldDatabase();
});
