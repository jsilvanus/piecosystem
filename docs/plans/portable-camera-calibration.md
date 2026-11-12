# Portable, User-Defined Camera Calibration

**Status:** Proposed architecture and implementation plan  
**Owners:** PiPerception (piperception) and PiSpace (pispace)  
**Ecosystem record:** Pi Ecosystem (piecosystem)  
**Initial validation site:** Riihimäen Keskuskirkko  
**Initial mobile camera:** Canon XA55  
**Reference cameras:** Existing fixed AVer PTZ cameras with calibrated FreeD poses

## 1. Purpose

Provide a hardware-independent way to introduce mobile cameras into a spatially modelled venue. Users must be able to supply their own venue geometry and their own calibration equipment. They must not have to buy a particular Pi ecosystem calibration board or marker rig.

The system must support:

- Fixed cameras with live pose telemetry, such as FreeD.
- Mobile cameras with a pose established during a deployment session.
- User-defined calibration boards and marker arrangements.
- Portable, tripod-mounted calibration equipment; no permanent venue fixture.
- User-supplied venue geometry and coordinate systems.
- Repeatable, inspectable calibration sessions and reusable camera profiles.

**Core boundary:** PiPerception reports visual observations in image coordinates. PiSpace interprets those observations in venue coordinates and owns calibration-session orchestration and camera-pose management.

## 2. Physical workflow

The initial workflow uses two successive placements of portable calibration equipment. The calibration equipment is moved; nothing is permanently installed in the venue.

### Stage A — Locate the camera tripod

1. Put the camera tripod in the intended operating position.
2. Mount a rigid tracking-marker assembly on the tripod using a repeatable interface.
3. The fixed AVer reference cameras observe the assembly.
4. PiPerception detects its markers and reports timestamped image-space feature coordinates.
5. PiSpace triangulates corresponding observations using the known reference-camera poses.
6. PiSpace reconstructs the marker assembly's 3D coordinate frame in venue coordinates.
7. Apply the measured transform between the marker assembly and the camera mounting interface to estimate the camera mount position and orientation.
8. Save this as an initial pose and an independent reference for validation.

A single sphere gives a point, not orientation. The assembly therefore needs multiple non-collinear, identifiable points with measured relative positions. For example, red, blue and yellow spheres can define an origin and two axes. Marker colour is a detection convenience, not a mathematical requirement.

### Stage B — Calibrate the camera perspective

1. Move the portable calibration target to a second position visible simultaneously to the XA55 and both fixed AVer cameras.
2. Mount the target on a tripod or other stable portable support.
3. The AVer cameras observe the board's identifiable features.
4. PiPerception detects board corners/markers in each AVer image.
5. PiSpace reconstructs the board's 3D feature coordinates and board coordinate frame by stereo/multi-view triangulation.
6. The XA55 captures the same board; PiPerception detects the corresponding feature identities and their pixel coordinates.
7. PiSpace matches the reconstructed 3D points to the XA55's 2D image observations and estimates camera extrinsics using PnP.
8. Compare this pose with the Stage A estimate, calculate quality metrics, and validate or reject the result.
9. Activate the resulting camera deployment only after validation.

Stage A provides an initial physical reference. Stage B provides the image-to-world geometric solution and may refine or challenge Stage A. The two results must not be averaged blindly: disagreement should be diagnosed using reprojection error, measurement uncertainty, mounting transforms and observation quality.

The board itself is portable and must be tracked during Stage B. It is not a permanent fixture.

### Geometric and operational requirements

- The fixed reference cameras must see the same marker/board features at sufficiently close times.
- The mobile camera must see the calibration board during Stage B.
- The board must provide enough well-distributed correspondences for a stable pose solution. A planar ChArUco board is suitable when adequately visible and observed with sufficient image coverage; avoid grazing/edge-on views.
- Use synchronized timestamps or a defined synchronization tolerance when associating observations across cameras.
- The camera-to-tripod mounting transform must be measured and repeatable.
- Intrinsic camera calibration is separate from extrinsic pose calibration. PnP requires an appropriate intrinsic profile for the active resolution, zoom and focus configuration.
- For the initial XA55 deployment, lock/document zoom, focus and image mode. Support separate intrinsic profiles for different zoom settings later.

## 3. Responsibility split

### 3.1 PiPerception — visual observations

PiPerception owns image acquisition and visual feature detection. It must remain venue-agnostic.

**Responsibilities**

- Ingest the mobile camera and fixed reference-camera analysis feeds through the existing frame/stream architecture.
- Preserve source identity, frame dimensions and timestamps.
- Provide configurable detector modules for:
  - Coloured blobs/markers, including configurable colour ranges and shape constraints.
  - AprilTag.
  - ArUco.
  - ChArUco.
  - Checkerboard corners.
  - Future custom detector implementations.
