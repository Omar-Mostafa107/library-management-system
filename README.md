# Folio & Shelf — Fullstack Library Management System

A fullstack relational Library Management System built with **Node.js + Express + SQL (SQLite via `better-sqlite3`)** and a bespoke, human-crafted editorial frontend. Designed to satisfy every core and optional requirement in `library_management_system_proposal.pdf`.

## Architecture Plan

```
library-management-system/
├── sql/
│   ├── 01_schema.sql              # Tables (books, members, loans), PK/FK/UNIQUE/CHECK, Indexes, Triggers, Views
│   ├── 02_seed.sql                # Curated sample dataset covering active, overdue, returned, and zero-loan cases
│   └── 03_reports_and_queries.sql # All 6 assignment reports + aggregate statistics (COUNT, MIN, MAX, AVG)
├── backend/src/
│   ├── config/db.js               # SQLite initialization (foreign_keys=ON, WAL mode, auto-seed)
│   ├── config/resetDb.js          # Clean database reset & re-seed script
│   ├── middleware/validate.js     # Input validation, ISO date checks, SQLi-safe ORDER BY whitelisting
│   ├── middleware/errorHandler.js # Central SQLite constraint-to-HTTP error mapper
│   ├── controllers/               # booksController, membersController, loansController (atomic transactions), reportsController
│   ├── routes/index.js            # RESTful /api endpoints
│   ├── app.js                     # Express app with Helmet, CORS, Rate Limiting, body cap
│   └── server.js                  # HTTP server with graceful shutdown
├── frontend/
│   └── index.html                 # Editorial warm-parchment UI connected to /api
├── package.json
└── .env.example
```

## Quick Start (Local Machine)

```bash
cd library-management-system
cp .env.example .env
npm install
npm run dev
# Open http://localhost:4000
```

## REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health check |
| `GET/POST` | `/api/books` | Search/filter/sort books or add a new book |
| `PUT/DELETE` | `/api/books/:id` | Update book or safely delete (`ON DELETE RESTRICT`) |
| `GET/POST` | `/api/members` | Search/sort members or register a new member (`UNIQUE email`) |
| `PUT/DELETE` | `/api/members/:id` | Update contact details or safely delete |
| `GET` | `/api/members/:id/history` | Member borrowing history (`JOIN`) |
| `GET/POST` | `/api/loans` | List loans (`?status=all|active|overdue|returned`) or issue new loan (atomic tx) |
| `PATCH` | `/api/loans/:id/return` | Record return date (atomic tx + trigger auto-increments `available_copies`) |
| `GET` | `/api/reports/overview` | KPI totals, category breakdown, and MIN/MAX/AVG loan duration |
| `GET` | `/api/reports/active-loans` | Active loans (`v_active_loans`) |
| `GET` | `/api/reports/overdue-loans` | Overdue loans (`v_overdue_loans`) |
| `GET` | `/api/reports/most-borrowed` | `GROUP BY` + `HAVING COUNT(*) > 1` |
| `GET` | `/api/reports/above-average` | Nested subquery comparing each book to AVG loan count |
| `GET` | `/api/reports/members-no-loans` | `NOT EXISTS` subquery |

## Senior Engineering Security & Reliability Hardening

1. **Zero SQL Injection**: 100% parameterized prepared statements (`?`) across all queries; dynamic `ORDER BY` uses strict column whitelists.
2. **Atomic Transactions & DB Triggers**: Issuing and returning books execute inside `db.transaction()` backed by `BEFORE INSERT` stock guard triggers and `AFTER INSERT` / `AFTER UPDATE` inventory triggers — preventing negative copies and double-return race conditions.
3. **Referential Integrity**: `PRAGMA foreign_keys = ON` with `ON DELETE RESTRICT` prevents orphaning historical loan records.
4. **Defense-in-Depth Middleware**: `helmet` security headers, `express-rate-limit`, `50kb` JSON body limit, strict ISO calendar date validation (rejects invalid dates like `2026-02-31`), and sanitized production error responses.
"# library-management-system" 
"# library-management-system" 
