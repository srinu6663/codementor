# Technical Debt Report

Severity: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## Architecture Issues

### 🔴 Database migrations via scaffoldDatabase()
**What:** Schema management is done by running idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on every server startup.  
**Why it's a problem:** Cannot handle column renames, type changes, index modifications, or data migrations. As the schema grows, the function is already 430+ lines long. Column order isn't guaranteed. Cannot roll back.  
**Fix:** Replace with a proper migration tool (Flyway, Knex migrations, or Drizzle ORM).

### 🟠 No test suite anywhere
**What:** Zero test files exist in any of the three packages.  
**Why it's a problem:** Every refactor is blind. Judge worker logic, permission resolution, contest scoring, rating calculation — all business-critical, all untested.  
**Fix:** Start with unit tests for `judge.worker.js`, `permissions.js`, and `rating.controller.js` (most critical business logic). Add integration tests for the submission pipeline.

### 🟠 Auth state stored in localStorage
**What:** `accessToken`, `refreshToken`, and the full `user` object are stored in `localStorage`.  
**Why it's a problem:** XSS vulnerability — malicious scripts can steal tokens. Industry best practice is `httpOnly` cookies for refresh tokens.  
**Fix:** Move refresh token to a `httpOnly`, `Secure`, `SameSite=Strict` cookie. Keep access token in memory (or short-lived sessionStorage).

### 🟠 Two parallel frontends with no clear migration path
**What:** `frontend/` (production) and `frontend-next/` (redesign, 10% done) coexist in the repo with no documented timeline or cutover plan.  
**Why it's a problem:** Maintenance burden on both; features added to `frontend/` need to be re-implemented in `frontend-next/`. `frontend-next/` cannot be deployed.  
**Fix:** Document a phased migration plan. Either accelerate `frontend-next/` to parity, or defer until post-MVP.

### 🟡 Backend is plain JavaScript (no TypeScript)
**What:** All backend files are `.js` with no type annotations.  
**Why it's a problem:** DB query results are untyped objects; controller parameters have no validation at the type layer; refactors are risky.  
**Fix:** Migrate backend to TypeScript incrementally, starting with `config/db.js` and the worker.

---

## Security Concerns

### 🟠 TOTP secret stored in plaintext
**What:** `users.totp_secret` is stored as plain text in PostgreSQL.  
**Why it's a problem:** If the database is compromised, all 2FA secrets are exposed, defeating 2FA entirely.  
**Fix:** Encrypt TOTP secrets at rest (AES-256 with a key stored in env vars, or use database-level encryption).

### 🟠 speakeasy is unmaintained (2FA library)
**What:** The `speakeasy` package has not been updated since 2018.  
**Why it's a problem:** No security patches; known vulnerability risk accumulates over time.  
**Fix:** Replace with `otplib` (actively maintained, TypeScript-native).

### 🟡 proctor_events has no FK constraints on assignment_id/problem_id
**What:** The `proctor_events` table stores `assignment_id` and `problem_id` as UUID columns without foreign key constraints.  
**Why it's a problem:** Orphaned proctor events accumulate and can't be cleaned up reliably. Inconsistency between tables.  
**Fix:** Add FK constraints with `ON DELETE SET NULL`.

### 🟡 No CSP (Content Security Policy)
**What:** `helmet()` is configured with `contentSecurityPolicy: false`.  
**Why it's a problem:** Without CSP headers, XSS attacks can exfiltrate data or hijack sessions.  
**Fix:** Define a CSP that allows the application's resources (self, Monaco CDN, KaTeX CDN).

### 🟡 No CSRF protection
**What:** The API uses Bearer token auth (not cookies), so traditional CSRF is lower risk, but if refresh tokens move to cookies, CSRF protection becomes necessary.  
**Why it's a problem:** Future-proofing; and some endpoints could be triggered cross-origin.  
**Fix:** Add `csurf` or `SameSite=Strict` on session cookies when/if cookies are adopted.

---

## Performance Issues