- Return identified image-space features: pixel coordinates, feature/marker identity, confidence and relevant detection-quality information.
- Support partial board visibility where the detector permits it.
- Expose the latest frame/observation capability for calibration consumers without building a second video pipeline.
- Provide the image observations needed for camera intrinsic calibration.
- Keep detector provenance and configuration/version with observations.

**Common observation contract**

The PiSpace-facing contract should be detector-independent and include at least:

- Schema/version.
- Camera/source ID.
- Frame timestamp and frame dimensions.
- Target/kit instance ID where known.
- Detector ID and detector version.
- Feature ID and pixel coordinate(s).
- Confidence/quality fields.
- Optional corner ordering, marker family/dictionary and detector-specific metadata.

Example (illustrative only):

~~~json
{
  "version": 1,
  "cameraId": "canon-capture",
  "timestamp": "2026-11-12T12:00:00Z",
  "frame": { "width": 1920, "height": 1080 },
  "targetId": "board-main",
  "detector": "opencv-charuco",
  "features": [
    {
      "featureId": "corner-001",
      "pixel": [812.4, 421.8],
      "confidence": 0.98
    }
  ]
}
~~~

The final transport and schema should follow the existing PiPerception/PiSpace API conventions and be versioned. Do not introduce venue coordinates into this contract.

**Explicit non-responsibilities**

PiPerception does not own venue geometry, reference-camera world poses, stereo triangulation, venue coordinate transforms, final camera pose, calibration-session state or deployment profiles. It reports what it sees.

### 3.2 PiSpace — spatial calibration and deployment

PiSpace owns calibration orchestration and all venue-specific spatial interpretation.

**Responsibilities**

- Manage calibration-kit definitions and physical kit instances.
- Import and validate venue geometry and coordinate-system metadata.
- Consume timestamped observations from PiPerception.
- Associate observations across cameras and frames.
- Perform stereo/multi-view triangulation in venue coordinates.
- Calculate board and marker-rig coordinate frames.
- Apply rig-to-tripod and tripod-to-camera mounting transforms.
- Perform PnP and camera-pose refinement.
- Calculate reprojection errors, triangulation quality and confidence.
- Compare Stage A and Stage B estimates.
- Manage intrinsic profiles and extrinsic camera deployment profiles.
- Orchestrate calibration sessions and require explicit validation/activation.
- Preserve calibration history and previous valid profiles.

**Camera representation**

Fixed FreeD cameras and mobile calibrated cameras must use a common spatial camera representation. The pose source differs:

- Fixed/telemetry camera: mount definition plus live FreeD pose.
- Mobile camera: deployment-specific calibrated pose, normally static until recalibrated.
- Other cameras: manually supplied pose or another supported pose provider.

The spatial consumer should not need to care whether a camera's pose came from FreeD or a calibration session.

**Calibration session operations**

Use explicit operations/states:

1. Select venue and camera.
2. Select calibration-kit definition and physical instance.
3. Locate Camera (Stage A).
4. Calibrate Perspective (Stage B).
5. Validate measurements.
6. Activate deployment.

Retain observations and intermediate results for diagnosis. Never silently replace an active valid profile with a failed or low-confidence calibration.

## 4. Calibration kits: open and user-defined

Introduce a PiSpace concept called **Calibration Kit**. A kit is a versioned digital description of physical calibration equipment, not a specific product.

Supported component types should include:

- Sphere/coloured marker.
- Fiducial marker.
- ChArUco board.
- Checkerboard.
- Rigid frame and custom reference points.
- Other declarative geometric components.

A kit definition describes:

- Stable ID, name and version.
- Units and handed coordinate-system convention.
- Origin and axis definitions.
- Components and component types.
- Component dimensions.
- Relative positions and orientations.
- Marker IDs, dictionary/family and detector requirements.
- Board pattern dimensions and physical square/marker sizes.
- Expected tolerances and required observations.

### 4.1 Separate definition, physical instance and result

Keep three separate records:

1. **Kit definition:** intended digital design and geometry.
2. **Kit instance:** a particular physical print/assembly, with its measured dimensions, deviations, inspection status and identity.
3. **Calibration result:** observations and calculated results from one session.

Do not assume that two prints of the same board design have identical physical dimensions.

### 4.2 Format

Define a versioned JSON schema independent of OpenCV or any one detector. OpenCV may provide initial detector implementations, but the kit format must describe physical geometry and feature identity, not library-specific object instances.

