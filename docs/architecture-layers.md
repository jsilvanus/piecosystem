# Architecture & Layering Model

This document defines the architectural layers of the **Pi Production Ecosystem** (`pi*`), a modular, edge-native AV broadcast and live production stack powering worship services and events at Riihimäen Keskuskirkko.

---

## 1. Evaluation of the Proposed 4-Layer Model

The proposed layer taxonomy provides a clean, intuitive mental model:
1. **Hardware connections**
2. **Media creation**
3. **Event orchestration**
4. **Consumer edge**

### Strengths of the Model
- **Linear & Comprehensible**: It traces the journey of media and signals from physical stage/sanctuary equipment, through creation and orchestration, out to the end consumer.
- **Clear Operational Scope**: Distinguishes between physical device control, content generation, event sequencing, and external distribution.

### Critical Broadcast Architecture Refinements
In production broadcast and AV-over-IP systems, standard practice requires addressing three core nuances:

1. **Strict Separation of Control Plane vs. Media (Data) Plane**:
   - High-bandwidth media streams (HDMI video, 1080p60 RTSP, multi-channel PCM audio, RTMP) **must never traverse control APIs or gateways**.
   - As mandated across `pigateway` and `pivoice`, control signals (e.g., VISCA UDP packets, ATEM program cuts, HiQnet volume levels) are lightweight, asynchronous, and deterministic, while audio/video frames travel directly between dedicated media pipelines.
   - If "Hardware connections" conflates device control (VISCA, Tally UDP) with raw video/audio capture (HDMI, USB ALSA), architectural boundaries blur.

2. **"Media Creation" vs. "Real-Time Media Processing & Composition"**:
   - *Media Creation & Staging*: Designing slides in Canva (`picanva`), formatting service hymns (`piprogram`), or generating virtual monitors on a PC (`picompanion`).
   - *Live Media Processing & Matrixing*: Compositing video layers, switching camera feeds, PiP overlays, and hardware display outputs (`pimatrix`, `piswitch`).

3. **Defining the "Consumer Edge"**:
   - In IoT and edge computing, the Raspberry Pi itself is an edge node.
   - In broadcast architecture, the "Consumer Edge" denotes **Audience Delivery & Egress**:
     - *Remote Consumers*: YouTube Live video streams and synchronized timed live captions (`pitube`).
     - *Local Radio Consumers*: Low-latency parish web radio stream (`web-radio-relay`).
     - *In-Sanctuary Consumers*: Congregational projector screens and stage confidence monitors (`pimatrix` HDMI, `piprogram` stage page).

4. **Cross-Cutting Control & AI Agent Plane**:
   - Human dashboards (`picontrol`) and AI agents (`picontrol-mcp`) interact with all layers via standardized schemas (`pi://` resources, Streamable HTTP). They form a unifying vertical plane across the entire stack.

---

## 2. The Refined 4+1 Plane Broadcast Architecture

To preserve the simplicity of the proposed model while respecting broadcast engineering invariants, we formalize the **4+1 Plane Broadcast Architecture**:

