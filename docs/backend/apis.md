# API Documentation

**Base URL:** `/api`  
**Authentication:** `Authorization: Bearer <accessToken>` header  
**Response format:** `{ success: boolean, data?: any, error?: string }`

---

## Auth — `/api/auth`

### POST `/api/auth/register`
Register a new user.

**Auth:** None  
**Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "student | faculty (default: student)",
  "department": "string?",
  "section": "string?",
  "year": "number? (1–6)",
  "roll_no": "string?"
}
```
**Response 201:**
```json
{
  "success": true,
  "user": { "id": "uuid", "name": "...", "email": "...", "role": "..." },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

### POST `/api/auth/login`
Authenticate a user.

**Auth:** None  
**Body:**
```json
{ "email": "string", "password": "string" }
```
**Response 200 (normal):**
```json
{
  "success": true,
  "user": { "id": "uuid", "name": "...", "email": "...", "role": "...", "permissions": {} },
  "accessToken": "...",
  "refreshToken": "..."
}
```
**Response 200 (2FA required):**
```json
{ "success": true, "twofa_required": true, "user_id": "uuid" }
```
**Response 403:** Account locked — includes remaining minutes.

---

### POST `/api/auth/refresh`
Exchange a refresh token for a new access token.

**Auth:** None  
**Body:** `{ "refreshToken": "string" }`  
**Response:** `{ "success": true, "accessToken": "..." }`

---

## Submissions — `/api`

### POST `/api/submit`
Enqueue a code submission for judging.

**Auth:** Optional (anonymous submissions tracked without user_id)  
**Rate limit:** Burst + sustained limiter  
**Body:**
```json
{
  "source_code": "string (max 64KB)",
  "language_id": "number (allowed: 50,51,52,54,62,63,71,72,73,74,75,76)",
  "problem_id": "UUID",
  "custom_input": "string? (max 8KB, for test run only)",
  "contest_id": "UUID? (links submission to contest)"
}
```
**Response 200:**
```json
{ "success": true, "jobId": "uuid", "message": "Submission queued successfully" }
```
**Response 503:** Judge or queue offline.

**Supported language IDs:**
| ID | Language |
|----|---------|
| 50 | C (GCC 9.2) |
| 51 | C++ (GCC 7.4) |
| 52 | C++ (GCC 8.3) |
| 54 | C++ (GCC 9.2) |
| 62 | Java (OpenJDK 13) |
| 63 | JavaScript (Node 12) |
| 71 | Python 3 (3.8) |
| 72 | Python 3 (3.11) |
| 73 | TypeScript (3.7) |
| 74 | TypeScript (5.0) |
| 75 | Go (1.18) |
| 76 | C++ (GCC 14.1) |

---

### GET `/api/submit/history/:problemId`
Per-problem submission history for the authenticated user.

**Auth:** Optional  
**Response:** `{ "success": true, "data": [{ id, verdict, language, runtime, memory, submitted_at, code }] }`  
**Limit:** Last 20 submissions

---

### GET `/api/submissions`
Full submission history.

**Auth:** Optional  
**Response:** `{ "success": true, "data": [{ id, verdict, language, runtime, memory, submitted_at, problem_title, problem_id }] }`  
**Limit:** Last 50 submissions

---

## Problems — `/api/problems`

### GET `/api/problems`
List problems with optional filters.

**Auth:** None  
**Query params:**
- `difficulty` — `easy | medium | hard`
- `tag` — Filter by tag (max 50 chars)
- `search` — Title search (ILIKE, max 100 chars)
- `limit` — 1–200 (default 100)

**Response:** `{ "success": true, "count": N, "data": [{ id, title, difficulty, tags, time_limit, memory_limit, created_at }] }`

---

### GET `/api/problems/:id`
Get a single problem.

**Auth:** None  
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "description": "Markdown string",
    "difficulty": "easy|medium|hard",
    "tags": ["array", "dp"],
    "time_limit": 2,
    "memory_limit": 256,
    "stubs": { "71": "def solution():\n    pass" },
    "scoring_mode": "acm",
    "max_score": 100,
    "editorial": "string or null (null if not yet unlocked)",
    "editorial_unlocked": false,
    "test_cases": [{ "input_data": "...", "expected_output": "..." }],
    "examples": [{ "input": "...", "output": "..." }]
  }
}
```

---

### GET `/api/problems/:id/adjacent`
Navigation helper for prev/next problem.

**Response:** `{ "success": true, "data": { "prev": "uuid|null", "next": "uuid|null", "position": N, "total": N } }`

---

## AI — `/api/ai`

### POST `/api/ai/chat`
Send a message to the Socratic AI tutor.

**Auth:** Required  
**Body:** `{ "problemId": "uuid", "problemDescription": "string", "code": "string", "message": "string" }`  
**Response:** `{ "success": true, "response": "string (Gemini response)" }`

---

### GET `/api/ai/history/:problemId`
Get AI conversation history for a specific problem.

**Auth:** Required  
**Response:** `{ "success": true, "history": [{ "role": "user|assistant", "content": "...", "created_at": "..." }] }`

---

### POST `/api/ai/explain-error`
Get a plain-English explanation of a compile/runtime error.

**Auth:** Required  
**Body:** `{ "problemDescription": "string", "code": "string", "errorTrace": "string" }`  
**Response:** `{ "success": true, "explanation": "string" }`

---

### POST `/api/ai/review`
Request an AI code quality review.

**Auth:** Required  
**Body:** `{ "problemDescription": "string", "code": "string" }`  
**Response:**
```json
{
  "success": true,
  "review": {
    "qualityScore": 85,
    "timeComplexity": "O(N)",
    "spaceComplexity": "O(1)",
    "codeSmells": ["string"],
    "improvementSuggestions": ["string"]
  }
}
```

---

## Faculty — `/api/faculty`

### GET `/api/faculty/dashboard`
Aggregate class statistics.

**Auth:** Faculty  
**Response:** `{ "success": true, "data": { "stats": { totalStudents, activeStudents, totalSubs, acRate, problemsSolved }, "assignments": [...] } }`

---

### POST `/api/faculty/problems`
Create a new problem (full faculty version with stubs, scoring, checker).

**Auth:** Faculty + `manage_problems` permission  
**Body:**
```json
{
  "title": "string (max 200)",
  "description": "string (max 20000)",
  "difficulty": "easy|medium|hard",
  "tags": ["string"],
  "test_cases": [{ "input": "string", "output": "string", "is_public": false, "score": 0 }],
  "stubs": { "71": "def solution():\n    pass" },
  "scoring_mode": "acm|oi",
  "max_score": 100,
  "editorial": "string?",
  "editorial_visible_at": "ISO timestamp?",
  "uses_checker": false,
  "checker_code": "string?",
  "checker_language_id": "number?"
}
```

---

### POST `/api/faculty/assignments`
Create an assignment or exam.

**Auth:** Faculty + `manage_assignments` permission  
**Body:**
```json
{
  "title": "string",
  "deadline": "ISO timestamp",
  "problem_ids": ["uuid"],
  "allowed_cidrs": ["192.168.1.0/24"],
  "is_exam": false
}
```

---

### GET `/api/faculty/analytics`
Full class analytics dataset.

**Auth:** Faculty  
**Response:** `{ "success": true, "data": { topicWeakness, submissionsTimeline, difficultyDistribution, verdictDistribution, topStudents, topicMastery, byDepartment, bySection, weeklyTrend, solvedDistribution, submissionHeatmap, languageDistribution, insights } }`

---

### GET `/api/faculty/at-risk`
Students flagged as at-risk.

**Auth:** Faculty  
**Response:** `{ "success": true, "data": [{ id, name, email, inactiveDays, totalSubmissions, acRate, reasons: ["Inactive 20d", "Low success 18%"] }] }`

---

### GET `/api/faculty/student/:id`
Deep-dive analytics for a specific student.

**Auth:** Faculty  
**Response:** `{ "success": true, "data": { student, totals, learningCurve, topicBreakdown, verdictBreakdown } }`

---

### POST `/api/faculty/problems/:id/generate-tests`
AI-generate 15 edge-case test cases.

**Auth:** Faculty + `generate_ai_tests` permission  
**Body:** `{ "title": "string", "description": "string" }`  
**Response:** `{ "success": true, "data": { "suggestedDifficulty": "...", "testCases": [{ "input": "...", "output": "..." }] } }`

---

### POST `/api/faculty/problems/:id/random-tests`
Generate randomized hidden tests via generator + reference solution.

**Auth:** Faculty  
**Body:** `{ "count": 5, "generator_code": "...", "generator_language_id": 71, "reference_code": "...", "reference_language_id": 71, "make_public": false, "persist_config": true }`  
**Response:** `{ "success": true, "data": { "created": N, "requested": N, "failures": [] } }`

---

## Contests — `/api/contests`

### GET `/api/contests`
List all contests.

**Auth:** None  
**Response:** Array of contest objects with problem count and registration status.

### POST `/api/contests`
Create a contest.

**Auth:** Faculty + `manage_contests` permission  
**Body:** `{ title, description, starts_at, ends_at, problem_ids, scoreboard_mode, freeze_at }`

### POST `/api/contests/:id/register`
Register for a contest.

**Auth:** Required

### GET `/api/contests/:id/scoreboard`
Live scoreboard (respects frozen/hidden mode).

**Auth:** Required

---

## Socket.IO Events

### Client → Server
| Event | Payload | Purpose |
|-------|---------|---------|
| `join` | `jobId: string` | Subscribe to verdict for this job |
| `leave` | `jobId: string` | Unsubscribe |

### Server → Client
| Event | Room | Payload | Purpose |
|-------|------|---------|---------|
| `verdict` | `jobId` | `{ success, state, result }` | Submission verdict delivered |
| `judging_retry` | `jobId` | `{ attempt, maxAttempts }` | Judge busy, retrying |
| `scoreboard_update` | `contest:{id}` | `{ contest_id }` | Scoreboard changed |

**Verdict result structure (on `success: true`):**
```json
{
  "submission_id": "uuid",
  "verdict": { "id": 3, "description": "Accepted" },
  "time": 0.125,
  "memory": 5120,
  "score": null,
  "max_score": null,
  "scoring_mode": "acm",
  "passed_count": 10,
  "total_count": 10,
  "test_case_results": [
    {
      "status": { "id": 3, "description": "Accepted" },
      "time": "0.125",
      "memory": 5120,
      "stdout": "42\n",
      "passed": true,
      "is_public": true,
      "input": "5\n1 2 3 4 5",
      "expected": "42"
    }
  ]
}
```
