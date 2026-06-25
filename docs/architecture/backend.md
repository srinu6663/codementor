# Backend Architecture

## Overview

The backend is a **Node.js + Express 5** application that serves a REST API and a Socket.IO WebSocket server. It runs a single BullMQ worker for asynchronous code judging.

**Entry point:** `src/server.js`  
**Port:** 3001 (default)

---

## Server Bootstrap Sequence

1. Validate required environment variables (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) — exit if missing
2. Register all Express route modules
3. Configure middleware: Helmet, CORS, JSON body parser (128KB limit), Morgan logging, rate limiter
4. Set `trust proxy 1` for correct IP resolution behind Caddy/Nginx
5. Create HTTP server → attach Socket.IO
6. `httpServer.listen()` → on ready:
   - `db.scaffoldDatabase()` — idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE IF NOT EXISTS` migrations
   - `checkJudge0Health()` — verify Judge0 is reachable

---

## Middleware Stack

| Middleware | File | Purpose |
|-----------|------|---------|
| `helmet` | `server.js` | Security headers (XSS, clickjacking, etc.) |
| `cors` | `server.js` | Allow listed origins from `CORS_ORIGIN` env |
| `express.json` | `server.js` | Parse JSON bodies (128KB limit) |
| `morgan` | `server.js` | HTTP request logging |
| `apiLimiter` | `rateLimiter.js` | Global rate limiter on `/api/*` |
| `protect` | `auth.middleware.js` | JWT verification → sets `req.user` |
| `requireRole` | `role.middleware.js` | Role-based access control |
| `requirePermission` | `permissions.js` | Granular faculty permission check |
| `validateSubmission` | `security.js` | Pre-validation on POST /api/submit |
| `enforceExamIP` | `cidrCheck.js` | Block submission if client IP not in allowed CIDRs |
| `submitBurstLimiter` | `rateLimiter.js` | Short burst limit on submissions |
| `submitSustainedLimiter` | `rateLimiter.js` | Sustained rate limit on submissions |
| `logAction` | `audit.js` | Write to `audit_logs` for sensitive operations |

---

## Authentication System

**Mechanism:** JWT (Bearer tokens)

- **Access Token:** 1-hour expiry, signed with `JWT_SECRET`
- **Refresh Token:** 7-day expiry, signed with `JWT_REFRESH_SECRET`
- **Payload:** `{ id, role, permissions }`
- **Storage:** Client stores both tokens in `localStorage`

**Token resolution:** The `protect` middleware decodes the token and attaches `req.user = { id, role, permissions }` to the request.

**2FA (TOTP):** If a user has `totp_enabled = true`, login returns `{ twofa_required: true, user_id }` instead of tokens. The client must call `/api/2fa/verify` with a TOTP code to receive tokens.

**Google OAuth:** The frontend sends a Google ID token; the backend verifies it with `google-auth-library`, creating or finding the user record.

**Account lockout:** 5 consecutive failed login attempts lock the account for 15 minutes (`locked_until` timestamp).

---

## Database Layer

**Database:** PostgreSQL 16 (via `pg` driver — raw SQL, no ORM)  
**Connection:** Single `Pool` instance in `config/db.js`  
**Schema management:** Idempotent `scaffoldDatabase()` function in `db.js` — runs `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` on startup. This is effectively a migrations-lite system; schema changes are additive only.

### Schema Evolution Pattern
The `scaffoldDatabase()` function has grown incrementally. Each new feature appends `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` calls at the end. This means:
- Safe on fresh databases (creates everything from scratch)
- Safe on existing databases (ALTER IF NOT EXISTS is idempotent)
- Not safe for column renames or type changes (would need manual migration)

---

## Queue Architecture (BullMQ)

**Queue:** `submissions` (Redis-backed via `ioredis`)  
**Worker:** `judge.worker.js` — single worker consuming from the queue

### Submission Flow
```
POST /api/submit
  → validate input (code size, language, UUID format)
  → submissionsQueue.add('judge-submission', jobData, { jobId: uuid })
  → return { jobId }

Judge Worker (async):
  → Fetch test cases from PostgreSQL
  → Fetch problem metadata (scoring mode, checker config)
  → Split test cases into batches of BATCH_SIZE (default 20)
  → For each batch: POST /submissions/batch to Judge0
  → Poll /submissions/batch until all tokens have terminal status (id > 2)
  → Compare output (or invoke checker program)
  → Calculate verdict and score
  → INSERT into code_submissions
  → UPDATE student_topic_mastery
  → Optionally INSERT into contest_submissions
  → Emit 'verdict' event via Socket.IO to job room
```

### Error Handling
- `QueueFullError`: Judge0 returns 503 → BullMQ retries up to 3 times → client notified via `judging_retry` socket event
- Network errors: mapped to user-friendly messages via `friendlyJudgeError()`
- Failed jobs: emits `'verdict'` with `{ success: false, error: <friendly message> }`

---

## Socket.IO Architecture

**Transport:** WebSocket with polling fallback  
**Pattern:** Job rooms

1. Client submits code → receives `jobId`
2. Client emits `socket.join(jobId)` to subscribe to that job's room
3. Worker completes job → `io.to(jobId).emit('verdict', result)`
4. Client leaves room after receiving verdict

For contests, a second pattern is used:
- Worker emits `scoreboard_update` to room `contest:{contestId}`
- Scoreboard viewers join that room on mount

---

## Controllers

| Controller | File | Responsibility |
|-----------|------|----------------|
| Auth | `auth.controller.js` | Register, login, refresh, Google OAuth |
| Problems | `problems.controller.js` | Public problem CRUD, adjacent navigation |
| Faculty | `faculty.controller.js` | Problem CRUD (faculty), assignments, analytics, student management, AI tests |
| Student | `student.controller.js` | Dashboard stats, leaderboard, placement track, recommendations |
| AI | `ai.controller.js` | Gemini tutor, error explanation, code review |
| Contest | `contest.controller.js` | Contest CRUD, registration, scoreboard |
| Plagiarism | `plagiarism.controller.js` | JPlag execution, results storage and retrieval |
| MCQ | `mcq.controller.js` | MCQ test CRUD, student attempts |
| Classroom | `classroom.controller.js` | Classroom CRUD, membership management |
| Proctor | `proctor.controller.js` | Log and retrieve proctoring events |
| 2FA | `twofa.controller.js` | TOTP setup (QR), verification |
| Profiles | `profiles.controller.js` | External coding profile link/sync |
| Rating | `rating.controller.js` | Elo rating recalculation after contests |
| PDF Export | `pdfExport.controller.js` | Assignment report PDF generation |
| Problem Import | `problemImport.controller.js` | Bulk import from ZIP |
| Judge Health | `judgeHealth.controller.js` | Judge0 status, supported languages |

---

## Third-Party Service Integrations

### Judge0 CE
- **Communication:** HTTP REST API (axios)
- **Endpoints used:** `POST /submissions/batch`, `GET /submissions/batch`, `POST /submissions` (single)
- **Auth:** Optional `X-Auth-Token` header matching `AUTHN_TOKEN` in `judge0.conf`
- **Network isolation:** Judge0 is only reachable from the backend container via Docker internal DNS

### Google Gemini
- **Library:** `@google/genai`
- **Model:** `gemini-2.5-flash`
- **Uses:** AI tutor, error explanation, code review, test case generation
- **Graceful degradation:** All Gemini calls fall back to mock responses if `GEMINI_API_KEY` is not set

### Google OAuth
- **Library:** `google-auth-library`
- **Flow:** Frontend sends Google ID token → backend verifies with `OAuth2Client.verifyIdToken()`

### JPlag
- **Communication:** `child_process.execFile()` — spawns the JPlag JAR as a subprocess
- **Requirements:** Java runtime must be available; JAR must be at `JPLAG_JAR_PATH`
- **Output:** JPlag writes a CSV file to a temp directory; backend parses it

---

## Security Measures

1. **Helmet** security headers on all routes
2. **Rate limiting**: Global API limiter + burst + sustained limiters on `/api/submit`
3. **JWT secret rotation**: Separate secrets for access and refresh tokens
4. **Account lockout**: Fail2ban-style after 5 failed logins
5. **Code size limit**: 64KB max on submitted source code
6. **Input size limit**: 8KB max on custom test input
7. **Language allowlist**: Only specific Judge0 language IDs accepted
8. **UUID format validation**: All resource IDs validated with regex
9. **Output truncation**: Judge0 output capped at 64KB before DB insert
10. **CIDR enforcement**: Exam submissions rejected from non-whitelisted IPs
11. **Audit logging**: Sensitive operations logged to `audit_logs` with IP
12. **SQL injection prevention**: Parameterized queries throughout (no string interpolation)
13. **Probe protection**: Test case inputs/outputs only returned for `is_public = true` tests

---

## Deployment

The production setup uses Docker Compose (`docker-compose.yml`) with the backend binding only to `127.0.0.1:3001`. A reverse proxy (Caddy or Nginx) is expected to:
- Terminate TLS
- Serve the frontend static files
- Proxy `/api/*` and `/socket.io/*` to `127.0.0.1:3001`
