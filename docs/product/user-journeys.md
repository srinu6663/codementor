# User Journey Maps

## Journey 1: Student First Login → First Accepted Submission

```
[Browser]                   [Frontend]              [Backend]              [Judge0]
    │                           │                       │                      │
    ├─ GET /login ──────────────►│                       │                      │
    │                           │ Render LoginPage      │                      │
    ├─ Enter email+password ────►│                       │                      │
    │                           ├─ POST /api/auth/login─►│                      │
    │                           │                       │ Validate credentials │
    │                           │                       │ Check lockout state  │
    │                           │                       │ Return JWT tokens    │
    │                           ◄── { accessToken,      │                      │
    │                           │    refreshToken,       │                      │
    │                           │    user }              │                      │
    │                           │ Store tokens in        │                      │
    │                           │ localStorage           │                      │
    ├─ GET /app/dashboard ──────►│                       │                      │
    │                           ├─ GET /api/student/dashboard                  │
    │                           │                       │ Query PostgreSQL     │
    │                           │                       │ stats, heatmap,      │
    │                           │                       │ streak, rank         │
    │                           │◄── dashboard data ────┤                      │
    │                           │ Render StudentDashboard                      │
    ├─ Click "Problems" ────────►│                       │                      │
    │                           ├─ GET /api/problems ───►│                      │
    │                           │◄── problem list ───────┤                      │
    │                           │ Render ProblemListPage │                      │
    ├─ Click problem title ─────►│                       │                      │
    │                           ├─ GET /api/problems/:id►│                      │
    │                           │◄── problem + public   │                      │
    │                           │    test cases          │                      │
    │                           │ Render Monaco IDE +   │                      │
    │                           │ problem statement     │                      │
    ├─ Write code + click Submit►│                       │                      │
    │                           ├─ POST /api/submit ────►│                      │
    │                           │                       │ Validate code size,  │
    │                           │                       │ language, problem_id │
    │                           │                       │ Enqueue BullMQ job   │
    │                           │◄── { jobId } ─────────┤                      │
    │                           │ socket.join(jobId)    │                      │
    │                           │                       │◄─ Worker picks job ──┤
    │                           │                       │  Batch submit to     │
    │                           │                       │  Judge0 /submissions │
    │                           │                       │                      ├─ Execute code
    │                           │                       │◄── token[] ──────────┤
    │                           │                       │  Poll until done     │
    │                           │                       │◄── results ──────────┤
    │                           │                       │  Compare output      │
    │                           │                       │  Insert to DB        │
    │                           │◄── socket 'verdict' ──┤                      │
    │◄── Real-time result ──────┤                       │                      │
    │   Accepted / WA / TLE     │                       │                      │
```

---

## Journey 2: Student Uses AI Tutor After Wrong Answer

```
Student gets "Wrong Answer" on test case 3
    │
    ├─ Opens AI Tutor sidebar
    ├─ Types: "My solution fails on large inputs, but passes small ones"
    │
    ├─ POST /api/ai/chat { problemId, code, message }
    │   Backend:
    │   1. Insert user message to ai_tutor_conversations
    │   2. Fetch full conversation history
    │   3. Build context: system prompt + problem + code + history
    │   4. Call Gemini 2.5 Flash generateContent()
    │   5. Insert AI response to ai_tutor_conversations
    │   6. Return { response: "..." }
    │
    ◄── AI responds with a Socratic question:
        "What's the time complexity of your current inner loop?
         Can you trace through what happens when N = 10^5?"
    │
    ├─ Student realizes nested loop is O(N²)
    ├─ Rewrites with hash map
    ├─ Submits again → Accepted
    ├─ Code review panel appears
    ├─ POST /api/ai/review { problemDescription, code }
    ◄── { qualityScore: 92, timeComplexity: "O(N)", 
          spaceComplexity: "O(N)", codeSmells: [...] }
```

---

## Journey 3: Faculty Creates an Assignment + Exam

