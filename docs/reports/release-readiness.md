# Release Readiness Assessment

**Assessment Date:** 2026-06-22  
**Assessed Against:** First production release at a college institution

---

## Critical Blockers

Issues that MUST be resolved before going live.

### 1. Faculty Assignments and Students routes are broken
**Issue:** `/faculty/assignments` and `/faculty/students` both render `FacultyDashboard` instead of their own pages (`App.tsx:106-107`).  
**Impact:** Faculty cannot navigate to their assignment management page through the sidebar — they must use a workaround.  
**Fix:** Create dedicated `FacultyAssignmentsPage.tsx` and `FacultyStudentsPage.tsx`, or correctly wire existing components.

### 2. No test suite
**Issue:** Zero automated tests exist across all packages.  
**Impact:** Any change to the judge worker, auth flow, or permission system could silently break without detection.  
**Minimum fix:** Write integration tests for: login flow, submission enqueue, verdict delivery, and faculty assignment creation.

### 3. Auth tokens in localStorage (security)
**Issue:** JWTs stored in `localStorage` are vulnerable to XSS attacks.  
**Impact:** A single XSS vulnerability anywhere in the app can steal all user tokens.  
**Fix:** Move refresh token to `httpOnly` cookie. Accept as a known risk if timeline is tight (document it).

### 4. No seeded admin account path
**Issue:** There is no documented way to bootstrap the first admin/faculty user. Registration defaults to `student` role, and there's no admin UI or command to promote a user.  
**Fix:** Document the SQL command (`UPDATE users SET role = 'admin' WHERE email = '...'`) in the deployment guide, or add a seed script.

### 5. TOTP secret stored in plaintext
**Issue:** 2FA secrets are stored unencrypted in the database.  
**Impact:** Database breach exposes all 2FA seeds.  
**Fix:** Before enabling 2FA in production, encrypt secrets at rest.

---

## High Priority Improvements

Important improvements that significantly affect release quality.

### 1. Database index creation
Missing indexes on `code_submissions` will cause slow dashboard loads at any meaningful scale (100+ students).  
```sql
CREATE INDEX ON code_submissions (user_id);
CREATE INDEX ON code_submissions (problem_id);
CREATE INDEX ON code_submissions (submitted_at DESC);
CREATE INDEX ON code_submissions (verdict);
CREATE INDEX ON problems (created_by);
```

### 2. Deployment documentation
No one outside the development team can deploy this without the internal context. A deployment guide is essential before handing off to college IT staff.

### 3. Admin user creation path
Faculty and admin users cannot self-register — they need the `role` field set manually. This needs a clear ops procedure.

### 4. Error monitoring
No error tracking (Sentry or equivalent). In production, errors will be invisible.

### 5. Judge0 health check on startup logs
The startup health check exists (`checkJudge0Health()`), but if Judge0 is down, the application still starts and accepts submissions that will all fail. Consider blocking startup or rate-limiting more aggressively when Judge0 is offline.

### 6. CORS_ORIGIN in production
The `.env.example` has `CORS_ORIGIN=https://YOUR-FRONTEND.vercel.app` but `'*'` is the fallback. Ensure production `.env` has the correct origin set before go-live.

---

## Medium Priority Improvements

Valuable but not blocking release.

### 1. Pagination on leaderboard and submission history
At scale, these queries return all rows — add pagination.

### 2. Analytics caching with Redis
Faculty dashboard analytics (15+ queries per load) should be cached with a 5-minute TTL.

### 3. Replace speakeasy with otplib
`speakeasy` is unmaintained. `otplib` is the community-maintained drop-in replacement.

### 4. Mobile responsiveness audit
The problem solver (Monaco IDE) is not usable on mobile. Document this limitation or add a message.

### 5. Content Security Policy
`contentSecurityPolicy: false` is set in Helmet. Define a real CSP.

### 6. faculty.controller.js split
Break the 1000+ line controller file into smaller, more focused files.

---

## Low Priority Improvements

Nice-to-have; should not delay release.

### 1. Delete App.jsx
`frontend/src/App.jsx` is a dead file alongside `App.tsx`.

### 2. API versioning prefix
Add `/api/v1/` prefix while the breaking changes are still manageable.

### 3. TypeScript on backend
Migrate backend to TypeScript for better maintainability.

### 4. Placement track in database
Move `placementTracks.js` data to a database table.

---

## Release Risks

### Risk 1: Judge0 reliability under load
**Likelihood:** Medium | **Impact:** High  
If the college lab has many students submitting simultaneously, Judge0 may queue up or slow down. The BullMQ retry mechanism helps, but students will experience delays.  
**Mitigation:** Monitor queue depth via Judge Health page; pre-warm Judge0 before exam periods.

