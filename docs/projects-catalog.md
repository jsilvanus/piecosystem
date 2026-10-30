# Projects Catalog

This catalog details all active projects within the Raspberry Pi production ecosystem at Riihimäen Keskuskirkko.

---

## Catalog Summary Table

| Project | Primary Layer (Proposed) | Refined Layer (4+1) | Core Function | Tech Stack | Default Port(s) |
|---|---|---|---|---|---|
| [`picam`](file:///d:/picam) | Hardware connections | Layer 1: Southbound HW | VISCA & CGI PTZ camera controller | Node 24, Fastify, TS | `3300` (VISCA: `52381`, CGI: `80`) |
| [`picanva`](file:///d:/picanva) | Media creation | Layer 2: Media Pipeline | Canva App plugin for liturgical slides | TS, Canva SDK, React | Canva Sandbox |
| [`picompanion`](file:///d:/picompanion) | Media creation | Layer 2: Media Pipeline | Windows virtual monitor & RTMP sender | C#, .NET, IddCx Driver | RTMP out |
| [`picontrol`](file:///d:/picontrol) | Event orchestration | +1 Control Plane | Operator Web UI housing & CLI | Node 22+, React, Vite | `3000` (UI dev: `5173`) |
| [`picontrol-mcp`](file:///d:/picontrol-mcp) | Event orchestration | +1 Control Plane | MCP Server for AI agents (`pi://`) | Node 24, Fastify, TS | `3200` |
| [`pigateway`](file:///d:/pigateway) | Hardware connections | Layer 1 & 3: HW & State | Central device broker & SSE bus | Node 24, Fastify, TS | `3100` (UDP: `3101`, `3102`, `40000`; TCP: `6600`, `6601`) |
| [`pilight`](file:///d:/pilight) | Hardware connections | Layer 1: Southbound HW | Tally-Ma wireless tally controller | Node 22+, Fastify, TS | `3200` / `3201` (UDP: `21324`) |
| [`pimatrix`](file:///d:/pimatrix) | Media creation | Layer 2: Media Pipeline | Video routing, compositor & display engine | Node 24, GStreamer, C++ | `8080`, `8081` (RTSP/WebRTC) |
| [`piprogram`](file:///d:/piprogram) | Media creation | Layer 2 & 4: Media & Stage | Hymns, slides, PPTX, stage display | Node 24, Fastify, TS | Configurable Fastify |
| [`pirundown`](file:///d:/pirundown) | Event orchestration | Layer 3: Orchestration | Deterministic service rundown engine | Node 22+, Fastify, TS | `3400` |
| [`pisound`](file:///d:/pisound) | Hardware connections | Layer 1: Southbound HW | BSS Soundweb London DSP audio router | Node 22+, Fastify, TS | `3300` (Soundweb: `1023`) |
| [`pispace`](file:///d:/pispace) | Event orchestration | Layer 3: Spatial Context | 3D venue digital twin & FreeD raycaster | Node 22+, Fastify, TS | `3108` |
| [`piswitch`](file:///d:/piswitch) | Hardware connections | Layer 1 & 2: HW & Mixer | Video switcher microservice (ATEM & soft) | Node 22+, Fastify, TS | `3106` (ATEM: `9910`) |
| [`pitube`](file:///d:/pitube) | Consumer edge | Layer 4: Presentation/Egress | YouTube Live lifecycle & delayed captions | Node 22+, TS | `3105` |
| [`pivoice`](file:///d:/pivoice) | Hardware connections / Media | Layer 1 & 2: HW Capture/DSP | ALSA audio capture, Silero VAD, fanout | Node 24, ONNX Runtime | REST API & UDP Telemetry |
| [`piperception`](file:///d:/piperception) | Media creation | Layer 2: Video Perception | Real-time YOLOX/ONNX person detection & tracking | Node/Python, ONNX | Ingests video, outputs 2D bboxes |
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
  - Hardware presets management (`0–254`) with thumbnail attachments.
  - AVer SmartFrame auto-framing toggle and FreeD tracking target configuration.
  - Defocus near-limit blur privacy toggle.
- **Protocols & Interfaces**: Fastify REST API (`3300`), VISCA UDP (`52381`), HTTP CGI (`80`).

---

### 2. picanva
- **Path**: `D:\picanva`
- **Role**: Official Canva App (SDK plugin) enabling worship teams to prepare and project liturgy slides directly from Canva.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: Layer 2 (Content Staging & Media Pipeline)
- **Key Capabilities**:
  - Connects Canva directly to `pigateway` and `piprogram`.
  - Stages visual media, sets up display routes in `pimatrix`, and triggers live slide advancing during worship.
  - Runs in Canva's web sandbox without requiring external local browser extensions.

---

### 3. picompanion
- **Path**: `D:\picompanion`
- **Role**: Windows companion application for screen sharing and presentation capture into PiMatrix.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: Layer 2 (Media Pipeline & Ingest)
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

### 7. pilight
- **Path**: `D:\pilight`
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
- **Role**: High-performance video matrix switching, compositing, and multi-display control plane.
- **Layers**:
  - *Proposed*: Media creation
  - *Refined*: Layer 2 (Real-Time Media Pipeline & Composition)
- **Key Capabilities**:
  - Ingests multiple video streams (RTSP cameras, WebRTC feeds, RTMP desktop signals).
  - Software and hardware-accelerated video compositing (PiP, lower thirds, slide overlays).
  - Drives physical HDMI hardware outputs for sanctuary projectors and live stream program outputs.

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

### 13. piperception (Upcoming)
- **Path**: `D:\piperception` (in transition from `lcyt-compute/src/perception`)
- **Role**: Dedicated computer vision microservice providing real-time neural detection, tracking, and 2D bounding box extraction.
- **Layers**:
  - *Proposed*: Media creation / Video analysis
  - *Refined*: Layer 2 (Media Pipeline & Computer Vision)
- **Key Capabilities**:
  - Real-time person detection using YOLOX on ONNX Runtime CPU/GPU.
  - Multi-person tracking with persistent track IDs (ByteTrack/Sort).
  - Normalised 2D bounding boxes (`[x, y, w, h]`), confidence scores, and crop framing.
  - Feeds 2D detections into `pispace` (`POST /api/v1/perception`) for 3D world projection.

---

### 14. piswitch
- **Path**: `D:\piswitch`
- **Role**: Universal video mixer microservice and CLI decoupling control clients from specific switcher hardware.
- **Layers**:
  - *Proposed*: Hardware connections
  - *Refined*: Layer 1 (Hardware Switcher Driver) & Layer 2 (Software Mixer)
- **Key Capabilities**:
  - Standardized REST and SSE interface (`/api/v1/video-mixer/*`).
  - Controls Blackmagic ATEM SDI / Mini Extreme ISO via UDP `9910`.
  - Features local Pi Software Mixer fallback using GStreamer/MediaMTX for mobile phone cameras (WebRTC/SRT).
  - Full backward-compatible `/api/v1/atem/*` endpoints for existing clients.

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
