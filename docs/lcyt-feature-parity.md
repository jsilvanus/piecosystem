# Feature Parity Matrix: Pi Ecosystem (`pi*`) vs. Live Captions YT (`lcyt`)

## Executive Summary

`live-captions-yt` (`lcyt`) originated as a consolidated broadcast automation, Speech-to-Text (STT), and delayed-captioning system for live-streamed church services. It combined RTMP ingestion, video delay buffers, STT transcription, software DSK overlays, and basic PTZ camera tracking into a single Node.js application stack.

The **Pi Production Ecosystem** (`pi*`) reimagines this entire broadcast workflow as an **edge-native microservices architecture** separated into strict **Control vs. Media (Data) Planes**. Rather than running monolithic FFmpeg pipelines in a single process, the Pi Ecosystem distributes specialized workloads across physical edge devices (Raspberry Pis, ATEM switchers, BSS DSPs, AMX controllers) and hardware-accelerated nodes, orchestrated through `pigateway` and operated via `picontrol` (operator console) and `picontrol-mcp` (AI agents).

---

## Comprehensive Parity Matrix

| Feature Domain | `live-captions-yt` (`lcyt`) | Pi Ecosystem Counterpart | Parity Status | Architectural Comparison & Advantages |
| :--- | :--- | :--- | :---: | :--- |
| **Video Ingestion & Relay** | Monolithic RTMP server (`node-media-server`/Nginx RTMP), disk-based chunk buffers | `mediamtx` + `fffleet` + `pimatrix` | **Exceeds** | `lcyt` relies on software RTMP ingest with high latency. Pi uses `mediamtx` (RTSP, RTMP, WebRTC, HLS) and `pimatrix` for direct zero-latency KMS/DRM hardware framebuffers and distributed transcoding via `fffleet`. |
| **Hardware Video Switching** | Software DSK / FFmpeg filter graph mixing | `piswitch` (ATEM Production Studio / Constellation) | **Exceeds** | `lcyt` composites video in CPU/GPU software before RTMP egress. `piswitch` drives hardware Blackmagic ATEM switchers over UDP 9910, managing hardware crossbars, DVE, transitions, and native upstream/downstream keyers. |
| **Media Pool & Stills** | Local image uploads loaded into ffmpeg overlay filter | `piswitch` `MediaPoolManager` | **Exceeds** | `piswitch` features a 24-slot hardware media pool with an automated circular 6-slot slide ring buffer (1..6) with $(N-2)$ auto-cleanup, plus 18 graphic slots (7..24) synced directly to ATEM memory. |
| **PTZ Camera Control** | `VISCAOverIP` driver, preset recalling | `picam` | **Exceeds** | `picam` provides full binary VISCA-over-IP (UDP 52381) and HTTP CGI controls, including pan/tilt speeds, optical zoom, variable preset curves, AVer SmartFrame auto-framing, and defocus privacy blur. |
| **Computer Vision & Tracking** | Embedded OpenCV/MediaPipe person/face tracker in monolithic agent | `piperception` + `pispace` | **Exceeds** | `piperception` runs hardware-accelerated YOLOX on ONNX Runtime for 2D bounding boxes and ByteTrack. `pispace` acts as a 3D digital twin, fusing FreeD telemetry (`UDP 40000`) with bounding boxes to compute real-world $(X, Y, Z)$ coordinates and sanctuary zone occupancy (`pulpit`, `altar`, `lectern`, `choir`). |
| **Audio Ingest & DSP** | Software audio capture via FFmpeg / RTMP demux | `pivoice` + `pisound` | **Exceeds** | `pivoice` captures directly from USB ALSA, executing in-process Silero neural VAD and energy gating. `pisound` interfaces directly with sanctuary hardware DSP (BSS Soundweb London BLU-100 via HiQnet TCP 1023) for physical microphone gain, automixing, and SQ-5 digital mixing presets. |
| **Speech-to-Text (STT)** | Google Cloud STT, OpenAI Whisper HTTP, PCM buffer | `liturgos-auditor` + `pivoice` | **Full Parity** | `pivoice` streams clean 16kHz S16LE PCM chunks with Silero VAD flags to `liturgos-auditor`, which performs real-time continuous transcription with speaker tokenization. |
| **Broadcast Delay & Captions** | 30s video delay buffer with CEA-608 embedding and YouTube Live timed captions | `pitube` | **Full Parity** | `pitube` synchronizes the 30s delay offset, communicates with YouTube Live Data API v3 for broadcast lifecycle automation, and pushes synchronized timed live captions directly to YouTube ingest endpoints. |
| **On-Air Graphics & Overlays** | Server-side SVG/Canvas generation baked into video stream | `pigraphics` + `picanva` + `piprogram` | **Exceeds** | `pigraphics` generates real-time HTML5/CSS animated graphics (lower-thirds, speaker tags, liturgy badges, bug/clock) rendered via Chromium/CEF with transparent alpha keys. `picanva` provides a Canva App extension for liturgical slides, and `piprogram` formats hymns and stage confidence views. |
| **Liturgical Rundown & Show Control** | Monolithic cue list with basic delay/trigger | `pirundown` + `pirundown-designer` | **Exceeds** | `pirundown` provides declarative YAML v2 cue sheets with conditional execution, countdowns, step triggers, and dynamic parameter resolution (`varfetch`). `pirundown-designer` provides a graphical web designer for authoring and validating services. |
| **Semantic Speech Cues** | `lcyt-cues` semantic match via `lcyt-agent` embeddings | `piembed` + `pirundown` | **Exceeds** | `piembed` (port 3125) preflights rundown semantic cues into a dimension-agnostic `Float32Array` vector cache using remote Ollama (`bge-m3`, `nomic-embed-text`) with automatic zero-downtime failover to in-process Hugging Face ONNX (`@huggingface/transformers`) and dynamic runtime model loading. |
| **Central Bus & State Sync** | Internal event emitter and direct SQLite tables | `pigateway` | **Exceeds** | `pigateway` exposes an OpenAPI v1 REST gateway and SSE event bus (`GET /api/v1/events`), maintaining authoritative in-memory state of all edge nodes, hardware watchdogs, and AMX NetLinx bridge (TCP 6501/6600). |
| **Parish Web Radio** | Local Icecast mountpoint relay | `web-radio-relay` | **Full Parity** | Standalone Nginx-RTMP/Icecast/HLS distribution server with silence detection, audio fallback playlists, and low-latency audio streaming for parish members. |
| **Desktop Capture / Slide Share** | Manual OBS/vMix input | `virtual-screen-streamer` | **Exceeds** | `virtual-screen-streamer` (.NET 8 WPF/C#) creates virtual display outputs and auto-streams secondary screen capture directly over RTMP into the video matrix. |
| **AI Agent & LLM Automation** | Early prototype agent script (`lcyt-agent`) | `picontrol-mcp` | **Exceeds** | Full Model Context Protocol (MCP) server providing stateless Streamable HTTP endpoints and standardized `pi://` URI resource schemas (`pi://rundown/current`, `pi://atem/program`, `pi://ptz/camera/1`, `pi://world/state`) for Claude, Gemini, and AGY. |
| **Operator UI & CLI** | Monolithic Vue/Express web page | `picontrol` | **In Progress (Phase 2 UI)** | `picontrol` CLI has complete command and client parity across all microservices (`rundown`, `graphics`, `program`, `space`, `perception`, `world`, `transcripts`). Web UI dashboard unified view is planned as the next milestone. |

---

## Architectural Deep Dive: Monolith vs. Microservice Ecosystem

### 1. Separation of Concerns & Failure Domains
- **`lcyt` (Single Failure Domain)**: If an FFmpeg transcode crashes or an STT API timeout hangs the event loop, the camera PTZ controls, RTMP stream, and captions all stutter or terminate simultaneously.
- **Pi Ecosystem (Isolated Failure Domains)**: Every service runs as an autonomous systemd daemon or container. If `liturgos-auditor` or `piperception` restarts, the physical ATEM switcher (`piswitch`), PTZ camera tracking (`picam`), and BSS sound controller (`pisound`) continue operating without a single dropped video frame.

### 2. Control Plane vs. Media (Data) Plane Invariant
- `pigateway` exclusively handles lightweight REST, SSE, and UDP control/telemetry messages.
- High-bandwidth media (4K/1080p60 HDMI, RTSP, RTMP, WebRTC, multi-channel ALSA audio) travels peer-to-peer or through dedicated media multiplexers (`mediamtx`, Blackmagic ATEM, BSS BLU-100).
- This ensures deterministic sub-millisecond control latency regardless of network video load.

### 3. Modularity and Extensibility
- New hardware (such as an additional PTZ camera, an AMX lighting preset, or a new stage display) is integrated simply by adding or configuring an endpoint in `pigateway` or `picam`, without altering the audio or presentation engines.
- AI agents seamlessly interact with the entire production stack via `picontrol-mcp` using well-defined tool abstractions, enabling automated run-of-show execution.
