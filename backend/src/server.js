const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const submissionRoutes = require('./routes/submissions.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(morgan('dev')); // Logger

// Routes
app.use('/api', submissionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CodeMentor API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