```mermaid
flowchart TD
    subgraph CP["CROSS-CUTTING CONTROL & AGENTIC PLANE"]
        MCP["picontrol-mcp<br/>(AI Agents / pi:// Resources)"]
        UI["picontrol<br/>(Operator UI & CLI)"]
        GOV["piecosystem<br/>(Coordination, Contracts & CI/CD)"]
    end

    subgraph L3["LAYER 3: ORCHESTRATION & STATE PLANE"]
        RUNDOWN["pirundown<br/>(Service Rundowns, Cues, YAML v2)"]
        SPACE["pispace<br/>(3D Digital Twin, Raycaster, Zone Solver)"]
        GATEWAY["pigateway<br/>(Central Device State & SSE Bus)"]
    end

    subgraph L2["LAYER 2: MEDIA PIPELINE & REAL-TIME COMPOSITION"]
        CANVA["picanva<br/>(Canva Slide App)"]
        PGM["piprogram<br/>(Hymns, Slides, PPTX)"]
        COMPANION["picompanion<br/>(Virtual Displays / RTMP)"]
        PERCEPTION["piperception<br/>(YOLOX / ONNX Bbox & Person Tracking)"]
        VOICE_DSP["pivoice<br/>(ALSA Capture, Silero VAD, PCM Fanout)"]
        MATRIX["pimatrix & piswitch<br/>(Compositor, Video Matrix, Multiview)"]
    end

    subgraph L1["LAYER 1: SOUTHBOUND HARDWARE & PHYSICAL INTERFACING"]
        PICAM["picam<br/>(VISCA-over-IP & CGI PTZ)"]
        PISWITCH["piswitch<br/>(ATEM Switcher Driver)"]
        PISOUND["pisound<br/>(BSS Soundweb HiQnet TCP 1023)"]
        PILIGHT["pilight<br/>(Tally-Ma UDP/HTTP Lights)"]
        HW_DEVICES["Physical Hardware:<br/>Cameras, ATEM, BSS DSP, AMX NetLinx, Tallies, Mics"]
    end

    subgraph L4["LAYER 4: PRESENTATION & EGRESS DELIVERY (CONSUMER EDGE)"]
        YT["pitube<br/>(YouTube Live & Timed Captions)"]
        RADIO["web-radio-relay<br/>(Parish Web Radio Stream)"]
        AUDITOR["liturgos-auditor<br/>(Live Transcription)"]
        DISPLAYS["Sanctuary Projectors & Stage Monitors<br/>(pimatrix HDMI, piprogram Stage Display)"]
    end

    %% Control Flow
    MCP -.-> RUNDOWN
    MCP -.-> GATEWAY
    UI --> RUNDOWN
    UI --> GATEWAY
    RUNDOWN --> GATEWAY
    GATEWAY --> PICAM
    GATEWAY --> PISWITCH
    GATEWAY --> PISOUND
    GATEWAY --> PILIGHT

    %% Hardware Interfacing
    PICAM --> HW_DEVICES
    PISWITCH --> HW_DEVICES
    PISOUND --> HW_DEVICES
    PILIGHT --> HW_DEVICES

    %% Media Flow (Direct Data Plane)
    HW_DEVICES ==>|Video Feeds| MATRIX
    HW_DEVICES ==>|Acoustic Audio| VOICE_DSP
    CANVA ==>|Slides & Assets| PGM
    PGM ==>|Overlays & Hymns| MATRIX
    COMPANION ==>|RTMP Screens| MATRIX
    VOICE_DSP ==>|Audio Stream| RADIO
    VOICE_DSP ==>|16kHz S16LE PCM| AUDITOR

    %% Egress Delivery
    MATRIX ==>|HDMI / PGM Stream| YT
    AUDITOR -.->|Transcripts| YT
    MATRIX ==>|HDMI Outputs| DISPLAYS
    PGM -.->|Web Stage Display| DISPLAYS
```

---

## 3. Layer-by-Layer Breakdown

### Layer 1: Southbound Hardware & Physical Interfacing
- **Mission**: Isolate vendor-specific hardware protocols behind clean microservices with REST/SSE interfaces, and manage physical AV routing infrastructure.
- **Projects**:
  - `pimatrix` (Video Matrix Infrastructure & Display Sink): The primary video crossbar router, interfacing with physical HDMI display ports (DRM/KMS), camera hardware capture (V4L2/CSI), and driving physical sanctuary projection feeds.
  - `picam`: Direct binary VISCA-over-IP (UDP 52381) and HTTP CGI for PTZ cameras (pan/tilt speeds, optical zoom, presets, AVer SmartFrame, defocus privacy blur).
  - `piswitch`: Video switcher driver for Blackmagic ATEM switchers (UDP 9910) and local software fallback switchers.
  - `pisound`: Harman London Direct Inject protocol (TCP 1023) to control BSS Soundweb London BLU-100 DSP (handheld mics, madonnas, sanctuary wired mics, auto-mixer vs SQ-5 presets).
  - `pilight`: Multi-segment wireless tally controller for Tally-Ma lights via HTTP cues and UDP 21324 binary packets.
  - `pivoice` (Hardware Ingest part): Direct ALSA USB microphone capture (Hama mic), continuous/scheduled auto-probing.
  - `pigateway` (Southbound Coordinator): Manages hardware watchdog sockets, AMX NetLinx master (TCP 6501/6600), Matrox Monarch HDX encoder, and device state aggregation.

