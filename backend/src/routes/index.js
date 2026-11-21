'use strict';

const express = require('express');
const books = require('../controllers/booksController');
const members = require('../controllers/membersController');
const loans = require('../controllers/loansController');
const reports = require('../controllers/reportsController');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'library-management-api', timestamp: new Date().toISOString() });
});

// Books CRUD
router.get('/books', books.listBooks);
router.get('/books/:id', books.getBook);
router.post('/books', books.createBook);
router.put('/books/:id', books.updateBook);
router.delete('/books/:id', books.deleteBook);

// Members CRUD + History
router.get('/members', members.listMembers);
router.get('/members/:id/history', members.getMemberHistory);
router.post('/members', members.createMember);
router.put('/members/:id', members.updateMember);
router.delete('/members/:id', members.deleteMember);

// Loans & Returns
router.get('/loans', loans.listLoans);
router.post('/loans', loans.createLoan);
router.patch('/loans/:id/return', loans.returnLoan);

// SQL Reports & Analytics
router.get('/reports/overview', reports.getOverview);
router.get('/reports/active-loans', reports.activeLoansReport);
router.get('/reports/overdue-loans', reports.overdueLoansReport);
router.get('/reports/most-borrowed', reports.mostBorrowedBooks);
router.get('/reports/above-average', reports.aboveAverageBooks);
router.get('/reports/members-no-loans', reports.membersWithNoLoans);
router.get('/reports/member-history/:memberId', reports.memberHistoryReport);

module.exports = router;
