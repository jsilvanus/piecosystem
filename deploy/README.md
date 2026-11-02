# Compose stacks per PC

| Stack | Host | Runs |
|---|---|---|
| [`operator-pc/`](operator-pc) | Operator PC (Windows, Docker Desktop) | liturgos-auditor STT, LCYT fat fffleet worker (ffmpeg, DSK, perception), ollama |
| [`assisting-pc/`](assisting-pc) | Assisting PC (gaming laptop 2) | LCYT fat fffleet worker (ffmpeg, DSK, perception) |

The **fffleet orchestrator runs on the Pi** (kirkonpi, wired `192.168.1.78:5000`), not in these stacks; both workers register with it
(`FFFLEET_ORCHESTRATOR_URL`). Each worker must advertise an address the Pi can reach (`FFFLEET_ADVERTISE_URL`, the PC's LAN IP) and share
`FFFLEET_WORKER_TOKEN` with the orchestrator.

**Roles and priority.** Capabilities `usb` (Pi only), `normal` (all three), `dsk` and `gpu` (operator PC); placement rules and the Pi's own orchestrator and worker are in [`fleet-pi/`](fleet-pi), the plan in [`../docs/fleet-worker-roles.md`](../docs/fleet-worker-roles.md). Each stack sets `FFFLEET_WORKER_ID` and `FFFLEET_CAPABILITIES`; `FFFLEET_PRIORITY` is a pass-through fffleet does not read.

Images: `ghcr.io/jsilvanus/lcyt-fleet-worker` (from live-captions-yt, replaces separate DSK and perception workers),
`ghcr.io/jsilvanus/liturgos-auditor-stt` (`-cuda` tag for GPU), `ollama/ollama`.

Validate without starting anything: `docker compose --env-file .env.example config`. Not yet run on the real PCs; the GPU overlays and the
published image tags are unverified.
