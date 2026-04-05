# AI-BOS Lens — Staged Development Roadmap (v0.1 → v1.0)

**Date:** 2026-04-04
**Status:** Approved
**Author:** Pi (AI-BOS) + Claude
**Context:** Enhancement analysis and staged versioning of the AI-BOS Lens PRD

---

## Overview

This document defines the staged development roadmap from v0.1 (PRD MVP) to v1.0 (production release). The strategy is **Sprint to Value** — compressing the highest-impact features into fewer releases to reach "partner" status as fast as possible.

### Priority Themes (in order)

1. **Predictive Intelligence** — Lens knows before you do
2. **Live Coaching** — Pi as strategist, not just encyclopedia
3. **Autonomous Post-Meeting Actions** — Lens does the busywork
4. **Expanded Awareness** — Lens sees more than audio (screen context first)
5. **Scale & Platform** — analytics, multi-channel, competitive intel, hardening

### Key Design Decisions

- **Coaching aggressiveness:** Configurable per meeting type via templates. Sales discovery gets active coaching; client check-ins get gentle nudges; internal meetings get minimal intervention.
- **Post-meeting autonomy:** Progressive trust model. Start with draft-and-review (v0.2), graduate to tiered autonomy (v0.4), full auto with undo window reserved for future once system proves reliable.
- **First expanded sense:** Screen awareness (v0.5). Correlating what's on screen with what's being said is the most differentiated capability.

---

## v0.1 — Foundation

**Codename:** Foundation
**Scope:** PRD MVP (Section 10)

### Deliverables

- Tauri app shell with floating overlay (macOS)
- Deepgram local audio capture → streaming transcript display
- Fireflies active meeting detection + Realtime API connection (hybrid mode)
- Pi chat panel connected to OpenClaw gateway
- 30-second analysis cycle → basic context cards (entity recognition from graph)
- Quick actions: Action Item (Fireflies + graph), Note, Soundbite
- Pre-meeting context load (manual trigger or Pi detects from Fireflies)
- Post-meeting ingest trigger (Fireflies webhook → existing AI-BOS pipeline)
- Keyboard shortcuts (Cmd+Shift+L/P/A/N/C, Escape)
- macOS only

### What v0.1 Proves

The overlay works, the integrations connect, Pi can surface graph context live during real meetings.

### Exit Criteria

Dirk uses it in 3+ real meetings and the transcript + context cards are reliably useful.

---

## v0.2 — Foresight

**Codename:** Foresight
**Themes:** Predictive Intelligence (Theme 1) + Autonomous Post-Meeting (Theme 3)

This is the big leap. Lens goes from "tool you look at during meetings" to "partner that prepares you and follows up for you."

### Pre-Meeting Intelligence

- **Calendar integration** — Lens reads the calendar via Pi/OpenClaw gateway (Pi already has Google Calendar access through AI-BOS skills), detects upcoming meetings, starts preparing context 5-10 minutes before.
- **Auto-briefing cards** — For each detected meeting: attendees pulled from invite → graph lookup → assembled briefing with relationship history, open action items, last meeting summary, project status, unresolved commitments.
- **Briefing notification** — Push notification or overlay auto-appears: "London Alley call in 10 min. 2 open items from last meeting. SOW still unsigned."
- **Attendee discovery** — New attendees (not in graph) get a lightweight web lookup: LinkedIn role, company, connections to existing graph entities.

### Post-Meeting Package (Draft-and-Review)

When a meeting ends, Pi generates a review bundle:

- Meeting summary (key points, decisions made, sentiment)
- Draft follow-up email to attendees
- Extracted action items (with suggested assignees and deadlines)
- Graph updates proposed (new entities, relationship changes, project status)
- Commitment log (promises made by either side, with timestamps)

**Review UI:** New overlay mode — scrollable package with approve/edit/reject per item. One-click approve-all or granular control.