```
Faculty → Faculty Dashboard → Assignments → New Assignment
    │
    ├─ Fill: Title, Deadline, Select Problems (from their problem bank)
    ├─ Toggle "Proctored Exam"
    ├─ Add IP CIDR ranges: "192.168.1.0/24" (college lab network)
    │
    ├─ POST /api/faculty/assignments
    │   Backend: validate CIDRs → INSERT assignments → INSERT assignment_problems
    │   Log action to audit_logs
    │
    Students see assignment in /app/assignments
    │
    During exam:
    ├─ Student submit triggers cidrCheck middleware
    │   Middleware: check req.ip against allowed_cidrs
    │   If IP not in range → 403 "Submission blocked from this IP"
    │
    ├─ useProctor.ts hook fires:
    │   - visibilitychange event (tab switch) → POST /api/proctor/event
    │   - fullscreenchange event → POST /api/proctor/event
    │   - paste event → POST /api/proctor/event
    │
    After deadline:
    ├─ Faculty → Assignments → View Submissions
    ├─ Faculty → Assignments → Export CSV
    │   Response: CSV with Roll No, Name, Email, Score, Plagiarism Flag
```

---

## Journey 4: Faculty Runs Plagiarism Detection

```
Faculty → /faculty/assignments/:id/plagiarism
    │
    ├─ POST /api/plagiarism/run { assignmentId, language }
    │
    Backend:
    ├─ Query: all students' best accepted submissions for each problem in assignment
    ├─ Write each submission to temp directory: /tmp/<jobId>/submissions/<rollno>/solution.ext
    ├─ Execute: java -jar jplag.jar /submissions -l <language> -m 0.70 --csv-export
    ├─ Parse JPlag CSV output for pairs above threshold
    ├─ INSERT all pairs into plagiarism_results
    ├─ Return: [{ studentA, studentB, similarity, language }]
    │
    Frontend:
    ├─ Renders network graph (force-directed): nodes = students, edges = similarity %
    ├─ Click edge → PlagiarismDiffModal opens with side-by-side code comparison
    ├─ Export CSV has "FLAGGED" in Plagiarism Flag column for involved students
```

---

## Journey 5: Student Participates in Contest

```
Student → /app/contests
    │
    ├─ See upcoming contests with start/end times
    ├─ Click "Register" → POST /api/contests/:id/register
    │
    At contest start time:
    ├─ Contest opens (client can check starts_at vs now)
    ├─ Problem list becomes visible
    ├─ Submit solutions → same judging pipeline as normal
    │   BUT: POST /api/submit includes { contest_id }
    │
    Judge worker:
    ├─ Validates: contest exists, now is between starts_at/ends_at,
    │              problem is in contest, user is registered
    ├─ INSERT contest_submissions (verdict, score, penalty_minutes)
    ├─ Emit socket event: "scoreboard_update" to room "contest:{id}"
    │
    Scoreboard update propagates to all connected participants
    │
    After contest ends:
    ├─ Faculty (or system) triggers POST /api/rating/compute/:contestId
    ├─ Elo ratings recalculated and updated for all participants
    ├─ Rating history entries created
```

---

## Journey 6: Token Refresh Flow

```
Client has expired access token (1h) but valid refresh token (7d):
    │
    ├─ Make API call → 401 Unauthorized
    │
    api.ts interceptor:
    ├─ Is this a /refresh request? → No
    ├─ isRefreshing = true
    ├─ POST /api/auth/refresh { refreshToken }
    │   Backend: verify refresh token → re-issue access token
    ├─ Store new accessToken in localStorage
    ├─ processQueue: all queued requests get the new token
    ├─ Retry original failed request with new token
    │
    If refresh fails:
    ├─ localStorage.clear()
    ├─ window.location.href = '/login'
```

---

## Journey 7: HOD Reviews Faculty Permissions

```
Admin → /faculty/permissions (RequireAdmin gate)
    │
    ├─ GET /api/faculty/permissions
    │   Returns list of all faculty with their effective permissions
    │
    ├─ Find a faculty member
    ├─ Toggle off "run_plagiarism" (not trusted with that yet)
    │
    ├─ PUT /api/faculty/permissions/:userId { run_plagiarism: false }
    │   Backend: UPDATE users SET permissions = $1 WHERE id = $2
    │   Log: audit_logs INSERT { action: 'permissions.update', detail: ... }
    │
    Effect:
    ├─ That faculty's next request to /api/plagiarism/run
    │   hits requirePermission('run_plagiarism') middleware → 403
```
