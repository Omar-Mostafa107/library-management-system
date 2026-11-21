'use strict';

const db = require('../config/db');
const {
  parsePositiveInt,
  validateBookPayload,
  whitelistSort
} = require('../middleware/validate');

const BOOK_SORT_COLUMNS = {
  title: 'b.title ASC',
  author: 'b.author ASC',
  category: 'b.category ASC',
  copies_desc: 'b.available_copies DESC, b.title ASC',
  copies_asc: 'b.available_copies ASC, b.title ASC',
  newest: 'b.book_id DESC'
};

exports.listBooks = (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const availableOnly = req.query.available === 'true';
    const orderBy = whitelistSort(req.query.sort, BOOK_SORT_COLUMNS, 'b.title ASC');

    const conditions = [];
    const params = [];

    if (q) {
      conditions.push('(b.title LIKE ? OR b.author LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like);
    }
    if (category && category !== 'All') {
      conditions.push('b.category = ?');
      params.push(category);
    }
    if (availableOnly) {
      conditions.push('b.available_copies > 0');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `
      SELECT
        b.*,
        (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.book_id AND l.return_date IS NULL) AS active_loans,
        (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.book_id) AS total_loans
      FROM books b
      ${whereClause}
      ORDER BY ${orderBy}
    `;

    const books = db.prepare(sql).all(...params);
    res.json({ data: books });
  } catch (err) {
    next(err);
  }
};

exports.getBook = (req, res, next) => {
  try {
    const bookId = parsePositiveInt(req.params.id, 'book_id');
    const book = db.prepare('SELECT * FROM books WHERE book_id = ?').get(bookId);
    if (!book) {
      return res.status(404).json({ error: 'Not Found', message: 'Book not found.' });
    }
    res.json({ data: book });
  } catch (err) {
    next(err);
  }
};

exports.createBook = (req, res, next) => {
  try {
    const payload = validateBookPayload(req.body);
    const stmt = db.prepare(`
      INSERT INTO books (title, author, category, available_copies)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(payload.title, payload.author, payload.category, payload.available_copies);
    const created = db.prepare('SELECT * FROM books WHERE book_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.updateBook = (req, res, next) => {
  try {
    const bookId = parsePositiveInt(req.params.id, 'book_id');
    const existing = db.prepare('SELECT * FROM books WHERE book_id = ?').get(bookId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Book not found.' });
    }
    const payload = validateBookPayload({ ...existing, ...req.body });
    db.prepare(`
      UPDATE books
      SET title = ?, author = ?, category = ?, available_copies = ?
      WHERE book_id = ?
    `).run(payload.title, payload.author, payload.category, payload.available_copies, bookId);

    const updated = db.prepare('SELECT * FROM books WHERE book_id = ?').get(bookId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteBook = (req, res, next) => {
  try {
    const bookId = parsePositiveInt(req.params.id, 'book_id');
    const existing = db.prepare('SELECT * FROM books WHERE book_id = ?').get(bookId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Book not found.' });
    }
    // Foreign key ON DELETE RESTRICT protects books with dependent loan history
    db.prepare('DELETE FROM books WHERE book_id = ?').run(bookId);
    res.json({ message: 'Book deleted successfully.', deleted_id: bookId });
  } catch (err) {
    next(err);
  }
};
