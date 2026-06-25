# Component Inventory

This document covers the custom components in `frontend/src/components/`. The `ui/` subdirectory (shadcn/ui components) is listed separately at the end.

---

## Auth Components

### `TwoFactorSetup.tsx`
- **Purpose:** TOTP 2FA enrollment flow — shows QR code, prompts for verification code
- **Props:** (no external props — likely internally wired)
- **Dependencies:** API calls to `/api/2fa/setup` and `/api/2fa/verify`
- **Reusability:** Low — specialized for 2FA setup flow
- **Used in:** Profile page or login flow

---

## Layout Components

### `AppLayout.tsx`
- **Purpose:** Student app shell — wraps all `/app/*` routes with sidebar + header
- **Props:** None (renders `<Outlet>` from React Router)
- **Dependencies:** `Sidebar.tsx`, `DashboardHeader.tsx`
- **Reusability:** High (page-level layout)
- **Used in:** All student routes

### `FacultyLayout.tsx`
- **Purpose:** Faculty app shell — wraps all `/faculty/*` routes
- **Props:** None
- **Dependencies:** `FacultySidebar.tsx`, `FacultyHeader.tsx`
- **Reusability:** High
- **Used in:** All faculty routes

### `Sidebar.tsx`
- **Purpose:** Student navigation sidebar with links to dashboard, problems, contests, etc.
- **Props:** None (reads user from localStorage)
- **Dependencies:** `lucide-react` icons, React Router `NavLink`
- **Reusability:** Medium

### `FacultySidebar.tsx`
- **Purpose:** Faculty navigation sidebar
- **Props:** None
- **Reusability:** Medium

### `DashboardHeader.tsx`
- **Purpose:** Top header bar for student area — shows user name, role, logout
- **Reusability:** Medium

### `FacultyHeader.tsx`
- **Purpose:** Top header bar for faculty area
- **Reusability:** Medium

---

## Problem Solving Components

### `AITutorSidebar.tsx`
- **Purpose:** Collapsible sidebar chat interface for the Socratic AI tutor
- **Props:** `problemId`, `problemDescription`, `currentCode`
- **Dependencies:** `/api/ai/chat`, `/api/ai/history/:problemId`
- **Reusability:** Low — tightly coupled to ProblemSolvingPage
- **Used in:** `ProblemSolvingPage.tsx`

### `CodeReviewPanel.tsx`
- **Purpose:** Shows AI code review results: quality score, time/space complexity, code smells
- **Props:** `problemDescription`, `code` (trigger), review result state
- **Dependencies:** `/api/ai/review`
- **Reusability:** Low
- **Used in:** `ProblemSolvingPage.tsx`

### `MarkdownRenderer.tsx`
- **Purpose:** Renders Markdown (with GitHub Flavored Markdown and LaTeX math support)
- **Props:** `content: string`
- **Dependencies:** `react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`, `DOMPurify`
- **Reusability:** ⭐⭐⭐⭐⭐ High — used anywhere Markdown needs rendering
- **Used in:** Problem descriptions, editorial

### `ProblemListPanel.tsx`
- **Purpose:** Collapsible left panel showing the problem list with navigation while in the solver
- **Props:** Current problem ID, list of problems
- **Dependencies:** React Router
- **Reusability:** Low
- **Used in:** `ProblemSolvingPage.tsx`

### `VerdictBadge.tsx`
- **Purpose:** Inline colored badge showing a submission verdict (AC = green, WA = red, etc.)
- **Props:** `verdict: string`
- **Dependencies:** shadcn `Badge`
- **Reusability:** ⭐⭐⭐⭐ High — reusable anywhere verdicts are displayed
- **Used in:** Submission lists, problem solver

### `VerdictBanner.tsx`
- **Purpose:** Full-width banner shown after a submission with verdict summary and test case results
- **Props:** Verdict result object, test case results array
- **Dependencies:** VerdictBadge, confetti (on Accepted)
- **Reusability:** Low
- **Used in:** `ProblemSolvingPage.tsx`

---

## Dashboard Components

### Analytics Charts

| Component | Chart Type | Data Source | Reusability |
|-----------|-----------|-------------|-------------|
| `ClassTrendChart.tsx` | Line chart (weekly submissions + AC rate) | Faculty analytics | Low |
| `CohortComparisonChart.tsx` | Bar chart (problems solved by dept/section) | Faculty analytics | Low |
| `CohortDrilldown.tsx` | Drilldown table for cohort data | Faculty analytics | Low |
| `CohortRadarChart.tsx` | Radar chart (topic mastery by cohort) | Faculty analytics | Low |
| `ContributionHeatmap.tsx` | GitHub-style calendar heatmap | Faculty analytics | Medium |
| `ScoreDistributionChart.tsx` | Histogram (problems solved distribution) | Faculty analytics | Low |
| `StreakCalendarWidget.tsx` | Calendar showing submission streak | Student dashboard | Low |
| `SubmissionHeatmap.tsx` | Day×hour activity heatmap | Faculty analytics | Low |
| `TopStudentsChart.tsx` | Horizontal bar (top N students) | Faculty analytics | Low |
| `TopicMasteryChart.tsx` | Bar chart (class-wide topic solved vs failed) | Faculty analytics | Medium |
| `TopicStrengthRadar.tsx` | Radar chart (personal topic mastery) | Student dashboard | Low |
| `VerdictPieChart.tsx` | Pie/donut (verdict distribution) | Faculty analytics | Medium |

