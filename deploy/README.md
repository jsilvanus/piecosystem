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

**Fat worker image.** `docker/fat-worker/` builds `ghcr.io/jsilvanus/pieco-fleet-worker`: the published LCYT fat worker plus yt-dlp with fffleet's `download` executor and a virtual PulseAudio sound card (`pieco`) for capturing a browser's sound. It is built by hand: GitHub, Actions, "Fat worker image", Run workflow (inputs: base tag, image tag, push or build only). The stacks above still use `lcyt-fleet-worker` until you switch their `image:` line. It also carries the `pieco-page` executor (`docker/fat-worker/executors/pieco-page`, job type `page`): open any http(s) page in Chromium and publish it, with its sound if asked, to any `rtsp://` or `rtmp(s)://` address (MediaMTX or other). Job spec: `spec.page = { url, output: { url }, width?, height?, fps? (default 10), audio?, encoder? (`x264` default, `nvenc` for a GPU worker; worker default `PIECO_PAGE_ENCODER`), background? }`. Set `PIECO_PAGE_ALLOW_HOSTS` (comma-separated host names) on the worker to limit which hosts a job may open or publish to. Unit-tested with a fake browser and ffmpeg; the encode arguments were checked with a real ffmpeg (picture only); not run with real Chromium, PulseAudio or MediaMTX, and the image has not been built.
