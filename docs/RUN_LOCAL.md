# Run CodeMentor Locally (no cloud, no card)

This runs the **entire platform on your own machine** — login, problems, AI tutor,
contests, faculty analytics, judging. The database is already on Supabase (cloud),
so you only need Docker for Judge0 + Redis. **Zero payment, zero signup.**

## Prerequisites (all free, no card)
- **Docker Desktop** — https://www.docker.com/products/docker-desktop (for Judge0 + Redis)
- **Node.js 18+** — https://nodejs.org
- Your `backend/.env` and `frontend/.env` are already filled in.

## Start it (Windows PowerShell — run each in order)

```powershell
# 1. Redis (job queue for judging)
docker run -d --name codementor-redis -p 6379:6379 redis:7

# 2. Judge0 (code execution engine) — first run downloads images, give it a minute
cd judge0
docker compose up -d
cd ..

# 3. Backend API  (new terminal)
cd backend
npm install
npm run dev            # → http://localhost:3001

# 4. Frontend  (another new terminal)
cd frontend
npm install
npm run dev            # → http://localhost:5173
```

Open **http://localhost:5173**, register an account, and you're in.

> First backend start auto-creates all tables in your Supabase DB.
> Judge0 needs Docker; if `docker compose up` errors about cgroups on Linux, see
> `docs/DEPLOYMENT.md`. On Docker Desktop (Windows/Mac) it works out of the box.

## What works locally
✅ Auth + Google login · ✅ Problems + Monaco editor · ✅ **Code judging** (local Judge0)
· ✅ AI tutor / review (your Gemini key) · ✅ Contests + live scoreboard · ✅ Faculty
dashboard + analytics · ✅ Classrooms · ✅ Placement track · ✅ Proctored exams.
⚠️ Plagiarism needs Java + the JPlag JAR (`bash backend/scripts/setup-jplag.sh`).

---

## Need a shareable link for a remote demo? (still free, no card)

Run everything locally as above, then expose it with **Cloudflare Tunnel** (free):

```powershell
# install once: winget install Cloudflare.cloudflared
# expose the backend:
cloudflared tunnel --url http://localhost:3001
#   → gives e.g. https://abc-xyz.trycloudflare.com  (this is your API URL)
```

Then point the frontend at that API URL and rebuild:

```powershell
cd frontend
# put the tunnel URL in frontend/.env:  VITE_API_URL=https://abc-xyz.trycloudflare.com
npm run build
npx vite preview --host    # serve the built app
# expose the frontend too:
cloudflared tunnel --url http://localhost:4173
```

Share the **frontend** tunnel URL. (Add both tunnel URLs to your Google OAuth
"Authorized JavaScript origins", and the frontend URL to `CORS_ORIGIN` in `backend/.env`.)

> Your laptop must stay on and running during the demo. For an in-person
> presentation, just use `http://localhost:5173` — simplest and most reliable.
