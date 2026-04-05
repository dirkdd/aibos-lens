# AI-BOS Lens 🔭

> Meeting intelligence overlay — live transcription + knowledge graph context + Pi agent, all in one floating window.

Part of the [AI-BOS](https://github.com/dirkdd/aibos-core) ecosystem by Wildlife AI.

---

## What It Is

AI-BOS Lens is a desktop overlay that gives you real-time intelligence during meetings. It listens, recognizes who and what is being discussed, queries your AI-BOS knowledge graph, and surfaces the right context — exactly when you need it.

- **Live transcription** — local Deepgram + Fireflies Realtime API (hybrid mode)
- **Pi in your corner** — the AI-BOS agent watches the transcript and surfaces relevant graph context
- **Quick actions** — create action items, draft emails, log to graph — all from the overlay
- **Graph-aware** — recognizes your clients, projects, and people from Neo4j in real-time
- **Fireflies tight-coupled** — writes action items and soundbites back into Fireflies mid-meeting

## Status

🚧 **Pre-alpha — in active development**

See [PRD.md](./PRD.md) for full product spec.

## Tech Stack

| Layer | Tech |
|---|---|
| Shell | Tauri (Rust + WebView) |
| UI | React + TypeScript + Tailwind |
| Local STT | Deepgram streaming SDK |
| Live meeting feed | Fireflies Realtime API (Socket.IO) |
| Agent | Pi via OpenClaw gateway (WebSocket) |
| Knowledge graph | Neo4j via AI-BOS (wildlife-graph skill) |
| Analysis | Claude Haiku (entity detection) + Sonnet (Pi) |

## Getting Started

> Requires: Rust, Node.js 18+, Tauri CLI, active AI-BOS instance

```bash
git clone https://github.com/dirkdd/aibos-lens
cd aibos-lens
cp .env.example .env
# Fill in your API keys (Deepgram, Fireflies, OpenClaw gateway)
npm install
npm run tauri dev
```

## Environment Variables

See `.env.example` for all required variables.

Key integrations:
- `DEEPGRAM_API_KEY` — Deepgram streaming STT
- `FIREFLIES_API_KEY` — Fireflies GraphQL + Realtime API
- `OPENCLAW_WS_URL` — OpenClaw gateway (Pi agent)
- `OPENCLAW_GATEWAY_TOKEN` — Auth token for Pi

## Project Structure

```
aibos-lens/
├── src-tauri/          # Rust shell (Tauri)
│   ├── src/main.rs
│   └── Cargo.toml
├── src/                # React UI
│   ├── components/
│   │   ├── TranscriptFeed.tsx
│   │   ├── ContextCard.tsx
│   │   ├── QuickActions.tsx
│   │   └── PiChat.tsx
│   ├── services/
│   │   ├── deepgram.ts
│   │   ├── fireflies.ts
│   │   ├── openclaw.ts
│   │   └── analysis-worker.ts
│   └── App.tsx
├── PRD.md              # Full product requirements
├── .env.example
└── package.json
```

## Part of AI-BOS

AI-BOS Lens is a client-facing product built on the AI-BOS platform:

- **AI-BOS Core** → [`dirkdd/aibos-core`](https://github.com/dirkdd/aibos-core) — the platform
- **AI-BOS Lens** → this repo — the meeting intelligence layer

---

*Built by Pi · Wildlife AI · 2026*
