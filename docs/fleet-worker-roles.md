# Worker Roles & Fleet Workload Distribution for the Church Stack

Which machine runs which jobs in the **Pi Production Ecosystem** and adjacent media services.
Configuration files live in:
- `deploy/fleet-pi/` (`fffleet.yaml`, `worker.env.example`, `fffleet-worker.service`)
- `deploy/operator-pc/` (`compose.yml`, `compose.gpu.yml`, `.env.example`)
- `deploy/assisting-pc/` (`compose.yml`, `compose.gpu.yml`, `.env.example`)

---

## 1. Fleet Worker Topology & Capabilities

| Worker ID | Machine / Host | `FFFLEET_CAPABILITIES` | Slots (`FFFLEET_SLOTS`) | Priority | Why |
|---|---|---|---|:---:|---|
| `pi` | Pi (Raspberry Pi 4) | `usb,normal,host:pi,arch:arm64` | `stream=2,default=1` | 3 | Physical USB capture hardware owner (`hama` video capture stick, ALSA USB audio). Keep slot cap low to preserve CPU and RAM for `mediamtx` and `pigateway`. |
| `operator-pc` | Church Media Workstation (Linux/Win11 + NVIDIA GPU) | `normal,dsk,gpu,nvenc,desktop,host:operator-pc` | `stream=8,default=4` | 2 | Primary powerhouse: DSK / Chromium graphics rendering, GPU NVENC transcoding, camera perception streams, desktop screen capture, and batch video rendering. |
| `assisting-pc` | Assisting CC (Gaming Laptop 2 + NVIDIA GPU) | `normal,gpu,nvenc,host:assisting-pc` | `stream=4,default=2` | 1 | High-priority stream offloader: takes continuous slide feeder streams (`piprogram` feeds 1–3), auxiliary camera perception feeds, and radio encoding first. |

---

## 2. Capabilities Specification

- `usb`: Exclusive hardware connected to the host. A job requiring physical USB devices specifies `requires: ["usb"]`. Only the Pi advertises this capability, ensuring local hardware paths (e.g. `/dev/video*`, ALSA card) are never scheduled remotely.
- `normal`: General-purpose MediaMTX-side FFmpeg work (relays, re-muxing, stream transcoding, one-shot frame grabs). Advertised by all workers for failover resiliency.
- `dsk`: Downstream keying and headless browser rendering. Required for jobs executing Playwright/Chromium live page capture (`pieco-page` / `type: dsk`).
- `gpu` / `nvenc`: Hardware-accelerated video encoding and deep learning compute (CUDA for Whisper STT and YOLOX perception, NVENC for H.264 video compression).
- `desktop`: Direct desktop/monitor duplication capability on the Windows host (used by `virtual-screen-streamer` / IddCx driver).
- `host:<id>` & `arch:<arch>`: Node identification tags for pinning or preference matching.

---

## 3. Migration of Standalone FFmpeg Background (SFMBG) Work to Fleet Workers

To prevent rogue unmanaged processes, CPU spikes on the Pi, and disjointed failure domains, all background FFmpeg streaming and batch jobs across the ecosystem are unified under `fffleet`.

### Workload Inventory per Module

