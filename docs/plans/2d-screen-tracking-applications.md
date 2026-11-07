# Future Applications for 2D Screen Tracking Telemetry

**PiPerception** (`piperception`, port `3202`) and **PiGateway** (`pigateway`, port `3000` / UDP `40002`) provide real-time, low-latency 2D screen tracking (`[ymin, xmin, ymax, xmax]`, persistent `trackId`, velocity `(vx, vy)`, confidence) over lightweight UDP datagrams.

Unlike **Space Tracking** (`pispace`), which projects bounding boxes into 3D world meters $(X, Y, Z)$ inside venue polygons (`altar`, `pulpit`, `lectern`), **Screen Tracking** operates directly in normalized camera sensor coordinates $[0.0, 1.0]$. This makes screen tracking 100% independent of 3D spatial calibration, ground-truth venue models, or FreeD camera mount offsets.

Here are the primary architectural opportunities and future applications enabled by having real-time 2D screen tracking live on the Gateway event bus:

---

## 1. Automated VISCA PTZ Camera Framing & Tracking (`picam`)

* **Screen-Space Error PID Controller**:
  A camera auto-tracking loop does not need 3D world coordinates. By computing normalized tracking errors:
  $$e_x = \text{center}_x - 0.5, \quad e_y = \text{center}_y - 0.5$$
  a simple proportional-integral-derivative (PID) loop can calculate continuous VISCA pan and tilt velocities (`0..24`) to keep the speaker centered in the camera viewport smoothly.
* **Auto-Framing & Dynamic Optical Zooming**:
  By evaluating normalized bounding box height $h = y_{\max} - y_{\min}$:
  * Target Medium Close-Up (MCU): $h \approx 0.45$ (subject occupies ~45% of vertical frame).
  * If subject walks toward the camera ($h > 0.55$), drive optical zoom out.
  * If subject steps back ($h < 0.35$), drive optical zoom in.
* **Headroom Maintenance Rule (Rule of Thirds)**:
  Calculate top margin $y_{\min}$. If $y_{\min} < 0.1$ (head touching top of frame), tilt up immediately to maintain comfortable headroom for broadcast.

---

## 2. Autonomous Broadcast Director Cut Evaluation (`pidirector`)

* **Framing Quality Score (FQS)**:
  Before cutting to a camera, `pidirector` can evaluate whether the camera currently has a broadcast-safe, aesthetically pleasing shot:
  * **Edge Cutoff Guard**: Disallow cutting to a camera if $x_{\min} < 0.05$ or $x_{\max} > 0.95$ (subject partially out of frame).
  * **Subject Centering Score**: Reward shots where active talkers are within the safe zone $[0.2, 0.8]$.
  * **Headroom Check**: Reject shots where the person's head is cut off.
* **Empty Podium / Altar Fallback**:
  If a preset (e.g. `pulpit`) was recalled, but zero people are detected in the 2D bounding boxes for that camera after transit settling, `pidirector` immediately aborts the cut and falls back to a safe wide shot or congregation angle.
* **Multi-Subject Two-Shot Detection**:
  If two bounding boxes are tracked on the same camera (e.g., priest and deacon at the altar table), `pidirector` tags the camera as an active "two-shot" without needing spatial polygon intersection.

---

## 3. Dynamic Lower-Third & Face Tag Alignment (`pigraphics`)

* **Tracking-Anchored Graphic Overlays**:
  Anchor lower-third name banners or speaker identifiers directly below the subject's 2D bounding box on the live SDI / NDI fill/key output:
  $$X_{\text{banner}} = x_{\min}, \quad Y_{\text{banner}} = y_{\max} + \text{offset}$$
* **Live Speaker Tracking Reticle for Multiview / Operator UI**:
  Draw bounding box overlays, track IDs, and confidence badges in `piui` / `picontrol` without taxing the main broadcast compositor.

---

## 4. Privacy Masking & Sensitive Area Defocus

* **Dynamic Lens Defocus on Congregation Intrusion**:
  If a tracked subject wanders into a designated private zone on screen (e.g. choir members or communion communicants who have not consented to broadcast), `picam` can trigger its near-limit optical lens defocus or trigger an ATEM DSK privacy blur.

---

## 5. Multi-Camera Redundancy & Cross-Validation

* If `pispace` experiences 3D calibration drift or FreeD UDP drops, `pigateway` and `pidirector` fall back to 2D screen tracking metrics as the ground truth for camera switching.
* High-frequency telemetry (5–15 Hz over UDP port `40002`) ensures zero frame delays and eliminates HTTP connection overhead across the video pipeline.
