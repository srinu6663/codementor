# Route & Screen Inventory

## Frontend Routes (React — `frontend/`)

### Public Routes (no auth required)

| Path | Component | Purpose |
|------|-----------|---------|
| `/login` | `LoginPage` | Email/password + Google OAuth login. Redirects authenticated users to their home. |
| `/register` | `RegisterPage` | New user registration. Accepts name, email, password, academic metadata. |

### Student Routes (auth required, any role)

All wrapped in `AppLayout` (sidebar + header).

| Path | Component | Purpose | Notes |
|------|-----------|---------|-------|
| `/app/dashboard` | `StudentDashboard` | Personal stats: submissions, AC rate, streak, rank, rating, topic mastery, heatmap, recommendations | Calls `/api/student/dashboard` |
| `/app/problems` | `ProblemListPage` | Browsable list of all problems. Filter by difficulty/tag, search by title. | Calls `/api/problems` |
| `/app/problems/:id` | `ProblemSolvingPage` | Full-screen IDE: Monaco editor, problem statement, test case runner, AI tutor sidebar | Full-screen, no sidebar. Calls `/api/problems/:id`, `/api/submit` |
| `/app/leaderboard` | `LeaderboardPage` | Rankings by problems solved; filter by department/section/year | Calls `/api/student/leaderboard` |
| `/app/assignments` | `AssignmentsPage` | View active and past assignments, see deadline and progress | Calls `/api/faculty/assignments` (public view) |
| `/app/contests` | `ContestsPage` | List, register, and participate in contests | Calls `/api/contests` |
| `/app/placement` | `PlacementTrackPage` | Curated problem sets organized by company/track | Calls `/api/student/placement-track` |
| `/app/ai-tutor` | `AITutorPage` | Standalone AI tutor chat interface | Calls `/api/ai/chat` |
| `/app/profile` | `ProfilePage` | View/edit own profile, see rating history | |
| `/app/submissions` | `MySubmissionsPage` | Personal submission history (last 50) | Calls `/api/submissions` |
| `/app/classes` | `StudentClassesPage` | View enrolled classrooms, join new class via code | Calls `/api/classrooms` |
| `/app/aptitude` | `AptitudePage` | Take MCQ/aptitude tests published by faculty | Calls `/api/mcq` |
| `/app/coding-profiles` | `CodingProfilesPage` | Link and sync external profiles (LeetCode, Codeforces, etc.) | Calls `/api/profiles` |

### Faculty Routes (requires role `faculty` or `admin`)

All wrapped in `FacultyLayout` (faculty-specific sidebar + header).

| Path | Component | Purpose | Notes |
|------|-----------|---------|-------|
| `/faculty/dashboard` | `FacultyDashboard` | Aggregate class stats, assignments list, analytics charts, at-risk students | Calls `/api/faculty/dashboard`, `/api/faculty/analytics` |
| `/faculty/problems` | `FacultyProblems` | Problem bank: create, edit, delete problems owned by this faculty | Calls `/api/faculty/problems` |
| `/faculty/assignments` | `FacultyDashboard` | **Bug: renders FacultyDashboard instead of an assignments page** | Placeholder route |
| `/faculty/assignments/:assignmentId/plagiarism` | `PlagiarismPage` | Run JPlag and view similarity network graph and diffs | |
| `/faculty/students` | `FacultyDashboard` | **Bug: renders FacultyDashboard instead of a students page** | Placeholder route |
| `/faculty/judge-health` | `JudgeHealthPage` | Judge0 health status, queue depth, supported language list | Calls `/api/judge-health` |
| `/faculty/permissions` | `FacultyPermissionsPage` | **Admin only** — Grant/revoke per-faculty permission flags | Calls `/api/faculty/permissions` |
| `/faculty/audit-logs` | `AuditLogPage` | **Admin only** — View action audit trail | Calls `/api/faculty/audit-logs` |
| `/faculty/classes` | `FacultyClassesPage` | Create classrooms, view members, manage classroom assignments | Calls `/api/classrooms` |
| `/faculty/plagiarism` | `FacultyPlagiarismOverview` | Overview of all plagiarism runs across all assignments | |
| `/faculty/mcq` | `FacultyMcqPage` | Create/manage MCQ tests, view student attempts | Calls `/api/mcq` |

### Redirect Routes

| Path | Redirects To | Notes |
|------|-------------|-------|
| `/` | `/app/dashboard` or `/faculty/dashboard` or `/login` | Based on auth state and role |
| `/faculty-dashboard` | `/faculty/dashboard` | Legacy URL support |
| `/faculty-problems` | `/faculty/problems` | Legacy URL support |
| `*` | `NotFoundPage` | 404 catch-all |

---

## Frontend-Next Routes (Next.js — `frontend-next/`)

This is the in-progress redesign. Only foundation pages are implemented.

