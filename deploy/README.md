# Compose stacks per PC

| Stack | Host | Runs |
|---|---|---|
| [`operator-pc/`](operator-pc) | Operator PC (Windows, Docker Desktop) | liturgos-auditor STT, LCYT fat fffleet worker (ffmpeg, DSK, perception), piperception detection worker (`operator-pc-detect`, CPU YOLOX), ollama, VersityGW (S3 backend of pistorage) |
| [`assisting-pc/`](assisting-pc) | Assisting PC (gaming laptop 2) | LCYT fat fffleet worker (ffmpeg, DSK, perception) |

The **fffleet orchestrator runs on the Pi** (wired `10.0.0.78:5000`), not in these stacks; both workers register with it
(`FFFLEET_ORCHESTRATOR_URL`). Each worker must advertise an address the Pi can reach (`FFFLEET_ADVERTISE_URL`, the PC's LAN IP) and share
`FFFLEET_WORKER_TOKEN` with the orchestrator.

**Roles and priority.** Capabilities `usb,normal,host:pi,arch:arm64` (Pi 4, 2 stream slots), `normal,dsk,gpu,nvenc,desktop,host:operator-pc` (Operator PC, 8 stream slots), and `normal,gpu,nvenc,host:assisting-pc` (Assisting CC, 4 stream slots); placement rules and the Pi's own orchestrator and worker are in [`fleet-pi/`](fleet-pi), the full SFMBG migration and camera scaling plan in [`../docs/fleet-worker-roles.md`](../docs/fleet-worker-roles.md). Each stack sets `FFFLEET_WORKER_ID`, `FFFLEET_CAPABILITIES`, and `FFFLEET_SLOTS`.

Images: `ghcr.io/jsilvanus/lcyt-fleet-worker` (from live-captions-yt, replaces separate DSK and perception workers),
`ghcr.io/jsilvanus/liturgos-auditor-stt` (`-cuda` tag for GPU), `ollama/ollama`, `versity/versitygw`, `amazon/aws-cli` (one-shot bucket creation).

**VersityGW / pistorage.** The operator-PC stack runs `versitygw` (posix backend, S3 on port `7070`, data in the `versitygw-data` volume) and a one-shot `versitygw-init` that creates the `pistorage` bucket. Set `VERSITYGW_ACCESS_KEY` / `VERSITYGW_SECRET_KEY` in `.env`, then on the Pi set `PISTORAGE_S3_ENDPOINT=http://<operator PC LAN address>:7070`, `PISTORAGE_S3_BUCKET=pistorage` and the same keys as `PISTORAGE_S3_ACCESS_KEY` / `PISTORAGE_S3_SECRET_KEY` (path-style stays on). Moving to Hetzner Object Storage later changes only those variables. Unverified: nothing has been run against a real VersityGW yet.

Validate without starting anything: `docker compose --env-file .env.example config`. Not yet run on the real PCs; the GPU overlays and the
published image tags are unverified.

**Fat worker image.** `docker/fat-worker/` builds `ghcr.io/jsilvanus/pieco-fleet-worker`: the published LCYT fat worker plus yt-dlp with fffleet's `download` executor and a virtual PulseAudio sound card (`pieco`) for capturing a browser's sound. It is built by hand: GitHub, Actions, "Fat worker image", Run workflow (inputs: base tag, image tag, push or build only). The stacks above still use `lcyt-fleet-worker` until you switch their `image:` line. It also carries the `pieco-page` executor (`docker/fat-worker/executors/pieco-page`, job type `page`): open any http(s) page in Chromium and publish it, with its sound if asked, to any `rtsp://` or `rtmp(s)://` address (MediaMTX or other). Job spec: `spec.page = { url, output: { url }, width?, height?, fps? (default 10), audio?, encoder? (`x264` default, `nvenc` for a GPU worker; worker default `PIECO_PAGE_ENCODER`), background?, frames? }`. `background` (`#RRGGBB`) is for keying: H.264 over RTSP has no alpha, so the page is captured transparent as PNG and laid over that exact flat colour in ffmpeg for the receiver to key out (the page must not paint its own background); `frames` is `jpeg` (default) or `png` (default when `background` is set). Set `PIECO_PAGE_ALLOW_HOSTS` (comma-separated host names) on the worker to limit which hosts a job may open or publish to. Unit-tested with a fake browser and ffmpeg; the encode arguments were checked with a real ffmpeg (picture only); not run with real Chromium, PulseAudio or MediaMTX, and the image has not been built.

**GPU variant.** The same Dockerfile builds `ghcr.io/jsilvanus/pieco-fleet-worker-gpu` (`GPU=1`, NVENC default encoder; the build fails if the image's ffmpeg has no `h264_nvenc`). Pick `cpu`, `gpu` or `both` when running the workflow. Use the GPU image only on a GPU host with the NVIDIA runtime (the `compose.gpu.yml` overlays reserve the device); the compose stacks still point at `lcyt-fleet-worker` until you change `image:`. Whether Debian's ffmpeg in the base image has NVENC is unchecked.
