# Feature Inventory

## Status Legend
- ✅ **Complete** — Implemented end-to-end, tested
- 🟡 **Partial** — Backend done, frontend incomplete (or vice versa)
- 🔲 **Stub** — Route/UI exists but logic is missing
- ❌ **Broken** — Known regression or bug

---

## Authentication & Account Management

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Email/password registration | ✅ | `auth.controller.js`, `RegisterPage.tsx` | Academic metadata (dept/section/year/roll_no) optional |
| Email/password login | ✅ | `auth.controller.js`, `LoginPage.tsx` | |
| JWT access + refresh tokens | ✅ | `auth.controller.js`, `api.ts` | Access: 1h, Refresh: 7d; auto-refresh on 401 |
| Account lockout (fail2ban) | ✅ | `auth.controller.js` | 5 failed attempts → 15-minute lockout |
| Google OAuth login | ✅ | `auth.controller.js` | `google-auth-library` verifies ID token |
| Two-Factor Auth (TOTP) | ✅ | `twofa.controller.js`, `TwoFactorSetup.tsx` | QR code setup via `speakeasy` + `qrcode` |
| Role-based routing guards | ✅ | `App.tsx` | `RequireAuth`, `RequireFaculty`, `RequireAdmin` |
| Permission system (JSONB) | ✅ | `permissions.js` | 7 granular faculty permissions |
| Profile page | 🟡 | `ProfilePage.tsx` | Page exists; edit profile form incomplete |

---

## Problem Management

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Problem creation (faculty) | ✅ | `faculty.controller.js`, `FacultyProblems.tsx` | Title, description (Markdown), difficulty, tags, stubs, test cases |
| Problem editing | ✅ | `faculty.controller.js` | Ownership-checked (created_by) |
| Problem deletion | ✅ | `faculty.controller.js` | Cascade-deletes test cases |
| Problem list (student) | ✅ | `problems.controller.js`, `ProblemListPage.tsx` | Filter by difficulty/tag; search by title |
| Problem detail + public tests | ✅ | `problems.controller.js`, `ProblemSolvingPage.tsx` | |
| Language stubs (starter code) | ✅ | `faculty.controller.js` | JSONB map: `language_id → code` |
| ACM / OI scoring modes | ✅ | `judge.worker.js` | ACM = binary; OI = partial per test case |
| Editorial with scheduled unlock | ✅ | `problems.controller.js` | `editorial_visible_at` timestamp |
| AI test case generation | ✅ | `faculty.controller.js` | Gemini 2.5 Flash generates 15 edge cases |
| Randomized test generation | ✅ | `faculty.controller.js` | Generator + reference solution run on Judge0 |
| Custom checker (special judge) | ✅ | `judge.worker.js`, `checkerRunner.js` | Faculty provides checker code |
| Problem import from ZIP | ✅ | `problemImport.controller.js` | Bulk import structure |
| Test case heatmap (faculty) | ✅ | `faculty.controller.js` | Per-test-case fail rates across all students |
| Adjacent problem navigation | ✅ | `problems.controller.js` | Prev/next problem IDs |

---

## Code Execution (Judging)

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Submit to Judge0 via queue | ✅ | `submissions.routes.js`, `judge.worker.js` | BullMQ queue; batch API |
| Supported languages | ✅ | `submissions.routes.js` | C, C++ (multiple), Java, Python3, JS, TypeScript, Go |
| Real-time verdict via Socket.IO | ✅ | `judge.worker.js`, `server.js` | Job room pattern; client joins by jobId |
| Custom input (test run) | ✅ | `judge.worker.js` | Single-run, no DB persistence |
| Language time/memory multipliers | ✅ | `judge.worker.js` | C/C++=1×, Java=2×, Python/JS=3× |
| 64KB code size limit | ✅ | `submissions.routes.js` | Validated before queue |
| Output truncation (64KB cap) | ✅ | `judge.worker.js` | `capOutput()` on all Judge0 output fields |
| Retry on judge queue full | ✅ | `judge.worker.js` | BullMQ retries (max 3); notifies client |
| Hidden test case protection | ✅ | `judge.worker.js` | Input/expected only in result for public tests |
| Contest submission tracking | ✅ | `judge.worker.js` | Writes to `contest_submissions`, emits scoreboard update |
| Topic mastery update on submit | ✅ | `judge.worker.js` | Upserts `student_topic_mastery` per tag |