**Execution on approval:** Approved items fire: email via GOG, action items to Fireflies + graph, graph updates commit, commitments tracked.

### Commitment Tracker (Cross-Meeting)

- Commitments extracted from every meeting stored as first-class graph nodes
- Linked to person, client, project, and meeting
- Surfaced in pre-meeting briefing cards: "You promised X on Mar 11 — still open"
- Appears in context cards during live meetings when the same topic resurfaces

### New Infrastructure Required

- Calendar API integration (read-only)
- Post-meeting review UI (new overlay mode)
- Commitment node type in Neo4j graph schema
- Email draft + send flow through Pi/GOG
- Briefing card generation pipeline (runs on schedule, not just 30s analysis cycle)

### What v0.2 Proves

Lens adds value before and after the meeting, not just during. The full meeting lifecycle is covered.

### Exit Criteria

Dirk walks into 3+ meetings already briefed by Lens, and reviews/approves post-meeting packages within 5 minutes of ending calls.

---

## v0.3 — Coach

**Codename:** Coach
**Theme:** Live Coaching (Theme 2)

Pi goes from "here's context" to "here's what to do right now."

### Meeting Templates

User-defined meeting types, each with its own coaching profile:

| Template | Coaching Level | Focus |
|---|---|---|
| Sales Discovery | Aggressive | Buying signals, objection handling, competitor mentions, close nudges |
| Client Check-in | Moderate | Sentiment monitoring, unresolved items, scope creep detection |
| Internal/Standup | Minimal | Action item extraction, time-boxing nudges |
| Board/Exec | Context-heavy | Surface numbers, flag political dynamics, decision tracking |

- **Template auto-detection** — Pi guesses the template from calendar invite title, attendees, and client type. User can override with one click.
- **Template editor** — Simple config UI to create/modify templates: toggle coaching categories, set sensitivity levels.

### Live Coaching Engine

New analysis pipeline running alongside the 30s context cycle, on a shorter cadence (~10s):

**Signal detection:**
- **Buying signals** — budget numbers, timeline commitments, decision-maker references, urgency language
- **Objection patterns** — "I'm not sure about...", pricing pushback, hesitation
- **Conversation dynamics** — talk-time ratio, question frequency, monologue detection (>2 min without a question)
- **Topic drift** — conversation straying from meeting agenda/purpose
- **Sentiment shifts** — tone change detected (enthusiasm → hesitation)

**Coaching card urgency levels:**
- `green` **Suggestion** — "Good time to ask about timeline" (dismissible, fades after 15s)
- `yellow` **Nudge** — "You've been talking for 3 minutes — ask a question" (persists until dismissed)
- `red` **Alert** — "They just named a competitor — you have intel" (persists + highlights)

**Coaching suppression:** If user dismisses 3+ coaching cards in a row, Pi backs off for 5 minutes.

### Talk-Time Metrics

- Real-time talk-time ratio bar in header: "You: 62% | Them: 38%"
- Updates every 30s
- Configurable target per template (e.g., sales discovery target: 30/70 you/them)
- Nudge triggers when ratio drifts too far from target

### New Infrastructure Required

- Template data model + storage (local JSON or graph-backed)
- 10-second coaching analysis cycle (Haiku — cheap and fast)
- Signal classification prompt (buying signals, objections, sentiment)
- Coaching card UI component (distinct from context cards)
- Talk-time tracking from speaker attribution data
- Template editor UI

### What v0.3 Proves

Lens actively makes you better in meetings. It tells you what to do, not just what it knows.

### Exit Criteria

Dirk reports that coaching nudges influenced at least one action per meeting in 5+ consecutive meetings. Talk-time awareness changes behavior.

---

## v0.4 — Trust

**Codename:** Trust
**Themes:** Tiered Autonomy + Cross-Meeting Intelligence

Pi earns more freedom. Lens thinks across your entire meeting history.

### Tiered Autonomy

Graduating from v0.2's draft-and-review model:

**Auto-execute tier (no approval needed):**
- Graph enrichment (new entities, relationship updates, project status)
- Internal notes (meeting summary to graph + Drive)
- Commitment extraction and tracking
- Transcript archival (PDF to client folder)
- Telegram notification ("Meeting wrapped. 3 action items. Summary saved.")

**Approval-required tier:**
- Outbound emails (follow-ups, proposals, intros)
- Calendar events (scheduling on behalf of attendees)
- Action items assigned to others (self-assigned auto-create)
- Client-facing documents (SOWs, recaps shared externally)

**Trust scoring:** Pi tracks approval rate per action type over time. When an action type hits 95%+ approval over 20+ instances, Pi suggests promoting it to auto-execute. User confirms the graduation.

### Cross-Meeting Pattern Detection

**Trend engine** — After each meeting is ingested, Pi runs cross-meeting analysis:
- "3 clients mentioned Q2 budget concerns this month"
- "You've discussed the SOW with London Alley in 4 consecutive meetings — still unsigned"
- "Competitor X named in 2 different prospect calls this week"

**Trend surfacing:**
- Patterns appear in pre-meeting briefing Insights section
- High-signal patterns push notifications outside meetings

### Deal Momentum Scoring

Sales-tagged meetings contribute to a per-deal score:
- **Positive signals:** budget mentioned, timeline discussed, decision-maker engaged, next steps agreed, competitor dismissed
- **Negative signals:** objections unresolved, "we need to think about it," rescheduled meeting, ghosted follow-up
- Score visible in briefing cards and context cards: "London Alley: 72% momentum (up 12 from last meeting)"
- Score tracked as graph property on deal/project node

### Stale Commitment Escalation

- Day 1 overdue: reminder in next pre-meeting briefing
- Day 3 overdue: Telegram ping
- Day 7 overdue: flagged in coaching cards if the client is present

### New Infrastructure Required

- Trust scoring system (approval rate per action type)
- Cross-meeting analysis pipeline (post-ingest, queries across meeting nodes)
- Deal momentum scoring model (signal weights, graph property)
- Escalation scheduler (cron-style commitment deadline checks)
- Insights section in briefing card UI

### What v0.4 Proves

Pi is trustworthy enough to act independently on internal tasks. Lens sees patterns across meetings that a human would miss.

### Exit Criteria

At least 2 action types graduate to auto-execute via trust scoring. Dirk acts on a cross-meeting trend insight he wouldn't have noticed otherwise.

---

## v0.5 — Vision

**Codename:** Vision
**Theme:** Screen Awareness (Theme 5)

Lens grows eyes. It sees what's on screen and correlates it with what's being said.

### Screen Capture Pipeline

- **Periodic screenshot capture** — Every 10-15 seconds during active meetings
- **OCR + visual understanding** — Screenshots processed through Claude vision model:
  - Text content (slide titles, bullet points, spreadsheet values)
  - Visual structure (chart type, layout, slide number)
  - Application context (Slides, Excel, Figma, browser, etc.)
- **Transcript-screen correlation** — Cross-references what's being said with what's on screen:
  - Budget numbers matching/contradicting graph data
  - Slide content aligned with discussion topic
  - Attendee browsing your website/pricing

### Screen-Aware Context Cards

New card type: **Visual Context Card**

```
+-- Screen Context --------------------------+
| Slide: "Q2 Budget Allocation"              |
|    $8,500/mo shown for your project        |
|    Matches approved budget in graph         |
|                                            |
|    "Their total budget is $45K/mo —        |
|    your share is 19%. Room to upsell."     |
|                                            |
| [Log Budget Data]  [Full Analysis]         |
+--------------------------------------------+
```

### Screen-Aware Coaching

Integrates with v0.3 meeting templates:

- **Presentation mode** — "They've been on this slide for 3 minutes — interested or confused?" / "Slide changed — previous had an unanswered question"
- **Document review** — "They're scrolling pricing section — prepare for negotiation" / "They highlighted the cancellation clause"
- **Demo mode** — "They're on your integrations page — mention Fireflies"

