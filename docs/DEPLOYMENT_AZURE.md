# Deploying CodeMentor to Microsoft Azure (Student credit, no card)

This is the **all-in-one** deployment: ONE Ubuntu VM runs everything —
backend + Judge0 + Redis (via Docker Compose) and the React frontend + HTTPS
(via Caddy). The database stays on **Supabase** so your existing test data carries over.

> Time: ~45–60 min the first time. Cost: ~$24–30/mo from your $100 credit (deallocate the VM when idle to stretch it).

---

## 0. What you'll end up with

```
                Internet (students / HOD)
                        │  https://your-domain
                        ▼
        ┌──────────────────────────────────┐
        │   Azure Ubuntu VM (B2s, 4GB)      │
        │                                   │
        │   Caddy  :80/:443  (auto-HTTPS)   │
        │     ├── /            → React build │
        │     └── /api, /socket.io → :3001  │
        │                                   │
        │   Docker Compose:                 │
        │     backend  :3001                │
        │     app_redis (BullMQ)            │
        │     judge0 (server+worker+db+redis)│
        └──────────────────────────────────┘
                        │
                        ▼
                Supabase (PostgreSQL, cloud)
```

---

## 1. Prerequisites (all free)

- **Azure for Students** activated (azure.microsoft.com/free/students → "Start free", sign in with your college email / GitHub). Gives $100 credit, **no card**.
- Your **secrets** ready (already in your local `backend/.env`): `DATABASE_URL` (Supabase), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`.
- **(Recommended) a domain** — free via the GitHub Student Pack (Namecheap `.me` / Name.com), or a free `duckdns.org` subdomain. Needed for HTTPS + Google login.
- Your code pushed to **GitHub** (so you can `git clone` it on the VM).

---

## 2. Create the VM (Azure Portal)

1. portal.azure.com → **Create a resource** → **Virtual machine**.
2. Fill in:
   - **Resource group**: create new, e.g. `codementor-rg`
   - **VM name**: `codementor`
   - **Region**: closest to you (e.g. Central India / South India)
   - **Image**: **Ubuntu Server 22.04 LTS**
   - **Size**: **Standard_B2s** (2 vCPU, 4 GB) — click "See all sizes" if not listed
   - **Authentication**: **SSH public key** (recommended) or Password
   - **Username**: `azureuser`
3. **Networking tab** → "Select inbound ports" → tick **HTTP (80)**, **HTTPS (443)**, **SSH (22)**.
4. **Review + create** → **Create**. (Download the SSH key if prompted.)
5. When done → open the VM → copy its **Public IP address**.

---

## 3. Open the firewall ports (if not done in step 2)

VM → **Networking** → **Add inbound port rule** for each: **22, 80, 443** (TCP, Allow).
Azure blocks everything by default — skipping this = nothing loads.

---

## 4. Connect via SSH

```bash
# from your laptop (PowerShell or terminal)
ssh azureuser@<VM_PUBLIC_IP>
# if you downloaded a key file:
ssh -i path/to/key.pem azureuser@<VM_PUBLIC_IP>
```

---

## 5. Install Docker + Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker          # apply group without re-login
docker --version       # confirm
```

---

## 6. Judge0 cgroup fix (required — one time)

Judge0 needs cgroup **v1**; Ubuntu 22.04 defaults to v2. Fix and reboot:

```bash
sudo sed -i 's/GRUB_CMDLINE_LINUX="\(.*\)"/GRUB_CMDLINE_LINUX="\1 systemd.unified_cgroup_hierarchy=0"/' /etc/default/grub
sudo update-grub
sudo reboot
```

Wait ~30s, then SSH back in.

---

## 7. Get the code

```bash
cd ~
git clone <YOUR_GITHUB_REPO_URL> codementor
cd codementor
```

---

## 8. Configure secrets (`.env`)

The root `docker-compose.yml` reads `.env` from the repo root. Create it:

```bash
nano .env
```

Paste (fill in YOUR values):

