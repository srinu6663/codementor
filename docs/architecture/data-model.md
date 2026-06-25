# Data Model

All tables are in PostgreSQL 16. The schema is created/migrated by `backend/src/config/db.js:scaffoldDatabase()` on application startup.

---

## Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────────────────────────────┐
  │                                                                                          │
  ├──< problems (created_by)                                                                 │
  │     │                                                                                    │
  │     ├──< test_cases (problem_id)                                                         │
  │     ├──< contest_problems (problem_id)                                                   │
  │     └──< assignment_problems (problem_id)                                                │
  │                                                                                          │
  ├──< code_submissions (user_id, problem_id)                                                │
  │                                                                                          │
  ├──< ai_tutor_conversations (user_id, problem_id)                                          │
  ├──< student_topic_mastery (user_id)                                                       │
  ├──< coding_profiles (user_id)                                                             │
  ├──< rating_history (user_id, contest_id)                                                  │
  ├──< proctor_events (user_id)                                                              │
  │                                                                                          │
  ├──< assignments (faculty_id)                                                              │
  │     └──< assignment_problems (assignment_id, problem_id)                                 │
  │                                                                                          │
  ├──< contests (faculty_id)                                                                 │
  │     ├──< contest_problems (contest_id, problem_id)                                       │
  │     ├──< contest_registrations (contest_id, user_id)                                     │
  │     ├──< contest_submissions (contest_id, user_id, problem_id)                           │
  │     └──< virtual_participations (contest_id, user_id)                                    │
  │                                                                                          │
  ├──< classrooms (faculty_id)                                                               │
  │     └──< classroom_members (classroom_id, user_id)                                       │
  │                                                                                          │
  ├──< plagiarism_results (student_a, student_b → users)                                     │
  ├──< mcq_tests (faculty_id)                                                                │
  │     ├──< mcq_questions (test_id)                                                         │
  │     └──< mcq_attempts (test_id, user_id)                                                 │
  │                                                                                          │
  └──< audit_logs (user_id)                                                                  │
