# Dependency Audit

---

## Backend Dependencies (`backend/package.json`)

### Runtime Dependencies

| Package | Version | Purpose | Risk | Notes |
|---------|---------|---------|------|-------|
| `express` | ^5.2.1 | HTTP framework | Low | Express 5 (RC) — stable for most use cases but technically still pre-release |
| `pg` | ^8.21.0 | PostgreSQL client | Low | Standard, well-maintained |
| `bullmq` | ^5.78.0 | Job queue (BullMQ) | Low | Redis-backed; production-grade |
| `ioredis` | ^5.11.1 | Redis client (BullMQ) | Low | Standard |
| `socket.io` | ^4.8.3 | WebSocket server | Low | |
| `jsonwebtoken` | ^9.0.3 | JWT signing/verification | Low | |
| `bcryptjs` | ^3.0.3 | Password hashing | Low | Pure-JS bcrypt; slightly slower than `bcrypt` native |
| `@google/genai` | ^2.8.0 | Google Gemini AI | Medium | Newer library; API surface may change |
| `google-auth-library` | ^10.7.0 | Google OAuth token verification | Low | Official Google library |
| `axios` | ^1.17.0 | HTTP client (Judge0 calls) | Low | |
| `helmet` | ^8.2.0 | Security headers | Low | |
| `cors` | ^2.8.6 | CORS middleware | Low | |
| `morgan` | ^1.11.0 | HTTP logging | Low | |
| `express-rate-limit` | ^8.5.2 | API rate limiting | Low | |
| `dotenv` | ^17.4.2 | Environment variable loading | Low | |
| `uuid` | ^14.0.0 | UUID generation for job IDs | Low | |
| `multer` | ^2.1.1 | File upload handling (ZIP import) | Low | |
| `adm-zip` | ^0.5.17 | ZIP file extraction (problem import) | Low | |
| `json2csv` | ^6.0.0-alpha.2 | CSV export | Medium | Alpha release; may have edge cases |
| `pdfkit` | ^0.19.1 | PDF generation | Low | |
| `speakeasy` | ^2.0.0 | TOTP 2FA | Low | Unmaintained (last publish 2018) — **replacement candidate** |
| `qrcode` | ^1.5.4 | QR code generation for 2FA setup | Low | |

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `nodemon` | Auto-restart in development |

### Missing Dev Dependencies
- No test runner (Jest, Vitest, Mocha)
- No linter (ESLint)
- No type checking (TypeScript not used in backend)

---

## Frontend Dependencies (`frontend/package.json`)

### UI Framework

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `react` | ^18.3.1 | UI framework | Low |
| `react-dom` | ^18.3.1 | DOM renderer | Low |
| `react-router-dom` | ^7.17.0 | Client-side routing | Low |

### Code Editor

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `@monaco-editor/react` | ^4.7.0 | Monaco Editor wrapper | Low | Heavy (~3MB); loaded lazily |

### UI Components (Radix)

All `@radix-ui/react-*` packages provide headless, accessible primitives for shadcn/ui. Well-maintained. Low risk.

### Charts & Visualization

| Package | Purpose | Risk |
|---------|---------|------|
| `recharts` | All analytics charts | Low |
| `canvas-confetti` | Accepted verdict celebration | Low |

### Utilities

| Package | Purpose | Risk |
|---------|---------|------|
| `axios` | API client | Low |
| `socket.io-client` | WebSocket client | Low |
| `react-hook-form` | Form state management | Low |
| `class-variance-authority` | Tailwind variant classes (shadcn) | Low |
| `clsx` / `tailwind-merge` | Conditional class names | Low |
| `dompurify` | Sanitize Markdown-rendered HTML | Low |
| `react-markdown` | Render problem descriptions | Low |
| `remark-gfm` | GitHub-flavored Markdown | Low |
| `remark-math` / `rehype-katex` | LaTeX math rendering | Low |
| `katex` | Math rendering engine | Low |
| `next-themes` | Dark mode | Low |
| `motion` | Animations (Framer Motion) | Low |
| `react-resizable-panels` | Split-pane layout | Low |
| `sonner` | Toast notifications | Low |
| `lucide-react` | Icons | Low |
| `input-otp` | OTP input component | Low |
| `vaul` | Drawer/bottom-sheet component | Low |
| `cmdk` | Command palette | Low |
| `embla-carousel-react` | Carousel | Low |

### Potential Issues
- `react-day-picker` v8 is included but its major version v9 has breaking API changes — verify v8 is intentional
- `motion` (Framer Motion) is heavy; ensure it is used meaningfully or remove

### Dev Dependencies

| Package | Purpose |
|---------|---------|
| `vite` | Build tool |
| `@vitejs/plugin-react` | React HMR |
| `tailwindcss` | CSS framework |
| `@tailwindcss/vite` | Tailwind Vite integration |
| `typescript` | Type checking |

---

## Frontend-Next Dependencies (`frontend-next/package.json`)

| Package | Version | Purpose | Risk |
|---------|---------|---------|------|
| `next` | 16.2.9 | React framework | Low |
| `react` | 19.2.4 | UI framework (React 19) | Medium | React 19 is latest stable but ecosystem compatibility may vary |
| `@mui/material` | ^6.5.0 | Material 3 UI components | Low |
| `@mui/icons-material` | ^6.5.0 | MUI icons | Low |
| `@mui/x-charts` | ^7.29.1 | Charts (MUI) | Low |
| `@mui/x-data-grid` | ^7.29.13 | Data grid | Low |
| `@emotion/react` + `@emotion/styled` + `@emotion/cache` | — | CSS-in-JS (required by MUI) | Low |
| `@monaco-editor/react` | ^4.7.0 | Monaco Editor | Low |
| `axios` | ^1.18.0 | HTTP client | Low |
| `socket.io-client` | ^4.8.3 | WebSocket | Low |

---

## Dead / Unused Dependencies

| Package | Where | Evidence of Non-use |
|---------|-------|-------------------|
| `App.jsx` | `frontend/src/` | Duplicate of `App.tsx` — both exist, only `.tsx` is used |
| Zustand | README | Listed in README but NOT in `package.json` |

---

## High-Risk Dependencies

| Package | Risk Reason | Recommended Action |
|---------|------------|-------------------|
| `speakeasy` | Unmaintained since 2018; no security updates | Replace with `otplib` |
| `json2csv` (alpha) | `6.0.0-alpha.2` — pre-release | Use stable v6 or `papaparse` |
| `express` v5 | RC release; minor API differences from v4 | Monitor for stable release |
| `@google/genai` v2 | New SDK; API may change | Pin exact version; test on updates |

---

## Missing Dependencies

| Needed For | Missing Package |
|-----------|----------------|
| Backend testing | `jest` or `vitest` |
| Backend type safety | TypeScript (backend is plain JS) |
| Frontend testing | `@testing-library/react` |
| API mocking | `msw` |
| Database migrations | Proper migration tool (Flyway, Knex migrations, or Drizzle) |
