# Repository Overview

## Project Identity

**Internal name:** CodeMentor / CodeSphere  
**Type:** Full-stack monorepo  
**Purpose:** Intelligent coding assessment platform for academic institutions

---

## Repository Structure

```
codementor/
├── backend/                  ← Node.js + Express REST API + Socket.IO
│   ├── src/
│   │   ├── config/           ← db.js, io.js, queue.js, judge0Health.js, placementTracks.js
│   │   ├── controllers/      ← Business logic handlers
│   │   ├── middleware/        ← auth, audit, cidrCheck, permissions, rateLimiter, role, security
│   │   ├── routes/           ← Express route declarations
│   │   ├── utils/            ← checkerRunner.js, codingPlatforms.js, judge0Run.js
│   │   ├── workers/          ← judge.worker.js (BullMQ)
│   │   └── scripts/          ← seed.js
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                 ← React 18 + Vite + Tailwind + shadcn/ui (PRIMARY frontend)
│   └── src/
│       ├── components/       ← auth, dashboard, layout, problem, ui (shadcn)
│       ├── hooks/            ← useProctor.ts
│       ├── lib/              ← api.ts, exportCsv.ts, utils.ts
│       ├── pages/            ← All application pages
│       └── styles/           ← CSS files
│
├── frontend-next/            ← Next.js 16 + MUI v6 (in-progress redesign)
│   └── src/
│       ├── app/              ← Next.js App Router pages
│       ├── components/       ← auth, shell, ui primitives
│       ├── lib/              ← api.ts, auth.ts, socket.ts, types.ts
│       └── theme/            ← ThemeRegistry, theme.ts, tokens.ts
│
├── judge0/                   ← Judge0 CE configuration
│   └── judge0.conf           ← Execution limits, auth token, CORS settings
│
├── deploy/                   ← Deployment scripts / configs
│
├── docker-compose.yml        ← Full production compose (all services)
├── .env.example              ← Environment variable template
└── README.md
```

---

## Applications

### 1. `backend/` — Express API Server
- **Runtime:** Node.js 18+, Express 5
- **Port:** 3001 (configurable via `PORT` env)
- **Protocol:** HTTP REST + Socket.IO WebSocket
- **Database:** PostgreSQL 16 via `pg` driver (raw SQL, no ORM)
- **Queue:** BullMQ backed by Redis (submission job queue)
- **Process model:** Single process with one BullMQ worker thread

### 2. `frontend/` — Primary React Frontend
- **Framework:** React 18 + Vite 5
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **State:** localStorage for auth tokens; no global state library (Zustand referenced in README but not installed)
- **Editor:** Monaco Editor (via `@monaco-editor/react`)
- **Charts:** Recharts
- **Status:** Feature-complete, in active use

### 3. `frontend-next/` — Redesign (In Progress)
- **Framework:** Next.js 16 + React 19
- **Styling:** MUI v6 (Material 3) + Emotion
- **Routing:** Next.js App Router
- **Status:** Foundation and Problem List pages done; all other pages pending
- **Note:** This is a from-scratch rebuild of `frontend/`; the original is still the deployed version

### 4. `judge0/` — Code Execution Engine
- **Image:** `judge0/judge0:1.13.1` (self-hosted Docker)
- **Internal URL:** `http://judge0_server:2358` (not exposed to host)
- **Components:** HTTP server + worker process, dedicated PostgreSQL 13 + Redis 7

---

## Docker Architecture

The project uses Docker Compose with **two isolated bridge networks**:

| Network | Services |
|---------|----------|
| `app_net` | backend, app_db (PostgreSQL 16), app_redis (Redis 7) |
| `judge0_net` | judge0_server, judge0_worker, judge0_db (PostgreSQL 13), judge0_redis |

The backend container spans **both networks** — it is the only service that can reach Judge0. Judge0 is not reachable from the host or the frontend.

```
Browser → Frontend → Backend (app_net + judge0_net)
                         ↓
                    Judge0 Server (judge0_net only)
                         ↓
                    Judge0 Worker
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Access token signing key |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token signing key |
| `REDIS_URL` | ✅ | Redis connection URL (BullMQ) |
| `JUDGE0_URL` | ✅ | Internal Judge0 base URL |
| `CORS_ORIGIN` | — | Comma-separated allowed origins |
| `PORT` | — | Server port (default 3001) |
| `GEMINI_API_KEY` | — | Google AI Studio key for AI tutor |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `JUDGE0_AUTH_TOKEN` | — | Judge0 AUTHN_TOKEN (if configured) |
| `JUDGE0_BATCH_SIZE` | — | Max test cases per Judge0 batch call (default 20) |
| `JPLAG_JAR_PATH` | — | Path to JPlag JAR for plagiarism detection |
| `JPLAG_THRESHOLD` | — | Similarity threshold 0–1 (default 0.70) |
| `JAVA_BIN` | — | Java binary path for running JPlag |

**Frontend (Vite):**

| Variable | Description |
|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## Build Systems

| Layer | Tool | Command |
|-------|------|---------|
| Backend | npm / nodemon | `npm run dev` / `npm start` |
| Frontend | Vite 5 | `npm run dev` / `npm run build` |
| Frontend-Next | Next.js 16 | `npm run dev` / `npm run build` |
| Container | Docker Compose | `docker compose up -d` |

---

## External Integrations

| Integration | Purpose | Library |
|-------------|---------|---------|
| Judge0 CE | Code execution & judging | axios (HTTP calls) |
| Google Gemini 2.5 Flash | AI tutor, code review, test generation | `@google/genai` |
| Google OAuth 2.0 | Social login | `google-auth-library` |
| JPlag | Plagiarism detection | `child_process` (execFile) |
| LeetCode / Codeforces / HackerRank | External coding profile sync | `codingPlatforms.js` util |
| Socket.IO | Real-time verdict delivery | `socket.io` / `socket.io-client` |

---

## CI/CD

A GitHub Actions workflow is referenced in the README but no `.github/` directory is present in the repository. CI/CD is not yet implemented.

The `deploy/` directory exists but its contents are not detailed in this audit.
