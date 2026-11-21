-- ============================================================================
-- Library Management System — Complete Relational Schema (SQLite / Standard SQL)
-- Aligned with library_management_system_proposal.pdf
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. BOOKS Table
CREATE TABLE IF NOT EXISTS books (
    book_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title            VARCHAR(200) NOT NULL CHECK (LENGTH(TRIM(title)) > 0),
    author           VARCHAR(150) NOT NULL CHECK (LENGTH(TRIM(author)) > 0),
    category         VARCHAR(100) NOT NULL DEFAULT 'General',
    available_copies INTEGER NOT NULL DEFAULT 1 CHECK (available_copies >= 0),
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. MEMBERS Table
CREATE TABLE IF NOT EXISTS members (
    member_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name        VARCHAR(150) NOT NULL CHECK (LENGTH(TRIM(full_name)) > 0),
    email            VARCHAR(180) NOT NULL UNIQUE COLLATE NOCASE,
    phone            VARCHAR(30),
    join_date        DATE NOT NULL DEFAULT (DATE('now')),
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. LOANS Table (1:N from Books, 1:N from Members; total participation on Loans)
CREATE TABLE IF NOT EXISTS loans (
    loan_id          INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id          INTEGER NOT NULL,
    member_id        INTEGER NOT NULL,
    borrow_date      DATE NOT NULL DEFAULT (DATE('now')),
    due_date         DATE NOT NULL,
    return_date      DATE DEFAULT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id)   REFERENCES books(book_id)     ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(member_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (due_date >= borrow_date),
    CHECK (return_date IS NULL OR return_date >= borrow_date)
);

-- ============================================================================
-- Performance Indexes (Bonus Enhancement #5)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_books_title        ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author       ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_category     ON books(category);
CREATE INDEX IF NOT EXISTS idx_loans_book_id      ON loans(book_id);
CREATE INDEX IF NOT EXISTS idx_loans_member_id    ON loans(member_id);
CREATE INDEX IF NOT EXISTS idx_loans_return_date  ON loans(return_date);
CREATE INDEX IF NOT EXISTS idx_loans_due_date     ON loans(due_date);

-- ============================================================================
-- Automatic Stock Integrity Triggers (Bonus Enhancement #3)
-- ============================================================================

-- Guard: prevent issuing an active loan when available_copies = 0
CREATE TRIGGER IF NOT EXISTS trg_loans_before_insert_check_stock
BEFORE INSERT ON loans
WHEN NEW.return_date IS NULL
BEGIN
    SELECT CASE
        WHEN (SELECT available_copies FROM books WHERE book_id = NEW.book_id) <= 0
        THEN RAISE(ABORT, 'No available copies left for this book')
    END;
END;

-- Decrement available_copies automatically when an active loan is created
CREATE TRIGGER IF NOT EXISTS trg_loans_after_insert_decrement
AFTER INSERT ON loans
WHEN NEW.return_date IS NULL
BEGIN
    UPDATE books
    SET available_copies = available_copies - 1
    WHERE book_id = NEW.book_id;
END;

-- Increment available_copies automatically when a loan is marked returned
CREATE TRIGGER IF NOT EXISTS trg_loans_after_return_increment
AFTER UPDATE OF return_date ON loans
WHEN OLD.return_date IS NULL AND NEW.return_date IS NOT NULL
BEGIN
    UPDATE books
    SET available_copies = available_copies + 1
    WHERE book_id = NEW.book_id;
END;

-- ============================================================================
-- Reporting Views (Bonus Enhancement #1)
-- ============================================================================

-- Active Loans View
CREATE VIEW IF NOT EXISTS v_active_loans AS
SELECT
    l.loan_id,
    b.book_id,
    b.title AS book_title,
    b.author AS book_author,
    b.category,
    m.member_id,
    m.full_name AS member_name,
    m.email AS member_email,
    l.borrow_date,
    l.due_date,
    CAST(julianday(l.due_date) - julianday(DATE('now')) AS INTEGER) AS days_remaining
FROM loans l
JOIN books b   ON l.book_id = b.book_id
JOIN members m ON l.member_id = m.member_id
WHERE l.return_date IS NULL
ORDER BY l.due_date ASC;

-- Overdue Loans View
CREATE VIEW IF NOT EXISTS v_overdue_loans AS
SELECT
    l.loan_id,
    b.book_id,
    b.title AS book_title,
    b.author AS book_author,
    m.member_id,
    m.full_name AS member_name,
    m.email AS member_email,
    m.phone AS member_phone,
    l.borrow_date,
    l.due_date,
    CAST(julianday(DATE('now')) - julianday(l.due_date) AS INTEGER) AS days_overdue
FROM loans l
JOIN books b   ON l.book_id = b.book_id
JOIN members m ON l.member_id = m.member_id
WHERE l.return_date IS NULL
  AND l.due_date < DATE('now')
ORDER BY l.due_date ASC;
