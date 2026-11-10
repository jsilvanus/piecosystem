# Developer Coordination & Engineering Conventions

This document establishes the guidelines, shared standards, and workflows for engineering across the multi-repository Pi ecosystem.

---

## 1. Multi-Repository Structure

The Pi ecosystem is designed as a set of focused, decoupled repositories rather than a monolithic repository:
- **Independent Lifecycles**: Each service can be tested, patched, and restarted via systemd independently.
- **Fail-Safe Isolation**: A failure in slide rendering (`piprogram`) or YouTube live captioning (`pitube`) cannot crash camera PTZ motors (`picam`) or audio routing (`pisound`).
- **Coordinated Planning**: `piecosystem` serves as the central umbrella for roadmaps, architectural contracts, integration testing, and project-wide health checks.

### Repository Status & Fleet Synchronization Tooling
From the root of `piecosystem`:

```bash
# Check status and remote commit drift across all 35+ repositories:
pnpm fleet:sync

# Fast-forward pull all clean repositories behind origin/main:
pnpm fleet:pull

# Automatically clone any newly added ecosystem repos from jsilvanus:
pnpm fleet:clone

# Legacy quick status table:
pnpm status
# or on Windows PowerShell:
pnpm status:ps
```

---

## 2. Core Engineering Principles

All services in the Pi stack adhere to the following invariants:

### A. Separation of Control and Data Planes
- **Inviolable Invariant**: Video frames and raw audio streams **never pass through control daemons or HTTP API gateways**.
- Media flows directly via optimized pipes (GStreamer, MediaMTX, ALSA, RTMP sockets, direct PCM pipes).
- Control APIs exchange small JSON payloads, status enums, and SSE messages.

### B. "Small & Boring" Runtime Stack
- **Runtime**: Node.js 22 or 24 with native ECMAScript Modules (`"type": "module"`).
- **Web Framework**: Fastify (fast, low overhead, schema-driven).
- **No Heavy Databases**: Services are stateless where possible, maintaining runtime state in memory and configuration in environment variables or simple JSON/YAML files.
- **Resilience**: Systemd manages process lifetimes (`Restart=always`); microservices implement watchdog sockets and automatic socket reconnection with exponential backoff.

### C. Contract-First API Definitions
- REST APIs are defined with **OpenAPI 3.0** schemas or strict **Zod** models.
- Downstream clients (e.g. `picontrol`, `picontrol-mcp`, `pigateway`) generate typed SDK clients using generators (e.g., `openapi-typescript-codegen`).
- Changes to API contracts must maintain backward compatibility or provide phased deprecation notices.

### D. Zero-Secret Leaks
- Secrets (stream keys, API tokens, passwords) are strictly held in environment files (`.env`).
- All logging, error traces, status endpoints, and MCP resource dumps automatically sanitize and mask tokens.

---

## 3. Port Allocation Registry Policy

To prevent port conflicts across the Raspberry Pi host system:
- Ports `3000–3999` are reserved for local HTTP microservices and user interfaces.
- Ports `6000–6999` are reserved for industrial AV integration (AMX NetLinx, Crestron).
- Ports `8000–8999` are reserved for video matrixing and media streamers (PiMatrix, MediaMTX).
- Vendor-standard ports are respected: `9910` (ATEM UDP), `1023` (HiQnet TCP), `52381` (VISCA UDP).
- When adding a new microservice, record its port reservation in [`docs/inter-service-matrix.md`](./inter-service-matrix.md) first.

---

## 4. Shared Git & Release Workflow

1. **Branching**:
   - `main`: Production-ready code deployable to the church Raspberry Pi units.
   - Feature branches: `feat/<feature-name>`, `fix/<bug-name>`.
2. **Versioning**:
   - Semantic Versioning (`MAJOR.MINOR.PATCH`).
   - Minor versions indicate new capabilities or non-breaking API additions.
   - Patch versions address bug fixes, protocol tweaks, and performance enhancements.
3. **Commit Messages**:
   - Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.

---

## 5. Physical Venue Boundary & Site Profiles

- **`piecosystem` & `pi*` Services**: Generic software, protocol drivers, and control pipelines. Microservices must not hardcode church IP addresses, channel assignments, or room layouts.
- **`keskuskirkko` Repository**: Sole authoritative repository for the venue's physical location data, AMX NetLinx source code, cabling diagrams, and venue hardware profiles.
- **Configuration Contract**: Microservices consume site-specific topology via `venue-profile.yaml` (see [`docs/site-profile-spec.md`](./site-profile-spec.md)) loaded via `VENUE_PROFILE_PATH` or `VENUE_PROFILE_URL`.
