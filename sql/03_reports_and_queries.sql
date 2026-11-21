-- ============================================================================
-- Library Management System — Required SQL Queries & Reports
-- Directly mapped to library_management_system_proposal.pdf (Pages 3 & 4)
-- ============================================================================

-- 1. Active Loans Report (JOIN Books, Members, Loans; return_date IS NULL; sort by due_date)
SELECT
    l.loan_id,
    b.title AS book_title,
    b.author,
    m.full_name AS member_name,
    m.email,
    l.borrow_date,
    l.due_date
FROM loans l
JOIN books b   ON l.book_id = b.book_id
JOIN members m ON l.member_id = m.member_id
WHERE l.return_date IS NULL
ORDER BY l.due_date ASC;

-- 2. Overdue Loans Report (Active loans with due_date before current date)
SELECT
    l.loan_id,
    b.title AS book_title,
    m.full_name AS member_name,
    m.phone,
    l.borrow_date,
    l.due_date,
    CAST(julianday(DATE('now')) - julianday(l.due_date) AS INTEGER) AS days_overdue
FROM loans l
JOIN books b   ON l.book_id = b.book_id
JOIN members m ON l.member_id = m.member_id
WHERE l.return_date IS NULL
  AND l.due_date < DATE('now')
ORDER BY l.due_date ASC;

-- 3. Most-Borrowed Books (COUNT, GROUP BY, HAVING > 1, ORDER BY DESC)
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
ORDER BY loan_count DESC, b.title ASC;

-- 4. Member Borrowing History (JOIN and filter by specific member_id)
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
WHERE m.member_id = 1
ORDER BY l.borrow_date DESC;

-- 5. Above-Average Borrowed Books (Nested Subquery comparing book count to AVG)
SELECT
    b.book_id,
    b.title,
    b.author,
    COUNT(l.loan_id) AS total_loans
FROM books b
JOIN loans l ON b.book_id = l.book_id
GROUP BY b.book_id, b.title, b.author
HAVING COUNT(l.loan_id) > (
    SELECT AVG(book_loans)
    FROM (
        SELECT COUNT(*) AS book_loans
        FROM loans
        GROUP BY book_id
    )
)
ORDER BY total_loans DESC;

-- 6. Members With No Loans (NOT EXISTS Subquery)
SELECT
    m.member_id,
    m.full_name,
    m.email,
    m.phone,
    m.join_date
FROM members m
WHERE NOT EXISTS (
    SELECT 1
    FROM loans l
    WHERE l.member_id = m.member_id
)
ORDER BY m.full_name ASC;

-- 7. Aggregate Summary Metrics (COUNT, MIN, MAX, AVG loan duration in days)
SELECT
    COUNT(*) AS total_returned_loans,
    MIN(CAST(julianday(return_date) - julianday(borrow_date) AS INTEGER)) AS min_duration_days,
    MAX(CAST(julianday(return_date) - julianday(borrow_date) AS INTEGER)) AS max_duration_days,
    ROUND(AVG(julianday(return_date) - julianday(borrow_date)), 1) AS avg_duration_days
FROM loans
WHERE return_date IS NOT NULL;
