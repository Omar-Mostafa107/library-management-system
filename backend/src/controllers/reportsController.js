'use strict';

const db = require('../config/db');
const { parsePositiveInt } = require('../middleware/validate');

exports.getOverview = (_req, res, next) => {
  try {
    const summary = {
      total_titles: db.prepare('SELECT COUNT(*) AS cnt FROM books').get().cnt,
      total_available_copies: db.prepare('SELECT COALESCE(SUM(available_copies), 0) AS cnt FROM books').get().cnt,
      total_members: db.prepare('SELECT COUNT(*) AS cnt FROM members').get().cnt,
      active_loans: db.prepare('SELECT COUNT(*) AS cnt FROM loans WHERE return_date IS NULL').get().cnt,
      overdue_loans: db.prepare("SELECT COUNT(*) AS cnt FROM loans WHERE return_date IS NULL AND due_date < DATE('now')").get().cnt,
      duration_stats: db.prepare(`
        SELECT
          COUNT(*) AS returned_count,
          MIN(CAST(julianday(return_date) - julianday(borrow_date) AS INTEGER)) AS min_days,
          MAX(CAST(julianday(return_date) - julianday(borrow_date) AS INTEGER)) AS max_days,
          ROUND(AVG(julianday(return_date) - julianday(borrow_date)), 1) AS avg_days
        FROM loans
        WHERE return_date IS NOT NULL
      `).get()
    };

    const categories = db.prepare(`
      SELECT category, COUNT(*) AS titles, SUM(available_copies) AS copies
      FROM books
      GROUP BY category
      ORDER BY titles DESC
    `).all();

    res.json({ data: { summary, categories } });
  } catch (err) {
    next(err);
  }
};

exports.activeLoansReport = (_req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM v_active_loans').all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.overdueLoansReport = (_req, res, next) => {
  try {
    const rows = db.prepare('SELECT * FROM v_overdue_loans').all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.mostBorrowedBooks = (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT
        b.book_id,
        b.title,
        b.author,
        b.category,
        COUNT(l.loan_id) AS loan_count
      FROM books b
      JOIN loans l ON b.book_id = l.book_id
      GROUP BY b.book_id, b.title, b.author, b.category
      HAVING COUNT(l.loan_id) > 1
      ORDER BY loan_count DESC, b.title ASC
    `).all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.aboveAverageBooks = (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT
        b.book_id,
        b.title,
        b.author,
        b.category,
        COUNT(l.loan_id) AS total_loans
      FROM books b
      JOIN loans l ON b.book_id = l.book_id
      GROUP BY b.book_id, b.title, b.author, b.category
      HAVING COUNT(l.loan_id) > (
        SELECT AVG(book_loans)
        FROM (
          SELECT COUNT(*) AS book_loans
          FROM loans
          GROUP BY book_id
        )
      )
      ORDER BY total_loans DESC, b.title ASC
    `).all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.membersWithNoLoans = (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT
        m.member_id,
        m.full_name,
        m.email,
        m.phone,
        m.join_date
      FROM members m
      WHERE NOT EXISTS (
        SELECT 1 FROM loans l WHERE l.member_id = m.member_id
      )
      ORDER BY m.full_name ASC
    `).all();
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};

exports.memberHistoryReport = (req, res, next) => {
  try {
    const memberId = parsePositiveInt(req.params.memberId, 'member_id');
    const rows = db.prepare(`
      SELECT
        m.full_name AS member_name,
        b.title AS book_title,
        b.author,
        l.borrow_date,
        l.due_date,
        l.return_date,
        CASE
          WHEN l.return_date IS NOT NULL THEN 'Returned'
          WHEN l.due_date < DATE('now') THEN 'Overdue'
          ELSE 'Active'
        END AS status
      FROM loans l
      JOIN books b   ON l.book_id = b.book_id
      JOIN members m ON l.member_id = m.member_id
      WHERE m.member_id = ?
      ORDER BY l.borrow_date DESC
    `).all(memberId);
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
};
