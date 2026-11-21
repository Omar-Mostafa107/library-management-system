'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = path.resolve(__dirname, '../../../data');
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : path.join(DATA_DIR, 'library.db');

const SQL_DIR = path.resolve(__dirname, '../../../sql');

function initDatabase() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  const schemaSql = fs.readFileSync(path.join(SQL_DIR, '01_schema.sql'), 'utf8');
  db.exec(schemaSql);

  const bookCount = db.prepare('SELECT COUNT(*) AS cnt FROM books').get().cnt;
  if (bookCount === 0) {
    const seedSql = fs.readFileSync(path.join(SQL_DIR, '02_seed.sql'), 'utf8');
    db.exec(seedSql);
  }

  return db;
}

const db = initDatabase();
module.exports = db;
