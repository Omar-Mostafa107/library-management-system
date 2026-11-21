'use strict';

const db = require('../config/db');
const {
  ValidationError,
  parsePositiveInt,
  parseIsoDate,
  validateLoanPayload
} = require('../middleware/validate');

exports.listLoans = (req, res, next) => {
  try {
    const status = (req.query.status || 'all').toLowerCase();
    const conditions = [];

    if (status === 'active') {
      conditions.push('l.return_date IS NULL');
    } else if (status === 'overdue') {
      conditions.push("l.return_date IS NULL AND l.due_date < DATE('now')");
    } else if (status === 'returned') {
      conditions.push('l.return_date IS NOT NULL');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const loans = db.prepare(`
      SELECT
        l.loan_id,
        l.book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.category,
        l.member_id,
        m.full_name AS member_name,
        m.email AS member_email,
        l.borrow_date,
        l.due_date,
        l.return_date,
        CASE
          WHEN l.return_date IS NOT NULL THEN 'Returned'
          WHEN l.due_date < DATE('now') THEN 'Overdue'
          ELSE 'Active'
        END AS status,
        CASE
          WHEN l.return_date IS NULL AND l.due_date < DATE('now')
          THEN CAST(julianday(DATE('now')) - julianday(l.due_date) AS INTEGER)
          ELSE 0
        END AS days_overdue
      FROM loans l
      JOIN books b   ON l.book_id = b.book_id
      JOIN members m ON l.member_id = m.member_id
      ${whereClause}
      ORDER BY
        CASE WHEN l.return_date IS NULL THEN 0 ELSE 1 END ASC,
        l.due_date ASC
    `).all();

    res.json({ data: loans });
  } catch (err) {
    next(err);
  }
};

// Atomic transaction: validates book & member existence + prevents race conditions on available_copies
const issueLoanTx = db.transaction((payload) => {
  const book = db.prepare('SELECT book_id, available_copies FROM books WHERE book_id = ?').get(payload.book_id);
  if (!book) {
    const err = new Error('Selected book does not exist.');
    err.status = 404;
    throw err;
  }
  if (book.available_copies <= 0) {
    throw new ValidationError('No available copies left for this book.');
  }

  const member = db.prepare('SELECT member_id FROM members WHERE member_id = ?').get(payload.member_id);
  if (!member) {
    const err = new Error('Selected member does not exist.');
    err.status = 404;
    throw err;
  }

  // Trigger trg_loans_after_insert_decrement automatically decrements available_copies
  const info = db.prepare(`
    INSERT INTO loans (book_id, member_id, borrow_date, due_date, return_date)
    VALUES (?, ?, ?, ?, NULL)
  `).run(payload.book_id, payload.member_id, payload.borrow_date, payload.due_date);

  return db.prepare(`
    SELECT l.*, b.title AS book_title, m.full_name AS member_name
    FROM loans l
    JOIN books b ON l.book_id = b.book_id
    JOIN members m ON l.member_id = m.member_id
    WHERE l.loan_id = ?
  `).get(info.lastInsertRowid);
});

exports.createLoan = (req, res, next) => {
  try {
    const payload = validateLoanPayload(req.body);
    const created = issueLoanTx(payload);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

// Atomic transaction: prevents double-return race condition & increments available_copies via trigger
const returnLoanTx = db.transaction((loanId, returnDate) => {
  const loan = db.prepare('SELECT * FROM loans WHERE loan_id = ?').get(loanId);
  if (!loan) {
    const err = new Error('Loan record not found.');
    err.status = 404;
    throw err;
  }
  if (loan.return_date !== null) {
    throw new ValidationError('This loan has already been returned.');
  }
  if (returnDate < loan.borrow_date) {
    throw new ValidationError('return_date cannot be earlier than borrow_date.');
  }

  // Trigger trg_loans_after_return_increment automatically increments available_copies
  db.prepare('UPDATE loans SET return_date = ? WHERE loan_id = ? AND return_date IS NULL').run(
    returnDate,
    loanId
  );

  return db.prepare(`
    SELECT l.*, b.title AS book_title, m.full_name AS member_name
    FROM loans l
    JOIN books b ON l.book_id = b.book_id
    JOIN members m ON l.member_id = m.member_id
    WHERE l.loan_id = ?
  `).get(loanId);
});

exports.returnLoan = (req, res, next) => {
  try {
    const loanId = parsePositiveInt(req.params.id, 'loan_id');
    const returnDate =
      parseIsoDate(req.body && req.body.return_date, 'return_date', { required: false }) ||
      new Date().toISOString().slice(0, 10);

    const updated = returnLoanTx(loanId, returnDate);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};