---

## AI Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Socratic AI tutor (chat) | ✅ | `ai.controller.js`, `AITutorSidebar.tsx` | Conversation history persisted per user/problem |
| Error explanation | ✅ | `ai.controller.js` | Plain-English error trace explanation |
| Code review | ✅ | `ai.controller.js`, `CodeReviewPanel.tsx` | Quality score, complexity, code smells |
| AI test case generation | ✅ | `faculty.controller.js` | 15 edge cases for a given problem |
| Mock responses when no API key | ✅ | `ai.controller.js` | Graceful degradation |
| Model | ✅ | `ai.controller.js` | `gemini-2.5-flash` |

---

## Assignments & Exams

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Create assignment with deadline | ✅ | `faculty.controller.js` | |
| Link problems to assignment | ✅ | `faculty.controller.js` | `assignment_problems` junction table |
| Proctored exam mode (IP lock) | ✅ | `faculty.controller.js`, `cidrCheck.js` | CIDR whitelist; validated on submit |
| Proctor event logging | ✅ | `proctor.controller.js`, `useProctor.ts` | Tab switch, fullscreen exit, paste events |
| Student progress grid | ✅ | `faculty.controller.js` | Per-student, per-problem solved/not matrix |
| Export marks CSV | ✅ | `faculty.controller.js` | Roll No, Name, Email, Dept, Section, Score, Solved At, Plagiarism Flag |
| Assignment submissions view | ✅ | `faculty.controller.js` | |
| Faculty assignments page | 🔲 | `App.tsx:106` | Route `/faculty/assignments` renders FacultyDashboard — no dedicated page |

---

## Contests

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Create contest with time window | ✅ | `contest.controller.js` | |
| Add problems to contest | ✅ | `contest.controller.js` | With sort_order |
| Student registration | ✅ | `contest.controller.js` | |
| Live scoreboard | ✅ | `contest.controller.js` | Socket.IO `scoreboard_update` event |
| Scoreboard modes (public/frozen/hidden) | ✅ | `contest.controller.js` | `freeze_at` timestamp for frozen mode |
| Penalty calculation | ✅ | `contest.controller.js` | Penalty minutes tracked |
| Virtual participation | ✅ | `contest.controller.js` | `virtual_participations` table |
| Elo rating recalculation | ✅ | `rating.controller.js` | Post-contest; stored in `rating_history` |

---

## Analytics & Dashboards

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Student personal dashboard | ✅ | `student.controller.js`, `StudentDashboard.tsx` | Stats, streak, rank, rating, heatmap, topic mastery radar |
| Submission heatmap (12 months) | ✅ | `student.controller.js` | GitHub-style calendar |
| Recommended problems | ✅ | `student.controller.js` | Based on topic mastery |
| Faculty dashboard aggregate stats | ✅ | `faculty.controller.js` | |
| Topic weakness heatmap | ✅ | `faculty.controller.js` | Class-wide most-failed topics |
| Submission timeline (30 days) | ✅ | `faculty.controller.js` | |
| Top students chart | ✅ | `faculty.controller.js` | |
| Verdict distribution pie | ✅ | `faculty.controller.js` | |
| Topic mastery radar (class) | ✅ | `faculty.controller.js` | |
| Cohort comparison (dept/section) | ✅ | `faculty.controller.js` | Average problems solved by cohort |
| Weekly trend chart | ✅ | `faculty.controller.js` | 12-week submission + AC rate trend |
| Score distribution histogram | ✅ | `faculty.controller.js` | Buckets: 0, 1–2, 3–5, etc. |
| Submission heatmap (day×hour) | ✅ | `faculty.controller.js` | Activity time pattern |
| Language distribution | ✅ | `faculty.controller.js` | |
| Auto-generated text insights | ✅ | `faculty.controller.js` | Plain-language callouts |
| At-risk student detection | ✅ | `faculty.controller.js` | 14-day inactivity OR <30% AC rate |
| Per-student deep-dive | ✅ | `faculty.controller.js`, `StudentDetailModal.tsx` | Learning curve, topic radar, verdict mix |
| Cohort topic radar | ✅ | `faculty.controller.js` | Compare dept/section across topics |
| Test case fail heatmap (per problem) | ✅ | `faculty.controller.js` | |