Illustrative fragment:

~~~json
{
  "schemaVersion": "1.0",
  "kit": {
    "id": "tripod-rig",
    "name": "Tripod Calibration Rig",
    "units": "m",
    "coordinateSystem": {
      "handedness": "right",
      "origin": "red-sphere"
    },
    "components": [
      {
        "id": "red-sphere",
        "type": "sphere",
        "detector": "color-blob",
        "position": [0, 0, 0],
        "radius": 0.05
      },
      {
        "id": "blue-sphere",
        "type": "sphere",
        "detector": "color-blob",
        "position": [0.30, 0, 0],
        "radius": 0.05
      },
      {
        "id": "board-main",
        "type": "charuco",
        "detector": "charuco",
        "position": [0, 0.20, 0],
        "rotation": [0, 0, 0],
        "parameters": {
          "squaresX": 7,
          "squaresY": 5,
          "squareLength": 0.04,
          "markerLength": 0.02,
          "dictionary": "DICT_4X4_50"
        }
      }
    ]
  }
}
~~~

The production schema must specify coordinate and rotation conventions, units, feature identities, physical tolerances, detector requirements, validation rules and compatibility policy.

### 4.3 Import, export and sharing

Users should be able to create, import, export and optionally share kits. A package may contain:

~~~text
my-calibration-kit/
  manifest.json
  geometry.json
  board.svg
  preview.png
  README.md
~~~

Support local/private kits first. Community publishing and a public catalogue are later work.

Treat packages as untrusted declarative data. Never execute code from a kit. Validate schema, file types, dimensions and resource limits.

## 5. Venue geometry

PiSpace accepts user-supplied venue geometry, initially including:

- GLB / glTF.
- OBJ.
- PLY.

Each imported model must have explicit units, scale, origin, axis conventions and a transform into the venue coordinate system. Provide scale/landmark validation; do not assume an uploaded scan is metrically accurate.

Venue geometry and calibration-kit geometry are separate assets:

- Venue geometry describes the environment.
- Kit geometry describes portable calibration equipment.

## 6. Quality, confidence and safety

Record at least:

- Detection confidence and feature localization quality.
- Observation timestamp difference between cameras.
- Stereo triangulation angle and reprojection error.
- PnP reprojection error.
- Intrinsic calibration quality/profile identity.
- Stage A / Stage B pose difference.
- Overall pose confidence and validation state.

Support outcomes such as:

- Valid.
- Valid with warning / low confidence.
- Requires manual review.
- Failed.

Thresholds must be configurable and tested against independently measured reference points. Do not promise a specific accuracy (for example, centimetre-level accuracy) until demonstrated empirically.

Keep the last known-good deployment. Require explicit activation and support rollback. Preserve session observations and diagnostics.

## 7. Existing implementation foundations

Build on the repositories as they exist; do not create a parallel video or spatial pipeline.

### PiPerception

The existing service already has a camera frame pipeline and a FrameHub that retains the newest frame per camera (including a documented snapshot/calibration use). Extend this architecture with calibration-oriented detector/observation consumers rather than introducing a second ingest path.

Existing person detection and ByteTrack tracking remain separate from calibration feature detection. Calibration observations must not be forced into the person-detection bounding-box schema.

### PiSpace

The existing service already has:

- Venue-coordinate and camera-pose concepts.
- FreeD camera telemetry handling.
- Camera intrinsics/optics utilities.
- Image-ray projection and ray triangulation mathematics.
- Venue model loading and spatial scene APIs.

Extend the existing camera and math architecture with general multi-view feature triangulation, calibration-kit geometry, PnP, deployment profiles and session orchestration. Do not duplicate the existing ray/coordinate math or replace the FreeD path.

### Existing Keskuskirkko signal paths

Keep the established architecture:

- AVer SDI → ATEM production.
- AVer RTMP/analysis feed → MediaMTX → PiPerception.
- AVer FreeD → PiSpace.
- Canon XA55 SDI → capture input → MediaMTX/PiPerception.

The Canon remains a normal production camera; calibration adds spatial context and does not require changing the production SDI path.

## 8. Implementation phases and ownership

### Phase 1 — Observation contract

**PiPerception**
- Define a calibration observation model alongside existing person detections.
- Add ChArUco/ArUco and configurable coloured-marker detection.
- Include timestamp, source identity, frame dimensions, feature identity and confidence.
- Reuse FrameHub and existing camera ingest.

**PiSpace**
- Define the versioned observation contract and coordinate conventions.
- Define the initial Calibration Kit schema.
- Identify the integration point for calibration observations.