| Path | File | Status |
|------|------|-------|
| `/` | `app/page.tsx` | Landing / redirect placeholder |
| `/login` | `app/(auth)/login/page.tsx` | Login page (MUI) |
| `/register` | `app/(auth)/register/page.tsx` | Register page (MUI) |
| `/app/dashboard` | `app/(student)/app/dashboard/page.tsx` | Student dashboard stub |
| `/app/problems` | `app/(student)/app/problems/page.tsx` | Problem list with MUI DataGrid |

All other routes from `frontend/` are **not yet implemented** in `frontend-next/`.

---

## Backend API Routes

### Auth — `/api/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login; returns JWT pair or 2FA challenge |
| POST | `/api/auth/refresh` | None | Exchange refresh token for new access token |
| POST | `/api/auth/google` | None | Google OAuth login/register |

### Submissions — `/api`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/submit` | Optional | Enqueue code submission |
| GET | `/api/submit/history/:problemId` | Optional | Per-problem submission history |
| GET | `/api/submissions` | Optional | Full submission history (last 50) |

### Problems — `/api/problems`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/problems` | None | List all problems (with filters) |
| GET | `/api/problems/:id` | None | Get single problem + public test cases |
| GET | `/api/problems/:id/adjacent` | None | Prev/next problem IDs |
| POST | `/api/problems` | Faculty | Create problem (simple version) |
| PUT | `/api/problems/:id` | Faculty | Update problem |
| DELETE | `/api/problems/:id` | Faculty | Delete problem |

### AI — `/api/ai`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/ai/chat` | Student | Socratic AI tutor message |
| GET | `/api/ai/history/:problemId` | Student | AI conversation history |
| POST | `/api/ai/explain-error` | Student | Explain compile/runtime error |
| POST | `/api/ai/review` | Student | Code quality review |

### Student — `/api/student`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/student/dashboard` | Student | Personal stats, streak, rank, heatmap |
| GET | `/api/student/leaderboard` | Student | Rankings |
| GET | `/api/student/placement-track` | Student | Placement prep problems |
| GET | `/api/student/recommended` | Student | AI-recommended next problems |

### Faculty — `/api/faculty`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/faculty/dashboard` | Faculty | Aggregate class stats |
| GET | `/api/faculty/analytics` | Faculty | Deep class analytics data |
| GET | `/api/faculty/students` | Faculty | Student list with stats |
| GET | `/api/faculty/at-risk` | Faculty | At-risk student list |
| GET | `/api/faculty/student/:id` | Faculty | Student deep-dive |
| GET | `/api/faculty/problems` | Faculty | Faculty's problems with stats |
| POST | `/api/faculty/problems` | Faculty | Create problem (full version) |
| PUT | `/api/faculty/problems/:id` | Faculty | Update problem |
| DELETE | `/api/faculty/problems/:id` | Faculty | Delete problem |
| POST | `/api/faculty/problems/:id/generate-tests` | Faculty | AI-generate test cases |
| POST | `/api/faculty/problems/:id/random-tests` | Faculty | Generate random tests via generator+reference |
| GET | `/api/faculty/problems/:id/test-heatmap` | Faculty | Per-test-case fail rate heatmap |
| POST | `/api/faculty/assignments` | Faculty | Create assignment/exam |
| GET | `/api/faculty/assignments/:id/submissions` | Faculty | View submissions for assignment |
| GET | `/api/faculty/assignments/:id/progress` | Faculty | Per-student progress grid |
| GET | `/api/faculty/assignments/:id/export-csv` | Faculty | Export marks CSV |
| GET/PUT | `/api/faculty/permissions` | Admin | Get/set per-faculty permissions |
| GET | `/api/faculty/audit-logs` | Admin | View audit log |
| GET | `/api/faculty/cohort-topics` | Faculty | Cohort-level topic mastery |

### Contests — `/api/contests`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/contests` | None | List all contests |
| GET | `/api/contests/:id` | None | Contest details + scoreboard |
| POST | `/api/contests` | Faculty | Create contest |
| PUT | `/api/contests/:id/scoreboard-mode` | Faculty | Update scoreboard visibility |
| POST | `/api/contests/:id/register` | Student | Register for contest |
| GET | `/api/contests/:id/scoreboard` | Auth | Live scoreboard |

### Other Routes
| Prefix | Description |
|--------|-------------|
| `/api/2fa` | TOTP setup/verify |
| `/api/classrooms` | Classroom CRUD + membership |
| `/api/mcq` | MCQ test CRUD + attempts |
| `/api/profiles` | External coding profile link/sync |
| `/api/plagiarism` | Run JPlag + view results |
| `/api/problem-import` | Bulk import problems from ZIP |
| `/api/pdf` | Export assignment report as PDF |
| `/api/rating` | Recalculate contest ratings |
| `/api/judge-health` | Judge0 health status |
| `/api/proctor` | Log/retrieve proctoring events |
