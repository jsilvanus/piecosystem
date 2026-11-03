# Projects Catalog

This catalog details all active projects within the Raspberry Pi production ecosystem at Riihimäen Keskuskirkko.

> **Seam projects** (`layer: Seam`) are not `pi*` services and sit outside the Pi layers: `virtual-screen-streamer`, `canva-pieco-app` (formerly `picanva`), `liturgos-auditor`, `web-radio-relay`, `fffleet`, `keskuskirkko`, `saarnavideo` (post-stream editing), `notify-core` (library), `pisim` (simulator). `live-captions-yt` is a reference, not a seam. See the README.

---

## Catalog Summary Table

| Project | Primary Layer (Proposed) | Refined Layer (4+1) | Core Function | Tech Stack | Default Port(s) |
|---|---|---|---|---|---|
| [`picam`](file:///d:/picam) | Hardware connections | Layer 1: Southbound HW | VISCA & CGI PTZ camera controller | Node 24, Fastify, TS | `3102` (VISCA: `52381`, CGI: `80`) |
| [`canva-pieco-app`](file:///d:/canva-pieco-app) (formerly `picanva`) | Media creation | **Seam** (not in the Pi layers) | Canva App plugin for liturgical slides | TS, Canva SDK, React | Canva Sandbox |
| [`virtual-screen-streamer`](file:///d:/virtual-screen-streamer) | Media creation | **Seam** (not in the Pi layers) | Windows virtual monitor & RTMP sender (formerly `picompanion`) | C#, .NET, IddCx Driver | RTMP out |
| [`picontrol`](file:///d:/picontrol) | Event orchestration | +1 Control Plane | Operator Web UI housing & CLI | Node 22+, React, Vite | `5173` dev (UI dev: `5173`) |
| [`piui`](file:///d:/piui) | UI Component Library | +1 Presentation Plane | Shared atomic & molecular UI components library (`@piecosystem/piui`) | Node 22+, TypeScript, Tailwind | Library / NPM |
| [`picontrol-mcp`](file:///d:/picontrol-mcp) | Event orchestration | +1 Control Plane | MCP Server for AI agents (`pi://`) | Node 24, Fastify, TS | `3600` |
| [`piagent`](file:///d:/piagent) | Agent Infrastructure | +1 Agentic Plane | Agent runtime & bus (LangGraph, Vercel AI SDK, MCP bridge, preemption) | Node 24, Fastify, TS | `3301` |
| [`piembed`](file:///d:/piembed) | Event orchestration / AI | Layer 3: Semantic Vector Engine | Vector embedding & semantic cue matching service (Ollama + Hugging Face ONNX) | Node 22+, Fastify, TS | `3300` |
| [`pigateway`](file:///d:/pigateway) | Hardware connections | Layer 1 & 3: HW & State | Central device broker & SSE bus | Node 24, Fastify, TS | `3000` (UDP: `3101`, `3102`, `40000`; TCP: `6600`, `6601`) |
| [`piencoder`](file:///d:/piencoder) | Hardware connections | Layer 1: Southbound HW | Multi-unit hardware streaming encoder controller (Matrox Monarch HDX) | Node 22+, Fastify, TS | `3104` |
| [`pigraphics`](file:///d:/pigraphics) | Media creation | Layer 2: Graphics & Streaming | Broadcast graphics engine, CSS animations, ATEM keying & Fill/Key streaming | Node 22+, Fastify, TS | `3201` |
| [`pitally`](file:///d:/pitally) | Hardware connections | Layer 1: Southbound HW | Tally-Ma wireless tally controller | Node 22+, Fastify, TS | `3107` (UDP: `21324`) |
| [`pipoe`](file:///d:/pipoe) | Hardware connections | Layer 1: Southbound HW | PoE switch controller (PLANET GS-4210-16P2S, SNMP): port status, PoE on/off/cycle | Node 22+, Fastify, TS | `3108` (SNMP: `161`) |
| [`pimatrix`](file:///d:/pimatrix) | Hardware connections | Layer 1: Hardware Video Matrix | Video routing matrix, compositor & display engine | Node 24, GStreamer, C++ | `8080`, `8081` (RTSP/WebRTC) |
| [`piprogram`](file:///d:/piprogram) | Media creation | Layer 2 & 4: Media & Stage | Hymns, slides, PPTX, stage display | Node 24, Fastify, TS | Configurable Fastify |
| [`pirundown`](file:///d:/pirundown) | Event orchestration | Layer 3: Orchestration | Deterministic service rundown engine | Node 22+, Fastify, TS | `3400` |
| [`pirundown-designer`](file:///d:/pirundown-designer) | Event orchestration / Authoring | +1 Control Plane & Staging | Visual authoring & cue-sheet designer for Rundown v2 YAML | Node 22+, React, Vite, Fastify | `3610` |
| [`pidirector`](file:///d:/pidirector) | Event orchestration / Directing | Layer 3 & +1 AI Director | Local AI stream director & co-pilot (Ollama, MCP auth, Rundown v2) | Node 24, Fastify, TS, Ollama | `3401` |
| [`pisound`](file:///d:/pisound) | Hardware connections | Layer 1: Southbound HW | BSS Soundweb London DSP audio router | Node 22+, Fastify, TS | `3105` (Soundweb: `1023`) |
| [`pispace`](file:///d:/pispace) | Event orchestration | Layer 3: Spatial Context | 3D venue digital twin & FreeD raycaster | Node 22+, Fastify, TS | `3203` |
| [`piswitch`](file:///d:/piswitch) | Hardware connections | Layer 1 & 2: HW & Mixer | Video switcher microservice (ATEM & soft) | Node 22+, Fastify, TS | `3103` (ATEM: `9910`) |
| [`pitube`](file:///d:/pitube) | Consumer edge | Layer 4: Presentation/Egress | YouTube Live lifecycle & delayed captions | Node 22+, TS | `3500` |
| [`pivoice`](file:///d:/pivoice) | Hardware connections / Media | Layer 1 & 2: HW Capture/DSP | ALSA audio capture, Silero VAD, fanout | Node 24, ONNX Runtime | REST API & UDP Telemetry |
| [`piperception`](file:///d:/piperception) | Media creation | Layer 2: Video Perception | Real-time YOLOX/ONNX person detection & tracking | Node/Python, ONNX | Ingests video, outputs 2D bboxes |
| [`pistorage`](file:///d:/pistorage) | Storage | Storage: Shared Object Storage | Durable file storage: S3-compatible backend (VersityGW now, Hetzner later) behind a read-through disk cache | Node 24, Fastify, TS | `3700` |
| [`pinotify`](file:///d:/pinotify) | Consumer edge | Layer 4: Presentation/Egress | Notifications from ecosystem events, built on `notify-core` (skeleton, not installed on the Pi) | Node, TS | TBD |
| [`notify-core`](file:///d:/notify-core) | Shared library | **Seam** (library) | Notification engine library (`@jsilvanus/notify-core`, EUPL-1.2, on npm) | Node, ESM | Library / NPM |
| [`pisim`](file:///d:/pisim) | Coordination | **Seam** (test tooling) | Ecosystem simulator: fake devices and events for testing without hardware | Node, TS | N/A |
| [`liturgos-auditor`](file:///d:/liturgos-auditor) | Media creation | Layer 2: Speech-to-Text | Real-time speech transcription (Whisper STT) | Python / Faster-Whisper | Ingests PCM, outputs text tokens |
| [`piecosystem`](file:///d:/piecosystem) | Coordination | +1 Governance Plane | Architecture, roadmap & coordination | Node, Markdown | N/A |

---

## Detailed Project Profiles

### 1. picam
- **Path**: `D:\picam`
- **Role**: High-precision PTZ camera controller service and CLI for VISCA-over-IP and HTTP/CGI cameras (AVer, Sony).
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Hardware Interfacing)
- **Key Capabilities**:
  - Direct binary VISCA packet encoding/decoding over UDP (`52381`) for pan/tilt velocity drive, zoom, focus, and power.
  - Enriched hardware presets management (`0–254`) storing both feed thumbnails and FreeD optical ground truth (`pan`, `tilt`, `zoom`, `focus`), persisted to `data/presets.json` and `data/thumbnails/`.
  - Automatic FreeD capture on preset save by querying `pigateway` (`GET /api/v1/cameras/:id/freed`).
  - Real-time settling & motion tracking (`CameraSettlingTracker`): ingests FreeD telemetry, tracks multi-frame velocity, and emits `action: "preset:settled"` onto the event bus when travel physically halts.
  - AVer SmartFrame auto-framing toggle and FreeD tracking target configuration.
  - Defocus near-limit blur privacy toggle.
- **Protocols & Interfaces**: Fastify REST API (`3300`), VISCA UDP (`52381`), HTTP CGI (`80`).

---

### 2. canva-pieco-app (formerly picanva)
- **Path**: `D:\canva-pieco-app`
- **Role**: Official Canva App (SDK plugin) enabling worship teams to prepare and project liturgy slides directly from Canva.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: Seam (runs inside Canva, meets `pigateway` over HTTPS)
- **Key Capabilities**:
  - Connects Canva directly to `pigateway` and `piprogram`.
  - Stages visual media, sets up display routes in `pimatrix`, and triggers live slide advancing during worship.
  - Runs in Canva's web sandbox without requiring external local browser extensions.

---

### 3. virtual-screen-streamer (formerly picompanion)
- **Path**: `D:\virtual-screen-streamer`
- **Role**: Windows program on the operator PC that streams several virtual screens as RTMP into PiMatrix. Not a Node project and not a Pi service.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: **Seam** (outside the Pi layers; meets the ecosystem at RTMP)
- **Key Capabilities**:
  - Creates virtual display monitors using Windows Indirect Display Driver (`IddCx`).
  - Encodes and broadcasts virtual monitor output via RTMP directly into `pimatrix`.
  - Enables church PowerPoint presentations to stream cleanly into video composites without occupying physical monitor ports.

---

### 4. picontrol
- **Path**: `D:\picontrol`
- **Role**: Centralized web UI console and unified CLI housing for human broadcast operators.
- **Layers**:
  - *Proposed*: Event orchestration
  - *Refined*: +1 Control & Observability Plane
- **Key Capabilities**:
  - Unified interface aggregating camera controls, ATEM switching, tally lights, audio telemetry, and program cues.
  - Connects to `pigateway` SSE bus for real-time status synchronization.
  - Modular Vite/React single-page application and Node CLI.

---

### 5. picontrol-mcp
- **Path**: `D:\picontrol-mcp`
- **Role**: Model Context Protocol (MCP) server exposing the entire Pi stack to AI agents (Claude, Gemini, Antigravity).
- **Layers**:
  - *Proposed*: Event orchestration
  - *Refined*: +1 Control & Observability Plane (Agentic Interface)
- **Key Capabilities**:
  - Streamable HTTP stateless MCP server on port `3200`.
  - Exposes domain-grouped tools: `routing_*`, `camera_*`, `atem_*`, `program_*`, `composites_*`, `voice_*`, `youtube_*`, `tally_*`, `radio_*`.
  - Exposes state via `pi://` URI resources (`pi://routing/matrix`, `pi://atem`, `pi://youtube/status`, `pi://tally/lights`).
  - Granular RBAC (`viewer`, `operator`, `admin`) with secret masking.

---

### 6. pigateway
- **Path**: `D:\pigateway`
- **Role**: The single hardware gateway process on the Raspberry Pi holding physical device connections and state caches.
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Gateway) & Layer 3 (State Broker)
- **Key Capabilities**:
  - Southbound broker for ATEM switchers, VISCA/CGI PTZ cameras, AMX master (NetLinx TCP `6501`/`6600`), and Matrox Monarch HDX encoder.
  - Authoritative Server-Sent Events bus (`GET /api/v1/events`).
  - Telemetry ingest for PiVoice UDP (`3101`) and PiSound UDP (`3102`).
  - **Rule**: Small, fast, boring Fastify daemon; never touches or buffers video/audio payload bytes.

---

### 6.5. piencoder
- **Path**: `D:\piencoder`
- **Role**: Multi-unit hardware streaming encoder controller microservice (Matrox Monarch HDX).
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Hardware Interfacing)
- **Key Capabilities**:
  - Controls and monitors multiple physical hardware streaming encoder appliances (`/api/v1/encoder/:number`).
  - Dual-channel stream and record orchestration (`encoder1`, `encoder2`, or `both`).
  - Serialized busy retry queueing handling Monarch firmware `RETRY` responses.
  - Video and audio lock status queries, bitrate configuration, and RTMP destination management.
- **Protocols & Interfaces**: Fastify REST API (`3109`), SSE stream (`/events`), HTTP/HTTPS device control.

---

### 7. pitally
- **Path**: `D:\pitally`
- **Role**: Tally light controller service and CLI for Tally-Ma wireless tally units.
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Hardware Interfacing)
- **Key Capabilities**:
  - mDNS hostname resolution (`tally01.local`–`tally08.local`) with automatic static IP fallback.
  - HTTP endpoints for solid tally states (`/PGM`, `/PRV`, `/NONE`), color cues (`/COLOR`), and talent call alerts.
  - 29-byte binary UDP protocol (`port 21324`) for multi-segment LED group animations (showing concurrent YouTube, ATEM, and projector statuses).

---

### 8. pimatrix
- **Path**: `D:\pimatrix`
- **Role**: Raspberry Pi video routing matrix, effects processor, and hardware display controller.
- **Layers**:
  - *Proposed*: Hardware connections (Video matrix crossbar & display sink infrastructure)
  - *Refined*: Layer 1 (Video Routing Infrastructure & Hardware Display Sink)
- **Key Capabilities**:
  - **Video Matrix Crossbar**: Routes video sources (`cam1`–`cam3`, `hama`, `rtmp1`/`rtmp2`, `PiPGM1`–`PiPGM3`) to display outputs (`hdmi0`, `hdmi1`, `multiview`).
  - **Source Effects**: Applies real-time crop, rotation, and fade-to-black slates per source via MediaMTX relays.
  - **Hardware Display Driver**: Directly drives the Pi's physical HDMI outputs (DRM/KMS) for sanctuary projectors and confidence monitors.
  - **Multiview**: Generates responsive multi-channel monitoring multiviews for mobile and desktop browser operators.
  - **Slide Key Composites**: 
    - `compose1`: Active HDMI key page rendering a slide box (left/right, scale 0.6–1.0, chroma/luma keying).
    - `compose2` (Deprecated): Legacy ATEM media-pool output. ATEM media pool and media player still management has migrated to `piswitch`'s dedicated `MediaPoolManager`.
  *(Note: It does not generate lower thirds or generic broadcast PiPs; DSK keying is handled on the ATEM switcher or in presentation software).*

---

### 9. piprogram
- **Path**: `D:\piprogram`
- **Role**: Liturgical content management and distribution: hymns, sermon slides, PPTX parsing, and stage display.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: Layer 2 (Content Staging) & Layer 4 (Stage Presentation)
- **Key Capabilities**:
  - Hymn lyrics and liturgical text database formatted for live presentation.
  - PPTX conversion pipeline for sermon slide decks.
  - Generates web-based Stage Page confidence monitors for pastors, cantors, and musicians.
  - Canva asset ingestion and staging.
  - **`piswitch` Media Pool Integration**: Client (`PiSwitchClient`) and automated slide sync that pre-renders PNG stills, uploads to `piswitch`'s circular buffer slots, and advances ATEM Media Player 1 on slide progression (`POST .../sync-piswitch`).

---

### 10. pirundown
- **Path**: `D:\pirundown`
- **Role**: Deterministic service rundown and cue execution engine.
- **Layers**:
  - *Proposed*: Event orchestration
  - *Refined*: Layer 3 (Orchestration & Workflow Plane)
- **Key Capabilities**:
  - Parses and executes service cue sheets using Rundown v2 YAML syntax.
  - `varfetch` runtime variable substitution for hymns, readings, and pastor names.
  - Automated timed and manual cue progression triggering downstream camera presets, slide changes, and audio mutes.

---

### 11. pisound
- **Path**: `D:\pisound`
- **Role**: Sound and microphone controller service and CLI for BSS Soundweb London (HiQnet).
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Hardware Interfacing)
- **Key Capabilities**:
  - Connects to BSS Soundweb BLU-100 DSP over TCP `1023` (London Direct Inject).
  - Manages wireless handheld mics (Kapula 1–4), headset madonnas (Madonna 1–10), and sanctuary wired mics (Altar, Lectern, Pulpit, Organ, Choir).
  - Switches DSP routing presets between sanctuary automixer and SQ-5 live mixing console.
  - Emits telemetry over UDP (`3102`) to `pigateway`.

---

### 12. pispace
- **Path**: `D:\pispace`
- **Role**: Spatial engine, geometric digital-twin service, and raycaster for the sanctuary venue.
- **Layers**:
  - *Proposed*: Event orchestration
  - *Refined*: Layer 3 (Spatial Context & World Model)
- **Key Capabilities**:
  - Venue Coordinate System $(X, Y, Z)$ centered at communion rail with defined zones (`pulpit`, `lectern`, `altar`, `communion_rail`, `choir`).
  - Raycasting: combines FreeD camera tracking telemetry (`UDP 40000`) and 2D bounding boxes (from `piperception`) to calculate exact 3D venue positions.
  - Inverse PTZ solver: calculates required pan, tilt, zoom angles to frame any target coordinate or named zone with requested shot types (`wide`, `medium`, `tight`, `close_up`).
  - Emits real-time spatial events (`zone_enter`, `zone_exit`, `subject_moved`) via SSE.
- **Protocols & Interfaces**: Fastify REST API and SSE on port `3108`.

---

### 13. piperception
- **Path**: `D:\piperception`
- **Role**: Dedicated computer vision microservice providing real-time neural detection, tracking, and 2D bounding box extraction.
- **Layers**:
  - *Proposed*: Media creation / Video analysis
  - *Refined*: Layer 2 (Media Pipeline & Computer Vision)
- **Key Capabilities**:
  - Real-time person detection using YOLOX on ONNX Runtime CPU/GPU.
  - Multi-person tracking with persistent track IDs (ByteTrack with two-stage association).
  - Normalized 2D bounding boxes (`[x, y, w, h]`), confidence scores, and crop framing.
  - Feeds 2D detections into `pispace` (`POST /api/v1/spatial/tracks`) for 3D world projection and camera ray intersection.
  - Standalone Fastify server, Web UI monitor, and CLI `piperception`.
- **Protocols & Interfaces**: Fastify REST API & SSE on port `3110`.

---

### 14. piswitch
- **Path**: `D:\piswitch`
- **Role**: Universal video mixer microservice and CLI for Raspberry Pi (ATEM hardware switchers, software mixing, phone camera feeds, and ATEM Media Player/Pool).
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Hardware Switcher Driver, Media Pool & Software Mixer)
- **Key Capabilities**:
  - Standardized REST and SSE interface (`/api/v1/video-mixer/*` and backward-compatible `/api/v1/atem/*`).
  - Controls Blackmagic ATEM SDI / Mini Extreme ISO via UDP `9910`.
  - **ATEM Media Pool & Media Player Handling**:
    - **6-Slot Circular Slide Buffer (Slots 1–6)**: Sliding window queue for `piprogram` slides with automated garbage collection (clears stale $N-2$ slot after progressing +2 steps).
    - **18-Slot Graphics Pool (Slots 7–24)**: Dedicated slots for broadcast lower-thirds, speaker straps, scripture readings, and banners.
    - Media Player source switching (`PUT .../media-players/:player/source` - 0ms instant cut).
  - Features local Pi Software Mixer fallback using GStreamer/MediaMTX for mobile phone cameras (WebRTC/SRT).

---

### 15. pitube
- **Path**: `D:\pitube`
- **Role**: YouTube broadcast lifecycle manager and synchronized live caption streamer.
- **Layers**:
  - *Proposed*: Consumer edge
  - *Refined*: Layer 4 (Presentation & Egress Delivery)
- **Key Capabilities**:
  - OAuth 2.0 authenticated YouTube Data API v3 lifecycle transitions (`ready` -> `testing` -> `live` -> `complete`).
  - Consumes live speech-to-text transcripts from `pigateway` SSE bus.
  - Synchronizes captions with YouTube's mandatory 30-second broadcast latency window and streams CEA-608/708 HTTP POST captions.
  - Reports stream status to `PUT /api/v1/youtube/status` on `pigateway`.

---

### 16. pivoice
- **Path**: `D:\pivoice`
- **Role**: Headless USB microphone audio capture, VAD analysis, and multi-consumer fanout.
- **Layers**:
  - *Proposed*: Hardware connections / Media creation
  - *Refined*: Layer 1 (ALSA Capture) & Layer 2 (Audio DSP & Fanout)
- **Key Capabilities**:
  - Captures Hama USB microphone once via ALSA and splits into:
    1. Primary PCM output for web radio publishing (`web-radio-relay`).
    2. 16 kHz mono S16LE stream for speech recognition (`liturgos-auditor`).
  - In-process Silero VAD neural network on ONNX Runtime CPU for speech probability detection.
  - Continuous, scheduled, or voice-threshold auto-probing capture policies.
  - Sends binary UDP telemetry (`port 3101`) to `pigateway`.

---

### 17. piecosystem (This Repository)
- **Path**: `D:\piecosystem`
- **Role**: Centralized architecture repository, project planning, multi-repo status tracking, and developer coordination.
- **Layers**:
  - *Proposed*: System coordination
  - *Refined*: +1 Governance & Coordination Plane
- **Key Capabilities**:
  - Architectural source of truth and layer definition.
  - Cross-repo status tools (`scripts/ecosystem-status.mjs`).
  - Shared API contract schemas, port registries, and deployment roadmaps.

---

### 18. pirundown-designer
- **Path**: `D:\pirundown-designer`
- **Role**: Visual authoring and cue-sheet designer application for Rundown v2 YAML serving Riihimäen Keskuskirkko.
- **Layers**:
  - *Proposed*: Event orchestration / Authoring
  - *Refined*: +1 Control Plane & Content Staging
- **Key Capabilities**:
  - Visual liturgical section grouping (*Johdanto*, *Sana*, *Rukous*, *Ehtoollinen*, *Päätös*) and cue item builder.
  - Multi-Speaker / Priest Registry enforcing the role-only invariant (*if name is missing, lower-thirds only display the role*).
  - Cue / trigger configurator with fuzzy-match threshold slider (0.80 default) and sound event triggers.
  - Action palette (`cam`, `switch`, `graphic`, `pipgm`, `tally`, `alternate`, `var`).
  - Lectionary & Kirkkovuosi (varfetch) connector integration.
  - Bi-directional live synchronization with syntax-highlighted YAML editor and real-time Zod schema & variable interpolation validation.
  - Built-in Finnish Lutheran template library (*Messu*, *Sanajumalanpalvelus*).
  - Direct HTTP push egress: `POST http://localhost:3400/api/v1/rundown/load`.
- **Protocols & Interfaces**: Fastify REST API & Web UI (`3410`), CLI `pirundown-designer`.

---

## Adjacent Media & Infrastructure Projects

### 19. liturgos-auditor
- **Path**: `D:\liturgos-auditor`
- **Role**: Self-hosted speech-to-text (STT) inference service (default language Finnish) for transcribing live worship streams and sermons, with custom acoustic model tuning.
- **Layers**: Refined Layer 2 (Media Pipeline & STT) & Layer 4 (Egress Text)
- **Key Capabilities**:
  - FastAPI service wrapping `faster-whisper` (CTranslate2) with GPU/CPU execution.
  - Two-priority inference queue: synchronous live chunked transcription (`/inference`, `/v1/audio/transcriptions`) prioritized ahead of background batch sermon jobs (`/v1/jobs`).
  - Pull transcription: connects directly to live `rtsp://` or `srt://` streams and emits Server-Sent Events (`/v1/live`).
  - Model registry CLI (`auditor-stt`) for crowd-sourced voice dataset training, LoRA fine-tuning, and model promotion.
- **Protocols & Interfaces**: FastAPI REST & SSE on port `8090`.

---

### 20. web-radio-relay
- **Path**: `D:\web-radio-relay`
- **Role**: Web radio audio relay: live HLS stream stripping, server-enforced listener delay, and synchronized live captions for parish web listeners.
- **Layers**: Refined Layer 4 (Presentation & Consumer Egress)
- **Key Capabilities**:
  - Pulls audio input (local RTMP or RTSP from MediaMTX), strips video via FFmpeg (`-vn`), generates HLS audio stream.
  - Automatically archives each broadcast as a timestamped MP3.
  - Delayed HLS playlist generator with configurable listener delay (e.g. matching church PA delay).
  - Synchronized caption buffer delivering timed closed captions aligned with listener delay.
  - Embeddable vanilla-JS web player widget (`web-radio-relay.js`).
- **Protocols & Interfaces**: Nginx HLS on port `8080`, Node.js API on port `3000`, RTMP ingest on port `1935`.

---

### 21. fffleet
- **Path**: `D:\fffleet`
- **Role**: Fast Forward Fleet: distributed FFmpeg job queue, worker daemon pool, and orchestrator running renders and transcoding across church machines and cloud nodes.
- **Layers**: Refined Layer 2 (Asynchronous Media Processing & Fleet Transcoding)
- **Key Capabilities**:
  - Unified client library (`fffleet`) with single job contract (`kind: batch | stream`).
  - Local runner fallback (`local`) or cluster orchestrator (`fffleet-orchestrator`).
  - Autoscaling worker pools (process workers, Docker containers, Hetzner Cloud instances).
  - Hardware probing and capability matching (e.g. S3 staging, `ffprobe`, `yt-dlp` download jobs).
  - Real-time job event streaming via Server-Sent Events.
- **Protocols & Interfaces**: HTTP job API and dashboard (`/ui/`) on port `5000`, worker endpoints on ports `5101+`.

---

### 22. mediamtx
- **Configuration**: `D:\deploy-media\config\mediamtx.yml`
- **Role**: Real-time zero-latency media routing proxy, handling camera ingest, RTMP relay, and multi-protocol fanout.
- **Layers**: Southbound & Media Data Plane
- **Key Capabilities**:
  - Zero-latency bridging between RTSP, RTMP, WebRTC (Whip/Whep), and HLS.
  - Ingests HDMI capture dongles (Hama via FFmpeg) and IP camera feeds.
  - Fans out live video to `pimatrix` compositing, `piperception` detection, and `web-radio-relay`.
- **Protocols & Interfaces**: RTSP (`8554`), RTMP (`1935`), WebRTC (`8889`), HLS (`8888`).

---

### 23. deploy-media
- **Path**: `D:\deploy-media`
- **Role**: Unified Docker Compose production and development deployment orchestration for church media services.
- **Layers**: +1 Governance & Deployment Automation
- **Key Capabilities**:
  - Declarative stack combining `mediamtx`, `auditor-stt` (CPU or NVIDIA CUDA GPU), `fffleet-orchestrator`, `fffleet-worker-ytdlp`, and S3 storage (`versitygw`).
  - Overlays: `compose.local.yml` (localhost dev), `compose.gpu.yml` (CUDA acceleration), `compose.traefik.yml` (TLS & reverse proxy).
  - CLI `./deploy` for updates, status, logs, and container lifecycle.

---

### 24. pidirector
- **Path**: `D:\pidirector`
- **Role**: Local AI broadcast director and intelligent co-pilot for church live streams using local LLMs (Ollama) and role-based MCP execution.
- **Layers**: Refined Layer 3 (Orchestration & Workflow) & +1 Agentic Control Plane
- **Key Capabilities**:
  - Multi-sensor event synthesis ingesting VAD/audio (`pivoice`), Finnish transcripts (`liturgos-auditor`), YOLOX detections (`piperception`), and 3D stage zones (`pispace`).
  - Local LLM inference via Ollama (`llama3.2:3b`, `qwen2.5:7b-instruct`) with structured JSON schema outputs.
  - Guided by Rundown v2 AI instructions (global church broadcast policies + per-section/item cues).
  - Authenticated least-privilege MCP client connecting to `picontrol-mcp` under dedicated `director` role.
  - Autonomous director mode (live camera presets and ATEM cuts) or Advisory co-pilot mode for human operators.
  - Architectural spec: [pidirector-architecture-plan.md](pidirector-architecture-plan.md).
- **Protocols & Interfaces**: Fastify REST & SSE on port `3450`.

---

### 25. piagent
- **Path**: `D:\piagent`
- **Role**: Centralized Agent Infrastructure Plane providing LangGraph.js multi-agent state machines, Vercel AI SDK Generative UI streaming, Ollama priority scheduling, and AbortController live interruption.
- **Layers**: +1 Agentic Control Plane
- **Key Capabilities**:
  - Bridges Ollama inference with `picontrol-mcp` tool execution with user/service role-based token forwarding.
  - SSE Generative UI wire streaming consumed by React `useChat` in `picontrol`.
  - Priority scheduler and VRAM arbiter prioritizing real-time `pidirector` calls over conversational UI queries.
  - Inter-agent message router and mailbox manager (Agent-as-a-Tool and asynchronous intent blackboard).
  - Out-of-band hard preemption ($<5\text{ms}$) via `AbortController` and `pigateway` SSE bus.
  - Architectural spec: [piagent-architecture-plan.md](piagent-architecture-plan.md).
- **Protocols & Interfaces**: Fastify REST & SSE on port `3120`.

---

### 26. piui
- **Path**: `D:\piui`
- **Repository**: [https://github.com/jsilvanus/piui](https://github.com/jsilvanus/piui)
- **Role**: Shared atomic and molecular UI component primitives for the Pi broadcast ecosystem.
- **Layers**: +1 Presentation & Operator Plane
- **Key Capabilities**:
  - Framework-agnostic TypeScript component emitters generating Tailwind CSS markup for fast SSR and client reactivity.
  - Atoms: badges, buttons, cards, meters, sliders, status dots, speaker badges, agent status badges, model badges, and priority pills.
  - Molecules: ATEM bus selector, PTZ pads/preset cards, audio faders, caption feeds, rundown item cards, tally facet widgets, agent cards, chat bubbles, and tool invocation cards.
- **Protocols & Interfaces**: ESM Package `@piecosystem/piui`.

---

### 27. pipoe
- **Path**: `D:\pipoe`
- **Repository**: [https://github.com/jsilvanus/pipoe](https://github.com/jsilvanus/pipoe)
- **Role**: Small controller for the rack's PoE switch (PLANET GS-4210-16P2S). Reads which ports are active and what they draw, switches PoE on or off per port, and cycles a port (power-cycle a frozen camera, for example).
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Southbound Hardware Interfacing)
- **Key Capabilities**:
  - Per-port PoE state, link and power (watts, if the switch reports it) plus switch totals (`GET /api/v1/poe`).
  - PoE on/off with read-back verification, and `cycle` (off, wait 1-60 s, on). Only ports named in `PIPOE_PORT_NAMES` can be switched; one operation per port at a time.
  - SNMP v2c driver on the standard PoE MIB (RFC 3621); simulation mode by default; optional bearer token.
  - No polling, watchdog or automatic cycling: callers (for example picam's freeze handling) decide when to cycle.
- **Protocols & Interfaces**: Fastify REST on port `3108` (`/openapi.json`), CLI `pipoe`, SNMP UDP `161` to the switch (factory address `192.168.0.100`, moving to `192.168.1.2`).
- **Status**: never run against the real switch; SNMP is off on the switch until it is enabled in its web UI. See the pipoe README for the read-only probes.

---

### 28. pistorage
- **Path**: `D:\pistorage`
- **Repository**: [https://github.com/jsilvanus/pistorage](https://github.com/jsilvanus/pistorage)
- **Role**: Durable shared file storage for the ecosystem: an S3-compatible backend behind a read-through disk cache on the Pi, with a local-disk backend for development.
- **Layers**: Storage (shared by Layer 2 media services)
- **Key Capabilities**:
  - Backends: S3 or any S3-compatible service (VersityGW on the operator PC now, Hetzner Object Storage later; switching is configuration only), or local disk. Keys carry the `pi/` prefix (`PISTORAGE_KEY_PREFIX`).
  - Read-through disk cache with TTL and size cap; write spool that holds writes while the backend is down.
  - `useAt` dates/ranges stored with each object drive prefetch into the cache before the service; signed links for browsers; optional retention sweep.
  - Client library and CLI `pistorage`; OpenAPI contract.
- **Protocols & Interfaces**: Fastify REST on port `3700` (`PISTORAGE_PORT`, `/health`), bearer or `x-api-key`.
- **Backend for local testing**: the `versitygw` service in `deploy/operator-pc/compose.yml` (S3 on host port `7070`, bucket `pistorage`). Point `PISTORAGE_S3_ENDPOINT` at it.
- **Status**: nothing run against a real S3 service yet; local backend and fake-offline tests only.

---

### 29. pinotify
- **Path**: `D:\pinotify`
- **Repository**: [https://github.com/jsilvanus/pinotify](https://github.com/jsilvanus/pinotify)
- **Role**: Notification service for the ecosystem, built on `notify-core`.
- **Status**: skeleton only (merged); not installed on the Pi, no systemd unit, no port assigned. The unit and a matrix entry wait for Juha's go.

---

### 30. notify-core
- **Path**: `D:\notify-core`
- **Repository**: [https://github.com/jsilvanus/notify-core](https://github.com/jsilvanus/notify-core)
- **Role**: Library: the notification engine, extracted from LCYT's `lcyt-notify` (EUPL-1.2, published as `@jsilvanus/notify-core` on npm with changesets and trusted publishing).
- **Layers**: Seam (shared library, not a service)
- **Consumers**: `pinotify`. Switching LCYT's `lcyt-notify` to it is future work.

---

### 31. pisim
- **Path**: `D:\pisim`
- **Repository**: [https://github.com/jsilvanus/pisim](https://github.com/jsilvanus/pisim)
- **Role**: Ecosystem simulator: stands in for devices and events so services (for example `picomposer`, which subscribes to gateway events) can be tested without hardware.
- **Layers**: Seam (test tooling)
