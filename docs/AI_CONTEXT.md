# AI Context File

> **Purpose:** This file helps an AI assistant quickly understand the CodeMentor project and continue development without prior context.

---

## What This Project Is

**CodeMentor** (also called **CodeSphere** in Docker Compose) is a self-hosted coding assessment platform for engineering colleges. Think "LeetCode for Education" — faculty create problems, students solve them, and faculty see detailed analytics. It runs entirely on the institution's own infrastructure.

---

## Repository Structure (Quick Map)

```
codementor/
├── backend/          ← Node.js + Express REST API + Socket.IO + BullMQ worker
├── frontend/         ← React 18 + Vite + Tailwind + shadcn/ui  ← THIS IS THE ACTIVE FRONTEND
├── frontend-next/    ← Next.js 16 + MUI v6  ← IN-PROGRESS REDESIGN (not deployable yet)
├── judge0/           ← Judge0 CE config (code execution engine)
└── docker-compose.yml ← Full production stack
```

**The active frontend is `frontend/`. Do NOT deploy or add features to `frontend-next/` — it is an incomplete rebuild.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 18 + Express 5 + PostgreSQL 16 + Redis + BullMQ |
| Frontend | React 18 + Vite + Tailwind CSS v4 + shadcn/ui + React Router v7 |
| Code Execution | Judge0 CE 1.13.1 (self-hosted Docker, internal network only) |
| Real-time | Socket.IO (verdict delivery) |
| AI | Google Gemini 2.5 Flash (`@google/genai`) |
| Auth | JWT (access 1h, refresh 7d) + Google OAuth + TOTP 2FA |
| Plagiarism | JPlag (Java subprocess) |

---

## User Roles

| Role | Can Do |
|------|--------|
| `student` | Solve problems, view own submissions, join contests, use AI tutor |
| `faculty` | All student capabilities + create problems/assignments/contests, view analytics |
| `admin` | All faculty capabilities + manage faculty permissions + view audit logs |

Faculty permissions are granular: `manage_problems`, `manage_assignments`, `manage_students`, `export_data`, `generate_ai_tests`, `run_plagiarism`, `manage_contests`. Stored as JSONB on `users.permissions`.

---

## Most Important Files

| File | What It Does |
|------|-------------|
| `backend/src/server.js` | Express app setup, Socket.IO, route registration |
| `backend/src/config/db.js` | DB connection + schema creation (all tables defined here) |
| `backend/src/workers/judge.worker.js` | Core judging logic — BullMQ worker that calls Judge0 |
| `backend/src/controllers/faculty.controller.js` | ~1000 lines: problem CRUD, assignments, analytics, AI tests |
| `backend/src/controllers/ai.controller.js` | All Gemini integrations (tutor, review, test gen) |
| `backend/src/middleware/permissions.js` | Faculty permission flags and `requirePermission()` middleware |
| `frontend/src/App.tsx` | React Router route definitions |
| `frontend/src/lib/api.ts` | Axios instance with JWT auto-refresh |
| `frontend/src/pages/ProblemSolvingPage.tsx` | Monaco editor + real-time verdict + AI tutor |
| `frontend/src/pages/FacultyDashboard.tsx` | Faculty analytics dashboard |

---

## Data Flow: Student Submits Code

```
frontend: POST /api/submit { source_code, language_id, problem_id }
  → backend validates input
  → adds job to BullMQ submissions queue
  → returns { jobId }
  → frontend: socket.join(jobId)

  [async] judge.worker.js picks up job:
    → fetches test cases from PostgreSQL
    → POST /submissions/batch to Judge0 (batches of 20)
    → polls Judge0 until all tokens complete
    → evaluates each result (exact match or custom checker)
    → INSERTs code_submission record
    → UPSERTs student_topic_mastery
    → if contest submission: INSERT contest_submissions
    → socket.to(jobId).emit('verdict', result)

frontend: receives 'verdict' event → shows result
```

---

## Database Tables (Key Ones)

| Table | Purpose |
|-------|---------|
| `users` | All users (students, faculty, admin) |
| `problems` | Coding problems with test case config |
| `test_cases` | Input/output pairs for judging |
| `code_submissions` | Every non-custom-input submission |
| `assignments` | Faculty-created assignments with deadlines |
| `contests` | Timed contests with scoreboard modes |
| `contest_submissions` | Contest-specific submission records |
| `ai_tutor_conversations` | Per-user-per-problem AI chat history |
| `student_topic_mastery` | Aggregated solved/failed per tag |
| `rating_history` | Elo rating changes after contests |
| `plagiarism_results` | JPlag similarity results |
| `audit_logs` | Action trail for sensitive operations |
| `classrooms` + `classroom_members` | Virtual class groups |
| `mcq_tests` + `mcq_questions` + `mcq_attempts` | MCQ/aptitude module |

---

## Important Workflows

### Add a New Backend Feature
1. Add table columns to `scaffoldDatabase()` in `db.js` using `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
2. Write controller function in the appropriate `*controller.js`
3. Register route in `*routes.js`
4. Mount route in `server.js` if it's a new route file
5. Protect with `protect` + `requireRole` or `requirePermission` as appropriate

### Add a New Frontend Page (Student)
1. Create `src/pages/NewPage.tsx`
2. Add route in `App.tsx` under the `/app` route group inside `<AppLayout>`
3. Add link to `Sidebar.tsx`

### Add a New Frontend Page (Faculty)
1. Create `src/pages/NewFacultyPage.tsx`
2. Add route in `App.tsx` under the `/faculty` route group
3. Add link to `FacultySidebar.tsx`

---

## Current Known Issues

| Issue | File | Severity |
|-------|------|----------|
| `/faculty/assignments` renders FacultyDashboard | `App.tsx:106` | High |
| `/faculty/students` renders FacultyDashboard | `App.tsx:107` | High |
| No automated tests anywhere | All packages | High |
| Auth tokens in localStorage (XSS risk) | `api.ts`, `App.tsx` | Medium |
| speakeasy (2FA) is unmaintained | `package.json` | Medium |
| TOTP secret stored in plaintext | `db.js` | Medium |

---

## Active Development Areas (as of 2026-06-22)

1. **frontend-next/** — Redesign in progress; foundation done (auth, dashboard stub, problem list). Next pages to build: ProblemSolvingPage, FacultyDashboard.
2. **frontend/** — Primary frontend is feature-complete; bug fixes ongoing (see known issues above).
3. **Backend** — Stable; incremental features added as needed.

---

## Environment Variables Required

```
DATABASE_URL=postgresql://...
JWT_SECRET=<32 hex chars>
JWT_REFRESH_SECRET=<32 hex chars>
REDIS_URL=redis://...
JUDGE0_URL=http://judge0_server:2358
CORS_ORIGIN=https://your-frontend.example.com
GEMINI_API_KEY=<optional, degrades to mock>
GOOGLE_CLIENT_ID=<optional, for Google OAuth>
```

---

## Conventions

- **API responses:** Always `{ success: boolean, data?: any, error?: string }`
- **UUIDs:** All primary keys use `gen_random_uuid()` from PostgreSQL
- **SQL:** Raw parameterized queries via `db.query(sql, [params])` — no ORM
- **Auth header:** `Authorization: Bearer <accessToken>`
- **Scoring modes:** `'acm'` (binary, stop on first fail) | `'oi'` (partial, run all tests)
- **Test case visibility:** Never return `input_data` or `expected_output` for non-public test cases — not in API responses, not in Socket.IO events
