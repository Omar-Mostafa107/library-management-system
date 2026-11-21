'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security headers (allow Google Fonts & Chart.js CDN for frontend)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:']
      }
    }
  })
);

// Restrict CORS to explicit origin in production
const allowedOrigin = process.env.ALLOWED_ORIGIN || true;
app.use(cors({ origin: allowedOrigin, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }));

// Body size cap to prevent payload DoS
app.use(express.json({ limit: '50kb' }));

// Rate limiting on API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Please slow down and try again shortly.' }
});

app.use('/api', apiLimiter, apiRoutes);

// Serve Frontend statically
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Not Found', message: 'API endpoint not found.' });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

app.use(errorHandler);

module.exports = app;
