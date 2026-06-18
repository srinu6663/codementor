# Deployment Guide

**Architecture**

```
  Browser ──HTTPS──> Vercel (React/Vite frontend, static)
     │
     └──HTTPS──> Caddy (TLS) ──> DigitalOcean Droplet (Docker)
                                   ├─ backend (Node/Express + Socket.IO + BullMQ worker, Java+JPlag)
                                   ├─ redis (BullMQ)
                                   └─ judge0 server + workers + its own db/redis
  Postgres ──────────────────────> Supabase (managed, already in use)
```

Why this split: **Judge0 needs Docker + kernel cgroup access**, so it can't run on Vercel/Render serverless — it lives on the Droplet. Postgres stays on Supabase. The frontend is static → Vercel.

---

## 1. Backend + Judge0 on a DigitalOcean Droplet

1. **Create a Droplet:** Ubuntu 22.04/24.04, **≥ 4 GB RAM / 2 vCPU** (Judge0 + Java + Node need headroom). Your $200 credit covers this comfortably.
2. **Install Docker + Compose:**
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Judge0 cgroup requirement (important):** Judge0 needs cgroup v1. On Ubuntu, edit `/etc/default/grub`:
   ```
   GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"
   ```
   then `sudo update-grub && sudo reboot`. (Skipping this is the #1 cause of Judge0 failing to run submissions.)
4. **Clone the repo** and create `backend/.env` from [`.env.example`](../backend/.env.example):
   - `DATABASE_URL` = your Supabase connection string
   - `CORS_ORIGIN` = `https://YOUR-APP.vercel.app` (add `,http://localhost:5173` if you also dev against it)
   - `JWT_SECRET`, `JWT_REFRESH_SECRET` = `openssl rand -hex 32`
   - `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`
   - Keep `JUDGE0_URL=http://judge0_server:2358`, `REDIS_URL=redis://app_redis:6379`
5. **Bring it up:** the root [`docker-compose.yml`](../docker-compose.yml) builds the backend (with Java + JPlag baked in) and starts Judge0 + Redis:
   ```bash
   docker compose up --build -d
   ```
   *Using Supabase?* You don't need the `app_db` service — point `DATABASE_URL` at Supabase and you can remove/ignore `app_db`.
6. **TLS:** point a DNS `A` record (e.g. `api.yourdomain.com`) at the Droplet IP, edit [`deploy/Caddyfile`](../deploy/Caddyfile) with that domain, and run Caddy (ports 80/443). You now have `https://api.yourdomain.com`.
   - No domain? Use a free one or DigitalOcean's, or run the frontend on the same Droplet to avoid mixed-content.

## 2. Frontend on Vercel

1. **New Project** → import the repo → set **Root Directory = `frontend`**. [`frontend/vercel.json`](../frontend/vercel.json) handles the build + SPA rewrites.
2. **Environment Variables:**
   - `VITE_API_URL = https://api.yourdomain.com` (your Caddy/backend URL — **HTTPS**)
   - `VITE_GOOGLE_CLIENT_ID = <same client id as backend>`
3. **Deploy.** Vercel gives you `https://YOUR-APP.vercel.app`.

## 3. Wire the two together

- Put the Vercel URL into the Droplet's `CORS_ORIGIN`, then `docker compose up -d` to restart the backend.
- **Google OAuth:** in Google Cloud Console → Auth Platform → your client → **Authorized JavaScript origins**, add `https://YOUR-APP.vercel.app`.

---

## Gotchas / honest notes

- **Mixed content:** the backend **must be HTTPS** (Caddy) — an HTTPS Vercel site can't call an `http://<ip>:3001` backend. This is the most common deploy failure.
- **Judge0 cgroups:** see step 1.3 — without it, code never executes.
- **Supabase free tier** pauses on inactivity and has connection limits; the pooled (`pgbouncer`) URL is best for the API.
- **Gemini free tier** has rate limits; set up billing on the AI Studio project for heavier use.
- **First boot** runs `scaffoldDatabase()` (creates/updates tables) automatically against `DATABASE_URL`.
- **Alternative (simpler, no Judge0 control):** Render can host the backend Docker image too, but Judge0's cgroup needs still push you toward a Droplet/VM — keep Judge0 on the Droplet either way.
