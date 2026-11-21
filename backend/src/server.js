'use strict';

require('dotenv').config();
const app = require('./app');
const db = require('./config/db');

const PORT = Number(process.env.PORT) || 4000;

const server = app.listen(PORT, () => {
  console.log(`Library Management System running on http://localhost:${PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Closing HTTP server and SQLite connection...`);
  server.close(() => {
    try {
      db.close();
    } catch (_) {
      // ignore if already closed
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