```

---

## Table Definitions

### `users`
Core entity for all authenticated users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `name` | VARCHAR(100) | Display name |
| `email` | VARCHAR(100) UNIQUE | Login identifier |
| `password_hash` | VARCHAR(255) | bcrypt hash |
| `role` | VARCHAR(20) | `'student'` \| `'faculty'` \| `'admin'` |
| `permissions` | JSONB | Faculty capability flags (default `{}`) |
| `department` | VARCHAR(60) | Academic metadata |
| `section` | VARCHAR(20) | Academic metadata |
| `year` | INTEGER | Academic year (1–6) |
| `roll_no` | VARCHAR(40) | College roll number |
| `failed_login_attempts` | INTEGER | Fail2ban counter |
| `locked_until` | TIMESTAMP | Lockout expiry |
| `last_login_at` | TIMESTAMP | Last successful login |
| `totp_secret` | TEXT | TOTP seed (encrypted at rest not yet) |
| `totp_enabled` | BOOLEAN | 2FA enabled flag |
| `google_id` | TEXT | Google OAuth subject ID |
| `rating` | INTEGER | Elo-style contest rating (default 1200) |
| `created_at` | TIMESTAMP | Registration time |

**`permissions` JSONB schema:**
```json
{
  "manage_problems": true,
  "manage_assignments": true,
  "manage_students": true,
  "export_data": true,
  "generate_ai_tests": true,
  "run_plagiarism": true,
  "manage_contests": true
}
```
Empty object `{}` means all defaults are applied. Admin role bypasses this entirely.

---

### `problems`
A coding problem authored by faculty.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `title` | VARCHAR(200) | |
| `description` | TEXT | Markdown (+ LaTeX) |
| `difficulty` | VARCHAR(10) | `'easy'` \| `'medium'` \| `'hard'` |
| `tags` | TEXT[] | e.g., `['arrays', 'dp']` |
| `created_by` | UUID FK → users | Owning faculty |
| `time_limit` | INTEGER | CPU time limit in seconds (default 2) |
| `memory_limit` | INTEGER | MB (default 256) |
| `stubs` | JSONB | `{ "71": "def solution():\n    pass" }` (language_id → starter code) |
| `scoring_mode` | VARCHAR(3) | `'acm'` or `'oi'` |
| `max_score` | INTEGER | Max score in OI mode (default 100) |
| `editorial` | TEXT | Solution editorial (Markdown) |
| `editorial_visible_at` | TIMESTAMP | Scheduled unlock time for editorial |
| `uses_checker` | BOOLEAN | Special judge enabled |
| `checker_code` | TEXT | Checker source code |
| `checker_language_id` | INTEGER | Judge0 language ID for checker |
| `generator_code` | TEXT | Random test generator code |
| `generator_language_id` | INTEGER | |
| `reference_code` | TEXT | Reference solution for random test gen |
| `reference_language_id` | INTEGER | |
| `created_at` | TIMESTAMP | |

---

### `test_cases`
Input/output pairs for judging. Cascade-deleted when problem is deleted.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `problem_id` | UUID FK → problems | |
| `input_data` | TEXT | stdin input |
| `expected_output` | TEXT | Expected stdout |
| `is_public` | BOOLEAN | True = visible to students in problem UI |
| `score` | INTEGER | Points for this test case in OI mode (0 = auto-split) |
| `created_at` | TIMESTAMP | |

---

### `code_submissions`
Every code submission (normal + contest runs; NOT custom input runs).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Nullable (anonymous submissions allowed) |
| `problem_id` | UUID FK → problems | |
| `code` | TEXT | Source code (capped at 64KB) |
| `language` | VARCHAR(20) | Judge0 language ID as string |
| `verdict` | VARCHAR(20) | `'Accepted'`, `'Wrong Answer'`, `'Time Limit Exceeded'`, etc. |
| `runtime` | INTEGER | Max runtime across test cases (milliseconds) |
| `memory` | INTEGER | Max memory across test cases (KB) |
| `score` | INTEGER | OI partial score (NULL in ACM mode) |
| `test_results` | JSONB | Ordered boolean array: `[true, false, true, ...]` |
| `submitted_at` | TIMESTAMP | |

---

### `assignments`
A faculty-created collection of problems with a deadline.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `faculty_id` | UUID FK → users | Creator |
| `title` | VARCHAR(200) | |
| `deadline` | TIMESTAMP | |
| `allowed_cidrs` | TEXT[] | IP CIDR whitelist; empty = no restriction |
| `is_exam` | BOOLEAN | Proctored exam mode |
| `created_at` | TIMESTAMP | |

---

### `assignment_problems`
Junction table linking assignments to problems.

| Column | Type | Notes |
|--------|------|-------|
| `assignment_id` | UUID FK → assignments | |
| `problem_id` | UUID FK → problems | |
| PK | (assignment_id, problem_id) | |

---

### `contests`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `faculty_id` | UUID FK → users | |
| `title` | VARCHAR(200) | |
| `description` | TEXT | |
| `starts_at` | TIMESTAMP | |
| `ends_at` | TIMESTAMP | |
| `scoreboard_mode` | VARCHAR(10) | `'public'` \| `'frozen'` \| `'hidden'` |
| `freeze_at` | TIMESTAMP | Scoreboard freeze timestamp (frozen mode) |
| `created_at` | TIMESTAMP | |

---

### `contest_problems`

| Column | Type | Notes |
|--------|------|-------|
| `contest_id` | UUID FK → contests | |
| `problem_id` | UUID FK → problems | |
| `sort_order` | INTEGER | Display order |
| PK | (contest_id, problem_id) | |

---

### `contest_registrations`

| Column | Type | Notes |
|--------|------|-------|
| `contest_id` | UUID FK → contests | |
| `user_id` | UUID FK → users | |
| `registered_at` | TIMESTAMP | |
| PK | (contest_id, user_id) | |

---

### `contest_submissions`
Separate from `code_submissions` — tracks contest-specific results including penalty.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `contest_id` | UUID FK → contests | |
| `user_id` | UUID FK → users | |
| `problem_id` | UUID FK → problems | |
| `verdict` | VARCHAR(20) | |
| `score` | INTEGER | |
| `penalty_minutes` | INTEGER | ACM-style time penalty |
| `is_virtual` | BOOLEAN | Virtual participation run |
| `virtual_elapsed_minutes` | INTEGER | Minutes elapsed in virtual run |
| `submitted_at` | TIMESTAMP | |

Indexed on `contest_id`.

---

### `virtual_participations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `contest_id` | UUID FK → contests | |
| `user_id` | UUID FK → users | |
| `started_at` | TIMESTAMP | |
| UNIQUE | (contest_id, user_id) | |

