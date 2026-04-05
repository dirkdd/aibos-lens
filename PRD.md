# PRD: AI-BOS Lens
### Meeting Intelligence Overlay — Product Requirements Document
**Version:** 0.1.0  
**Status:** Draft  
**Author:** Pi (AI-BOS)  
**Date:** 2026-04-05  
**Repo:** github.com/dirkdd/aibos-lens

---

## 1. Executive Summary

**AI-BOS Lens** is a desktop overlay application that gives you a second brain during meetings. It combines live transcription, real-time knowledge graph access, and Pi — the AI-BOS agent — to surface contextual intelligence exactly when you need it, without breaking your conversational flow.

Unlike generic AI meeting tools (Cluely, Otter, etc.), Lens is **graph-aware**. It knows your clients, your projects, your history. When a prospect mentions a company name, Lens already has their deal history. When a client references a past meeting, Lens surfaces what was decided. When a commitment is made, Lens writes it to Fireflies and the AI-BOS graph simultaneously.

This is the next evolution of AI-BOS: from a backend operator to an active participant in your working day.

---

## 2. Problem Statement

### The Gap
Sales calls, discovery meetings, client check-ins — these are the moments where business is won or lost. Yet the knowledge needed to perform in those moments (past commitments, client context, project status, people details) is locked in a graph database that you can't query mid-sentence.

### Current Friction
- You're in a Zoom call. A client mentions something from a meeting 3 weeks ago. You can't search your notes while maintaining eye contact.
- A prospect drops a company name. You have intel on them in Neo4j. You can't reach it in real-time.
- An action item is made verbally. It gets captured in Fireflies... eventually. By the time you review it, the nuance is gone.
- Your AI assistant (Pi) is powerful but gated behind Telegram. You can't consult it live in a meeting.

### The Opportunity
Fireflies has a Realtime API. Deepgram has a streaming SDK. OpenClaw has a local WebSocket gateway. Neo4j is already populated. The pieces exist — they just aren't wired together into something you can use in the moment.

---

## 3. Product Vision

> **"The intelligence you've built over months, available in the 30 seconds that matter."**

AI-BOS Lens is a floating desktop overlay that:
1. Listens to your meetings (locally or via Fireflies bot)
2. Understands who is being discussed using the AI-BOS knowledge graph
3. Surfaces the right context, questions, and actions at the right moment
4. Lets Pi take actions — draft emails, schedule meetings, create action items — directly from the overlay
5. Writes everything back to Fireflies and the graph automatically

---

## 4. Target Users

**Primary:** Dirk — agency owner, running sales/client meetings daily, wants to close faster and deliver better
**Secondary:** Future AI-BOS clients (the product ships as part of AI-BOS offerings)

---

## 5. Core Features

### 5.1 Live Transcription (The Feed)
Real-time display of spoken words, streaming as they happen.

**Mode A — Fireflies-Connected:**
- Detects active meetings via Fireflies `active_meetings` GraphQL query
- Connects to Fireflies Realtime API (`wss://api.fireflies.ai`) via Socket.IO
- Receives `transcription.broadcast` events with speaker attribution
- Speaker-color-coded, timestamped, scrolling display

**Mode B — Local Audio Capture (Deepgram):**
- Captures microphone and system audio (loopback) via Tauri system APIs
- Streams to Deepgram streaming STT (`wss://api.deepgram.com`)
- Near-instant (<300ms) transcription
- Works for any meeting platform, phone calls, in-person conversations
- Auto-falls back to this mode when no Fireflies bot detected

**Mode C — Hybrid (default):**
- Local Deepgram for the UI (immediate display)
- Fireflies Realtime in parallel when available (for write-back sync)
- If both present, Fireflies takes precedence for the saved record

### 5.2 Pi Context Panel
The intelligence layer. Appears automatically when Pi has something relevant to surface.

**Trigger conditions (any of):**
- Speaker mentions a tracked entity (company, person, project name recognized in graph)
- Topic shift detected (new subject > 60% different from prior 2 minutes)
- Question is asked in the meeting (detected by interrogative pattern)
- User manually triggers (`Cmd+Shift+P`)

