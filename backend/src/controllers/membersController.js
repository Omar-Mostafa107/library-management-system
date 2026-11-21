'use strict';

const db = require('../config/db');
const {
  parsePositiveInt,
  validateMemberPayload,
  whitelistSort
} = require('../middleware/validate');

const MEMBER_SORT_COLUMNS = {
  name: 'm.full_name ASC',
  name_desc: 'm.full_name DESC',
  newest: 'm.join_date DESC, m.member_id DESC',
  oldest: 'm.join_date ASC'
};

exports.listMembers = (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const orderBy = whitelistSort(req.query.sort, MEMBER_SORT_COLUMNS, 'm.full_name ASC');

    const params = [];
    let whereClause = '';
    if (q) {
      whereClause = 'WHERE m.full_name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    const sql = `
      SELECT
        m.*,
        (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.member_id AND l.return_date IS NULL) AS active_loans,
        (SELECT COUNT(*) FROM loans l WHERE l.member_id = m.member_id) AS total_loans
      FROM members m
      ${whereClause}
      ORDER BY ${orderBy}
    `;

    const members = db.prepare(sql).all(...params);
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
};

exports.getMemberHistory = (req, res, next) => {
  try {
    const memberId = parsePositiveInt(req.params.id, 'member_id');
    const member = db.prepare('SELECT * FROM members WHERE member_id = ?').get(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Not Found', message: 'Member not found.' });
    }

    const history = db.prepare(`
      SELECT
        l.loan_id,
        b.book_id,
        b.title AS book_title,
        b.author AS book_author,
        b.category,
        l.borrow_date,
        l.due_date,
        l.return_date,
        CASE
          WHEN l.return_date IS NOT NULL THEN 'Returned'
          WHEN l.due_date < DATE('now') THEN 'Overdue'
          ELSE 'Active'
        END AS status
      FROM loans l
      JOIN books b ON l.book_id = b.book_id
      WHERE l.member_id = ?
      ORDER BY l.borrow_date DESC, l.loan_id DESC
    `).all(memberId);

    res.json({ data: { member, history } });
  } catch (err) {
    next(err);
  }
};

exports.createMember = (req, res, next) => {
  try {
    const payload = validateMemberPayload(req.body);
    const info = db.prepare(`
      INSERT INTO members (full_name, email, phone, join_date)
      VALUES (?, ?, ?, ?)
    `).run(payload.full_name, payload.email, payload.phone, payload.join_date);

    const created = db.prepare('SELECT * FROM members WHERE member_id = ?').get(info.lastInsertRowid);
    res.status(201).json({ data: created });
  } catch (err) {
    next(err);
  }
};

exports.updateMember = (req, res, next) => {
  try {
    const memberId = parsePositiveInt(req.params.id, 'member_id');
    const existing = db.prepare('SELECT * FROM members WHERE member_id = ?').get(memberId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Member not found.' });
    }
    const payload = validateMemberPayload({ ...existing, ...req.body });
    db.prepare(`
      UPDATE members
      SET full_name = ?, email = ?, phone = ?, join_date = ?
      WHERE member_id = ?
    `).run(payload.full_name, payload.email, payload.phone, payload.join_date, memberId);

    const updated = db.prepare('SELECT * FROM members WHERE member_id = ?').get(memberId);
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteMember = (req, res, next) => {
  try {
    const memberId = parsePositiveInt(req.params.id, 'member_id');
    const existing = db.prepare('SELECT * FROM members WHERE member_id = ?').get(memberId);
    if (!existing) {
      return res.status(404).json({ error: 'Not Found', message: 'Member not found.' });
    }
    db.prepare('DELETE FROM members WHERE member_id = ?').run(memberId);
    res.json({ message: 'Member deleted successfully.', deleted_id: memberId });
  } catch (err) {
    next(err);
  }
};
