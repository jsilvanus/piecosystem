# test-syncer

Test tool for `piecosystem` to experiment with and verify **video delay compensation** and **stream-embedded closed captions** (soft subtitles and burned-in overlays).

---

## Background & Why This Exists

In `live-captions-yt` (`lcyt`), an earlier experimental branch attempted to use FFmpeg with `-c:s eia608` to inject subtitles into H.264 streams on the fly. However, that was never verified, and standard FFmpeg builds do not possess an `eia608` subtitle encoder (CEA-608 in FFmpeg is handled either as frame user-data/SEI via `-a53cc 1` from broadcast sources, or soft container tracks).

`test-syncer` provides a fully working, reproducible test harness that:
1. Takes a real broadcast video recording (e.g. from `liturgos-auditor`).
2. Obtains transcription from `liturgos-auditor` (live via HTTP), an adjacent `.vtt` file, or built-in liturgy fallback cues.
3. Applies a configurable **video presentation delay** (e.g. `2.5s` to compensate for STT latency).
4. Produces an output file (MP4 or MKV) with the captions **embedded directly inside the stream**, ready to play and verify in **VLC**.

---

## Quick Start

### 1. Run with Sample Video & Embedded Captions

```bash
node tools/test-syncer/syncer.mjs --video "D:/liturgos-auditor/mass13.9.mp4.mp4" --clip-start 183 --duration 30 --delay 2.5
```

This generates `tools/test-syncer/tmp/mass13.9.mp4-synced.mp4` with a 2.5-second video delay and embedded Finnish closed captions (`mov_text`).

### 2. Open Directly in VLC

Add `--vlc` to automatically open the generated video in VLC:

```bash
node tools/test-syncer/syncer.mjs --clip-start 183 --duration 30 --delay 2.5 --vlc
```

In VLC:
- The video plays with the delayed presentation timing.
- Subtitles appear automatically or under:
  **Subtitle** $\rightarrow$ **Sub Track** $\rightarrow$ **Suomi CC [Finnish]**.

---

## CLI Options

| Option | Shorthand | Description | Default |
| :--- | :--- | :--- | :--- |
| `--video` | `-i` | Input video file path | Discovered in `liturgos-auditor` |
| `--vtt` | `-s` | Input VTT transcript file | Discovered adjacent to video |
| `--auditor` | | `liturgos-auditor` base URL | `http://localhost:8090` |
| `--delay` | `-d` | Video delay in seconds | `2.5` |
| `--clip-start` | `-ss` | Start offset in seconds | `0` |
| `--duration` | `-t` | Duration of clip to process in seconds | `30` |
| `--output` | `-o` | Custom output file path | `tmp/<name>-synced.mp4` |
| `--format` | | Container format (`mp4` or `mkv`) | `mp4` |
| `--burn-in` | | Burn subtitles into video pixels | `false` |
| `--rtmp, --stream` | | Push live stream to MediaMTX RTMP URL | `rtmp://127.0.0.1:1935/live/test` |
| `--loop` | | Loop RTMP stream continuously | `false` |
| `--vlc` | | Launch in VLC immediately | `false` |

---

## Testing Modes

### Mode A: Soft Embedded Captions (Default)
Muxes subtitles into the container stream (`mov_text` for MP4, `subrip` for MKV) with language tagged as `fin` (Finnish). This tests soft closed caption delivery where the viewer can toggle CC on/off.

### Mode B: Burned-in Subtitles (`--burn-in`)
Applies FFmpeg's `setpts` video delay and burns the timed cues into the video pixels using church broadcast typography (white text with semi-transparent dark backing). This provides immediate visual confirmation of the frame-accurate synchronization.

```bash
node tools/test-syncer/syncer.mjs --clip-start 183 --duration 15 --delay 2.5 --burn-in --vlc
```

### Mode C: Live Streaming to MediaMTX (`--rtmp`)
Pushes the delayed video and synchronized captions in real-time over RTMP to MediaMTX.

```bash
# Push 30 seconds to local MediaMTX
node tools/test-syncer/syncer.mjs --clip-start 183 --duration 30 --delay 2.5 --rtmp rtmp://127.0.0.1:1935/live/test

# Continuous streaming loop to test player reconnects
node tools/test-syncer/syncer.mjs --clip-start 183 --duration 60 --delay 2.5 --rtmp --loop

# Open directly in VLC from MediaMTX
node tools/test-syncer/syncer.mjs --clip-start 183 --duration 60 --delay 2.5 --rtmp --vlc
```

Once published to MediaMTX, you can open any of the multi-protocol outputs in VLC:
* **RTMP**: `rtmp://127.0.0.1:1935/live/test`
* **RTSP**: `rtsp://127.0.0.1:8554/live/test`
* **HLS**: `http://127.0.0.1:8888/live/test/index.m3u8`

### Mode D: Live Auditor ASR
When `liturgos-auditor` is running (`docker compose up` or `auditor-stt serve` on port 8090), `test-syncer` extracts the 16kHz audio chunk with FFmpeg, posts it to `/v1/audio/transcriptions` (or `/inference`), and synchronizes the returned segments.

---

## Unit Tests

Run the test suite:

```bash
node --test tools/test-syncer/test/syncer.test.mjs
# or from piecosystem root:
pnpm test
```
