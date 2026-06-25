# Product Overview

## Executive Summary

**CodeMentor** (also internally called **CodeSphere**) is an intelligent coding assessment platform built for academic institutions — specifically engineering colleges. It provides a self-hosted LeetCode-like environment where faculty can author programming problems, create time-boxed contests, monitor student progress through rich analytics dashboards, and detect academic dishonesty through plagiarism detection. Students solve problems in an in-browser Monaco IDE with real-time code execution, AI-assisted tutoring, and Elo-style competitive ratings.

The platform is designed to replace fragmented tools (HackerRank for Education, Google Forms, etc.) with a single institution-controlled system that gives faculty deep visibility into learning outcomes.

---

## Target Users

### Student
An engineering student (primarily CS/IT branches) who solves algorithmic problems as part of coursework, assignments, and competitive practice.

**Goals:**
- Solve assigned problems and get instant feedback
- Understand why their code fails (AI tutor)
- Track their own progress and improve their rating
- Compete in timed contests

**Pain points without the platform:**
- No structured practice tied to course curriculum
- Delayed grading feedback
- No understanding of algorithmic weaknesses

### Faculty / Instructor
A lecturer or professor who creates and manages coding assignments, monitors class health, and grades performance.

**Goals:**
- Create programming problems with test cases (including AI-generated ones)
- Set deadlines and IP-restricted exam environments
- See which students are struggling (at-risk detection)
- Detect plagiarism before finalizing marks
- Export marks to CSV for the college's grading system

**Pain points without the platform:**
- Manual grading is slow and error-prone
- No visibility into where students are getting stuck
- Plagiarism is hard to detect at scale

### HOD / Admin
Head of Department or system administrator who manages faculty accounts and audits sensitive actions.

**Goals:**
- Grant/revoke specific capabilities to faculty members
- View audit logs of actions like problem deletions and mark exports
- Oversee platform-wide usage

---

## Product Terminology

| Term | Definition |
|------|-----------|
| **Problem** | A coding challenge with description, test cases, difficulty, and optional starter code (stubs) |
| **Test Case** | Input/output pair used to judge solutions; public cases shown to students, hidden cases used for actual scoring |
| **Submission** | A student's code run against all test cases; produces a verdict |
| **Verdict** | Judging result: Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, Compile Error, Partial |
| **Assignment** | A faculty-created collection of problems with a deadline; can be a normal assignment or a proctored exam |
| **Contest** | A timed competitive event with live scoreboard; supports public, frozen, and hidden scoreboard modes |
| **ACM Mode** | Binary scoring — a submission is either fully Accepted or not (stops on first failure) |
| **OI Mode** | Partial scoring — each test case earns partial marks; all test cases run regardless |
| **Classroom** | A virtual class created by faculty; students join via a join code |
| **Rating** | Elo-style competitive rating starting at 1200; updated after each contest |
| **Placement Track** | Curated problem sets organized by company tags (FAANG, etc.) for campus placement prep |
| **AI Tutor** | Socratic chatbot powered by Google Gemini that guides students without giving away answers |
| **Proctoring** | Browser-level integrity monitoring: tab switches, fullscreen exits, paste events are logged |
| **JPlag** | External plagiarism detection tool that compares code submissions for similarity |
| **Checker** | Faculty-authored program that judges submissions when exact string matching is insufficient (e.g., floating-point problems) |

---

## Major Workflows

### 1. Student: Solve a Problem
1. Log in → routed to Student Dashboard
2. Browse Problem List (filter by difficulty, topic, search)
3. Open a problem → Monaco IDE loads with problem statement
4. Write code in chosen language → Run against custom input
5. Submit → Backend enqueues a BullMQ job → Judge0 executes all test cases
6. Socket.IO delivers verdict in real-time → student sees pass/fail per test case
7. On failure: open AI Tutor sidebar → Gemini guides towards solution
8. On Accepted: code review panel available → Gemini analyzes code quality

### 2. Faculty: Create a Problem
1. Log in → Faculty Dashboard
2. Navigate to Problems → "Add Problem"
3. Fill title, description (Markdown), difficulty, tags, language stubs
4. Add test cases manually OR click "Generate with AI" → Gemini creates 15 edge-case tests
5. Configure scoring mode (ACM / OI), time/memory limits
6. Optional: add a special judge (checker) for problems requiring non-exact matching
7. Optional: set an editorial with a scheduled unlock time
8. Save → problem immediately visible on problem list

### 3. Faculty: Create and Run an Assignment
1. Faculty Dashboard → Assignments → "New Assignment"
2. Select problems from the problem bank, set deadline
3. Optional: mark as proctored exam + restrict by IP CIDR range
4. Students see assignment in their dashboard
5. Faculty monitors progress in real-time: per-student, per-problem grid
6. After deadline: export marks CSV (includes plagiarism flag)

### 4. Faculty: Detect Plagiarism
1. Faculty Plagiarism Overview → select assignment
2. Choose a language to analyze
3. System writes all accepted submissions to temp files → runs JPlag JAR
4. Results stored in `plagiarism_results` table
5. Faculty views a network graph of suspicious pairs + similarity diff viewer
6. Flagged students are marked in the CSV export

### 5. Student: Participate in a Contest
1. Contests page → register for an upcoming contest
2. At start time: contest opens, problem list visible
3. Student submits solutions; accepted submissions score points / penalties
4. Live scoreboard shows rankings (unless faculty chose frozen/hidden mode)
5. After contest: Elo rating recalculated and updated

### 6. Faculty: View Analytics
1. Faculty Dashboard shows aggregate stats: total students, active students, AC rate, problems solved
2. Class Analytics: topic weakness heatmap, submission timeline, top students
3. Cohort Comparison: compare departments/sections on average problems solved
4. At-Risk Students: automatically flagged for 14+ days inactivity or <30% AC rate
5. Per-student deep-dive: learning curve, topic mastery radar, verdict breakdown

---

## Core Business Logic

1. **Judging pipeline:** Submissions flow through a BullMQ queue → Judge0 batch API → per-test verdict → DB insert → Socket.IO push. This decouples the web server from code execution and allows retries on failure.

2. **Permission system:** Faculty permissions are stored as JSONB on the user record. Admins can granularly restrict individual faculty (e.g., deny `run_plagiarism` or `manage_contests`). Default is fully enabled.

3. **Test case visibility:** Hidden test cases are never sent to the frontend — inputs and expected outputs are only attached to results for `is_public = true` test cases. The AI tutor therefore cannot leak hidden test data.

4. **Academic metadata:** Users have `department`, `section`, `year`, `roll_no` fields enabling cohort analytics (compare CSE vs ECE, A vs B section, etc.).

5. **Two scoring modes:**
   - ACM: early exit on first failure, binary score (used for most problems)
   - OI: run all test cases, accumulate partial score (used for problems with weighted test cases)