### Layer 2: Media Pipeline & Real-Time Composition (Data Plane)
- **Mission**: Ingest, process, composite, generate, and transform audio, video, and textual media signals. Heavy media payloads stay strictly in this plane.
- **Projects**:
  - `picanva`: Canva App plugin for liturgical slides, worship lyrics, and real-time presentation control.
  - `piprogram`: Presentation content engine for slide distribution, PPTX conversion, hymn lyric formatting, and stage displays.
  - `picompanion`: Windows desktop companion utilizing virtual monitor drivers to push screen captures as RTMP signals into the matrix.
  - `liturgos-auditor`: Speech-to-Text (STT) transcription engine converting spoken audio into real-time text tokens, timestamps, and caption feeds.
  - `piperception` (Upcoming): Dedicated computer vision microservice running YOLOX on ONNX Runtime to perform real-time person detection, multi-person tracking, and 2D bounding box extraction from camera frames.
  - `pimatrix` (Compositing Engine part): Real-time video compositing, PiP layouts, and graphic overlays.
  - `pivoice` (Signal Processing part): In-process Silero VAD neural voice activity detection, energy gating, acoustic spectral analysis, and clean PCM audio distribution.

### Layer 3: Orchestration, State & Event Plane (Workflow Plane)
- **Mission**: Deterministic, reproducible run-of-show execution, spatial world modeling, and real-time state synchronization across all systems.
- **Projects**:
  - `pirundown`: Automated service rundown engine executing YAML v2 cue sheets with `varfetch` dynamic parameter resolution.
  - `pispace`: Spatial engine and geometric digital-twin service. Fuses FreeD camera tracking telemetry (`UDP 40000`) and 2D bounding boxes (from `piperception`) to calculate real-time 3D positions $(X, Y, Z)$ within sanctuary zones (`pulpit`, `lectern`, `altar`, `choir`), and provides inverse PTZ targeting solvers.
  - `pigateway` (Event Broker part): Low-latency Server-Sent Events (SSE) bus (`GET /api/v1/events`), maintaining authoritative cache of system and device states.

### Layer 4: Presentation & Egress Delivery (Consumer Edge)
- **Mission**: Deliver the finished broadcast and interactive experience to congregation members, online audiences, and worship leaders.
- **Projects**:
  - `pitube`: YouTube Live Data API v3 lifecycle automation (broadcast scheduling, transitions) and ingestion of timed 30s-delayed live captions (`lcyt`).
  - `web-radio-relay`: Icecast/HLS live streaming server distributing real-time church audio to parish listeners.
  - `liturgos-auditor`: Automated speech-to-text transcription engine translating minister voice feeds into real-time text.
  - **In-Sanctuary Presentation**:
    - `pimatrix` HDMI outputs feeding sanctuary projectors and front-of-house displays.
    - `piprogram` stage view providing live cue/hymn confidence monitors for choir, pastors, and organists.

### +1 Cross-Cutting Plane: Unified Control, Observability & Dev Coordination
- **Mission**: Single-pane-of-glass operator control, agentic AI execution, and ecosystem-wide governance.
- **Projects**:
  - `picontrol`: Web management console and unified CLI housing for human broadcast operators.
  - `picontrol-mcp`: Model Context Protocol server exposing stateless Streamable HTTP endpoints and `pi://` resources for AI assistants (e.g. Gemini, Claude).
  - `piecosystem`: Central repository for documentation, architecture models, cross-repo status tracking, shared contracts, and CI/CD coordination.
