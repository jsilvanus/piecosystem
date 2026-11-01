# Compose stacks per PC

| Stack | Host | Runs |
|---|---|---|
| [`operator-pc/`](operator-pc) | Operator PC (Windows, Docker Desktop) | liturgos-auditor STT, LCYT fat fffleet worker (ffmpeg, DSK, perception), ollama |
| [`assisting-pc/`](assisting-pc) | Assisting PC (gaming laptop 2) | LCYT fat fffleet worker (ffmpeg, DSK, perception) |

The **fffleet orchestrator runs on the Pi** (kirkonpi, wired `192.168.1.78:5000`), not in these stacks; both workers register with it
(`FFFLEET_ORCHESTRATOR_URL`). Each worker must advertise an address the Pi can reach (`FFFLEET_ADVERTISE_URL`, the PC's LAN IP) and share
`FFFLEET_WORKER_TOKEN` with the orchestrator.

**Priority.** Intended order: DSK jobs assisting PC (1) then operator PC (2); normal ffmpeg stream management assisting (1), operator (2), Pi (3);
Pi-only hardware jobs (Hama capture etc.) on the Pi only. fffleet's `workerPreference` (ordered worker ids, strict allowlist) does the ordering, using
the worker ids `assisting-pc`, `operator-pc` and the Pi's id. Each stack sets `FFFLEET_WORKER_ID`, `FFFLEET_CAPABILITIES` (`host:`, `tier:`) and a
`FFFLEET_PRIORITY` pass-through that fffleet does not read yet; the job-priority work decides what consumes them.

Images: `ghcr.io/jsilvanus/lcyt-fleet-worker` (from live-captions-yt, replaces separate DSK and perception workers),
`ghcr.io/jsilvanus/liturgos-auditor-stt` (`-cuda` tag for GPU), `ollama/ollama`.

Validate without starting anything: `docker compose --env-file .env.example config`. Not yet run on the real PCs; the GPU overlays and the
published image tags are unverified.
