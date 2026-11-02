# End-to-End Workflow Scenarios

This document walks through real-world operational workflows across the Pi ecosystem layers to demonstrate how microservices collaborate in practice.

---

## Scenario A: Automated Sunday Service Cue Execution

When a service conductor or automation engine triggers the next cue in the liturgy:

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Broadcast Operator
    participant Rundown as pirundown
    participant Gateway as pigateway
    participant Switcher as piswitch / ATEM
    participant Camera as picam
    participant Program as piprogram
    participant Matrix as pimatrix
    participant Tally as pitally
    participant Display as Sanctuary Projector

    Operator->>Rundown: Next Cue ("Opening Hymn")
    Rundown->>Program: Select Hymn Slide ("Hymn 329, Verse 1")
    Program->>Matrix: Push Slide Frame to Composite Overlay
    Rundown->>Camera: Recall Preset 2 (Organist/Choir Angle)
    Camera->>Camera: Drive VISCA motor over UDP 52381
    Rundown->>Switcher: Cut Program to Input 3 (Camera 2)
    Switcher->>Switcher: Send ATEM Cut Packet (UDP 9910)
    Switcher-->>Gateway: Broadcast Switch Event
    Gateway-->>Tally: SSE "atem_pgm: 3"
    Tally->>Tally: Send UDP packet (21324) to tally02 (Red LED)
    Matrix->>Display: Output mixed PGM + Hymn Slide over HDMI
```

1. **Trigger**: Operator presses "Next" in `picontrol` or `pirundown` CLI.
2. **Content Prep (Layer 2)**: `piprogram` renders the formatted hymn graphic and submits it to `pimatrix` overlay slot.
3. **Hardware Repositioning (Layer 1)**: `picam` sends VISCA UDP packets to reposition Camera 2 to preset 2.
4. **Switch Execution (Layer 1 & 2)**: `piswitch` triggers an ATEM cut to Camera 2.
5. **State Broadcast (Layer 3)**: `pigateway` detects the PGM change and broadcasts an SSE event.
6. **Tally Indication (Layer 1)**: `pitally` catches the event and sets the physical tally light on Camera 2 to RED.
7. **Egress (Layer 4)**: The live HDMI feed to the sanctuary projector and YouTube RTMP encoder switches seamlessly.

---

## Scenario B: AI Agent Live Assistance via MCP

An AI assistant (Claude, Gemini, Antigravity) running with `picontrol-mcp` tools assists a volunteer:

```mermaid
sequenceDiagram
    autonumber
    actor Volunteer
    participant Agent as AI Assistant
    participant MCP as picontrol-mcp
    participant Gateway as pigateway
    participant Cam as picam
    participant Mic as pisound

    Volunteer->>Agent: "The guest speaker has walked up to the lectern, please get ready"
    Agent->>MCP: callTool("camera_preset", { camId: 1, preset: 3 })
    MCP->>Cam: POST /api/v1/cameras/1/preset/3
    Cam-->>MCP: { success: true, moving: true }
    Agent->>MCP: callTool("routing_request_route", { source: "cam1", target: "preview" })
    MCP->>Gateway: POST /api/v1/routing/preview
    Agent->>MCP: callTool("voice_configure", { unbind_mutes: ["lectern_mic"] })
    MCP->>Mic: POST /api/v1/mics/lectern/unmute
    Mic-->>MCP: { muted: false, gain: -6.0 }
    Agent-->>Volunteer: "Camera 1 is aligned to the lectern on preview, and the lectern microphone is live."
```

1. The volunteer gives a natural language command.
2. The agent queries resources (`pi://cameras`, `pi://routing/matrix`).
3. The agent dispatches tool calls to `picontrol-mcp` over Streamable HTTP on port `3200`.
4. `picontrol-mcp` validates RBAC permissions and routes requests to the relevant microservices.
5. Camera repositions, preview bus updates, and microphone audio level un-mutes automatically.

---

## Scenario C: Real-Time Audio Capture, VAD & YouTube Live Captions

Continuous automated speech detection and synchronized YouTube closed captioning:

```mermaid
sequenceDiagram
    autonumber
    participant Hama as Physical USB Mic
    participant Voice as pivoice (ALSA + Silero)
    participant Auditor as liturgos-auditor
    participant Gateway as pigateway
    participant Tube as pitube
    participant YouTube as YouTube Live API

    Hama->>Voice: Continuous Raw Audio (ALSA)
    Voice->>Voice: Silero VAD Neural Analysis (32ms frames)
    Voice->>Voice: Speech Detected (probability > 0.75)
    Voice->>Gateway: UDP Telemetry (Port 3101: Speech Active)
    Voice->>Auditor: Direct 16kHz S16LE PCM stream
    Auditor->>Auditor: Whisper/Speech-to-Text Transcription
    Auditor->>Gateway: POST /api/v1/transcripts { text: "..." }
    Gateway-->>Tube: SSE Event "transcript"
    Tube->>Tube: Queue text into 30-Second Video Delay Buffer
    Tube->>YouTube: HTTP POST Timed Captions (CEA-608 / lcyt)
```

1. **Hardware Capture (Layer 1)**: `pivoice` captures USB audio from the sanctuary pulpit/altar microphone.
2. **In-Process VAD (Layer 2)**: Embedded Silero ONNX VAD detects human speech vs background organ music.
3. **Transcription Pipeline (Layer 2/4)**: Clean 16kHz PCM audio flows into `liturgos-auditor`.
4. **State Distribution (Layer 3)**: Resulting text tokens are forwarded to `pigateway` SSE bus.
5. **Latency Alignment & Egress (Layer 4)**: `pitube` holds the text in a synchronized delay queue to match YouTube's 30-second live distribution buffer, streaming timed subtitles right when the minister speaks on screen.
