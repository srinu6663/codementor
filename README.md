# 🎓 CodeMentor — Intelligent Coding Assessment Platform

> A full-stack coding assessment platform for academic institutions — featuring a Monaco-powered IDE, real-time code execution via Judge0, AI-assisted hints, plagiarism detection, and role-based dashboards for Students, Faculty, and Admins.

---

## 📐 Architecture Overview

```
codementor/
├── frontend/          ← React + Vite app (Monaco Editor, role-based UI)
│   └── src/
│       ├── components/   (editor, problems, auth, dashboard)
│       ├── pages/        (student, faculty, admin)
│       ├── hooks/        (custom React hooks)
│       ├── services/     (API calls)
│       └── store/        (Zustand state management)
├── backend/           ← Node.js + Express API server
│   └── src/
│       ├── routes/       (auth, problems, submissions)
│       ├── controllers/  (business logic)
│       ├── middleware/   (auth, rate limit, error handling)
│       ├── models/       (User, Problem, Submission)
│       ├── services/     (judge, AI, plagiarism)
│       └── config/       (db, redis, env)
├── judge0/            ← Code execution engine (Docker)
│   └── docker-compose.yml
└── docs/              ← Architecture diagrams, API docs
```

---

## 🚀 Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18, Vite, Monaco Editor, Zustand          |
| Backend      | Node.js, Express, JWT, Socket.IO                |
| Database     | PostgreSQL (primary), Redis (cache/sessions)    |
| Code Engine  | Judge0 CE (self-hosted via Docker)              |
| AI Features  | OpenAI API (hints, code review)                 |
| Auth         | JWT + bcrypt, role-based (Student/Faculty/Admin)|
| DevOps       | Docker Compose, GitHub Actions                  |

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/codementor.git
cd codementor
```

### 2. Start Judge0 (Code Execution Engine)

```bash
cd judge0
docker compose up -d
```

Judge0 will be available at `http://localhost:2358`

### 3. Start the Backend

```bash
cd backend
cp .env.example .env     # Fill in your DB, Redis, JWT secrets
npm install
npm run dev
```

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:5173`

---

## 👥 Roles

| Role    | Capabilities                                                           |
|---------|------------------------------------------------------------------------|
| Student | Solve problems, view submissions, get AI hints                        |
| Faculty | Create/manage problems, view student analytics, set contest deadlines  |
| Admin   | Manage users, system settings, plagiarism reports                     |

---

## 📡 API Reference

See [`docs/API.md`](docs/API.md) for full endpoint documentation.

---

## 🗺️ Project Phases

- **Phase 0** ✅ — Environment setup, folder structure, Judge0 running
- **Phase 1** 🔲 — Backend foundation (Auth, DB models, core APIs)
- **Phase 2** 🔲 — Frontend foundation (Monaco editor, routing, auth UI)
- **Phase 3** 🔲 — Judge0 integration (submission pipeline, real-time results)
- **Phase 4** 🔲 — Role dashboards (Student, Faculty, Admin)
- **Phase 5** 🔲 — AI features (hints, code review, plagiarism)
- **Phase 6** 🔲 — Polish, testing, deployment

---

## 📄 License

MIT © CodeMentor Project