### Risk 2: JPlag requires Java on production server
**Likelihood:** Medium | **Impact:** Medium  
Plagiarism detection will silently fail if Java is not installed on the production server or the JAR is missing.  
**Mitigation:** Document the setup; add a startup health check for the JPlag JAR.

### Risk 3: Gemini API key expiry or quota
**Likelihood:** Medium | **Impact:** Low  
AI tutor, code review, and AI test generation all depend on the Gemini API. If the key expires or hits quota, these features degrade.  
**Mitigation:** The code already has mock fallbacks — these will activate. Document this behavior to faculty.

### Risk 4: PostgreSQL volume data loss
**Likelihood:** Low | **Impact:** Critical  
There is no documented backup strategy. A server failure could lose all submissions and user data.  
**Mitigation:** Set up automated daily `pg_dump` backups before going live.

### Risk 5: frontend-next confusion
**Likelihood:** Low | **Impact:** Medium  
A developer could accidentally deploy `frontend-next/` thinking it's the current frontend. It's missing 95% of features.  
**Mitigation:** Add a warning to `frontend-next/README.md`; ensure deployment scripts explicitly reference `frontend/`.

---

## Recommended Release Scope

### Production-Ready Features ✅
- Email/password authentication (with 2FA optional)
- Google OAuth login
- Problem solving: Monaco editor, custom input test run, real-time verdict
- All supported languages (C, C++, Java, Python, JS, TS, Go)
- AI tutor (Socratic), error explanation, code review
- Student dashboard: stats, heatmap, streak, rank, rating
- Problem list: filter, search, navigate
- Faculty problem creation/management (including AI + random test generation)
- Faculty class analytics: topic weakness, timeline, top students, cohort comparison
- At-risk student detection
- Per-student deep-dive
- Assignment creation with deadline
- Student assignment view
- Marks export (CSV)
- Contests: create, register, live scoreboard
- Elo rating system
- Leaderboard
- Classrooms (create, join, view members)
- Plagiarism detection (JPlag)
- MCQ/Aptitude module
- External coding profiles
- 2FA (TOTP)
- Audit logs
- Judge health page
- Proctoring (event logging)

### Needs Additional Work Before Release ⚠️
- `/faculty/assignments` route (broken — renders wrong page)
- `/faculty/students` route (broken — renders wrong page)
- Proctored exam IP enforcement (functional but untested end-to-end)
- PDF export (functional but not user-tested)
- ZIP problem import (functional but no documentation)

### Postpone to v1.1 📋
- `frontend-next/` redesign
- API versioning (`/api/v1/`)
- Backend TypeScript migration
- Full test suite

### Remove from Initial Release 🚫
- Nothing needs to be removed; broken routes are routing bugs, not unusable features

---

## Launch Checklist

### Functionality
- [ ] All major user flows tested manually (student, faculty, admin)
- [ ] Fix `/faculty/assignments` and `/faculty/students` routes
- [ ] Verify submission pipeline end-to-end in production environment
- [ ] Verify Socket.IO works behind the reverse proxy
- [ ] Verify 2FA flow works
- [ ] Verify Google OAuth works in production domain

### Security
- [ ] `CORS_ORIGIN` set to production domain only
- [ ] `JWT_SECRET` and `JWT_REFRESH_SECRET` generated with `openssl rand -hex 32`
- [ ] `NODE_ENV=production` set
- [ ] TLS/HTTPS configured on reverse proxy
- [ ] Database not exposed on public interface
- [ ] Judge0 not exposed on public interface
- [ ] Redis not exposed on public interface
- [ ] Review all environment variables — no default secrets in production

### Performance
- [ ] Database indexes created (especially on code_submissions)
- [ ] Judge0 reachability verified before opening to students
- [ ] Load test with 20+ concurrent submissions

### Monitoring
- [ ] Server logs accessible (Docker logs or log aggregation)
- [ ] Database disk usage monitored
- [ ] Set up automated PostgreSQL backup (pg_dump)

### Deployment
- [ ] Docker Compose `up -d` verified
- [ ] Health check endpoint (`GET /health`) returns 200
- [ ] Frontend served correctly (static files or Vite build)
- [ ] Reverse proxy routing `/api/*` and `/socket.io/*` to backend port 3001
- [ ] First admin user created via SQL

### Documentation
- [ ] Deployment guide written (even internal document)
- [ ] Faculty onboarding guide (how to create problems, assignments)
- [ ] IT support contact for production issues

### Mobile / Accessibility
- [ ] Test on at least one mobile device — document limitations if Monaco is unusable
- [ ] Verify dark mode works across all pages
