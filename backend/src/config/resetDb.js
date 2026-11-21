'use strict';

const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.resolve(__dirname, '../../../data/library.db');

for (const suffix of ['', '-wal', '-shm']) {
  const target = `${dbPath}${suffix}`;
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

require('./db');
console.log('Database reset and re-seeded cleanly at:', dbPath);