---

## Classrooms

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Create classroom with join code | ✅ | `classroom.controller.js` | 12-char unique code |
| Student join by code | ✅ | `classroom.controller.js` | |
| View classroom members | ✅ | `classroom.controller.js` | |
| Faculty classroom management UI | ✅ | `FacultyClassesPage.tsx` | |
| Student classroom UI | ✅ | `StudentClassesPage.tsx` | |

---

## MCQ / Aptitude Module

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Create MCQ test | ✅ | `mcq.controller.js`, `FacultyMcqPage.tsx` | |
| Add questions with options | ✅ | `mcq.controller.js` | JSONB options, `correct_index` |
| Publish test | ✅ | `mcq.controller.js` | `is_published` flag |
| Student take test | ✅ | `mcq.controller.js`, `AptitudePage.tsx` | `mcq_attempts` table; one attempt per student |
| View attempt results | 🟡 | `mcq.controller.js` | Backend done; results UI may be basic |

---

## External Coding Profiles

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Link LeetCode/Codeforces/HackerRank | ✅ | `profiles.controller.js`, `CodingProfilesPage.tsx` | |
| Sync profile stats | ✅ | `codingPlatforms.js` | Scrapes/fetches external platform data |
| View linked profiles | ✅ | `CodingProfilesPage.tsx` | |

---

## Placement Track

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Curated track definitions | ✅ | `placementTracks.js` | Company-tagged problem sets |
| Student placement track page | ✅ | `PlacementTrackPage.tsx` | |

---

## Plagiarism Detection

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Run JPlag analysis | ✅ | `plagiarism.controller.js` | Requires Java + JPlag JAR |
| View similarity network graph | ✅ | `PlagiarismNetworkGraph.tsx` | D3-style visualization |
| View code diff of suspicious pair | ✅ | `PlagiarismDiffModal.tsx` | Side-by-side comparison |
| Plagiarism flag in CSV export | ✅ | `faculty.controller.js` | |
| Per-assignment plagiarism overview | ✅ | `FacultyPlagiarismOverview.tsx` | |
| Language support | ✅ | `plagiarism.controller.js` | Java, Python, JS, TS, C, C++ |

---

## System Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Rate limiting (API) | ✅ | `rateLimiter.js` | Burst + sustained limiters on `/api/submit` |
| Audit log | ✅ | `audit.js`, `AuditLogPage.tsx` | Sensitive actions logged with IP |
| Judge0 health monitor | ✅ | `judgeHealth.controller.js`, `JudgeHealthPage.tsx` | Language list, queue depth |
| PDF export (assignment report) | ✅ | `pdfExport.controller.js` | `pdfkit` |
| Helmet security headers | ✅ | `server.js` | |
| Leaderboard | ✅ | `student.controller.js`, `LeaderboardPage.tsx` | Filter by cohort |
| Dark mode | ✅ | `ThemeToggle.tsx` | `next-themes` |
| Error boundary | ✅ | `ErrorBoundary.tsx` | Wraps entire React app |
| 404 page | ✅ | `NotFoundPage.tsx` | |

---

## Known Issues / Bugs

| Issue | Severity | Location |
|-------|----------|----------|
| `/faculty/assignments` and `/faculty/students` render `FacultyDashboard` | High | `App.tsx:106-107` |
| Auth state stored in `localStorage` (XSS risk) | Medium | `App.tsx`, `api.ts` |
| No test suite in any package | High | All packages |
| `frontend-next/` is an incomplete rebuild; not deployable | Medium | `frontend-next/` |
| `App.jsx` exists alongside `App.tsx` (dead file) | Low | `frontend/src/App.jsx` |
