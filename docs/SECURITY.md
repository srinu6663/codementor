# CodeSphere — Security Checklist

Mapped against the Piston security model and Judge0 CVE advisories.
Run through this list before every deployment or exam.

---

## Judge0 Version

| Check | How to verify | Status |
|---|---|---|
| Version ≥ 1.13.1 (CVE-2024-28185/28189 patched) | Backend logs `✓ version x.y.z ≥ 1.13.1` at startup | Auto-checked |

CVE references:
- [CVE-2024-28185 — symlink sandbox escape](https://infosecwriteups.com/exploiting-symlinks-a-deep-dive-into-cve-2024-28185-and-cve-2024-28189-of-judge0-sandboxes-36bd471cfc4d)
- [CVE-2024-28189 — sandbox escape analysis](https://tantosec.com/blog/judge0/)

---

## Network Isolation

| Check | Config / file | Expected |
|---|---|---|
| Port 2358 not reachable from internet | `docker-compose.yml` — no `ports:` on `judge0_server` | No exposed port |
| Port 2358 localhost-only (dev) | `judge0/docker-compose.yml` | `127.0.0.1:2358:2358` |
| Judge0 Redis not exposed | `docker-compose.yml` — no `ports:` on `judge0_redis` | No exposed port |
| Judge0 Postgres not exposed | `docker-compose.yml` — no `ports:` on `judge0_db` | No exposed port |
| Submitted code cannot make network calls | `judge0.conf` | `ENABLE_NETWORK=false` |
| Backend reaches Judge0 via internal DNS | `.env` / `docker-compose.yml` | `JUDGE0_URL=http://judge0_server:2358` |

---

## Sandbox Protections (verified by `checkJudge0Health` at startup)

| Protection | Config key | Value | Defeats |
|---|---|---|---|
| Network disabled | `ENABLE_NETWORK` | `false` | Code phoning home |
| Process cap | `MAX_PROCESSES_AND_OR_THREADS` | `30` | Fork bombs |
| File size cap | `MAX_FILE_SIZE` | `4096 KB` | Disk-fill attacks |
| stdout cap (Judge0) | `STDOUT_LIMIT` | `65536 B` | Output bombs |
| stderr cap (Judge0) | `STDERR_LIMIT` | `65536 B` | Output bombs |
| stdout cap (Express) | `capOutput()` in worker | `65536 B` | Defence-in-depth |
| CPU time cap | `CPU_TIME_LIMIT` + multipliers | 2–6 s | Infinite loops |
| Wall time cap | `WALL_TIME_LIMIT` + multipliers | 5–15 s | Infinite loops |
| Memory cap | `MEMORY_LIMIT` + multipliers | 256–768 MB | Memory exhaustion |
| Queue cap | `MAX_QUEUE_SIZE` | `100` | Exam-spike crash |

---

## API Attack Surface Reduction

| Check | Config key | Value |
|---|---|---|
| Compiler options disabled | `ENABLE_COMPILER_OPTIONS` | `false` |
| CLI arguments disabled | `ENABLE_COMMAND_LINE_ARGUMENTS` | `false` |
| Submission delete disabled | `ENABLE_SUBMISSION_DELETE` | `false` |
| Auth token required | `AUTHN_TOKEN` in `judge0.conf` | Set in production |

---

## Rate Limiting (Express middleware)

| Limiter | Window | Max | Key |
|---|---|---|---|
| Submit burst | 10 s | 1 | user ID or IP |
| Submit sustained | 60 s | 20 (auth) / 10 (anon) | user ID or IP |
| Global API | 60 s | 200 | IP |
| Auth endpoints | 15 min | 20 | IP |

---

## Code Pre-flight Validation

Patterns checked in `middleware/security.js` before every submission:

| Pattern | Action |
|---|---|
| Bash fork-bomb `:(){ :|: }` | Block (400) |
| Python `os.fork()` in loop | Block (400) |
| C infinite `fork()` loop | Block (400) |
| `/dev/full`, `/dev/zero` write | Block (400) |
| Network imports | Log only |
| Shell exec attempts | Log only |

---

## Pre-exam Checklist

- [ ] Run `docker compose up -d` and check backend logs for `✅ All security checks passed`
- [ ] Confirm `JUDGE0_AUTH_TOKEN` is set in `.env`
- [ ] Confirm `AUTHN_TOKEN` matches in `judge0.conf`
- [ ] Confirm port 2358 is not publicly reachable: `curl http://<public-ip>:2358/system_info` should timeout
- [ ] Confirm port 6379 is not publicly reachable: `redis-cli -h <public-ip>` should refuse
- [ ] Review faculty permissions for exam-specific roles
