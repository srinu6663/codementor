# CodeMentor — Architecture Notes

## System Overview

CodeMentor is a multi-role coding assessment platform with four core subsystems:

1. **Frontend** (React + Vite + Monaco Editor)
2. **Backend** (Node.js + Express REST API)
3. **Code Execution Engine** (Judge0 CE, self-hosted)
4. **Database Layer** (PostgreSQL + Redis)

## Request Flow: Code Submission

```
Student clicks "Run" in Monaco Editor
        │
        ▼
  Frontend (React)
  POST /api/submissions
        │
        ▼
  Backend (Express)
  → Validates JWT token
  → Saves submission to PostgreSQL
  → Forwards code + language to Judge0
        │
        ▼
  Judge0 Worker (Docker container)
  → Sandboxed execution (CPU/memory limits)
  → Returns: verdict, stdout, stderr, time, memory
        │
        ▼
  Backend stores result + emits via Socket.IO
        │
        ▼
  Frontend receives real-time result
  → Displays verdict, output, runtime stats
```

## Role Hierarchy

```
Admin
  └── Faculty
        └── Student
```

- **Admin**: Full system access, user management, analytics
- **Faculty**: Create/manage problems, view class analytics, export reports
- **Student**: Solve problems, view own submissions, receive AI hints

## Database Schema (conceptual)

```
Users          Problems         Submissions
─────          ────────         ───────────
id             id               id
email          title            user_id → Users
password_hash  description      problem_id → Problems
role           difficulty       language_id
name           test_cases[]     source_code
created_at     time_limit       status (AC/WA/TLE/MLE/RE)
               memory_limit     judge0_token
               created_by       stdout
                                stderr
                                runtime
                                memory
                                submitted_at
```

## Ports (Development)

| Service       | Port  |
|---------------|-------|
| Frontend      | 5173  |
| Backend API   | 3001  |
| Judge0 API    | 2358  |
| PostgreSQL    | 5432  |
| Redis         | 6379  |