### 🟡 No database query optimizations / missing indexes
**What:** Most analytics queries do full table scans on `code_submissions`, `users`, and `problems`.  
**Why it's a problem:** At scale (10,000+ submissions), `getClassAnalytics()` runs 10+ sequential complex queries — this will be very slow.  
**Recommended indexes:**
```sql
CREATE INDEX code_submissions_user_problem ON code_submissions (user_id, problem_id);
CREATE INDEX code_submissions_submitted ON code_submissions (submitted_at DESC);
CREATE INDEX code_submissions_verdict ON code_submissions (verdict);
CREATE INDEX problems_difficulty ON problems (difficulty);
CREATE INDEX problems_created_by ON problems (created_by);
```

### 🟡 No caching layer for analytics
**What:** Faculty dashboard analytics runs 15+ PostgreSQL queries on every page load.  
**Why it's a problem:** Redis is already in the stack but used only for BullMQ. Analytics could be cached.  
**Fix:** Cache `getClassAnalytics()` results in Redis with a 5-minute TTL.

### 🟡 Monaco Editor not lazy-loaded
**What:** `@monaco-editor/react` is a large bundle (~3MB). It's always loaded on the problem solving page.  
**Why it's a problem:** Slow initial page load even when the user just wants to read the problem.  
**Fix:** It's already used inside its own page; confirm it's in a code-split chunk (Vite should handle this automatically with dynamic imports in the route).

---

## Maintainability Concerns

### 🟠 faculty.controller.js is 1000+ lines
**What:** The faculty controller handles problem CRUD, assignment management, student analytics, AI test generation, random test generation, test heatmap, cohort analytics, student detail, and marks export — all in one file.  
**Why it's a problem:** Very hard to navigate, test, or split work between contributors.  
**Fix:** Split into `problemController.js`, `assignmentController.js`, `analyticsController.js`, `aiTestController.js`.

### 🟡 scaffoldDatabase() is 430+ lines and growing
**What:** Every feature appends more `ALTER TABLE` calls to the single function.  
**Why it's a problem:** Will eventually become unmaintainable. New developers can't understand schema history.  
**Fix:** See migration tool recommendation above.

### 🟡 No API versioning
**What:** All routes are under `/api/` with no version prefix.  
**Why it's a problem:** Breaking API changes would affect all clients simultaneously.  
**Fix:** Add `/api/v1/` prefix now (while the codebase is small) to allow future `/api/v2/` changes.

### 🟡 hardcoded placement track data
**What:** Placement track definitions are in `config/placementTracks.js` — static data in code.  
**Why it's a problem:** Adding a new company track requires a code change and deployment.  
**Fix:** Move to a database table or admin-editable config.

### 🟢 App.jsx exists alongside App.tsx
**What:** Both `frontend/src/App.jsx` and `App.tsx` exist. Only `App.tsx` is used.  
**Fix:** Delete `App.jsx`.

---

## Scalability Concerns

### 🟡 Single BullMQ worker
**What:** One worker process handles all code submissions.  
**Why it's a problem:** On a busy instance, a 30-test-case problem takes ~15 seconds per submission. Under load, the queue backs up.  
**Fix:** Run multiple worker replicas (BullMQ supports this naturally — multiple workers on the same queue). Or add worker count scaling via environment variable.

### 🟡 Judge0 batch size hardcoded at 20
**What:** `JUDGE0_BATCH_SIZE = 20` is the default. If Judge0's API allows larger batches, this limits throughput.  
**Why it's a problem:** Configurable via env but not documented prominently.  
**Note:** This is already environment-configurable; just needs documentation.

### 🟡 All students in one leaderboard
**What:** The leaderboard queries ALL students without pagination.  
**Why it's a problem:** At 1000+ students, this query and response could be large.  
**Fix:** Add `LIMIT` + `OFFSET` pagination, or use cursor-based pagination.

---

## Accessibility Issues

### 🟡 No accessibility audit performed
**What:** No a11y testing has been done.  
**Known gaps:**
- Color alone used to indicate verdict (colorblind users affected)
- Monaco Editor has accessibility mode but it's not enabled
- Charts (Recharts) have no ARIA descriptions
- No skip-to-content link

### 🟡 No keyboard navigation testing
**What:** The problem solver's split-pane layout and AI tutor sidebar may have focus trapping issues.