### Privacy Controls

- **Capture toggle** — Global on/off in overlay header. Off by default, opt-in per meeting.
- **App exclusion list** — Never capture from specified apps (messaging, banking, personal)
- **No storage by default** — Screenshots processed in-memory, discarded after analysis. Only extracted insights retained if user saves.
- **Visual indicator** — Persistent eye icon when capture is active

### New Infrastructure Required

- Screen capture API (Tauri plugin or native Rust)
- Vision model integration (Claude vision — heavier than Haiku text, budget accordingly)
- Screenshot processing pipeline (capture → vision → correlation → card)
- Privacy controls UI (toggle, exclusion list, storage prefs)
- Visual context card component
- Screen-aware coaching prompts in template system

### What v0.5 Proves

Lens understands the full meeting environment — audio AND visual. Context cards become dramatically more relevant when they account for what everyone is looking at.

### Exit Criteria

Screen-aware context cards appear in 50%+ of meetings with screen sharing. Dirk rates them relevant/useful 70%+ of the time.

---

## v0.6 — Channels

**Codename:** Channels
**Theme:** Multi-Channel Context

- **Slack integration** — Recent threads related to meeting attendees/topics surfaced in briefing cards
- **Email context** — Recent threads with attendees via Gmail API / Pi
- **Ticket/task awareness** — Open items from project management tools (Linear, Asana, etc.)
- Context provenance labels: `[via Slack]` `[via Email]` `[via Graph]`

---

## v0.7 — Intel

**Codename:** Intel
**Theme:** Competitive Intelligence

- Real-time web intel when competitors mentioned (news, funding, product updates)
- Competitive intel card: summary, recent moves, differentiation points, talking points
- Data cached in graph after first lookup — subsequent mentions instant

---

## v0.8 — Mirror

**Codename:** Mirror
**Theme:** Meeting Analytics Dashboard

- **Personal analytics:** meeting frequency, talk-time trends, coaching acceptance rate, follow-up completion, deal momentum charts, commitment fulfillment
- **Client health scores:** composite metric from sentiment, frequency, commitments, momentum
- **Weekly digest:** Pi-generated summary of meeting activity, deal movement, overdue items

---

## v0.9 — Fortress

**Codename:** Fortress
**Theme:** Platform Hardening

- Windows 11 support (WASAPI audio capture)
- Performance optimization to PRD targets (memory, CPU, startup)
- Error recovery (API failures, network drops, gateway disconnects)
- Onboarding flow (first-run setup wizard)
- Settings panel (all configuration centralized)
- Encryption at rest for locally cached data

---

## v1.0 — Lens

**Codename:** Lens
**Theme:** Production Release

### Release Criteria

- All themes integrated and stable
- 2+ weeks of daily use by Dirk without critical bugs
- Full meeting lifecycle: prepare → conduct → coach → follow up → learn
- Trust scoring has graduated 3+ action types to auto-execute
- Cross-meeting intelligence generating actionable insights weekly
- Ready to demo to AI-BOS clients as a product offering

---

## Version Summary

| Version | Codename | Core Addition |
|---|---|---|
| v0.1 | Foundation | Transcript + Pi + quick actions |
| v0.2 | Foresight | Pre-meeting briefing + post-meeting package |
| v0.3 | Coach | Live coaching + meeting templates |
| v0.4 | Trust | Tiered autonomy + cross-meeting patterns |
| v0.5 | Vision | Screen awareness |
| v0.6 | Channels | Slack + email + ticket context |
| v0.7 | Intel | Competitive intelligence |
| v0.8 | Mirror | Analytics dashboard + client health |
| v0.9 | Fortress | Windows, performance, settings, hardening |
| v1.0 | Lens | Production release |

---

*AI-BOS Lens Staged Roadmap — Built by Pi + Claude for Wildlife AI*
