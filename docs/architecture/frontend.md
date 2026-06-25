# Frontend Architecture

## Two Parallel Frontends

This repository contains two frontend applications at different maturity levels:

| | `frontend/` | `frontend-next/` |
|--|-------------|-----------------|
| **Status** | Production-ready, feature-complete | In-progress redesign (5 pages) |
| **Framework** | React 18 + Vite 5 | Next.js 16 + React 19 |
| **UI Library** | Tailwind CSS v4 + shadcn/ui | MUI v6 (Material 3) + Emotion |
| **Routing** | React Router v7 (CSR) | Next.js App Router (SSR capable) |
| **Build** | Vite (SPA) | Next.js |

**The primary frontend is `frontend/`.** `frontend-next/` is a planned replacement and should not be treated as production-ready.

---

## Frontend (`frontend/`)

### Framework & Tooling
- **React 18.3** with TypeScript 5.8
- **Vite 5.3** as bundler
- **ESM modules** (`"type": "module"` in package.json)
- No test runner configured

### Routing
React Router v7 with nested route groups:

```
/login, /register           — Public (unauthenticated)
/app/*                      — Student layout (AppLayout)
  /app/problems/:id         — Full-screen problem solver (no layout)
/faculty/*                  — Faculty layout (FacultyLayout)
```

Route protection implemented as inline components (`RequireAuth`, `RequireFaculty`, `RequireAdmin`) that read `localStorage` directly on render.

### State Management
- **No global state library** — Zustand is referenced in README but not in `package.json`
- Auth state: `accessToken`, `refreshToken`, `user` stored in `localStorage`
- Server state: direct `api.ts` axios calls inside components/pages; no React Query or SWR
- Local component state via `useState` / `useReducer`

### API Layer
`src/lib/api.ts` exports a configured axios instance that:
1. Injects `Authorization: Bearer <token>` from localStorage on every request
2. Intercepts 401 responses and attempts token refresh
3. Queues concurrent requests during refresh to prevent race conditions
4. Redirects to `/login` on refresh failure

The base URL is `/` — the frontend assumes it is served behind a reverse proxy that routes `/api/*` to the backend (e.g., Vite proxy in dev, Caddy/Nginx in prod).

### Component Hierarchy

```
App.tsx
├── ErrorBoundary
└── BrowserRouter
    ├── LoginPage / RegisterPage
    ├── AppLayout (student layout)
    │   ├── Sidebar (navigation)
    │   ├── DashboardHeader
    │   └── <Outlet> (page content)
    │       ├── StudentDashboard
    │       │   ├── ContributionHeatmap
    │       │   ├── TopicStrengthRadar
    │       │   ├── StreakCalendarWidget
    │       │   ├── UpcomingContests
    │       │   ├── RecommendedProblems
    │       │   └── RecentSubmissions
    │       ├── ProblemListPage
    │       │   └── ProblemListPanel
    │       ├── LeaderboardPage
    │       ├── ContestsPage
    │       └── ...
    ├── ProblemSolvingPage (standalone, no layout)
    │   ├── ProblemListPanel (collapsible)
    │   ├── Monaco Editor
    │   ├── AITutorSidebar
    │   ├── CodeReviewPanel
    │   ├── VerdictBanner
    │   └── VerdictBadge
    └── FacultyLayout (faculty layout)
        ├── FacultySidebar
        ├── FacultyHeader
        └── <Outlet>
            ├── FacultyDashboard
            │   ├── ClassTrendChart
            │   ├── TopStudentsChart
            │   ├── VerdictPieChart
            │   ├── TopicMasteryChart
            │   ├── CohortComparisonChart
            │   ├── CohortRadarChart
            │   ├── ScoreDistributionChart
            │   ├── SubmissionHeatmap
            │   ├── InsightCallouts
            │   ├── StudentDetailModal
            │   ├── PlagiarismNetworkGraph
            │   └── PlagiarismDiffModal
            └── FacultyProblems
```

### Design System

**shadcn/ui** is used as the UI component library. It provides pre-built, composable components built on top of **Radix UI** primitives, styled with Tailwind CSS.

All shadcn components are located in `src/components/ui/` and include:
accordion, alert-dialog, alert, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

**Color theming** is done via CSS custom properties defined in `styles/theme.css` and `styles/globals.css`.

**Dark mode** is supported via `next-themes` toggled by `ThemeToggle.tsx`.

### Specialized Libraries
- **Monaco Editor** (`@monaco-editor/react`): In-browser code editor on ProblemSolvingPage
- **Recharts**: All analytics charts (line, bar, pie, radar, area)
- **react-resizable-panels**: Split-pane layout on ProblemSolvingPage
- **react-markdown** + `remark-gfm` + `remark-math` + `rehype-katex`: Render problem descriptions (Markdown + LaTeX)
- **DOMPurify**: Sanitize rendered Markdown to prevent XSS
- **socket.io-client**: Real-time verdict delivery
- **canvas-confetti**: Celebration animation on Accepted verdict
- **motion** (Framer Motion): Micro-animations

### Accessibility
No accessibility audit has been performed. No ARIA attributes have been specifically added beyond what Radix/shadcn provides by default.

### Mobile Responsiveness
Tailwind responsive breakpoints are used on some pages. The problem solver (Monaco IDE) is not designed for mobile screens. No dedicated mobile testing has been done.

---

## Frontend-Next (`frontend-next/`)

### Framework
- **Next.js 16.2.9** with App Router
- **React 19.2** (latest)
- The `AGENTS.md` file in this directory warns: "This is NOT the Next.js you know — APIs, conventions, and file structure may differ from training data."

### Routing (App Router)
```
app/
├── layout.tsx              ← Root layout (ThemeRegistry)
├── page.tsx                ← Root page (redirect placeholder)
├── globals.css
├── (auth)/                 ← Route group (no layout impact)
│   ├── login/page.tsx
│   └── register/page.tsx
└── (student)/
    └── app/
        ├── layout.tsx      ← Student app layout (AppShell)
        ├── dashboard/page.tsx
        └── problems/page.tsx
```

### UI & Theming
- **MUI v6** (Material 3 design language) with `@mui/material`, `@mui/icons-material`
- **Emotion** for CSS-in-JS (required by MUI)
- **ThemeRegistry** (`src/theme/ThemeRegistry.tsx`): wraps `CacheProvider` + `ThemeProvider` for proper SSR with Emotion
- Design tokens in `src/theme/tokens.ts`
- Light/dark theme in `src/theme/theme.ts`

### Key Libraries
- `@mui/x-data-grid`: Problem list table
- `@mui/x-charts`: Dashboard charts
- `@monaco-editor/react`: Code editor
- `socket.io-client`: Real-time verdict

### State / Auth
- `src/lib/auth.ts`: Auth utilities
- `src/lib/api.ts`: Axios instance (similar to frontend/)
- `src/components/auth/AuthGuard.tsx`: Route protection wrapper

### What's Missing
All of these pages from `frontend/` have no equivalent in `frontend-next/`:
- ProblemSolvingPage (Monaco IDE, AI tutor, real-time judging)
- Faculty Dashboard and all faculty pages
- Contests, Assignments, Placement Track
- Leaderboard, Profile, Submissions
- Classrooms, Aptitude, Coding Profiles