| Module | Workload / Process | Job Kind | Scaling by Camera | Count (2 Cams) | Count (3 Cams) | Count (4 Cams) | Target Placement & Capabilities |
|---|---|---|:---:|:---:|:---:|:---:|---|
| **`pimatrix`** | Hama USB Capture (`StreamSupervisor`) | Stream | Fixed | 1 | 1 | 1 | `pi` (`requires: ["usb"]`) |
| **`pimatrix`** | Live Key Composite (`compose1` / `KeyPublisher`) | Stream | Fixed | 1 | 1 | 1 | `assisting-pc` / `operator-pc` (`normal`) |
| **`pimatrix`** | Frame preview grab (`GET /preview.png`) | Batch | Fixed | 1 (burst) | 1 (burst) | 1 (burst) | `operator-pc` / `assisting-pc` (`normal`) |
| **`piprogram`** | Feed publishers (`PiPGM1`, `PiPGM2`, `PiPGM3`) | Stream | Fixed | 3 | 3 | 3 | `assisting-pc` (`normal`, 5 fps loop) |
| **`piprogram`** | Slide thumbnailer (`step-cache`) & Chromium stills | Batch | Fixed | 1 (burst) | 1 (burst) | 1 (burst) | `operator-pc` / `assisting-pc` (`normal`, `dsk`) |
| **`pigraphics`** | Live Fill + Key graphics stream | Stream | Fixed | 1 | 1 | 1 | `operator-pc` (`dsk`, `gpu`) |
| **`pigraphics`** | Lower-third still rasterization | Batch | Fixed | 1 (burst) | 1 (burst) | 1 (burst) | `operator-pc` / `assisting-pc` (`dsk`, `normal`) |
| **`pivoice`** | ALSA USB mic capture (`CaptureSupervisor`) | Stream | Fixed | 1 | 1 | 1 | `pi` (`requires: ["usb"]`) |
| **`pivoice`** | Radio RTMP encoder (`RadioOutputs`) | Stream | Fixed | 1 | 1 | 1 | `assisting-pc` / `operator-pc` (`normal`) |
| **`piperception`** | Person detection (`type: perception-detect`: reads the camera, YOLOX on CPU, sends detections only) | Stream | **1 per cam** | **2** (`cam1,2`) | **3** (`+cam3`) | **4** (`+aux`) | `operator-pc-detect` (detect-worker container); fallback: local feed to the Pi at 1 fps, detection on the Pi |
| **`liturgos-auditor`** | Live STT stream ingest (`/v1/live`) | Stream | Fixed | 1 | 1 | 1 | `operator-pc` (`normal`) |
| **`liturgos-auditor`** | Batch audio stripping & norm (`/v1/jobs`) | Batch | Fixed | 1 (burst) | 1 (burst) | 1 (burst) | `operator-pc` / `assisting-pc` (`normal`) |
| **`web-radio-relay`** | HLS / MP3 radio supervisor | Stream | Fixed | 1 | 1 | 1 | `assisting-pc` / `operator-pc` (`normal`) |
| **`virtual-screen-streamer`** | Windows virtual display streamer (IddCx) | Stream | Fixed | 1 | 1 | 1 | `operator-pc` (`desktop`, `nvenc`) |
| **`saarnavideo`** | Sermon video render & `yt-dlp` download | Batch | Fixed | 1–2 (burst) | 1–2 (burst) | 1–2 (burst) | `operator-pc` (`normal`, `gpu`) |

---

## 4. Concurrency Totals & Camera Scaling

* **Baseline (2 Cameras: `cam-1` Altar, `cam-2` Pulpit)**:
  * **Continuous Live Streams**: **13 slots**
  * **Burst Batch Allowance**: **2–3 slots**
  * **Total Concurrency Needed**: **15–16 slots**
* **Standard 3 Cameras (`+ cam-3` Tripod / SDI tie-line)**:
  * **Continuous Live Streams**: **14 slots**
  * **Total Concurrency Needed**: **16–17 slots**
* **Extended 4 Cameras (`+ mobile phone / WebRTC aux`)**:
  * **Continuous Live Streams**: **15 slots**
  * **Total Concurrency Needed**: **17–18 slots**

Total cluster provisioned capacity across the three workers is **14 stream slots + 7 default batch slots (21 total)**, providing plenty of headroom for bursts and post-production rendering.

---

## 5. Placement & Scheduling Logic (`fffleet.yaml`)

Job placement is defined in `deploy/fleet-pi/fffleet.yaml`:
1. **USB Hardware Rule**: Jobs with `requires: ["usb"]` are routed exclusively to `pi`.
2. **DSK & Heavy GPU Rule**: `type: dsk` or `requires: ["gpu"]` prioritizes `operator-pc` first, with `assisting-pc` as secondary fallback. Never the Pi.
3. **General Stream Rule**: Normal stream jobs prioritize `assisting-pc` first, `operator-pc` second, and `pi` last (`[assisting-pc, operator-pc, pi]`). This offloads the continuous slide feeders (`PiPGM1–3`) and radio encoders to the assisting laptop, keeping the Operator PC responsive for AI deliberation (`ollama`), Whisper STT, and DSK graphics.
4. **General Batch Rule**: Distributed across all workers using least-loaded round-robin.

---

## 6. Verification Checklist

1. **Verify Orchestrator on Pi**:
   ```bash
   curl -s http://10.0.0.78:5000/v1/health
   curl -s http://10.0.0.78:5000/v1/workers | jq
   ```
2. **Verify Connected Workers**:
   - `pi`: capabilities `[usb, normal, host:pi, arch:arm64]`, slots `stream: 2, default: 1`
   - `operator-pc`: capabilities `[normal, dsk, gpu, nvenc, desktop, host:operator-pc]`, slots `stream: 8, default: 4`
   - `assisting-pc`: capabilities `[normal, gpu, nvenc, host:assisting-pc]`, slots `stream: 4, default: 2`
3. **Test USB Pinning**:
   Submit a test job with `requires: ["usb"]` and confirm `workerId` equals `pi`.
4. **Test DSK Routing**:
   Submit a test job with `type: dsk` and confirm `workerId` equals `operator-pc`.