### Dashboard Widgets

| Component | Purpose | Reusability |
|-----------|---------|-------------|
| `InsightCallouts.tsx` | Text callout cards with auto-generated insights | Low |
| `RecentSubmissions.tsx` | Latest N submissions with verdict badges | Medium |
| `RecommendedProblems.tsx` | AI-recommended problems list | Low |
| `UpcomingContests.tsx` | List of upcoming contests | Medium |

### Modal Components

| Component | Purpose | Triggered By |
|-----------|---------|-------------|
| `StudentDetailModal.tsx` | Full per-student analytics deep-dive | Faculty clicks a student row |
| `PlagiarismDiffModal.tsx` | Side-by-side code comparison for plagiarism pair | Clicking an edge in network graph |
| `PlagiarismNetworkGraph.tsx` | Force-directed network of similar submission pairs | Faculty plagiarism view |
| `RandomTestsModal.tsx` | UI for generator+reference test generation | FacultyProblems page |
| `TestHeatmapModal.tsx` | Per-test-case fail rate grid for a problem | FacultyProblems page |

### Export Components

| Component | Purpose |
|-----------|---------|
| `CsvButton.tsx` | Trigger CSV export for assignment marks |
| `ExportPdfButton.tsx` | Trigger PDF report export |
| `ZipImportButton.tsx` | Trigger bulk problem import from ZIP |

---

## Global Components

### `ErrorBoundary.tsx`
- **Purpose:** React error boundary — catches runtime errors and shows fallback UI
- **Props:** `children`
- **Reusability:** ⭐⭐⭐⭐⭐ High
- **Used in:** Root `App.tsx`

### `RatingBadge.tsx`
- **Purpose:** Displays Elo rating with tier color (similar to Codeforces color coding)
- **Props:** `rating: number`
- **Reusability:** ⭐⭐⭐⭐ High

### `ThemeToggle.tsx`
- **Purpose:** Light/dark mode toggle button
- **Props:** None
- **Dependencies:** `next-themes`
- **Reusability:** ⭐⭐⭐⭐⭐ High

---

## shadcn/ui Components (`src/components/ui/`)

These are generated/copied from the shadcn/ui library and **should not be modified** — they are the base design system. All are built on Radix UI primitives.

| Component | Radix Primitive | Notes |
|-----------|----------------|-------|
| `accordion.tsx` | `@radix-ui/react-accordion` | |
| `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | Confirmation dialogs |
| `avatar.tsx` | `@radix-ui/react-avatar` | |
| `badge.tsx` | — | Color-coded label |
| `button.tsx` | `@radix-ui/react-slot` | `class-variance-authority` variants |
| `card.tsx` | — | Container with header/content/footer |
| `chart.tsx` | — | Recharts wrapper with theme tokens |
| `command.tsx` | `cmdk` | Command palette / search |
| `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialog |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | |
| `form.tsx` | `react-hook-form` | Form field wrappers |
| `input.tsx` | — | Styled HTML input |
| `label.tsx` | `@radix-ui/react-label` | |
| `select.tsx` | `@radix-ui/react-select` | |
| `separator.tsx` | `@radix-ui/react-separator` | |
| `sheet.tsx` | `@radix-ui/react-dialog` | Slide-in panel |
| `sidebar.tsx` | — | Full sidebar component |
| `skeleton.tsx` | — | Loading placeholder |
| `sonner.tsx` | `sonner` | Toast notifications |
| `table.tsx` | — | Styled HTML table |
| `tabs.tsx` | `@radix-ui/react-tabs` | |
| `textarea.tsx` | — | Styled HTML textarea |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | |
| `resizable.tsx` | `react-resizable-panels` | Split panes |
| `scroll-area.tsx` | `@radix-ui/react-scroll-area` | Custom scrollbar |

---

## Frontend-Next Components (`frontend-next/src/components/`)

| Component | Purpose | Status |
|-----------|---------|-------|
| `auth/AuthGuard.tsx` | Route protection HOC | ✅ |
| `auth/BrandPanel.tsx` | Left decorative panel on auth pages | ✅ |
| `auth/GoogleIcon.tsx` | Google logo SVG | ✅ |
| `shell/AppShell.tsx` | Main app layout with MUI Drawer navigation | ✅ |
| `ui/DifficultyChip.tsx` | MUI Chip showing difficulty | ✅ |
| `ui/PageHeader.tsx` | Page title + breadcrumb header | ✅ |
| `ui/SearchField.tsx` | MUI search input | ✅ |
| `ui/SegmentedButtons.tsx` | MUI ToggleButtonGroup | ✅ |
| `ui/StatCard.tsx` | Dashboard KPI card | ✅ |
| `ui/States.tsx` | Loading / empty / error state components | ✅ |
| `ThemeToggle.tsx` | Dark/light mode toggle | ✅ |
