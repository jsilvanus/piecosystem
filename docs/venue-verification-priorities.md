# Riihimäen Keskuskirkko — Venue Verification Priorities & Tracking Ledger

This document defines the **on-site verification priority tiers** for all packages and subsystems in the Pi Production Ecosystem and physical plant at **Riihimäen Keskuskirkko**. It records the current verification status, the total number of validation checks per package, and how many have been completed on-site.

---

## 1. Verification Priority Ledger & Progress Tracking

| Priority | Package / Subsystem | Role / Component | Total Checks | Verified (Done) | Status |
|---|---|---|:---:|:---:|---|
| **P1** | [`picam`](file:///d:/picam) | All PTZ camera functions (VISCA, FreeD, CGI, presets) | 16 | 0 / 16 | ⏳ Ready for Venue |
| **P1** | [`piswitch`](file:///d:/piswitch) | All video mixer functions (ATEM, cuts, transitions, media pool) | 16 | 0 / 16 | ⏳ Ready for Venue |
| **P1** | [`piencoder`](file:///d:/piencoder) | Matrox Monarch HDX broadcast stream & archival recording | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P1** | [`pitube`](file:///d:/pitube) | YouTube Live lifecycle & delayed CEA-608 captions | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P1** | [`pimatrix`](file:///d:/pimatrix) | Atlona video routing crossbar, HDMI KMS display outputs | 7 | 0 / 7 | ⏳ Ready for Venue |
| **P1** | [`pivoice`](file:///d:/pivoice) | Hama USB ALSA capture, Silero VAD, 16kHz PCM fanout | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P1** | [`web-radio-relay`](file:///d:/web-radio-relay) | Audio-only HLS stream, listener delay buffer & live captions | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P1\*** | [`pigateway`](file:///d:/pigateway) *(Suggested P1)* | Central device broker, SSE event bus, UDP telemetry | 7 | 0 / 7 | ⏳ Ready for Venue |
| **P1\*** | [`keskuskirkko`](file:///c:/Users/jsilv/Code/keskuskirkko) *(Suggested P1)* | AMX NX-2200, MD-702, Atlona RS-232, Epson projectors RS-232 | 8 | 0 / 8 | ⏳ Ready for Venue |
| **P1\*** | [`liturgos-auditor`](file:///d:/liturgos-auditor) *(Suggested P1)* | Finnish ecclesiastical Whisper STT inference & live SSE | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P1\*** | `mediamtx` / `deploy-media` *(Suggested P1)* | Core media proxy (RTSP/RTMP/WebRTC fanout on Workstation) | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P2** | [`picontrol`](file:///d:/picontrol) | Operator web console UI & emergency override controls | 7 | 0 / 7 | ⏳ Ready for Venue |
| **P2** | [`picontrol-mcp`](file:///d:/picontrol-mcp) | AI Agent Model Context Protocol server (tools & `pi://` resources) | 7 | 0 / 7 | ⏳ Ready for Venue |
| **P2\*** | [`pitally`](file:///d:/pitally) / [`pilight`](file:///d:/pilight) *(Suggested P2)* | Tally-Ma wireless tally master UDP 21324, Cam 1–3 PGM/PRV lights | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P2\*** | [`piprogram`](file:///d:/piprogram) *(Suggested P2)* | Hymnal database, Stage Page confidence display, ATEM slide sync | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P2\*** | [`pigraphics`](file:///d:/pigraphics) *(Suggested P2)* | HTML5 lower-thirds (role-only invariant), hymn graphics, keying | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P2\*** | [`virtual-screen-streamer`](file:///d:/picompanion) *(Suggested P2)* | Windows virtual monitor driver & PPTX RTMP streamer | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P3** | [`pipoe`](file:///d:/pipoe) | PLANET switch SNMP v2c status, wattage, camera power-cycle gate | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P3** | [`piperception`](file:///d:/piperception) | RTSP YOLOX neural person detection & ByteTrack 2D bounding boxes | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P3** | [`pisound`](file:///d:/pisound) | BSS Soundweb BLU-100 DSP over TCP 1023, JTS wireless mics, mutes | 7 | 0 / 7 | ⏳ Ready for Venue |
| **P3\*** | [`pispace`](file:///d:/pispace) *(Suggested P3)* | 3D sanctuary digital twin, FreeD raycasting, inverse PTZ solver | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P3\*** | [`pirundown`](file:///d:/pirundown) *(Suggested P3)* | Rundown v2 deterministic cue execution engine & `varfetch` | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P3\*** | [`pirundown-designer`](file:///d:/pirundown-designer) *(Suggested P3)* | Visual cue sheet authoring app, Finnish liturgy templates | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P3\*** | [`canva-pieco-app`](file:///d:/picanva) *(Suggested P3)* | Canva app plugin for church slide deck ingestion | 3 | 0 / 3 | ⏳ Ready for Venue |
| **P3\*** | [`piui`](file:///d:/piui) *(Suggested P3)* | Atomic/molecular UI component library | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P3\*** | [`pistorage`](file:///d:/pistorage) *(Suggested P3)* | S3/VersityGW durable asset storage & read-through disk cache | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P3\*** | [`fffleet`](file:///d:/fffleet) *(Suggested P3)* | FFmpeg transcoding job queue & worker daemon cluster | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P4** | [`piagent`](file:///d:/piagent) | Agent infrastructure plane, LangGraph state machine, preemption | 5 | 0 / 5 | ⏳ Ready for Venue |
| **P4** | [`pidirector`](file:///d:/pidirector) | Local Ollama AI director (co-pilot & autonomous mode) | 6 | 0 / 6 | ⏳ Ready for Venue |
| **P4\*** | [`piembed`](file:///d:/piembed) *(Suggested P4)* | Vector embedding & semantic cue matching microservice | 3 | 0 / 3 | ⏳ Ready for Venue |
| **P4\*** | [`picomposer`](file:///d:/picomposer) & MCP *(Suggested P4)* | Multi-screen workspace composer & generative UI | 4 | 0 / 4 | ⏳ Ready for Venue |
| **P4\*** | [`pinotify`](file:///d:/pinotify) / [`notify-core`](file:///d:/notify-core) *(Suggested P4)* | Notification delivery service for email/SMS alert dispatch | 3 | 0 / 3 | ⏳ Ready for Venue |
| **P4\*** | `saarnavideo` *(Suggested P4)* | Post-service sermon video clipping & archival post-production | 3 | 0 / 3 | ⏳ Ready for Venue |
| **P4\*** | [`pisim`](file:///d:/pisim) *(Suggested P4)* | Offline ecosystem scenario simulator | 3 | 0 / 3 | ⏳ Ready for Venue |
| **TOTAL** | **34 Modules & Subsystems** | **Comprehensive Venue Scope** | **188** | **0 / 188** | **0.0% Complete** |

*\* Denotes packages suggested to fill the gaps in the initial priority list.*

---

## 2. Priority 1: Core Broadcast & Streaming Path (Must Pass to Go Live)

These 11 modules form the foundational signal flow. If any of these fail, live video, audio, or streaming from Riihimäen Keskuskirkko cannot operate.

### `picam` (All Functions Verification)
- [ ] **1.1 Health & Service Identity**: `GET /health` and `GET /api/v1/health` return `{"status":"ok","service":"picam"}` on port `3102`.
- [ ] **1.2 SSE Event Bus**: `GET /api/v1/events` stream opens and emits heartbeat events.
- [ ] **1.3 Camera Discovery**: `GET /api/v1/cameras` lists Cam 1 (Alttari `192.168.1.21`), Cam 2 (Puhuja `192.168.1.22`), Cam 3 (Jalusta `192.168.1.23`).
- [ ] **1.4 Camera Detail**: `GET /api/v1/cameras/:cameraId` returns live status, connection mode, and current state.
- [ ] **1.5 Pan/Tilt Drive**: `POST /api/v1/cameras/:cameraId/move` tests all 11 directions (`up`, `down`, `left`, `right`, `upleft`, `upright`, `downleft`, `downright`, `stop`, `home`, `reset`) at variable panSpeed/tiltSpeed (1–24).
- [ ] **1.6 Continuous Zoom**: `POST /api/v1/cameras/:cameraId/zoom` drives optical zoom in (tele), out (wide), and stop.
- [ ] **1.7 Focus Modes**: `POST /api/v1/cameras/:cameraId/focus` toggles auto vs manual focus, near, far, stop, and one-push autofocus trigger.
- [ ] **1.8 Preset Save with Ground Truth**: `POST /api/v1/cameras/:cameraId/presets/:presetId` stores pan/tilt/zoom positions, captures FreeD optical angles, and grabs frame thumbnail to `data/thumbnails/`.
- [ ] **1.9 Preset Recall**: `POST /api/v1/cameras/:cameraId/presets/:presetId/recall` moves camera smoothly to stored target.
- [ ] **1.10 Camera Settling Detection**: Verify `preset:settled` event fires onto the event bus precisely when physical travel stops (`CameraSettlingTracker`).
- [ ] **1.11 FreeD Telemetry Query**: `GET /api/v1/cameras/:cameraId/freed` returns real-time pan, tilt, zoom, and focus encoder readings.
- [ ] **1.12 AVer SmartFrame**: `POST /api/v1/cameras/:cameraId/smartframe` toggles auto-framing on/off and switches framing modes.
- [ ] **1.13 Defocus Privacy Blur**: `POST /api/v1/cameras/:cameraId/defocus` triggers immediate near-limit blur for sensitive pastoral moments.
- [ ] **1.14 Image Settings**: `PUT /api/v1/cameras/:cameraId/settings/image` patches exposure, white balance, iris, backlight compensation, and gain.
- [ ] **1.15 Stream Settings**: `PUT /api/v1/cameras/:cameraId/settings/stream` patches video resolution (1080p), framerate (50fps), and bitrate.
- [ ] **1.16 Power & Maintenance**: `GET/POST /api/v1/cameras/:cameraId/power` and `POST /api/v1/cameras/:cameraId/reboot` test standby toggle and soft reboot.

### `piswitch` (All Functions Verification)
- [ ] **2.1 Health & Connection**: `GET /health` and `GET /api/v1/status` return status of Blackmagic ATEM SDI Extreme (`192.168.1.20:9910`).
- [ ] **2.2 SSE Mixer Event Stream**: `GET /api/v1/events` and `GET /api/v1/video-mixer/events` emit live switcher state transitions.
- [ ] **2.3 Mixer State Audit**: `GET /api/v1/video-mixer` returns current Program, Preview, Keyer, and Transition states.
- [ ] **2.4 Program Bus Selection**: `PUT /api/v1/video-mixer/program {"input": N}` instantly cuts Program to Inputs 1 (Cam 1), 2 (Cam 2), 3 (Cam 3), 4 (Atlona Matrix).
- [ ] **2.5 Preview Bus Selection**: `PUT /api/v1/video-mixer/preview {"input": N}` routes selected camera to Preview bus.
- [ ] **2.6 Hard Cut**: `POST /api/v1/video-mixer/cut` swaps Program and Preview buses instantly with 0ms delay.
- [ ] **2.7 Auto Transition**: `POST /api/v1/video-mixer/auto` executes smooth mix/dissolve at configured duration (e.g. 1.0s).
- [ ] **2.8 Fade to Black (FTB)**: `POST /api/v1/video-mixer/ftb` smoothly fades Program video and audio to black; verify blinking FTB tally.
- [ ] **2.9 Downstream Keyer (DSK)**: `PUT /api/v1/video-mixer/dsk/1/on-air` and `.../tie` toggle lower-third graphic overlay on/off air.
- [ ] **2.10 Upstream Keyer (USK)**: `PUT /api/v1/video-mixer/usk/1/on-air` and `.../fill-source` toggle picture-in-picture / slide box keyer.
- [ ] **2.11 Aux Bus Routing**: `PUT /api/v1/video-mixer/aux/1/source` routes custom video feed to physical aux outputs.
- [ ] **2.12 Macro Execution**: `POST /api/v1/video-mixer/macros/:macro/run` triggers pre-programmed ATEM hardware macros.
- [ ] **2.13 Media Pool Upload & List**: `GET /api/v1/video-mixer/media-pool` lists slots; `PUT .../media-pool/:slot` uploads test RGBA still PNG.
- [ ] **2.14 Media Player Assignment**: `PUT /api/v1/video-mixer/media-players/1/source {"stillIndex": N}` binds Media Player 1 to slot.
- [ ] **2.15 6-Slot Slide Circular Buffer**: `GET .../media-pool/slides/status` and `POST .../media-players/1/advance` advance liturgical slides and automatically garbage-collect slot $N-2$.
- [ ] **2.16 Dynamic Phone Camera Ingest**: `POST /api/v1/video-mixer/inputs/phone` and `DELETE .../inputs/phone/:id` add/remove WebRTC/SRT auxiliary smartphone cameras.

### `piencoder` (Hardware Streaming & Archival Encoder)
- [ ] **3.1 Service Health**: `GET /health` returns `200 OK` on port `3104`.
- [ ] **3.2 Matrox Monarch HDX Connection**: Connects to `192.168.1.13:80`; video lock verified on 3G-SDI input.
- [ ] **3.3 Primary Broadcast Stream (Encoder 1)**: `POST /api/v1/encoder/1/start` initiates RTMP push to YouTube/test endpoint; verify bitrate stability.
- [ ] **3.4 Archival Recording (Encoder 2)**: `POST /api/v1/encoder/2/record` initiates local recording to USB/SMB storage.
- [ ] **3.5 Stream & Record Stop**: `POST /api/v1/encoder/both/stop` gracefully finalizes both streams and closes MP4 files without corruption.
- [ ] **3.6 Monarch Busy Retry Queue**: Verify serialized queue handles Monarch firmware `RETRY` responses without dropping calls.

### `pitube` (YouTube Live Egress & Closed Captions)
- [ ] **4.1 Service Health**: `GET /health` returns `200 OK` on port `3500`.
- [ ] **4.2 OAuth 2.0 Token Audit**: Valid parish Google/YouTube API credentials confirmed with valid token refresh cycle.
- [ ] **4.3 Broadcast Lifecycle Query**: `GET /api/v1/youtube/status` queries current scheduled Sunday broadcast.
- [ ] **4.4 Lifecycle Transition Testing**: Transitions stream `ready` -> `testing` -> `live` -> `complete`.
- [ ] **4.5 CEA-608 Delayed Caption Ingest**: Ingests live Finnish STT tokens from PiGateway bus.
- [ ] **4.6 30-Second Caption Window Alignment**: HTTP POST caption chunks aligned with YouTube's 30-second live broadcast buffer.

### `pimatrix` (Video Matrix Crossbar & Display Driver)
- [ ] **5.1 Service Health**: `GET /health` returns `200 OK` on port `3101`.
- [ ] **5.2 Atlona Matrix RS-232 / TCP Switching**: Routes Atlona Input 1 (Lectern), Input 2 (Workstation PC), Input 3 (Pi HDMI 1), Input 4 (Pi HDMI 2).
- [ ] **5.3 Physical HDMI Sink `hdmi0`**: Pi KMS driver displays primary presentation compositor to Atlona In 3 -> Sanctuary Left Projector (`192.168.1.62`).
- [ ] **5.4 Physical HDMI Sink `hdmi1`**: Pi KMS driver displays secondary confidence / multiview feed to Atlona In 4 -> Sanctuary Right Projector (`192.168.1.63`).
- [ ] **5.5 Slide Key Compositor (`compose1`)**: Activates slide box layout (left/right, scale 0.75) for hymn slides over live video.
- [ ] **5.6 Source Video Effects**: Applies crop, rotation, or fade-to-black slate across MediaMTX relay feeds.
- [ ] **5.7 Web Multiview Monitor**: Multiview web endpoint renders low-latency grid of active video sources.

### `pivoice` (Audio Capture & Silero VAD)
- [ ] **6.1 Service Health**: `GET /health` returns `200 OK` on port `3106`.
- [ ] **6.2 ALSA Hardware Capture**: Hama USB / line-in device captured without buffer underruns (`arecord -l`).
- [ ] **6.3 Silero VAD Neural Inference**: Real-time neural network detects speech (>0.85 prob) vs silence (<0.10 prob).
- [ ] **6.4 16 kHz Mono PCM Fanout**: Streams clean 16 kHz S16LE audio directly to `liturgos-auditor` (`port 8090`).
- [ ] **6.5 Broadcast Audio Fanout**: Delivers audio stream to `web-radio-relay`.
- [ ] **6.6 Binary UDP Telemetry**: Emits binary audio RMS and VAD packets over UDP port `3101` to PiGateway.

### `web-radio-relay` (Parish Web Radio & Synced Captions)
- [ ] **7.1 Web Radio Health**: `GET /api/health` returns `200 OK` on port `8080`.
- [ ] **7.2 Audio-Only Stream Stripping**: FFmpeg strips video from MediaMTX RTSP stream and encodes low-bandwidth HLS.
- [ ] **7.3 Listener Delay Buffer**: Audio delayed by configurable buffer (matching sanctuary acoustic/PA latency).
- [ ] **7.4 Synchronized Live Web Captions**: Delivers time-aligned Finnish closed captions to the web listener widget.
- [ ] **7.5 Local Broadcast Archival**: Automatically records broadcast into a timestamped MP3 file.

### `pigateway` *(Suggested Priority 1 Backbone)*
- [ ] **8.1 Fastify Daemon Health**: `GET /health` returns `{"status":"ok"}` on port `3000`.
- [ ] **8.2 Authoritative SSE Bus**: `GET /api/v1/events` broadcasts system-wide state changes to all listening clients.
- [ ] **8.3 UDP Audio Telemetry Ingest**: Listens on UDP `3101` (PiVoice VAD) and UDP `3102` (PiSound DSP meters).
- [ ] **8.4 UDP FreeD Tracking Ingest**: Listens on UDP `40000` for camera spatial tracking telemetry.
- [ ] **8.5 AMX TCP Bridge**: Binds TCP `6600` for bi-directional communication with AMX NetLinx NX-2200.
- [ ] **8.6 Southbound Device Cache**: Centralizes connection state for ATEM, AVer cameras, and Matrox encoder.
- [ ] **8.7 Zero Payload Buffer Invariant**: Confirms gateway never buffers or touches heavy raw video/audio frames.

### `keskuskirkko` *(Suggested Priority 1 Venue AV)*
- [ ] **9.1 AMX NX-2200 Master**: Online at `192.168.1.10:6501`; system code running without runtime errors.
- [ ] **9.2 Modero MD-702 Touch Panel**: Online at `192.168.1.3`; user interface buttons respond.
- [ ] **9.3 Atlona 4x4 Matrix RS-232 Control**: Port `5001:1:0` executes `x<in>AVx<out>\r` commands.
- [ ] **9.4 Epson Left Projector RS-232**: Port `5001:2:0` toggles power, shutter mute, and input selection.
- [ ] **9.5 Epson Right Projector RS-232**: Port `5001:3:0` toggles power, shutter mute, and input selection.
- [ ] **9.6 BSS Soundweb Serial Ingest**: Port `5001:4:0` passes master volume and preset triggers to BLU-100.
- [ ] **9.7 Camera IR / Control Terminals**: Ports 11 and 12 verify secondary control lines to Cam 1 and Cam 2.
- [ ] **9.8 Physical Tie-Lines**: Lectern floor box (AV09) and Pulpit stage box signals verified to rack patchbay.

### `liturgos-auditor` *(Suggested Priority 1 Speech-to-Text)*
- [ ] **10.1 Service Health**: `GET /health` returns `{"status":"ok"}` on port `8090` with loaded model name.
- [ ] **10.2 CUDA GPU Acceleration**: `nvidia-smi` confirms faster-whisper CTranslate2 model running on GPU.
- [ ] **10.3 Live Chunk Inference (`/inference`)**: Returns Finnish transcription with ecclesiastical vocabulary within 800ms.
- [ ] **10.4 OpenAI-Compatible Endpoint (`/v1/audio/transcriptions`)**: Verifies standard multipart audio upload.
- [ ] **10.5 Pull Transcription SSE (`/v1/live`)**: Ingests MediaMTX live stream and emits word-level tokens over SSE.
- [ ] **10.6 Priority Queue Arbitration**: Synchronous live audio chunks prioritized ahead of background batch jobs.

### `mediamtx` / `deploy-media` *(Suggested Priority 1 Media Infrastructure)*
- [ ] **11.1 Docker Media Stack**: `mediamtx` container running on Workstation (`192.168.1.14`).
- [ ] **11.2 RTSP Stream Hub (`:8554`)**: Exposes Cam 1, Cam 2, and slide feeds to `piperception` and `pimatrix`.
- [ ] **11.3 RTMP Ingest Gateway (`:1935`)**: Accepts camera RTMP push feeds from AVer PTZ cameras.
- [ ] **11.4 WebRTC Browser Preview (`:8889`)**: Streams sub-second latency video to operator web browsers.
- [ ] **11.5 HLS Distribution (`:8888`)**: Serves internal HLS video feeds.

---

## 3. Priority 2: Operator Control Surfaces, Presentation & Enrichment

These 6 modules provide the operator interface, AI agent integration, presenter tally lights, and live liturgical presentation materials.

### `picontrol` (Operator Web UI Console)
- [ ] **12.1 Web Console Access**: UI loads in browser on port `5173` (dev) / `8080` (production).
- [ ] **12.2 Multi-Camera Monitoring Grid**: Renders live video streams with active camera indicator.
- [ ] **12.3 Program & Preview Switcher Bar**: Live interactive bus buttons reflecting ATEM states with 0-latency clicks.
- [ ] **12.4 PTZ Control Pad**: Virtual joystick and preset recall cards drive physical cameras via `pigateway`.
- [ ] **12.5 Real-Time Audio Meters**: Displays live decibel levels and mute toggles for sanctuary microphones.
- [ ] **12.6 Rundown Timeline View**: Highlights current service item and upcoming liturgical cues.
- [ ] **12.7 Emergency Operator Override**: Dedicated "Take Manual Control" toggle freezes AI director actions immediately.

### `picontrol-mcp` (AI Agent Model Context Protocol Server)
- [ ] **13.1 MCP Server Health**: `GET /health` returns `200 OK` on port `3600`.
- [ ] **13.2 Video Routing Tools**: AI agent can call `routing_get_status` and `routing_set_route`.
- [ ] **13.3 Camera Tools**: AI agent can call `camera_list`, `camera_move`, and `camera_recall_preset`.
- [ ] **13.4 ATEM Switcher Tools**: AI agent can call `atem_cut`, `atem_auto`, and `atem_set_program`.
- [ ] **13.5 Audio Tools**: AI agent can call `audio_get_meters` and `audio_set_channel_mute`.
- [ ] **13.6 `pi://` Resource Endpoints**: AI agent can inspect `pi://routing/matrix`, `pi://atem`, `pi://tally/lights`.
- [ ] **13.7 Role-Based Access Control**: RBAC enforces `viewer`, `operator`, `admin` permission scopes.

### `pitally` / `pilight` *(Suggested Priority 2 Tally System)*
- [ ] **14.1 Tally Service Health**: `GET /health` returns `200 OK` on port `3107`.
- [ ] **14.2 Tally-Ma Controller Connection**: Communicates with hardware master at `192.168.1.4:21324`.
- [ ] **14.3 Green Preview Tally**: Camera placed on ATEM Preview lights steady green on target camera tally unit.
- [ ] **14.4 Red Program Tally**: Camera cut to ATEM Program lights steady red on target camera tally unit.
- [ ] **14.5 Multi-Segment Status LEDs**: 29-byte UDP packet animates secondary indicators for YouTube broadcast state.

### `piprogram` *(Suggested Priority 2 Liturgical Presentation)*
- [ ] **15.1 Hymnal Database Search**: Querying hymn number returns complete verses and liturgical refrains.
- [ ] **15.2 Sanctuary Stage Display**: Stage Page renders high-contrast text on pastor and choir confidence tablets.
- [ ] **15.3 PPTX Sermon Deck Ingestion**: Converts uploaded PowerPoint files into presentation slide series.
- [ ] **15.4 ATEM Media Pool Slide Push**: Pre-renders slides as PNG stills and pushes to `piswitch` Media Pool slots.
- [ ] **15.5 Slide Sync Progression**: Advancing slide on stage display triggers 0ms cut to next media player still.
- [ ] **15.6 Canva Slide Integration**: Ingests shared liturgical graphic decks directly from Canva.

### `pigraphics` *(Suggested Priority 2 Broadcast Graphics)*
- [ ] **16.1 Graphics Engine Health**: `GET /health` returns `200 OK` on port `3201`.
- [ ] **16.2 Speaker Lower-Third Animation**: Renders smooth CSS slide-in banner with speaker name and title.
- [ ] **16.3 Role-Only Invariant Enforcement**: If speaker name is blank, banner gracefully displays only the role (*"Liturgi"*).
- [ ] **16.4 Hymn Overlay Graphics**: Generates bottom-of-screen hymn title and lyrics graphics.
- [ ] **16.5 Fill & Key Channel Sync**: Renders clean key/fill outputs for ATEM downstream keyer.

### `virtual-screen-streamer` / `picompanion` *(Suggested Priority 2 Operator PC Seam)*
- [ ] **17.1 Virtual Display Driver (`IddCx`)**: Windows recognizes virtual presentation monitor.
- [ ] **17.2 Full-Screen Slide Capture**: Captures PowerPoint slide show on virtual monitor at 1080p60.
- [ ] **17.3 RTMP Egress to MediaMTX**: Streams captured display to `rtmp://127.0.0.1:1935/live/slides`.
- [ ] **17.4 Zero Physical Port Footprint**: Validates presentation PC needs no secondary physical HDMI cable.

---

## 4. Priority 3: Hardware Management, Spatial Context & Auxiliary Services

These 10 modules manage PoE power, audio DSP routing, 3D computer vision tracking, service rundown automation, and durable media storage.

### `pipoe` (PoE Switch Controller)
- [ ] **18.1 Service Health**: `GET /health` returns `200 OK` on port `3108`.
- [ ] **18.2 SNMP v2c Walk**: Queries PLANET switch (`192.168.1.2:161`) with community string `public`.
- [ ] **18.3 Port Power Status**: `GET /api/v1/poe` reports power draw (W) for ports 1–16.
- [ ] **18.4 Camera Power Verification**: Confirms Port 1 (Cam 1) and Port 2 (Cam 2) draw 12–15 W (802.3at).
- [ ] **18.5 Protected Port Power-Cycle**: Tests `POST /api/v1/poe/ports/4/cycle` on non-critical accessory port.

### `piperception` (Real-Time Neural Person Tracker)
- [ ] **19.1 Service Health**: `GET /health` returns `200 OK` on port `3202`.
- [ ] **19.2 Video Ingest**: Pulls live RTSP camera feed from MediaMTX (`rtsp://192.168.1.14:8554/live/cam1`).
- [ ] **19.3 YOLOX Neural Detection**: Detects persons standing at Altar, Pulpit, and Lectern.
- [ ] **19.4 ByteTrack Association**: Maintains consistent tracker ID during subject movement and turning.
- [ ] **19.5 Normalized Bounding Boxes**: Outputs 2D coordinates `[x, y, w, h]` with confidence $> 0.70$.
- [ ] **19.6 Spatial Stream Egress**: Pushes tracking data to `pispace` (`POST /api/v1/spatial/tracks`).

### `pisound` (BSS Soundweb London DSP Controller)
- [ ] **20.1 Service Health**: `GET /health` returns `200 OK` on port `3105`.
- [ ] **20.2 HiQnet Direct Inject TCP**: Connects to BSS BLU-100 at `192.168.1.31:1023`.
- [ ] **20.3 Fixed Sanctuary Mics**: Verifies levels on Altar (Ch 1), Pulpit (Ch 2), Lectern (Ch 3).
- [ ] **20.4 JTS Wireless Mic Receivers**: Verifies RF signals and audio meters on wireless channels 1–12.
- [ ] **20.5 Remote Channel Mutes**: Sends channel mute commands and verifies silence in sanctuary PA.
- [ ] **20.6 Automixer vs SQ-5 Mixing**: Switches DSP preset between automatic speech mixer and live console.
- [ ] **20.7 BLU-DAN Dante Bridge**: Audio flows over Dante network to Allen & Heath SQ-5 console.

### `pispace` *(Suggested Priority 3 Sanctuary Digital Twin)*
- [ ] **21.1 Service Health**: `GET /health` returns `200 OK` on port `3203`.
- [ ] **21.2 3D Coordinate Calibration**: Sanctuary coordinate system origin $(0,0,0)$ aligned with altar rail.
- [ ] **21.3 FreeD Raycasting**: Combines camera FreeD angles and 2D bounding boxes to pinpoint 3D coordinates.
- [ ] **21.4 Liturgical Zone Triggers**: Emits `zone_enter` / `zone_exit` for `pulpit`, `lectern`, `altar`, `choir`.
- [ ] **21.5 Inverse PTZ Solver**: Computes pan, tilt, zoom angles to frame any 3D coordinate with requested shot type.
- [ ] **21.6 Real-Time Spatial SSE Bus**: Emits spatial updates to `pidirector` and `picontrol`.

### `pirundown` *(Suggested Priority 3 Service Rundown Engine)*
- [ ] **22.1 Service Health**: `GET /health` returns `200 OK` on port `3400`.
- [ ] **22.2 Rundown v2 YAML Parsing**: Validates and loads complete Sunday worship liturgy schema.
- [ ] **22.3 `varfetch` Lectionary Resolution**: Dynamically resolves Sunday scripture texts, hymn numbers, and pastor names.
- [ ] **22.4 Automated Cue Progression**: Advances service cues on manual operator trigger or STT speech triggers.
- [ ] **22.5 Downstream Cue Dispatch**: Dispatches simultaneous camera preset, video cut, and audio unmute actions.

### `pirundown-designer` *(Suggested Priority 3 Authoring App)*
- [ ] **23.1 Visual Designer Web UI**: Accessible in browser at `http://localhost:3610`.
- [ ] **23.2 Liturgical Section Builder**: Configures *Johdanto*, *Sana*, *Rukous*, *Ehtoollinen*, *Päätös*.
- [ ] **23.3 Priest & Speaker Registry**: Manages pastor assignments and enforces role formatting.
- [ ] **23.4 Push to Production Rundown**: Pushes validated YAML cue sheet directly to `pirundown` (`POST :3400/api/v1/rundown/load`).

### `canva-pieco-app` (`picanva`) *(Suggested Priority 3 Canva Integration)*
- [ ] **24.1 Canva SDK Sandbox**: App loads cleanly inside official Canva workspace.
- [ ] **24.2 PiGateway Communication**: Communicates securely with church PiGateway over HTTPS.
- [ ] **24.3 Live Slide Staging**: Exports liturgy slide deck into `piprogram` staging directory.

### `piui` *(Suggested Priority 3 UI Component Library)*
- [ ] **25.1 Component Package Integrity**: `@piecosystem/piui` builds and exports TypeScript primitives.
- [ ] **25.2 Atomic Visual Elements**: Verifies badges, buttons, meters, and status dots render cleanly.
- [ ] **25.3 Molecular Control Elements**: Verifies PTZ pads, ATEM bus selectors, and audio faders render cleanly.
- [ ] **25.4 Dark Mode & High Contrast**: Validates UI elements in church dim-light control booth conditions.

### `pistorage` *(Suggested Priority 3 Durable Asset Storage)*
- [ ] **26.1 Service Health**: `GET /health` returns `200 OK` on port `3700`.
- [ ] **26.2 S3 / VersityGW Storage Target**: Connects to local S3 staging bucket on Workstation.
- [ ] **26.3 Asset Upload & Read-Through Cache**: Stores slide images and retrieves them through local disk cache.
- [ ] **26.4 Media Retention Policy**: Verifies archival recordings are persisted safely.

### `fffleet` *(Suggested Priority 3 Distributed Transcoding)*
- [ ] **27.1 FFFleet Orchestrator Health**: `GET /health` returns `200 OK` on port `5000`.
- [ ] **27.2 Worker Pool Discovery**: Identifies available local FFmpeg workers.
- [ ] **27.3 Test Transcode Job**: Submits short video conversion job; confirms completion.
- [ ] **27.4 Dashboard Inspection**: Orchestrator UI at `http://localhost:5000/ui/` displays job events.

---

## 5. Priority 4: Autonomous Directing, Agents & Post-Production

These 7 modules provide AI agent reasoning, automated camera cutting, semantic vector search, notifications, and post-service sermon extraction.

### `piagent` (Agent Infrastructure Plane)
- [ ] **28.1 Service Health**: `GET /health` returns `200 OK` on port `3301`.
- [ ] **28.2 LangGraph State Machine**: Initializes agent graph with tool-calling capabilities.
- [ ] **28.3 Vercel AI SDK Wire Protocol**: Streams generative UI responses to `picontrol` chat console.
- [ ] **28.4 $<5\text{ms}$ Operator Hard Preemption**: Human operator action sends `abort` signal, canceling active AI actions instantly.
- [ ] **28.5 VRAM Arbiter**: Prioritizes `pidirector` real-time inference over general chat queries.

### `pidirector` (Local AI Stream Director)
- [ ] **29.1 Service Health**: `GET /health` returns `200 OK` on port `3401`.
- [ ] **29.2 Ollama LLM Connection**: Connects to local Ollama instance (`llama3.2:3b` or `qwen2.5:7b-instruct`).
- [ ] **29.3 Multi-Sensor Data Fusion**: Ingests VAD audio status, Finnish STT text, YOLOX tracking, and 3D stage zones.
- [ ] **29.4 Co-Pilot Advisory Mode**: Emits camera and switcher suggestions to operator UI without executing them.
- [ ] **29.5 Autonomous Director Mode**: Executes safe camera preset recalls and ATEM cuts guided by Rundown rules.
- [ ] **29.6 Moving Camera Safety Interlock**: Verifies cuts are suppressed if the target camera is still physically in motion.

### `piembed` *(Suggested Priority 4 Vector Search)*
- [ ] **30.1 Service Health**: `GET /health` returns `200 OK` on port `3300`.
- [ ] **30.2 Embedding Model**: Ingests text and computes dense vector embeddings on ONNX runtime.
- [ ] **30.3 Semantic Cue Matching**: Matches spoken Finnish phrases against liturgical cue library.

### `picomposer` & `picomposer-mcp` *(Suggested Priority 4 Generative UI)*
- [ ] **31.1 Service Health**: `GET /health` returns `200 OK` on port `3402`.
- [ ] **31.2 MCP Server Health**: Exposes composer tools on port `3601`.
- [ ] **31.3 Dynamic Multi-Screen Canvas**: Generates tailored monitoring layouts based on active operator tasks.
- [ ] **31.4 Real-Time Generative Widgets**: Renders custom live widgets into the operator UI.

### `pinotify` / `notify-core` *(Suggested Priority 4 Alerting)*
- [ ] **32.1 Service Health**: `GET /health` returns `200 OK` on port `3109`.
- [ ] **32.2 Critical Failure Notification**: Dispatches test alert on simulated encoder or camera disconnect.
- [ ] **32.3 Notification Channels**: Validates email/SMS dispatch via `notify-core` library.

### `saarnavideo` *(Suggested Priority 4 Sermon Post-Production)*
- [ ] **33.1 Video Ingest**: Accesses finished service recording from Matrox encoder or FFFleet storage.
- [ ] **33.2 Sermon Boundary Detection**: Identifies sermon start/end timestamps from STT cues.
- [ ] **33.3 Automated Clipping & Export**: Exports isolated sermon video with intro/outro titles for parish website.

### `pisim` *(Suggested Priority 4 Offline Simulator)*
- [ ] **34.1 Simulator Environment**: Initializes virtual devices for ATEM, AVer cameras, and BSS DSP.
- [ ] **34.2 Scripted Worship Playback**: Replays recorded 10-minute church service event stream.
- [ ] **34.3 Regression Validation**: Confirms all ecosystem services handle simulated inputs without errors.

---

## 6. How to Record Progress On-Site

When you are at the church venue:
1. Open this file: [`piecosystem/docs/venue-verification-priorities.md`](file:///d:/piecosystem/docs/venue-verification-priorities.md).
2. As each test passes, change `[ ]` to `[x]`.
3. Increment the **Verified (Done)** count in the Section 1 ledger table.
4. Update the **Status** column from `⏳ Ready for Venue` to `🟡 In Progress` or `✅ Verified`.
5. Run `git commit -am "chore(verification): update on-site verification progress"` in `d:\piecosystem` to keep the verification history preserved in version control.