---

### `ai_tutor_conversations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `problem_id` | UUID FK → problems | |
| `role` | VARCHAR(20) | `'user'` or `'assistant'` |
| `content` | TEXT | Message content |
| `created_at` | TIMESTAMP | |

---

### `student_topic_mastery`
Aggregated per-student, per-topic stats updated after every submission.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID FK → users | |
| `topic` | VARCHAR(50) | Tag from `problems.tags` |
| `solved_count` | INTEGER | |
| `failed_count` | INTEGER | |
| `hint_usage_count` | INTEGER | |
| PK | (user_id, topic) | |

---

### `rating_history`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `contest_id` | UUID FK → contests | |
| `old_rating` | INTEGER | |
| `new_rating` | INTEGER | |
| `rank` | INTEGER | Rank in contest |
| `created_at` | TIMESTAMP | |

Indexed on `user_id` and `contest_id`.

---

### `proctor_events`
Browser integrity events during proctored exams.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `assignment_id` | UUID | (no FK constraint) |
| `problem_id` | UUID | (no FK constraint) |
| `event_type` | VARCHAR(40) | `'tab_switch'`, `'fullscreen_exit'`, `'paste'`, etc. |
| `detail` | TEXT | Additional context |
| `created_at` | TIMESTAMP | |

Indexed on `assignment_id`.

---

### `classrooms`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `faculty_id` | UUID FK → users | |
| `name` | VARCHAR(120) | |
| `department` | VARCHAR(60) | |
| `section` | VARCHAR(20) | |
| `join_code` | VARCHAR(12) UNIQUE | Students use this to enroll |
| `created_at` | TIMESTAMP | |

---

### `classroom_members`

| Column | Type | Notes |
|--------|------|-------|
| `classroom_id` | UUID FK → classrooms | |
| `user_id` | UUID FK → users | |
| `joined_at` | TIMESTAMP | |
| PK | (classroom_id, user_id) | |

---

### `plagiarism_results`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `assignment_id` | UUID FK → assignments | |
| `student_a` | UUID FK → users | |
| `student_b` | UUID FK → users | |
| `similarity` | NUMERIC(5,2) | Similarity score 0–100 |
| `language` | VARCHAR(20) | Language analyzed |
| `ran_at` | TIMESTAMP | |

Indexed on `assignment_id`.

---

### `audit_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users (SET NULL on delete) | |
| `action` | VARCHAR(60) | e.g., `'problem.delete'`, `'marks.export'` |
| `detail` | TEXT | Context |
| `ip` | VARCHAR(64) | Client IP |
| `created_at` | TIMESTAMP | |

Indexed on `created_at DESC`.

---

### MCQ Tables

**`mcq_tests`**: Test metadata (title, category, duration, published flag)  
**`mcq_questions`**: Questions with `options` JSONB array, `correct_index`, marks, topic  
**`mcq_attempts`**: Student attempts with `responses` JSONB and computed score (UNIQUE per student+test)

---

### `coding_profiles`
External platform profile links.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | |
| `platform` | VARCHAR(20) | `'leetcode'`, `'codeforces'`, `'hackerrank'` |
| `handle` | VARCHAR(80) | Username on that platform |
| `solved` | INT | Problems solved |
| `rating` | INT | Current rating |
| `max_rating` | INT | Peak rating |
| `extra` | JSONB | Platform-specific data |
| `sync_status` | VARCHAR(20) | `'pending'`, `'synced'`, `'error'` |
| `last_synced` | TIMESTAMP | |
| UNIQUE | (user_id, platform) | One profile per platform per user |

---

## Data Flow: Submission → Verdict

```
POST /api/submit
  ↓
BullMQ queue (Redis)
  ↓
judge.worker.js
  ↓ reads test_cases (PostgreSQL)
  ↓ sends batch to Judge0
  ↓ polls Judge0 for results
  ↓ evaluates verdict
  ↓ INSERT code_submissions (PostgreSQL)
  ↓ UPSERT student_topic_mastery (PostgreSQL)
  ↓ INSERT contest_submissions if contest (PostgreSQL)
  ↓ emit 'verdict' via Socket.IO (client-side update)
```
