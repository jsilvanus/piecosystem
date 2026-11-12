# Pi Ecosystem Documentation Index

This directory contains architectural specifications, deployment guides, interface contracts, and design plans for the **Pi Production Ecosystem (`piecosystem`)** at the venue.

---

## 🏛️ Core Architecture & Design Guidelines

- 📐 **[Architectural Layers & Model](architecture-layers.md)**: The 4+1 plane broadcast architecture (Hardware Interfacing, Media Pipeline, Orchestration/State, Consumer Edge, and Cross-Cutting Control/Agent Plane).
- ⚡ **[Event Conditionals & Automation Guidelines](event-conditionals-architecture.md)**: Architectural guidelines and decision matrix for where conditionals (*"When event X happens, do Y"*) belong across `pigateway`, individual modules, and Layer 3 orchestrators.
- 🎬 **[End-to-End Workflow Scenarios](workflow-scenarios.md)**: Sequence diagrams and operational walkthroughs for automated Sunday service cue execution, AI agent assistance via MCP, and live captions.

---

## 📦 Services, Repositories & Protocols

- 📋 **[Projects Catalog](projects-catalog.md)**: In-depth technical specifications, roles, technologies, and port bindings for all ecosystem repositories.
- 🔌 **[Inter-Service Communication & Ports Matrix](inter-service-matrix.md)**: Network port allocations, communication protocols (HTTP, SSE, UDP, VISCA, HiQnet, FreeD), and security boundaries.
- 🛠️ **[Developer Coordination & Conventions](dev-coordination.md)**: Multi-repo maintenance guidelines, shared TypeScript/Fastify patterns, OpenAPI contracts, and health tooling.

---

## 🚢 Deployment, Hardware & Fleet Infrastructure

- 🚢 **[Deployment Plan](deployment-plan.md)**: Deployment topologies, systemd services, container strategies, and rollouts across the Pi, church workstations, and cloud relays.
- 🖥️ **[Fleet Worker Roles & Workload Distribution](fleet-worker-roles.md)**: Specification of worker roles, GPU/DSK capabilities, and FFmpeg/MediaMTX stream and batch job assignments across nodes.
- 📍 **[Site Profile Specification](site-profile-spec.md)**: Venue physical hardware profile schema, audio channel assignments, and device addressing for the venue.

---

## 🧠 Specialized Component Plans

- 🤖 **[pidirector Architecture Plan](pidirector-architecture-plan.md)**: Architecture plan for the local AI stream director using Ollama LLMs and MCP role-based permissions.
- 🧩 **[piagent Architecture Plan](piagent-architecture-plan.md)**: Autonomous agent plane using LangGraph / AI SDK with human preemption.
- 📝 **[LCYT Feature Parity](lcyt-feature-parity.md)**: Feature parity roadmap and verification for YouTube Live captioning and stream lifecycle.
- 🏷️ **[pitally Rename](pitally-rename.md)**: Background notes on the tally service naming and domain scope.
- 📂 **[Plans & RFCs](plans/)**: Additional planning documents and roadmaps.
- 📷 **[Portable, User-Defined Camera Calibration](plans/portable-camera-calibration.md)**: Shared PiPerception/PiSpace plan for portable calibration rigs, user-supplied venue geometry, stereo reconstruction, PnP and mobile-camera deployments.