**Context card contents (assembled in real-time):**
- **Who:** Person/company recognized → graph-pulled: role, relationship, last interaction
- **What:** Project/topic recognized → status, last decision, open items
- **History:** Most recent relevant meeting snippet (from Fireflies-ingested transcripts)
- **Suggested question:** Pi-generated based on context gap (what you don't know that matters)
- **Suggested action:** What to do right now (1-click execution)

**Example:**
```
┌─ Pi ─────────────────────────────────────┐
│ 🏢 London Alley (Active Client)          │
│    Status: SOW pending signature         │
│    Last meeting: Mar 11 (board prep)     │
│    Budget: $8,500/mo approved            │
│                                          │
│ 💡 "What's the board's threshold for     │
│    approving the final scope?"           │
│                                          │
│ [Ask Pi More]  [Create Action Item]      │
└──────────────────────────────────────────┘
```

### 5.3 Quick Actions
Context-generated action chips that appear below the transcript. Not static buttons — Pi generates them based on what's being discussed.

**Built-in actions:**
| Action | What it does |
|---|---|
| 📋 Action Item | Creates in Fireflies + Neo4j graph via `createLiveActionItem` |
| 📧 Draft Email | Opens Pi draft panel → produces email for approval → sends via GOG |
| 📅 Schedule | Extracts date/time from transcript → creates calendar event |
| 🔍 Deep Context | Full Neo4j graph query on mentioned entity |
| 📝 Note | Adds timestamped note to the meeting record in Fireflies |
| 🔗 Link to Project | Tags this meeting to a graph project node |
| 💾 Soundbite | Creates a Fireflies soundbite of the last 30 seconds |

**Context-generated chip examples (Pi-generated mid-meeting):**
- "They mentioned M&A activity → [Flag for follow-up]"
- "Competitor named → [Pull competitive intel]"
- "Budget number dropped → [Log to graph]"

### 5.4 Pi Chat Panel
Expandable full-conversation interface with Pi, powered by the OpenClaw local gateway.

- Same Pi you talk to in Telegram — same graph access, same skills
- Context-seeded with current transcript + relevant graph nodes
- Can execute any Pi action: search, draft, graph update, Drive upload
- Keyboard shortcut: `Cmd+Shift+L` to expand/collapse
- Response streamed inline (not modal pop-up)

### 5.5 Post-Meeting Auto-Ingest
When the meeting ends (detected by audio silence or Fireflies webhook):
- Transcript + action items sent to AI-BOS Fireflies ingest pipeline
- Pi generates: meeting summary, key decisions, action items, sentiment notes
- Graph enriched: meeting node created, attendees linked, topics tagged
- Drive upload: transcript PDF routed to client folder
- Notification sent to Telegram: "London Alley meeting wrapped. 3 action items created. SOW mentioned twice."

---

## 6. Technical Architecture

### 6.1 Stack

```
┌────────────────────────────────────────────────────────────┐
│                    AI-BOS LENS (Desktop)                   │
├────────────────────────────────────────────────────────────┤
│  Tauri Shell (Rust)                                        │
│  ├─ System audio capture (CoreAudio/WASAPI/PulseAudio)     │
│  ├─ Window management (always-on-top, floating overlay)    │
│  └─ IPC bridge (Rust ↔ WebView)                           │
├────────────────────────────────────────────────────────────┤
│  React UI (TypeScript)                                     │
│  ├─ Transcript Feed component                              │
│  ├─ Pi Context Panel component                             │
│  ├─ Quick Actions bar                                      │
│  └─ Pi Chat Panel (expandable)                            │
├────────────────────────────────────────────────────────────┤
│  Service Layer (TypeScript workers)                        │
│  ├─ AudioCaptureService (mic + loopback)                   │
│  ├─ DeepgramService (streaming STT)                        │
│  ├─ FirefliesService (Realtime WS + GraphQL API)           │
│  ├─ OpenClawService (Pi gateway WebSocket)                 │
│  └─ AnalysisWorker (30s cycle, entity detection, Pi query) │
└────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
  ┌─────────────┐   ┌──────────────────┐   ┌────────────────┐
  │  Deepgram   │   │  Fireflies API   │   │  OpenClaw      │
  │  Streaming  │   │  ├─ Realtime WS  │   │  Gateway       │
  │  STT API    │   │  ├─ GraphQL API  │   │  (local)       │
  └─────────────┘   │  └─ Webhooks     │   │  ├─ Pi Agent   │
                    └──────────────────┘   │  ├─ Neo4j      │
                                           │  └─ All skills  │
                                           └────────────────┘
```

### 6.2 Key Technical Decisions

**Tauri over Electron:**
Electron bundles ~150MB of Chromium. Tauri uses the OS webview (~5MB binary). Same React/TS UI code either way. Tauri gives us native system audio access via Rust plugins without Node.js hacks. Security sandbox model is also cleaner.

**Deepgram for local STT:**
Already have a key (`DEEPGRAM_API_KEY` in env). Streaming SDK supports real-time mic + system audio. <300ms latency. Works offline-ish (streaming, not local model). Nova-3 model is excellent for conversational speech.

**OpenClaw local gateway as the Pi bridge:**
Pi runs on the EC2 server, but the OpenClaw gateway is already configured with a WebSocket API. The desktop app connects to `wss://wildlifeai-openclaw.mudpuppy-geological.ts.net` (Tailscale) or via the gateway token for authenticated access. This means Pi — with full graph access and all skills — is available in the overlay. No new infrastructure needed.

**Analysis loop cadence:**
Every 30 seconds, OR immediately on:
- Speaker change (could be a new topic)
- Entity name detected matching graph index (fuzzy match)
- Manual trigger

Each cycle: chunk → entity extraction (Haiku, cheap) → graph query → Pi suggestion (Haiku) → UI update.
Full Pi response: only on user-triggered actions (Sonnet/Opus as appropriate).

### 6.3 Fireflies Integration Points

| Feature | API | Notes |
|---|---|---|
| Detect active meetings | `active_meetings` query | Poll every 30s when app is open |
| Live transcript | Realtime API WebSocket | Socket.IO, `transcription.broadcast` |
| Live action items feed | `live_action_items` query | Poll every 60s |
| Write action item | `createLiveActionItem` mutation | 10/hr rate limit |
| Create soundbite | `createLiveSoundbite` mutation | On user request |
| Pause/resume bot | `updateMeetingState` mutation | From UI control |
| Post-meeting transcript | `transcript` query + webhook | On `Transcription.Completed` webhook |
| AskFred integration | `createAskFredThread` mutation | Deep Q&A post-meeting |

### 6.4 AI-BOS Graph Integration Points

All graph access routed through Pi via OpenClaw gateway (not direct Neo4j from the desktop app — keeps auth centralized).

**Pre-meeting context load:**
```
Pi: "Prepare context for meeting with London Alley"
→ Neo4j: MATCH (c:Client {name: "London Alley"})-[:HAS_PROJECT]->(p) RETURN c, p
→ Recent meetings, open action items, key contacts, budget status
→ Returns structured context object to UI
```

**Real-time entity lookup:**
```
Transcript: "...they're working with Sprinklr..."
→ Fuzzy match against graph entity index
→ Neo4j: MATCH (c:Company {name: "Sprinklr"}) RETURN c
→ Surface: competitor intel, relationship graph
```

**Action item creation:**
```
User: [taps Action Item chip]
→ Pi: createLiveActionItem (Fireflies API) + WildlifeGraph.create_action_item()
→ Linked to meeting node, client node, relevant project
```

### 6.5 OpenClaw Gateway Connection

```typescript
// Config (environment-aware)
const OPENCLAW_WS = process.env.OPENCLAW_WS_URL || 'wss://wildlifeai-openclaw.mudpuppy-geological.ts.net';
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN; // d643278711b836eb4e879fe1c2ab538cac5fc75e7ed5458a

// Pi message format (same as Telegram channel)
interface PiMessage {
  type: 'user' | 'assistant';
  content: string;
  context?: {
    transcript_chunk?: string;
    entities?: GraphEntity[];
    meeting_id?: string;
    client?: string;
  };
}
```

---

## 7. UI / UX Specification

### 7.1 Overlay Layout

**Default state (compact — ~320×480px):**
```
┌─────────────────────────────────────┐
│ ● LIVE  00:23:47     [London Alley] │  ← Header bar (draggable)
│                          [⏸] [✕]   │
├─────────────────────────────────────┤
│                                     │
│  Dirk: "So the timeline question    │  ← Transcript feed
│  is really about whether the board  │    (scrolling, speaker-colored)
│  approves it before Q2..."          │
│                                     │
│  Client: "Right, and Marcus is the  │
│  decision maker there..."           │
│                                     │
├─ Pi ────────────────────────────────┤
│ 💡 Marcus Chen = Board Chair        │  ← Context card (auto-appears)
│    Last mentioned: Feb meeting      │    (slides in when triggered)
│    No direct relationship mapped    │
│                                     │
│ Ask: "What's Marcus's timeline      │
│ expectation for the vote?"          │
├─────────────────────────────────────┤
│ [📋 Action] [📧 Email] [📅 Schedule]│  ← Quick action chips
│ [+ Flag: Marcus Chen]               │    (context-generated)
└─────────────────────────────────────┘
```

**Expanded Pi chat state (~320×720px):**
```
┌─────────────────────────────────────┐
│ ● LIVE  00:23:47     [London Alley] │
├─────────────────────────────────────┤
│ [Transcript - last 3 lines]         │
├─ Pi Chat ──────────────────── [▼] ─┤
│                                     │
│  Pi: Marcus Chen is the board       │
│  chair at London Alley. He joined   │
│  in Jan 2025. No prior direct       │
│  interactions logged. The board     │
│  meets quarterly — next meeting     │
│  is likely mid-April.               │
│                                     │
│ ─────────────────────────────────── │
│ > Ask Pi anything...        [Send]  │
└─────────────────────────────────────┘
```

### 7.2 Visual Design Principles
- **Dark overlay, high contrast** — readable over any background
- **Minimal footprint** — doesn't steal screen real estate
- **Animated transitions** — context card slides in, doesn't pop
- **Traffic light opacity** — full opacity when active, 60% when idle (configurable)
- **Never blocking** — click-through mode when no Pi activity for 60s

### 7.3 Keyboard Shortcuts
| Shortcut | Action |
|---|---|
| `Cmd+Shift+L` | Toggle Lens overlay |
| `Cmd+Shift+P` | Force Pi analysis of last 60s |
| `Cmd+Shift+A` | Quick action item from last sentence |
| `Cmd+Shift+N` | Quick note |
| `Cmd+Shift+C` | Copy last Pi suggestion to clipboard |
| `Escape` | Dismiss context card |

---

## 8. Data Flow

```
Audio Input
    │
    ├─► Deepgram Streaming ──► Transcript Buffer (rolling 5min)
    │                                │
    ▼                                ▼
Fireflies Realtime ──► Sync      Analysis Worker (every 30s)
    │                  Buffer         │
    │                                 ├─► Entity Detection (Haiku)
    │                                 │       │
    │                                 │       ▼
    │                                 │   Pi/Neo4j Graph Query
    │                                 │       │
    │                                 │       ▼
    │                                 └─► Context Card Update → UI
    │
    └─► On action item / soundbite ──► Fireflies GraphQL API
                                   ──► AI-BOS Graph (via Pi)
```

---

## 9. Pi Integration Contract

The Lens app communicates with Pi through the OpenClaw gateway using a structured message format. Pi is context-seeded at the start of each meeting.

### 9.1 Meeting Context Seed (sent on meeting start)
```json
{
  "type": "meeting_context",
  "meeting_id": "fireflies_meeting_id_or_local_uuid",
  "client": "London Alley",
  "attendees": ["Dirk", "Client Name"],
  "fireflies_connected": true,
  "timestamp": "2026-04-05T14:00:00Z"
}
```

### 9.2 Analysis Request (every 30s)
```json
{
  "type": "analysis_request",
  "transcript_chunk": "...last 60 seconds of transcript...",
  "entities_detected": ["Marcus Chen", "board meeting", "Q2"],
  "request": "What context should I have? What should I ask or do?"
}
```

### 9.3 Action Execution Request
```json
{
  "type": "action_request",
  "action": "create_action_item",
  "params": {
    "text": "Follow up with Marcus Chen re: board timeline",
    "assignee": "Dirk",
    "meeting_id": "abc123",
    "client": "London Alley"
  }
}
```

### 9.4 Pi Response Format
```json
{
  "type": "pi_response",
  "context_card": {
    "entity": "Marcus Chen",
    "summary": "Board Chair, joined Jan 2025, no prior direct contact",
    "suggested_question": "What's Marcus's timeline expectation?",
    "confidence": 0.87
  },
  "quick_actions": [
    { "label": "Add Marcus to Graph", "action": "graph_upsert", "params": {...} },
    { "label": "Draft Intro Email", "action": "draft_email", "params": {...} }
  ],
  "action_result": null
}
```

---

## 10. MVP Scope (v0.1.0)

### In Scope
- [ ] Tauri app shell (macOS first, Windows later)
- [ ] Local Deepgram audio capture + streaming transcript display
- [ ] Fireflies active meeting detection + Realtime API connection
- [ ] 30-second Pi analysis cycle → context card
- [ ] Quick actions: Action Item (Fireflies + graph), Note, Soundbite
- [ ] Pi chat panel (OpenClaw gateway connection)
- [ ] Pre-meeting context load (graph query on meeting start)
- [ ] Post-meeting trigger (ingest to Fireflies skill + graph)
- [ ] Keyboard shortcuts
- [ ] macOS system audio permission handling

### Out of Scope (v0.2+)
- Windows / Linux builds
- Custom entity index (beyond Neo4j graph)
- Multi-meeting support (one active meeting at a time for v0.1)
- Screen capture / visual context (Cluely feature)
- Automated email/calendar actions (Pi does it, needs approval flow)
- Mobile companion
- White-label packaging for AI-BOS clients

---

## 11. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Transcript latency (local) | < 300ms |
| Pi analysis cycle | < 5s end-to-end |
| Overlay startup time | < 2s |
| Binary size | < 20MB (Tauri) |
| Memory footprint | < 200MB |
| CPU usage (idle) | < 2% |
| CPU usage (active) | < 15% |
| Supported platforms | macOS 13+ (v0.1), Windows 11 (v0.2) |

---

## 12. Security & Privacy

- **No audio leaves the device** unless:
  - Deepgram streaming is active (user-controlled)
  - Fireflies bot is in the meeting (Fireflies handles this)
- Transcript data is ephemeral in-app unless explicitly saved
- OpenClaw gateway connection uses bearer token auth
- No plaintext credentials in source code — all via environment/keychain
- Fireflies API key stored in OS keychain (Tauri `keytar` plugin)
- Client data never mixed — meeting context scoped to detected client

---

## 13. Success Metrics (v0.1)

| Metric | Target |
|---|---|
| Meetings where Pi surfaces relevant context | > 70% |
| Context card false positive rate | < 20% |
| Quick actions used per meeting | ≥ 2 |
| Post-meeting ingest success rate | > 95% |
| User-reported "Pi helped me in the moment" | Qualitative / Dirk feedback |

---

## 14. Open Questions

1. **Audio loopback on macOS** — requires virtual audio driver (BlackHole, Loopback). Do we bundle this or require user to install? Cluely installs silently. We should too.
2. **Fireflies bot auto-join** — can we trigger Fred to join meetings automatically from the app, or does user need to configure this in Fireflies settings?
3. **OpenClaw gateway routing** — when Dirk is on his local machine, the gateway is remote (EC2). Latency for Pi responses will be ~200-500ms round-trip. Acceptable for suggestions; need to test for streaming chat.
4. **Entity index** — right now entity detection relies on Pi/Haiku matching against known graph entities. Do we need a separate entity extraction step with a pre-built index of all graph node names for faster matching?
5. **Rate limits** — Fireflies `createLiveActionItem` is 10/hr. This is fine for manual triggers but means we can't auto-create action items programmatically without burning the limit fast.

---

## 15. Milestones

| Milestone | Target | Deliverable |
|---|---|---|
| M0 — Scaffold | Week 1 | Tauri app running, Deepgram mic input, transcript display |
| M1 — Fireflies Live | Week 2 | Realtime API connected, Fireflies meeting detection |
| M2 — Pi Online | Week 3 | OpenClaw gateway connected, Pi chat panel working |
| M3 — Context Cards | Week 4 | 30s analysis cycle, context card appearing |
| M4 — Quick Actions | Week 5 | All 7 quick actions implemented and functional |
| M5 — Post-Meeting | Week 6 | Auto-ingest, graph enrichment, Telegram notification |
| M6 — Polish | Week 7-8 | UI polish, shortcuts, performance, macOS packaging |
| **v0.1.0 Release** | Week 8 | Internal use by Dirk |

---

## 16. Appendix: Environment Variables Required

```env
# Deepgram
DEEPGRAM_API_KEY=3bf1d2b8cfd1603b95aa15a59ed38486012573d8

# Fireflies
FIREFLIES_API_KEY=<from FIREFLIES_API_KEY env>

# OpenClaw Gateway (Pi)
OPENCLAW_WS_URL=wss://wildlifeai-openclaw.mudpuppy-geological.ts.net
OPENCLAW_GATEWAY_TOKEN=d643278711b836eb4e879fe1c2ab538cac5fc75e7ed5458a

# Optional: Local gateway for dev
OPENCLAW_LOCAL_URL=ws://localhost:18789
```

---

## 17. Appendix: Fireflies Realtime Event Schema

```typescript
// transcription.broadcast event payload
interface TranscriptionBroadcast {
  meeting_id: string;
  transcript_id: string;
  speaker: string;
  speaker_id: string;
  text: string;         // Current sentence fragment
  is_final: boolean;    // True when sentence is complete
  timestamp: number;    // Unix ms
}
```

---

*AI-BOS Lens — v0.1.0 PRD — Built by Pi for Wildlife AI*  
*This document is the source of truth. All implementation decisions should trace back here.*
