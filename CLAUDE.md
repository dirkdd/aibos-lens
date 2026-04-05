# CLAUDE.md — AI-BOS Lens

This file is for Claude Code. Read it before doing anything.

## What This Is

A Tauri desktop overlay app that provides real-time meeting intelligence by:
1. Capturing audio locally (Deepgram streaming STT)
2. Connecting to Fireflies Realtime API when a meeting bot is active
3. Querying the AI-BOS knowledge graph (Neo4j) via Pi/OpenClaw
4. Surfacing context cards and quick actions to the user

## Architecture Decision: Tauri (not Electron)

We chose Tauri for the small binary size and native audio access. The UI is React/TypeScript. The shell is Rust. Do not suggest switching to Electron.

## Key Files

- `PRD.md` — Full product spec. Source of truth. Read this first.
- `.env.example` — All required environment variables
- `src/` — React UI components
- `src-tauri/` — Rust shell

## Getting Started

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Install Node dependencies
npm install

# Run in dev mode
npm run tauri dev
```

## Component Structure

Build these components in order:
1. `TranscriptFeed` — scrolling live transcript with speaker colors
2. `ContextCard` — Pi context panel (slides in/out)
3. `QuickActions` — action chip bar (dynamically generated)
4. `PiChat` — expandable Pi conversation panel

## Service Structure

Build these services:
1. `DeepgramService` — mic + loopback audio → streaming STT
2. `FirefliesService` — active meeting detection + Realtime WS + GraphQL mutations
3. `OpenClawService` — WebSocket connection to Pi/OpenClaw gateway
4. `AnalysisWorker` — 30s cycle: transcript chunk → entity detection → Pi query → UI update

## API Integration Notes

### Fireflies Realtime
```typescript
import { io } from 'socket.io-client';
const socket = io('wss://api.fireflies.ai', {
  path: '/ws/realtime',
  auth: { token: `Bearer ${FIREFLIES_API_KEY}`, transcriptId: meetingId }
});
socket.on('transcription.broadcast', (event) => { /* update transcript */ });
```

### OpenClaw Pi Gateway
The Pi agent lives at the OpenClaw gateway. Connect via WebSocket with the gateway token. Messages are JSON with `type`, `content`, and optional `context` fields. See PRD.md Section 9 for the full contract.

### Deepgram Streaming
```typescript
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
const deepgram = createClient(DEEPGRAM_API_KEY);
const connection = deepgram.listen.live({ model: 'nova-3', punctuate: true });
```

## macOS Audio Notes

System audio capture (loopback) on macOS requires a virtual audio driver. For dev, install [BlackHole](https://github.com/ExistentialAudio/BlackHole). The app should detect if loopback is available and gracefully fall back to mic-only mode if not.

## MVP Goal (v0.1.0)

Get the overlay running with:
- Live Deepgram transcript displayed
- Fireflies meeting detection + connection
- Pi chat panel connected to OpenClaw gateway
- At least one working quick action (Action Item → Fireflies + log)

Full scope in PRD.md Section 10.

## Do Not

- Don't write a custom STT implementation — use Deepgram SDK
- Don't implement direct Neo4j queries from the desktop app — route everything through Pi/OpenClaw
- Don't hardcode API keys — use `.env`
- Don't build for Windows yet — macOS first
- Don't scope creep — MVP is in PRD.md Section 10, that's it for v0.1