**Exit condition:** PiSpace can receive detector-independent, timestamped image-space observations from multiple cameras.

### Phase 2 — Calibration-kit geometry

**PiPerception**
- Make detector configuration declarative and compatible with kit component definitions.
- Return stable feature IDs and ordered board corners.

**PiSpace**
- Load and validate kit definitions and instances.
- Represent rigid component geometry and coordinate frames.
- Add kit import/export and basic geometry preview.

**Exit condition:** A user can describe their own marker rig and board without changing application code.

### Phase 3 — Stereo localization (Stage A)

**PiPerception**
- Supply synchronized marker observations from both fixed AVer cameras.

**PiSpace**
- Associate observations by identity and time.
- Triangulate corresponding points.
- Reconstruct the rigid rig coordinate frame.
- Calculate reprojection/triangulation quality.
- Apply the rig-to-tripod/camera mounting transform.

**Exit condition:** The portable marker assembly can establish the camera tripod's pose in venue coordinates.

### Phase 4 — Perspective calibration (Stage B)

**PiPerception**
- Detect board features in both reference-camera feeds and the mobile-camera feed.
- Supply corresponding feature IDs and image coordinates.
- Supply observations for intrinsic calibration where required.

**PiSpace**
- Reconstruct board feature coordinates in venue space.
- Match 3D board features with mobile-camera 2D observations.
- Implement PnP and pose refinement.
- Compare Stage A and Stage B estimates and calculate validation metrics.

**Exit condition:** The mobile camera pose can be calibrated with the portable board visible to the fixed AVer cameras and the mobile camera.

### Phase 5 — Deployment lifecycle

**PiPerception**
- Expose the mobile camera's calibration observations through the same observation interface as other cameras.

**PiSpace**
- Implement calibration sessions and states.
- Manage intrinsic profiles, mounting transforms and deployment profiles.
- Add validation, activation and rollback.

**Exit condition:** A user can complete a guided mobile-camera deployment and activate a validated pose.

### Phase 6 — User assets and venue import

**PiPerception**
- Improve detector extensibility and configuration documentation.

**PiSpace**
- Add kit creator/import/export.
- Add venue geometry import and coordinate/scale validation.
- Add kit instance management and reusable camera profiles.

**Exit condition:** Users can bring their own venue model and calibration equipment.

### Phase 7 — Community ecosystem

**PiSpace**
- Define package compatibility and versioning.
- Add provenance and optional community kit catalogue integration.

**Exit condition:** Calibration kits can be safely exchanged between installations.

## 9. Initial Keskuskirkko prototype and acceptance tests

Use the two existing fixed AVer cameras as reference cameras and the Canon XA55 as the first mobile camera.

Build one low-cost portable prototype with:

- A tripod mounting interface.
- Three identifiable spherical markers in a measured, rigid arrangement.
- A ChArUco board with documented physical dimensions.
- A kit definition and measured physical instance record.

Test the complete two-stage process:

1. Both AVer cameras detect the tripod-mounted marker assembly.
2. PiSpace reconstructs its position and orientation.
3. The calibration board is moved to a second position visible to both AVer cameras and the XA55.
4. Both AVer cameras detect and reconstruct board features.
5. The XA55 detects the same board features.
6. PiSpace estimates the XA55 pose using PnP.
7. Stage A and Stage B results are compared and explained by measured uncertainty.
8. The result is checked against an independently measured camera position/orientation.
9. Repeated deployments produce consistent results within a measured tolerance.
10. Failed calibration leaves the active camera profile unchanged.

The initial Canon profile should use a documented fixed resolution, zoom and focus configuration. Test SDI capture and frame timestamps as part of integration.

## 10. Explicit architectural decisions

1. PiPerception owns visual detection and image-space observations.
2. PiSpace owns calibration-kit definitions, spatial reconstruction, PnP, camera pose and calibration sessions.
3. Intrinsic calibration uses PiPerception image observations; the resulting camera profile is managed by PiSpace.
4. Venue geometry and calibration-kit geometry are separate user-supplied assets.
5. Calibration-kit definitions are open, versioned and independent of OpenCV.
6. Users may use their own boards, marker colours, dimensions and rig arrangements.
7. No permanent calibration fixture is required.
8. The calibration target is tracked by the fixed reference cameras during Stage B; it is not assumed to be stationary in the venue.
9. Fixed FreeD cameras and mobile calibrated cameras share a common spatial camera representation.
10. Calibration results are inspectable, validated, versioned and explicitly activated.

**Target outcome:** Any Pi ecosystem installation can spatially calibrate a mobile camera using its own venue model and its own portable calibration equipment, without requiring proprietary hardware.
