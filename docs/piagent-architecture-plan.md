# `piagent` — Centralized Agent Infrastructure Plane Architecture Plan

## Executive Summary

`piagent` is the dedicated **Agent Infrastructure Plane** for the Pi Ecosystem (`piecosystem`). It bridges local LLM inference engines (**Ollama**) with domain consumers (**`pidirector`**, **`picontrol`**, **`pirundown-designer`**) and southbound execution tools (**`picontrol-mcp`**).

By isolating agentic plumbing into `piagent`, individual applications remain lightweight, maintainable, and decoupled from AI framework specifics.

---

## 1. Core Architectural Responsibilities

1. **Inference & VRAM Management**: Manages connections to local Ollama instances (`http://localhost:11434`), model warmup, and GPU concurrency scheduling (prioritizing live broadcast directing over UI chats).
2. **MCP Tool Loop Execution**: Connects to `picontrol-mcp` (`:3200`) as an authenticated client, translating Ollama tool calls into MCP JSON-RPC requests while preserving caller role credentials.
3. **Generative UI Streaming**: Standardizes wire-protocol streaming (`ai` / Vercel AI SDK) to render interactive widgets, confirmation dialogues, and telemetry cards in `picontrol`.
4. **Multi-Agent Messaging (Actor Bus)**: Coordinates agent-to-agent communication via opt-in mailboxes (Agent-as-a-Tool) and asynchronous intent broadcasting (`director.intent`).
5. **Out-of-Band Interruption Engine**: Integrates with `pigateway` SSE bus and Node.js `AbortController` to terminate in-flight LLM inferences and cancel uncommitted hardware commands in $<5\text{ms}$ when human overrides occur.

---

## 2. System Topology

```mermaid
graph TD
    subgraph INFERENCE["Inference Engine"]
        OLLAMA["Ollama (:11434)<br/>(Llama 3.2, Qwen 2.5, Mistral)"]
    end

    subgraph AGENT_PLANE["piagent (:3120) — Agent Infrastructure Plane"]
        SCHEDULER["Priority Scheduler & VRAM Arbiter"]
        GRAPH["LangGraph.js State Graph & Checkpointer"]
        ROUTER["Inter-Agent Message Bus & Mailbox Manager"]
        INTERRUPT["AbortController & Preemption Engine"]
        GENUI["Vercel AI SDK Stream Adapter"]
    end

    subgraph CONSUMERS["Domain Consumers"]
        DIRECTOR["pidirector (:3450)<br/>(Live Stream Director)"]
        CONTROL["picontrol (:3000)<br/>(Operator UI & Generative UI)"]
        DESIGNER["pirundown-designer (:3410)<br/>(Rundown v2 Assistant)"]
    end

    subgraph SOUTHBOUND["Execution & Event Bus"]
        MCP["picontrol-mcp (:3200)<br/>(RBAC Tools & pi:// Resources)"]
        GATEWAY["pigateway (:3100)<br/>(SSE Real-Time Event Bus)"]
    end

    CONSUMERS -->|Direct / Chat Requests| AGENT_PLANE
    GATEWAY -->|Urgent Overrides / Telemetry| INTERRUPT
    SCHEDULER <-->|Prompts & Tool Schemas| OLLAMA
    GRAPH <-->|tools/call (Scoped Tokens)| MCP
    GENUI ==>|SSE React Component Stream| CONTROL
```

---

## 3. Technology Stack & Key Dependencies

```json
{
  "name": "piagent",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "fastify": "^5.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/sse": "^0.4.0",
    "ai": "^4.0.0",
    "@ai-sdk/react": "^1.0.0",
    "ollama-ai-provider": "^1.0.0",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/core": "^0.3.0",
    "@langchain/ollama": "^0.1.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.24.0",
    "pino": "^9.0.0"
  }
}
```

---

## 4. API Endpoints Specification

| Method | Path | Purpose | Protocol |
|---|---|---|---|
| `POST` | `/api/v1/agent/chat` | Conversational Generative UI endpoint for `picontrol` | HTTP $\to$ SSE Stream |
| `POST` | `/api/v1/agent/direct` | High-priority, low-latency structured decision endpoint for `pidirector` | HTTP JSON |
| `POST` | `/api/v1/agent/messages` | Inter-agent messaging & query dispatch | HTTP JSON |
| `POST` | `/api/v1/agent/interrupt` | Emergency preemption / cancel active turn | HTTP JSON |
| `GET` | `/api/v1/agent/models` | Active model health, VRAM utilization, and queue length | HTTP JSON |
| `GET` | `/api/v1/agent/events` | SSE stream for agent thoughts, intent broadcasts, and tool call logs | SSE Stream |

---

## 5. Multi-Agent & Interruption Architecture

### 5.1 Agent Manifest (Opt-in Communication)
```typescript
export interface AgentManifest {
  id: string; // e.g. 'director', 'copilot', 'audio-assistant'
  name: string;
  defaultModel: string;
  priority: 'realtime' | 'interactive' | 'background'; // Priority scheduling tier
  messaging?: {
    canReceiveDirect?: boolean;    // Can handle incoming queries from other agents
    allowedSenders?: string[];     // e.g. ['copilot', 'admin']
    subscriptions?: string[];      // e.g. ['director.intent', 'liturgy.cue']
  };
}
```

### 5.2 Interruption Flow
1. Operator hits manual cut in `picontrol`.
2. `pigateway` pushes `stream.manual_override` via SSE to `piagent`.
3. `piagent`'s `PreemptionEngine` calls `abortController.abort()` on the active `pidirector` session.
4. Active socket to Ollama is closed immediately ($<5\text{ms}$).
5. Outgoing tool execution queue is purged.
6. `piagent` emits Generative UI card to `picontrol`: `AI Director Preempted — Manual Control Active`.

---

## 6. Implementation Milestones

```mermaid
timeline
    title piagent Implementation Roadmap
    section Sprint 1 : Core & MCP
      Scaffold D:/piagent (Fastify + TS) : 1d
      MCP Client Bridge to picontrol-mcp : 1d
      Ollama Client & Priority Queue : 1d
    section Sprint 2 : Generative UI & LangGraph
      Vercel AI SDK SSE Chat Endpoint : 2d
      LangGraph State Machine Engine : 2d
      AbortController Preemption Engine : 1d
    section Sprint 3 : Inter-Agent & Integration
      Inter-Agent Mailbox & Router : 2d
      picontrol React useChat Integration : 2d
      End-to-End Test Suite : 1d
```
