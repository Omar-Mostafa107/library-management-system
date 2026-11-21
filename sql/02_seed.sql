-- ============================================================================
-- Library Management System — Sample Seed Data
-- Designed so every required SQL query & report yields meaningful results
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Books (10 curated titles across 5 categories)
INSERT INTO books (book_id, title, author, category, available_copies) VALUES
(1,  'Designing Data-Intensive Applications', 'Martin Kleppmann',      'Computer Science', 4),
(2,  'Clean Architecture',                    'Robert C. Martin',      'Software Engineering', 3),
(3,  'Database System Concepts',              'Abraham Silberschatz',  'Databases', 2),
(4,  'The Pragmatic Programmer',              'David Thomas & Andrew Hunt', 'Software Engineering', 3),
(5,  'The Design of Everyday Things',         'Don Norman',            'Design & UX', 2),
(6,  'Atomic Habits',                         'James Clear',           'Personal Growth', 5),
(7,  'Sapiens: A Brief History of Humankind', 'Yuval Noah Harari',     'History', 2),
(8,  'Introduction to Algorithms',            'Thomas H. Cormen',      'Computer Science', 1),
(9,  'Don''t Make Me Think',                  'Steve Krug',            'Design & UX', 3),
(10, 'Refactoring',                           'Martin Fowler',         'Software Engineering', 2);

-- Members (8 members; members 7 and 8 intentionally have NO loans for NOT EXISTS report)
INSERT INTO members (member_id, full_name, email, phone, join_date) VALUES
(1, 'Salma Hassan',     'salma.hassan@library.edu',     '+20 100 234 5671', '2025-09-12'),
(2, 'Youssef Adel',     'youssef.adel@library.edu',     '+20 101 876 5432', '2025-10-03'),
(3, 'Nourhan Tarek',    'nourhan.tarek@library.edu',    '+20 112 345 6789', '2025-11-18'),
(4, 'Karim El-Sayed',   'karim.elsayed@library.edu',    '+20 122 987 1234', '2026-01-08'),
(5, 'Mariam Sherif',    'mariam.sherif@library.edu',    '+20 109 456 7890', '2026-02-14'),
(6, 'Tarek Mahmoud',    'tarek.mahmoud@library.edu',    '+20 115 654 3210', '2026-03-22'),
(7, 'Hana Mostafa',     'hana.mostafa@library.edu',     '+20 106 789 0123', '2026-09-05'),
(8, 'Ziad Ibrahim',     'ziad.ibrahim@library.edu',     '+20 128 321 9876', '2026-10-19');

-- Loans (Mix of returned, active on-time, and overdue loans)
-- Note: Triggers automatically decrement available_copies for rows where return_date IS NULL
INSERT INTO loans (loan_id, book_id, member_id, borrow_date, due_date, return_date) VALUES
-- Returned historical loans
(1,  1, 1, '2026-09-01', '2026-09-15', '2026-09-12'),
(2,  1, 2, '2026-09-18', '2026-10-02', '2026-10-01'),
(3,  3, 1, '2026-09-20', '2026-10-04', '2026-10-03'),
(4,  5, 3, '2026-10-01', '2026-10-15', '2026-10-10'),
(5,  2, 4, '2026-10-05', '2026-10-19', '2026-10-18'),
(6,  6, 5, '2026-10-12', '2026-10-26', '2026-10-22'),
(7,  1, 3, '2026-10-15', '2026-10-29', '2026-10-28'),
(8,  4, 2, '2026-10-20', '2026-11-03', '2026-11-01'),
-- Active OVERDUE loans (due_date < 2026-11-21)
(9,  3, 4, '2026-10-25', '2026-11-08', NULL),
(10, 8, 2, '2026-10-28', '2026-11-11', NULL),
(11, 5, 6, '2026-11-01', '2026-11-15', NULL),
-- Active ON-TIME loans (due_date >= 2026-11-21)
(12, 1, 5, '2026-11-12', '2026-11-26', NULL),
(13, 2, 1, '2026-11-14', '2026-11-28', NULL),
(14, 9, 3, '2026-11-16', '2026-11-30', NULL),
(15, 6, 4, '2026-11-18', '2026-12-02', NULL);
