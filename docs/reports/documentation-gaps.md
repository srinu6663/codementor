# Documentation Gaps

This document identifies areas of the codebase that lack sufficient documentation, making onboarding and maintenance harder.

---

## Missing Documentation

### 1. Deployment Guide
**Gap:** There is no `DEPLOYMENT.md` or deployment documentation.  
**What's needed:**
- Step-by-step Docker Compose deployment on a Linux server
- Reverse proxy configuration (Nginx or Caddy example)
- Environment variable reference with valid values
- How to seed initial admin/faculty accounts
- SSL/TLS setup
- How to update the application (rolling restart)
- Backup strategy for PostgreSQL volumes

### 2. Development Setup Guide
**Gap:** The README has a basic startup guide but it omits:
- How to configure the frontend proxy in Vite (`vite.config.ts` proxy setup)
- How to create the first admin user
- How to run Judge0 locally vs. using the Docker Compose version
- How to enable the Gemini AI features (API key setup)
- How to set up JPlag for plagiarism detection (Java required, JAR location)

### 3. Judge0 Configuration Reference
**Gap:** `judge0/judge0.conf` is mounted into the Judge0 container but its contents and purpose are not documented.  
**What's needed:** Document all configuration keys (AUTHN_TOKEN, memory limits, CPU limits, STDOUT_LIMIT, etc.)

### 4. API Error Codes
**Gap:** The API responses include `error: "string"` messages but there is no reference for what error codes or messages to expect per endpoint.

### 5. Permission System Reference
**Gap:** The 7 faculty permissions are defined in `permissions.js` but not documented outside the code.  
**What's needed:** Which routes are guarded by each permission, what the default behavior is, and how an admin grants/revokes them.

### 6. Socket.IO Event Reference
**Gap:** Socket.IO events are defined in `server.js` and `judge.worker.js` but not documented.  
**Status:** Partially covered in `docs/backend/apis.md` as part of this audit.

### 7. Judge0 Language ID Reference
**Gap:** Language IDs (50, 62, 71, etc.) appear throughout the codebase without explanation.  
**Status:** Partially documented in `docs/backend/apis.md`.

### 8. Scoring Mode Behavior
**Gap:** ACM vs. OI scoring behavior is implemented in `judge.worker.js` but not documented for faculty creating problems.  
**What's needed:** A user-facing explanation of when to use each mode and what the UX difference is for students.

### 9. Plagiarism Detection Setup
**Gap:** JPlag requires a Java runtime and the JAR to be present at a specific path. This setup is not documented.  
**What's needed:** How to download JPlag, where to place it, Java version requirements, and expected output format.

### 10. External Coding Profile Sync
**Gap:** `codingPlatforms.js` implements scraping/API calls for LeetCode, Codeforces, and HackerRank but the implementation details, rate limits, and required credentials are not documented.

### 11. Rating Algorithm
**Gap:** The Elo-style rating system in `rating.controller.js` is not documented.  
**What's needed:** The formula used, how K-factor is calculated, when ratings are updated.

### 12. Frontend-Next Migration Plan
**Gap:** There is no document explaining the relationship between `frontend/` and `frontend-next/`, the migration timeline, or what features are planned for `frontend-next/`.

### 13. Database Schema Changes
**Gap:** There is no changelog for database schema changes. New developers cannot tell which features were added when or why certain columns exist.  
**Fix:** When migrating to a proper migration tool, use timestamped migration files that serve as a changelog.

### 14. Test Case Format for ZIP Import
**Gap:** The problem import feature accepts a ZIP file but the expected ZIP structure is not documented.

### 15. Environment Variable: JUDGE0_BATCH_SIZE
**Gap:** `JUDGE0_BATCH_SIZE` appears in `judge.worker.js` but is not listed in `.env.example`.

---

## Partially Documented Systems

| System | Status | Gaps |
|--------|--------|------|
| Auth flow | Partial (README) | 2FA, Google OAuth flow not documented |
| Submission pipeline | Well-covered in code comments | Not in user-facing docs |
| Analytics queries | No docs | Complex SQL queries have no explanations |
| Classroom system | No docs | Join code generation, membership rules |
| Contest scoring | No docs | Penalty calculation rules |
| Virtual participation | No docs | How it differs from real participation |

---

## Code-Level Documentation

The backend code has good inline comments on the most complex systems (judge worker, plagiarism controller). However:

- **No JSDoc** on any controller functions (no parameter/return type documentation)
- **No README** in any `src/` subdirectory
- **Function signatures** for utility functions (`checkerRunner.js`, `judge0Run.js`, `codingPlatforms.js`) lack parameter documentation