```env
# ── Database: keep Supabase (your existing data) ──
DATABASE_URL=postgres://...your Supabase pooler URL...

# ── Auth ──
JWT_SECRET=...your value...
JWT_REFRESH_SECRET=...your value...

# ── AI tutor ──
GEMINI_API_KEY=...your value...

# ── Google login ──
GOOGLE_CLIENT_ID=...your value...

# ── Your public site (for CORS) ──
CORS_ORIGIN=https://your-domain.com

# ── Judge0 internal DB password (any random string) ──
JUDGE0_DB_PASSWORD=change_me_random
# Leave REDIS_PASSWORD empty (compose REDIS_URL has no password)
REDIS_PASSWORD=
```

**To keep Supabase as the DB** (recommended — data continuity), edit `docker-compose.yml`
and **comment out** the line that forces the local DB, plus the `app_db` service:

```yaml
  backend:
    environment:
      JUDGE0_URL: http://judge0_server:2358
      # DATABASE_URL: postgres://...@app_db:5432/...   ← comment this out
      REDIS_URL: redis://app_redis:6379
    depends_on:
      # app_db:                ← comment out these two lines
      #   condition: service_healthy
      app_redis:
        condition: service_healthy
      judge0_server:
        condition: service_started
```

(You can also leave it as-is to use a **fresh local Postgres** instead — then you'll start with an empty database and create users/problems on the server.)

---

## 9. Build the frontend

```bash
# install Node 20 on the VM
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

cd ~/codementor/frontend
npm ci
# Google login needs the client id baked in; the API works via same-origin (relative /api)
VITE_GOOGLE_CLIENT_ID=<YOUR_GOOGLE_CLIENT_ID> npm run build

# publish the build where Caddy serves it
sudo mkdir -p /var/www/codementor
sudo cp -r dist/* /var/www/codementor/
cd ~/codementor
```

---

## 10. Launch the backend + Judge0 stack

```bash
docker compose up --build -d
docker compose ps          # all services should be "running"/"healthy"
docker compose logs backend --tail=30   # look for "Backend server running" + "tables initialized"
```

Judge0 images are large — the first pull takes a few minutes.

---

## 11. HTTPS with Caddy

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Put your domain in the Caddyfile (edit `deploy/Caddyfile`, replace `codementor.example.com`
with your real domain), then install + start it:

```bash
sudo cp ~/codementor/deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy fetches a free Let's Encrypt certificate automatically once DNS points here.

> **No domain yet?** For a quick test, replace the first line of `/etc/caddy/Caddyfile`
> with `:80 {` (serves over plain HTTP at `http://<VM_IP>`). Google login won't work
> on bare HTTP, but everything else will. Add the domain later for HTTPS.

---

## 12. Point your domain + Google OAuth

1. **DNS**: at your domain registrar, add an **A record** → your VM's public IP.
   (DuckDNS: just set the IP in their dashboard.) Wait a few minutes to propagate.
2. **Google OAuth**: console.cloud.google.com → your project → Credentials → OAuth client →
   add `https://your-domain.com` to **Authorized JavaScript origins**.

---

## 13. Verify

```bash
curl -s https://your-domain.com/api/.. ../health   # or just open in a browser:
```
Open **https://your-domain.com** → register/login → faculty dashboard, analytics,
then solve a problem and **Submit** → you should get a real verdict (Judge0 working).

---

## 14. Save credit when idle

Azure bills while the VM is **running**. Between demos:

- Portal → VM → **Stop (deallocate)** → billing for compute pauses.
- **Start** it again before the next demo (same IP if you assigned a static IP).

---

## 15. Troubleshooting

| Symptom | Fix |
|---|---|
| Site won't load | NSG ports 80/443 open? `sudo systemctl status caddy` |
| HTTPS cert fails | DNS A record must point to the VM **before** Caddy can issue a cert |
| Submit gives no verdict | `docker compose logs judge0_worker` — usually the cgroup fix/reboot was skipped |
| Judge0 worker crash-loops | Re-do step 6 (cgroup v1) and `sudo reboot` |
| Google login fails | Domain added to Authorized origins? Must be HTTPS |
| Backend can't reach DB | Check `DATABASE_URL` in `.env`; Supabase allows external connections |
| Out of memory | B2s (4 GB) is the floor for Judge0 + backend; don't go smaller |

---

## Later: moving to the college server

Because it's all Docker + Supabase, migration is: install Docker on the college box →
`git clone` → same `.env` → `docker compose up -d` → build frontend → run Caddy →
update DNS + Google origin to the new domain. The database (Supabase) is untouched, so
**no data migration** and the demo data carries straight over.
