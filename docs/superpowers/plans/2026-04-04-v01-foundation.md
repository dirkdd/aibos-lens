# v0.1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Tauri desktop overlay that displays live transcription (Deepgram + Fireflies), surfaces Pi context cards via the OpenClaw gateway, and provides quick actions — usable in real meetings on macOS.

**Architecture:** Tauri v2 shell (Rust) handles window management and audio capture. React/TypeScript frontend renders the overlay UI. Four service modules (Deepgram, Fireflies, OpenClaw, AnalysisWorker) connect to external APIs via WebSockets and GraphQL. State flows unidirectionally: services emit events → React hooks consume → components render.

**Tech Stack:** Tauri v2, Rust, React 18, TypeScript, Vite, Tailwind CSS, @deepgram/sdk, socket.io-client, Zustand (state management)

---

## File Structure

```
aibos-lens/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── .env                            # Local env (gitignored)
├── .env.example                    # Already exists
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root layout, state orchestration
│   ├── types.ts                    # Shared TypeScript interfaces
│   ├── store.ts                    # Zustand store (transcript, context, meeting state)
│   ├── components/
│   │   ├── OverlayHeader.tsx       # Draggable header bar (timer, meeting name, controls)
│   │   ├── TranscriptFeed.tsx      # Scrolling speaker-colored transcript
│   │   ├── ContextCard.tsx         # Pi context panel (slides in/out)
│   │   ├── QuickActions.tsx        # Dynamic action chip bar
│   │   └── PiChat.tsx             # Expandable Pi conversation panel
│   ├── services/
│   │   ├── deepgram.ts            # Deepgram streaming STT connection
│   │   ├── fireflies.ts           # Fireflies GraphQL + Realtime WebSocket
│   │   ├── openclaw.ts            # Pi gateway WebSocket connection
│   │   └── analysis.ts            # 30s analysis cycle orchestrator
│   └── styles/
│       └── global.css             # Tailwind directives + overlay base styles
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json            # Window config (overlay, transparent, always-on-top)
│   ├── capabilities/
│   │   └── default.json           # IPC permissions
│   ├── icons/                     # App icons (generated)
│   └── src/
│       ├── main.rs                # Tauri entry point
│       └── lib.rs                 # Audio capture commands + IPC handlers
└── tests/
    ├── services/
    │   ├── deepgram.test.ts       # DeepgramService unit tests
    │   ├── fireflies.test.ts      # FirefliesService unit tests
    │   ├── openclaw.test.ts       # OpenClawService unit tests
    │   └── analysis.test.ts       # AnalysisWorker unit tests
    ├── components/
    │   ├── TranscriptFeed.test.tsx # TranscriptFeed render tests
    │   ├── ContextCard.test.tsx    # ContextCard render tests
    │   ├── QuickActions.test.tsx   # QuickActions render tests
    │   └── PiChat.test.tsx        # PiChat render tests
    └── store.test.ts              # Zustand store tests
```

---

## Task 1: Scaffold Tauri + React Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`
- Create: `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `src-tauri/build.rs`, `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- Create: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Create the Tauri + React project**

Run from the project root (which already has files — we scaffold around them):

```bash
npm create tauri-app@latest -- --template react-ts --yes . 2>/dev/null || true
```

If the CLI refuses to scaffold into a non-empty directory, create manually. The key files:

```bash
npm init -y
npm install react@18 react-dom@18 @tauri-apps/api@^2.0.0 @tauri-apps/plugin-shell@^2.0.0
npm install -D @tauri-apps/cli@^2.0.0 @types/react @types/react-dom typescript vite @vitejs/plugin-react
```

- [ ] **Step 2: Create `vite.config.ts`**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
```

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["ES2021", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI-BOS Lens</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Create `src/App.tsx` (minimal shell)**

```tsx
function App() {
  return (
    <div className="overlay">
      <div className="overlay-header">
        <span className="status-dot live" />
        <span>AI-BOS Lens</span>
      </div>
      <div className="overlay-body">
        <p className="text-zinc-400 text-sm p-4">Waiting for meeting...</p>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 8: Create `src-tauri/Cargo.toml`**

```toml
[package]
name = "aibos-lens"
version = "0.1.0"
edition = "2021"

[lib]
name = "aibos_lens_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

- [ ] **Step 9: Create `src-tauri/build.rs`**

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 10: Create `src-tauri/src/main.rs`**

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    aibos_lens_lib::run()
}
```

- [ ] **Step 11: Create `src-tauri/src/lib.rs`**

```rust
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Lens is running.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 12: Create `src-tauri/tauri.conf.json` (overlay window config)**

```json
{
  "$schema": "https://raw.githubusercontent.com/nicedoc/tauri/main/.schema/config.schema.json",
  "productName": "AI-BOS Lens",
  "version": "0.1.0",
  "identifier": "ai.wildlife.aibos-lens",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:5173",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "AI-BOS Lens",
        "width": 320,
        "height": 480,
        "alwaysOnTop": true,
        "decorations": false,
        "transparent": true,
        "resizable": true,
        "minWidth": 280,
        "minHeight": 320,
        "x": 50,
        "y": 50
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 13: Create `src-tauri/capabilities/default.json`**

```json
{
  "identifier": "default",
  "description": "Default capability for AI-BOS Lens",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 14: Update `package.json` scripts**

Ensure `package.json` has these scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "tauri": "tauri"
  }
}
```

- [ ] **Step 15: Generate Tauri icons**

```bash
cd src-tauri && mkdir -p icons
npx @tauri-apps/cli icon ../src-tauri/icons/icon.png 2>/dev/null || echo "Generate icons manually or use placeholder PNGs"
```

If no icon source exists, create minimal placeholder files so the build doesn't fail.

- [ ] **Step 16: Verify the app launches**

```bash
npm run tauri dev
```

Expected: A 320x480 frameless, always-on-top window appears with "AI-BOS Lens" header and "Waiting for meeting..." text on a dark background.

- [ ] **Step 17: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts index.html src/main.tsx src/App.tsx src-tauri/ .gitignore
git commit -m "feat: scaffold Tauri v2 + React project with overlay window config"
```

---

## Task 2: Tailwind CSS + Dark Overlay Styles

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.js`, `src/styles/global.css`
- Modify: `package.json` (add deps)

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Create `tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        overlay: {
          bg: "rgba(17, 17, 17, 0.92)",
          surface: "rgba(30, 30, 30, 0.95)",
          border: "rgba(255, 255, 255, 0.08)",
        },
        speaker: {
          self: "#60a5fa",
          other: "#a78bfa",
          third: "#34d399",
        },
        pi: {
          accent: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.08)",
          border: "rgba(245, 158, 11, 0.2)",
        },
      },
      animation: {
        "slide-in": "slideIn 0.25s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
      },
      keyframes: {
        slideIn: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Create `postcss.config.js`**

```javascript
export default {
  plugins: {
    tailwindcss: {},
  },
};
```

- [ ] **Step 4: Create `src/styles/global.css`**

```css
@import "tailwindcss";

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  height: 100%;
  overflow: hidden;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.overlay {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: rgba(17, 17, 17, 0.92);
  color: #e4e4e7;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.overlay-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(30, 30, 30, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  cursor: grab;
  user-select: none;
  -webkit-app-region: drag;
}

.overlay-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #71717a;
}

.status-dot.live {
  background: #ef4444;
  box-shadow: 0 0 6px rgba(239, 68, 68, 0.5);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Scrollbar styling for transcript */
::-webkit-scrollbar {
  width: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
```

- [ ] **Step 5: Verify styles render**

```bash
npm run tauri dev
```

Expected: Dark semi-transparent overlay with rounded corners, red pulsing dot in header, proper font rendering.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.js src/styles/global.css package.json package-lock.json
git commit -m "feat: add Tailwind CSS with dark overlay theme and base styles"
```

---

## Task 3: Shared Types + Zustand Store

**Files:**
- Create: `src/types.ts`, `src/store.ts`
- Create: `tests/store.test.ts`
- Modify: `package.json` (add deps)

- [ ] **Step 1: Install dependencies**

```bash
npm install zustand
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Add test config to `vite.config.ts`**

Add to the existing vite config:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 5174 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: [],
  },
});
```

- [ ] **Step 3: Add test script to `package.json`**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: Create `src/types.ts`**

```typescript
// --- Transcript ---

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  source: "deepgram" | "fireflies";
}

// --- Meeting ---

export type MeetingStatus = "idle" | "detecting" | "active" | "ended";

export interface MeetingInfo {
  id: string;
  title: string;
  client: string | null;
  attendees: string[];
  startedAt: number;
  firefliesConnected: boolean;
}

// --- Pi / Context ---

export interface ContextCard {
  id: string;
  entity: string;
  summary: string;
  suggestedQuestion: string | null;
  confidence: number;
  timestamp: number;
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  params: Record<string, unknown>;
}

export interface PiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// --- Pi Gateway Messages ---

export interface PiRequest {
  type: "meeting_context" | "analysis_request" | "action_request" | "chat";
  content?: string;
  context?: {
    transcript_chunk?: string;
    entities?: string[];
    meeting_id?: string;
    client?: string;
  };
  params?: Record<string, unknown>;
}

export interface PiResponse {
  type: "pi_response";
  context_card?: {
    entity: string;
    summary: string;
    suggested_question: string | null;
    confidence: number;
  };
  quick_actions?: Array<{
    label: string;
    action: string;
    params: Record<string, unknown>;
  }>;
  chat_response?: string;
  action_result?: Record<string, unknown> | null;
}

// --- Service Status ---

export type ServiceStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ServiceStatuses {
  deepgram: ServiceStatus;
  fireflies: ServiceStatus;
  openclaw: ServiceStatus;
}
```

- [ ] **Step 5: Write failing store tests**

Create `tests/store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../src/store";
import type { TranscriptEntry, ContextCard, PiMessage } from "../src/types";

describe("AppStore", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  describe("transcript", () => {
    it("adds a transcript entry", () => {
      const entry: TranscriptEntry = {
        id: "1",
        speaker: "Dirk",
        text: "Hello world",
        timestamp: Date.now(),
        isFinal: true,
        source: "deepgram",
      };

      useAppStore.getState().addTranscriptEntry(entry);
      expect(useAppStore.getState().transcript).toHaveLength(1);
      expect(useAppStore.getState().transcript[0].text).toBe("Hello world");
    });

    it("updates an existing entry by id when not final", () => {
      const entry: TranscriptEntry = {
        id: "1",
        speaker: "Dirk",
        text: "Hello",
        timestamp: Date.now(),
        isFinal: false,
        source: "deepgram",
      };

      useAppStore.getState().addTranscriptEntry(entry);
      useAppStore.getState().addTranscriptEntry({ ...entry, text: "Hello world" });

      expect(useAppStore.getState().transcript).toHaveLength(1);
      expect(useAppStore.getState().transcript[0].text).toBe("Hello world");
    });

    it("caps transcript at 500 entries", () => {
      for (let i = 0; i < 510; i++) {
        useAppStore.getState().addTranscriptEntry({
          id: String(i),
          speaker: "Dirk",
          text: `Entry ${i}`,
          timestamp: Date.now(),
          isFinal: true,
          source: "deepgram",
        });
      }

      expect(useAppStore.getState().transcript).toHaveLength(500);
      expect(useAppStore.getState().transcript[0].text).toBe("Entry 10");
    });
  });

  describe("context card", () => {
    it("sets and clears the active context card", () => {
      const card: ContextCard = {
        id: "c1",
        entity: "London Alley",
        summary: "Active client",
        suggestedQuestion: "Ask about SOW",
        confidence: 0.87,
        timestamp: Date.now(),
      };

      useAppStore.getState().setContextCard(card);
      expect(useAppStore.getState().contextCard?.entity).toBe("London Alley");

      useAppStore.getState().clearContextCard();
      expect(useAppStore.getState().contextCard).toBeNull();
    });
  });

  describe("pi chat", () => {
    it("adds messages to pi chat history", () => {
      const msg: PiMessage = {
        id: "m1",
        role: "user",
        content: "Tell me about London Alley",
        timestamp: Date.now(),
      };

      useAppStore.getState().addPiMessage(msg);
      expect(useAppStore.getState().piMessages).toHaveLength(1);
    });
  });

  describe("meeting state", () => {
    it("starts and ends a meeting", () => {
      expect(useAppStore.getState().meetingStatus).toBe("idle");

      useAppStore.getState().startMeeting({
        id: "m1",
        title: "London Alley Sync",
        client: "London Alley",
        attendees: ["Dirk"],
        startedAt: Date.now(),
        firefliesConnected: false,
      });

      expect(useAppStore.getState().meetingStatus).toBe("active");
      expect(useAppStore.getState().meeting?.title).toBe("London Alley Sync");

      useAppStore.getState().endMeeting();
      expect(useAppStore.getState().meetingStatus).toBe("ended");
    });
  });

  describe("quick actions", () => {
    it("sets quick actions from Pi response", () => {
      useAppStore.getState().setQuickActions([
        { id: "a1", label: "Create Action Item", action: "create_action_item", params: {} },
      ]);

      expect(useAppStore.getState().quickActions).toHaveLength(1);
    });
  });

  describe("service statuses", () => {
    it("updates individual service status", () => {
      useAppStore.getState().setServiceStatus("deepgram", "connected");
      expect(useAppStore.getState().serviceStatuses.deepgram).toBe("connected");
      expect(useAppStore.getState().serviceStatuses.fireflies).toBe("disconnected");
    });
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

```bash
npx vitest run tests/store.test.ts
```

Expected: FAIL — `Cannot find module '../src/store'`

- [ ] **Step 7: Create `src/store.ts`**

```typescript
import { create } from "zustand";
import type {
  TranscriptEntry,
  ContextCard,
  QuickAction,
  PiMessage,
  MeetingStatus,
  MeetingInfo,
  ServiceStatus,
  ServiceStatuses,
} from "./types";

const MAX_TRANSCRIPT_ENTRIES = 500;

interface AppState {
  // Transcript
  transcript: TranscriptEntry[];
  addTranscriptEntry: (entry: TranscriptEntry) => void;

  // Context
  contextCard: ContextCard | null;
  setContextCard: (card: ContextCard) => void;
  clearContextCard: () => void;

  // Quick Actions
  quickActions: QuickAction[];
  setQuickActions: (actions: QuickAction[]) => void;

  // Pi Chat
  piMessages: PiMessage[];
  addPiMessage: (message: PiMessage) => void;
  piChatOpen: boolean;
  togglePiChat: () => void;

  // Meeting
  meetingStatus: MeetingStatus;
  meeting: MeetingInfo | null;
  startMeeting: (info: MeetingInfo) => void;
  endMeeting: () => void;

  // Service statuses
  serviceStatuses: ServiceStatuses;
  setServiceStatus: (service: keyof ServiceStatuses, status: ServiceStatus) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  transcript: [] as TranscriptEntry[],
  contextCard: null as ContextCard | null,
  quickActions: [] as QuickAction[],
  piMessages: [] as PiMessage[],
  piChatOpen: false,
  meetingStatus: "idle" as MeetingStatus,
  meeting: null as MeetingInfo | null,
  serviceStatuses: {
    deepgram: "disconnected",
    fireflies: "disconnected",
    openclaw: "disconnected",
  } as ServiceStatuses,
};

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  addTranscriptEntry: (entry) =>
    set((state) => {
      const existingIndex = state.transcript.findIndex((e) => e.id === entry.id);

      let updated: TranscriptEntry[];
      if (existingIndex !== -1 && !state.transcript[existingIndex].isFinal) {
        updated = [...state.transcript];
        updated[existingIndex] = entry;
      } else if (existingIndex !== -1) {
        return state;
      } else {
        updated = [...state.transcript, entry];
      }

      if (updated.length > MAX_TRANSCRIPT_ENTRIES) {
        updated = updated.slice(updated.length - MAX_TRANSCRIPT_ENTRIES);
      }

      return { transcript: updated };
    }),

  setContextCard: (card) => set({ contextCard: card }),
  clearContextCard: () => set({ contextCard: null }),

  setQuickActions: (actions) => set({ quickActions: actions }),

  addPiMessage: (message) =>
    set((state) => ({ piMessages: [...state.piMessages, message] })),

  togglePiChat: () => set((state) => ({ piChatOpen: !state.piChatOpen })),

  startMeeting: (info) => set({ meeting: info, meetingStatus: "active" }),
  endMeeting: () => set({ meetingStatus: "ended" }),

  setServiceStatus: (service, status) =>
    set((state) => ({
      serviceStatuses: { ...state.serviceStatuses, [service]: status },
    })),

  reset: () => set(initialState),
}));
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run tests/store.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add src/types.ts src/store.ts tests/store.test.ts vite.config.ts package.json package-lock.json
git commit -m "feat: add shared types and Zustand store with tests"
```

---

## Task 4: OverlayHeader Component

**Files:**
- Create: `src/components/OverlayHeader.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/components/OverlayHeader.tsx`**

```tsx
import { useAppStore } from "../store";

function formatTime(startedAt: number): string {
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const hrs = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function OverlayHeader() {
  const meetingStatus = useAppStore((s) => s.meetingStatus);
  const meeting = useAppStore((s) => s.meeting);
  const serviceStatuses = useAppStore((s) => s.serviceStatuses);

  const isLive = meetingStatus === "active";
  const title = meeting?.client ?? meeting?.title ?? "AI-BOS Lens";

  return (
    <div className="overlay-header">
      <span className={`status-dot ${isLive ? "live" : ""}`} />
      {isLive && (
        <span className="text-xs text-zinc-400 font-mono tabular-nums">
          <TimerDisplay startedAt={meeting!.startedAt} />
        </span>
      )}
      <span className="flex-1 text-sm font-medium truncate">{title}</span>
      <div className="flex gap-1.5 -webkit-app-region-no-drag">
        {isLive && (
          <ServiceIndicators statuses={serviceStatuses} />
        )}
      </div>
    </div>
  );
}

function TimerDisplay({ startedAt }: { startedAt: number }) {
  const [time, setTime] = useState("00:00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(startedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <>{time}</>;
}

function ServiceIndicators({ statuses }: { statuses: Record<string, string> }) {
  const dotColor = (status: string) => {
    if (status === "connected") return "bg-emerald-400";
    if (status === "connecting") return "bg-yellow-400";
    if (status === "error") return "bg-red-400";
    return "bg-zinc-600";
  };

  return (
    <div className="flex gap-1 items-center">
      {Object.entries(statuses).map(([name, status]) => (
        <div
          key={name}
          className={`w-1.5 h-1.5 rounded-full ${dotColor(status)}`}
          title={`${name}: ${status}`}
        />
      ))}
    </div>
  );
}
```

Note: Add the missing React imports at the top:

```tsx
import { useState, useEffect } from "react";
import { useAppStore } from "../store";
```

- [ ] **Step 2: Update `src/App.tsx` to use OverlayHeader**

```tsx
import OverlayHeader from "./components/OverlayHeader";

function App() {
  return (
    <div className="overlay">
      <OverlayHeader />
      <div className="overlay-body">
        <p className="text-zinc-400 text-sm p-4">Waiting for meeting...</p>
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Verify visually**

```bash
npm run tauri dev
```

Expected: Header shows "AI-BOS Lens" with a gray status dot. Draggable.

- [ ] **Step 4: Commit**

```bash
git add src/components/OverlayHeader.tsx src/App.tsx
git commit -m "feat: add OverlayHeader component with timer and service indicators"
```

---

## Task 5: TranscriptFeed Component

**Files:**
- Create: `src/components/TranscriptFeed.tsx`
- Create: `tests/components/TranscriptFeed.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Install test utilities**

```bash
npm install -D @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Write failing test**

Create `tests/components/TranscriptFeed.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TranscriptFeed from "../../src/components/TranscriptFeed";
import { useAppStore } from "../../src/store";

describe("TranscriptFeed", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("shows empty state when no transcript entries", () => {
    render(<TranscriptFeed />);
    expect(screen.getByText(/waiting for audio/i)).toBeTruthy();
  });

  it("renders transcript entries with speaker names", () => {
    useAppStore.getState().addTranscriptEntry({
      id: "1",
      speaker: "Dirk",
      text: "Hello everyone",
      timestamp: Date.now(),
      isFinal: true,
      source: "deepgram",
    });

    render(<TranscriptFeed />);
    expect(screen.getByText("Dirk")).toBeTruthy();
    expect(screen.getByText(/Hello everyone/)).toBeTruthy();
  });

  it("groups consecutive entries from the same speaker", () => {
    const now = Date.now();
    useAppStore.getState().addTranscriptEntry({
      id: "1",
      speaker: "Dirk",
      text: "First sentence.",
      timestamp: now,
      isFinal: true,
      source: "deepgram",
    });
    useAppStore.getState().addTranscriptEntry({
      id: "2",
      speaker: "Dirk",
      text: "Second sentence.",
      timestamp: now + 1000,
      isFinal: true,
      source: "deepgram",
    });

    render(<TranscriptFeed />);
    const speakerLabels = screen.getAllByText("Dirk");
    expect(speakerLabels).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/components/TranscriptFeed.test.tsx
```

Expected: FAIL — `Cannot find module '../../src/components/TranscriptFeed'`

- [ ] **Step 4: Create `src/components/TranscriptFeed.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import type { TranscriptEntry } from "../types";

const SPEAKER_COLORS: Record<number, string> = {
  0: "text-speaker-self",
  1: "text-speaker-other",
  2: "text-speaker-third",
};

function getSpeakerColor(speaker: string, speakers: string[]): string {
  const index = speakers.indexOf(speaker);
  return SPEAKER_COLORS[index] ?? "text-zinc-400";
}

interface SpeakerGroup {
  speaker: string;
  entries: TranscriptEntry[];
}

function groupBySpeaker(transcript: TranscriptEntry[]): SpeakerGroup[] {
  const groups: SpeakerGroup[] = [];
  for (const entry of transcript) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === entry.speaker) {
      last.entries.push(entry);
    } else {
      groups.push({ speaker: entry.speaker, entries: [entry] });
    }
  }
  return groups;
}

export default function TranscriptFeed() {
  const transcript = useAppStore((s) => s.transcript);
  const bottomRef = useRef<HTMLDivElement>(null);

  const speakers = [...new Set(transcript.map((e) => e.speaker))];
  const groups = groupBySpeaker(transcript);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript.length]);

  if (transcript.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Waiting for audio...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
      {groups.map((group, i) => (
        <div key={`${group.speaker}-${i}`} className="animate-fade-in">
          <span className={`text-xs font-semibold ${getSpeakerColor(group.speaker, speakers)}`}>
            {group.speaker}
          </span>
          <p className="text-sm text-zinc-200 leading-relaxed mt-0.5">
            {group.entries.map((e) => e.text).join(" ")}
          </p>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/components/TranscriptFeed.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 6: Update `src/App.tsx`**

```tsx
import OverlayHeader from "./components/OverlayHeader";
import TranscriptFeed from "./components/TranscriptFeed";

function App() {
  return (
    <div className="overlay">
      <OverlayHeader />
      <div className="overlay-body">
        <TranscriptFeed />
      </div>
    </div>
  );
}

export default App;
```

- [ ] **Step 7: Commit**

```bash
git add src/components/TranscriptFeed.tsx tests/components/TranscriptFeed.test.tsx src/App.tsx
git commit -m "feat: add TranscriptFeed component with speaker grouping and auto-scroll"
```

---

## Task 6: ContextCard Component

**Files:**
- Create: `src/components/ContextCard.tsx`
- Create: `tests/components/ContextCard.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/components/ContextCard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextCard from "../../src/components/ContextCard";
import { useAppStore } from "../../src/store";

describe("ContextCard", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("renders nothing when no context card is set", () => {
    const { container } = render(<ContextCard />);
    expect(container.children).toHaveLength(0);
  });

  it("renders entity and summary when context card is set", () => {
    useAppStore.getState().setContextCard({
      id: "c1",
      entity: "London Alley",
      summary: "Active client, SOW pending",
      suggestedQuestion: "Ask about timeline",
      confidence: 0.87,
      timestamp: Date.now(),
    });

    render(<ContextCard />);
    expect(screen.getByText("London Alley")).toBeTruthy();
    expect(screen.getByText(/SOW pending/)).toBeTruthy();
    expect(screen.getByText(/Ask about timeline/)).toBeTruthy();
  });

  it("clears on dismiss", () => {
    useAppStore.getState().setContextCard({
      id: "c1",
      entity: "London Alley",
      summary: "Active client",
      suggestedQuestion: null,
      confidence: 0.87,
      timestamp: Date.now(),
    });

    render(<ContextCard />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(useAppStore.getState().contextCard).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/ContextCard.test.tsx
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `src/components/ContextCard.tsx`**

```tsx
import { useAppStore } from "../store";

export default function ContextCard() {
  const card = useAppStore((s) => s.contextCard);
  const clearCard = useAppStore((s) => s.clearContextCard);

  if (!card) return null;

  return (
    <div className="mx-2 mb-2 rounded-lg border border-pi-border bg-pi-bg animate-slide-in">
      <div className="flex items-start justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-pi-accent text-xs font-bold uppercase tracking-wide">Pi</span>
          <span className="text-sm font-semibold text-zinc-100">{card.entity}</span>
        </div>
        <button
          onClick={clearCard}
          aria-label="Dismiss"
          className="text-zinc-500 hover:text-zinc-300 text-xs leading-none p-1"
        >
          ✕
        </button>
      </div>
      <p className="px-3 text-sm text-zinc-300 leading-relaxed">{card.summary}</p>
      {card.suggestedQuestion && (
        <p className="px-3 pt-2 pb-2.5 text-sm text-pi-accent">
          <span className="text-zinc-500 mr-1">Ask:</span>
          &ldquo;{card.suggestedQuestion}&rdquo;
        </p>
      )}
      {!card.suggestedQuestion && <div className="pb-2.5" />}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/ContextCard.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ContextCard.tsx tests/components/ContextCard.test.tsx
git commit -m "feat: add ContextCard component with slide-in animation and dismiss"
```

---

## Task 7: QuickActions Component

**Files:**
- Create: `src/components/QuickActions.tsx`
- Create: `tests/components/QuickActions.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/components/QuickActions.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickActions from "../../src/components/QuickActions";
import { useAppStore } from "../../src/store";

describe("QuickActions", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("renders nothing when no actions available and meeting not active", () => {
    const { container } = render(<QuickActions onAction={() => {}} />);
    expect(container.children).toHaveLength(0);
  });

  it("renders default actions when meeting is active", () => {
    useAppStore.getState().startMeeting({
      id: "m1",
      title: "Test",
      client: null,
      attendees: [],
      startedAt: Date.now(),
      firefliesConnected: false,
    });

    render(<QuickActions onAction={() => {}} />);
    expect(screen.getByText(/Action Item/)).toBeTruthy();
    expect(screen.getByText(/Note/)).toBeTruthy();
    expect(screen.getByText(/Soundbite/)).toBeTruthy();
  });

  it("renders Pi-generated actions alongside defaults", () => {
    useAppStore.getState().startMeeting({
      id: "m1",
      title: "Test",
      client: null,
      attendees: [],
      startedAt: Date.now(),
      firefliesConnected: false,
    });
    useAppStore.getState().setQuickActions([
      { id: "qa1", label: "Flag: Marcus Chen", action: "graph_upsert", params: {} },
    ]);

    render(<QuickActions onAction={() => {}} />);
    expect(screen.getByText(/Flag: Marcus Chen/)).toBeTruthy();
  });

  it("calls onAction with action details when clicked", () => {
    useAppStore.getState().startMeeting({
      id: "m1",
      title: "Test",
      client: null,
      attendees: [],
      startedAt: Date.now(),
      firefliesConnected: false,
    });

    const onAction = vi.fn();
    render(<QuickActions onAction={onAction} />);
    fireEvent.click(screen.getByText(/Action Item/));
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: "create_action_item" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/QuickActions.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/QuickActions.tsx`**

```tsx
import { useAppStore } from "../store";
import type { QuickAction } from "../types";

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: "default-action-item", label: "Action Item", action: "create_action_item", params: {} },
  { id: "default-note", label: "Note", action: "create_note", params: {} },
  { id: "default-soundbite", label: "Soundbite", action: "create_soundbite", params: {} },
];

interface QuickActionsProps {
  onAction: (action: QuickAction) => void;
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const meetingStatus = useAppStore((s) => s.meetingStatus);
  const piActions = useAppStore((s) => s.quickActions);

  if (meetingStatus !== "active") return null;

  const allActions = [...DEFAULT_ACTIONS, ...piActions];

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t border-overlay-border">
      {allActions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action)}
          className="px-2.5 py-1 text-xs font-medium rounded-full
                     bg-overlay-surface border border-overlay-border
                     text-zinc-300 hover:text-zinc-100 hover:border-zinc-600
                     transition-colors"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/QuickActions.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickActions.tsx tests/components/QuickActions.test.tsx
git commit -m "feat: add QuickActions component with default and Pi-generated actions"
```

---

## Task 8: PiChat Component

**Files:**
- Create: `src/components/PiChat.tsx`
- Create: `tests/components/PiChat.test.tsx`

- [ ] **Step 1: Write failing test**

Create `tests/components/PiChat.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PiChat from "../../src/components/PiChat";
import { useAppStore } from "../../src/store";

describe("PiChat", () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it("renders nothing when chat is closed", () => {
    const { container } = render(<PiChat onSend={() => {}} />);
    expect(container.querySelector("[data-testid='pi-chat-panel']")).toBeNull();
  });

  it("renders chat panel when open", () => {
    useAppStore.getState().togglePiChat();
    render(<PiChat onSend={() => {}} />);
    expect(screen.getByPlaceholderText(/ask pi anything/i)).toBeTruthy();
  });

  it("renders message history", () => {
    useAppStore.getState().togglePiChat();
    useAppStore.getState().addPiMessage({
      id: "m1",
      role: "user",
      content: "Tell me about London Alley",
      timestamp: Date.now(),
    });
    useAppStore.getState().addPiMessage({
      id: "m2",
      role: "assistant",
      content: "London Alley is an active client.",
      timestamp: Date.now(),
    });

    render(<PiChat onSend={() => {}} />);
    expect(screen.getByText(/Tell me about London Alley/)).toBeTruthy();
    expect(screen.getByText(/active client/)).toBeTruthy();
  });

  it("calls onSend when submitting a message", () => {
    useAppStore.getState().togglePiChat();
    const onSend = vi.fn();

    render(<PiChat onSend={onSend} />);
    const input = screen.getByPlaceholderText(/ask pi anything/i);
    fireEvent.change(input, { target: { value: "What about the SOW?" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSend).toHaveBeenCalledWith("What about the SOW?");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/components/PiChat.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Create `src/components/PiChat.tsx`**

```tsx
import { useState, useRef, useEffect } from "react";
import { useAppStore } from "../store";

interface PiChatProps {
  onSend: (message: string) => void;
}

export default function PiChat({ onSend }: PiChatProps) {
  const isOpen = useAppStore((s) => s.piChatOpen);
  const messages = useAppStore((s) => s.piMessages);
  const toggleChat = useAppStore((s) => s.togglePiChat);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput("");
  };

  return (
    <div
      data-testid="pi-chat-panel"
      className="flex flex-col border-t border-pi-border bg-pi-bg animate-slide-in"
      style={{ maxHeight: "50vh" }}
    >
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-xs font-bold text-pi-accent uppercase tracking-wide">
          Pi Chat
        </span>
        <button
          onClick={toggleChat}
          className="text-zinc-500 hover:text-zinc-300 text-xs p-1"
          aria-label="Close chat"
        >
          ▼
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2 min-h-[100px]">
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.role === "user" ? "text-zinc-300" : "text-zinc-100"}`}>
            <span className="text-xs font-semibold text-zinc-500 mr-1">
              {msg.role === "user" ? "You:" : "Pi:"}
            </span>
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 px-3 py-2 border-t border-overlay-border">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Pi anything..."
          className="flex-1 bg-overlay-surface border border-overlay-border rounded px-2.5 py-1.5
                     text-sm text-zinc-200 placeholder-zinc-500 outline-none
                     focus:border-pi-accent/50"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-medium rounded bg-pi-accent/20
                     text-pi-accent hover:bg-pi-accent/30 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/components/PiChat.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PiChat.tsx tests/components/PiChat.test.tsx
git commit -m "feat: add PiChat expandable panel with message history and input"
```

---

## Task 9: DeepgramService

**Files:**
- Create: `src/services/deepgram.ts`
- Create: `tests/services/deepgram.test.ts`

- [ ] **Step 1: Install Deepgram SDK**

```bash
npm install @deepgram/sdk
```

- [ ] **Step 2: Write failing test**

Create `tests/services/deepgram.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepgramService } from "../../src/services/deepgram";

// Mock the Deepgram SDK
vi.mock("@deepgram/sdk", () => ({
  createClient: vi.fn(() => ({
    listen: {
      live: vi.fn(() => ({
        on: vi.fn(),
        send: vi.fn(),
        requestClose: vi.fn(),
        getReadyState: vi.fn(() => 1),
      })),
    },
  })),
  LiveTranscriptionEvents: {
    Open: "open",
    Transcript: "transcript",
    UtteranceEnd: "utteranceEnd",
    Close: "close",
    Error: "error",
  },
}));

describe("DeepgramService", () => {
  let service: DeepgramService;

  beforeEach(() => {
    service = new DeepgramService("test-api-key");
  });

  it("initializes in disconnected state", () => {
    expect(service.getStatus()).toBe("disconnected");
  });

  it("transitions to connecting when connect is called", () => {
    service.connect();
    expect(service.getStatus()).toBe("connecting");
  });

  it("accepts an onTranscript callback", () => {
    const callback = vi.fn();
    service.onTranscript(callback);
    expect(service.hasTranscriptCallback()).toBe(true);
  });

  it("accepts an onStatusChange callback", () => {
    const callback = vi.fn();
    service.onStatusChange(callback);
    service.connect();
    expect(callback).toHaveBeenCalledWith("connecting");
  });

  it("can disconnect cleanly", () => {
    service.connect();
    service.disconnect();
    expect(service.getStatus()).toBe("disconnected");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/services/deepgram.test.ts
```

Expected: FAIL — cannot find module.

- [ ] **Step 4: Create `src/services/deepgram.ts`**

```typescript
import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { ServiceStatus, TranscriptEntry } from "../types";

type TranscriptCallback = (entry: TranscriptEntry) => void;
type StatusCallback = (status: ServiceStatus) => void;

export class DeepgramService {
  private apiKey: string;
  private connection: ReturnType<ReturnType<typeof createClient>["listen"]["live"]> | null = null;
  private status: ServiceStatus = "disconnected";
  private transcriptCb: TranscriptCallback | null = null;
  private statusCb: StatusCallback | null = null;
  private entryCounter = 0;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  hasTranscriptCallback(): boolean {
    return this.transcriptCb !== null;
  }

  onTranscript(cb: TranscriptCallback): void {
    this.transcriptCb = cb;
  }

  onStatusChange(cb: StatusCallback): void {
    this.statusCb = cb;
  }

  connect(): void {
    this.setStatus("connecting");

    const deepgram = createClient(this.apiKey);
    this.connection = deepgram.listen.live({
      model: "nova-3",
      punctuate: true,
      interim_results: true,
      utterance_end_ms: 1000,
      encoding: "linear16",
      sample_rate: 16000,
    });

    this.connection.on(LiveTranscriptionEvents.Open, () => {
      this.setStatus("connected");
    });

    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript) return;

      const isFinal = data.is_final ?? false;
      const entryId = isFinal ? `dg-${++this.entryCounter}` : "dg-interim";

      this.transcriptCb?.({
        id: entryId,
        speaker: data.channel?.alternatives?.[0]?.words?.[0]?.speaker
          ? `Speaker ${data.channel.alternatives[0].words[0].speaker}`
          : "You",
        text: transcript,
        timestamp: Date.now(),
        isFinal,
        source: "deepgram",
      });
    });

    this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      console.error("[Deepgram] Error:", err);
      this.setStatus("error");
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      this.setStatus("disconnected");
    });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.connection && this.status === "connected") {
      this.connection.send(data);
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.requestClose();
      this.connection = null;
    }
    this.setStatus("disconnected");
  }

  private setStatus(status: ServiceStatus): void {
    this.status = status;
    this.statusCb?.(status);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/services/deepgram.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/deepgram.ts tests/services/deepgram.test.ts package.json package-lock.json
git commit -m "feat: add DeepgramService for streaming STT connection"
```

---

## Task 10: FirefliesService

**Files:**
- Create: `src/services/fireflies.ts`
- Create: `tests/services/fireflies.test.ts`

- [ ] **Step 1: Install Socket.IO client**

```bash
npm install socket.io-client
```

- [ ] **Step 2: Write failing test**

Create `tests/services/fireflies.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirefliesService } from "../../src/services/fireflies";

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
}));

// Mock fetch for GraphQL
global.fetch = vi.fn();

describe("FirefliesService", () => {
  let service: FirefliesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirefliesService("test-api-key", "https://api.fireflies.ai/graphql");
  });

  it("initializes in disconnected state", () => {
    expect(service.getStatus()).toBe("disconnected");
  });

  it("polls for active meetings via GraphQL", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          active_meetings: [
            { id: "meeting-1", title: "London Alley Sync", started_at: "2026-04-04T14:00:00Z" },
          ],
        },
      }),
    });

    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(1);
    expect(meetings[0].id).toBe("meeting-1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.fireflies.ai/graphql",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      })
    );
  });

  it("returns empty array when no active meetings", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { active_meetings: [] } }),
    });

    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(0);
  });

  it("handles GraphQL fetch errors gracefully", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const meetings = await service.getActiveMeetings();
    expect(meetings).toHaveLength(0);
  });

  it("can create a live action item", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: { createLiveActionItem: { id: "ai-1" } },
      }),
    });

    const result = await service.createActionItem("meeting-1", "Follow up with Marcus");
    expect(result).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/services/fireflies.test.ts
```

Expected: FAIL.

- [ ] **Step 4: Create `src/services/fireflies.ts`**

```typescript
import { io, Socket } from "socket.io-client";
import type { ServiceStatus, TranscriptEntry } from "../types";

type TranscriptCallback = (entry: TranscriptEntry) => void;
type StatusCallback = (status: ServiceStatus) => void;

interface ActiveMeeting {
  id: string;
  title: string;
  started_at: string;
}

export class FirefliesService {
  private apiKey: string;
  private graphqlUrl: string;
  private socket: Socket | null = null;
  private status: ServiceStatus = "disconnected";
  private transcriptCb: TranscriptCallback | null = null;
  private statusCb: StatusCallback | null = null;
  private entryCounter = 0;

  constructor(apiKey: string, graphqlUrl: string) {
    this.apiKey = apiKey;
    this.graphqlUrl = graphqlUrl;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  onTranscript(cb: TranscriptCallback): void {
    this.transcriptCb = cb;
  }

  onStatusChange(cb: StatusCallback): void {
    this.statusCb = cb;
  }

  async getActiveMeetings(): Promise<ActiveMeeting[]> {
    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: `query { active_meetings { id title started_at } }`,
        }),
      });

      const json = await response.json();
      return json.data?.active_meetings ?? [];
    } catch (err) {
      console.error("[Fireflies] Failed to fetch active meetings:", err);
      return [];
    }
  }

  connectRealtime(meetingId: string): void {
    this.setStatus("connecting");

    this.socket = io("wss://api.fireflies.ai", {
      path: "/ws/realtime",
      auth: {
        token: `Bearer ${this.apiKey}`,
        transcriptId: meetingId,
      },
      reconnection: true,
    });

    this.socket.on("auth.success", () => {
      this.setStatus("connected");
    });

    this.socket.on("auth.failed", () => {
      console.error("[Fireflies] Authentication failed");
      this.setStatus("error");
    });

    this.socket.on("transcription.broadcast", (data: any) => {
      const entryId = data.is_final ? `ff-${++this.entryCounter}` : "ff-interim";

      this.transcriptCb?.({
        id: entryId,
        speaker: data.speaker ?? "Unknown",
        text: data.text ?? "",
        timestamp: data.timestamp ?? Date.now(),
        isFinal: data.is_final ?? false,
        source: "fireflies",
      });
    });

    this.socket.on("connection.error", (err: any) => {
      console.error("[Fireflies] Connection error:", err);
      this.setStatus("error");
    });
  }

  async createActionItem(meetingId: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: `mutation CreateLiveActionItem($transcriptId: String!, $text: String!) {
            createLiveActionItem(transcript_id: $transcriptId, text: $text) { id }
          }`,
          variables: { transcriptId: meetingId, text },
        }),
      });

      const json = await response.json();
      return !!json.data?.createLiveActionItem;
    } catch (err) {
      console.error("[Fireflies] Failed to create action item:", err);
      return false;
    }
  }

  async createSoundbite(meetingId: string, name: string, startTime: number, endTime: number): Promise<boolean> {
    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query: `mutation CreateBite($transcriptId: String!, $name: String!, $startTime: Float!, $endTime: Float!) {
            createBite(transcript_id: $transcriptId, name: $name, start_time: $startTime, end_time: $endTime) { id status }
          }`,
          variables: { transcriptId: meetingId, name, startTime, endTime },
        }),
      });

      const json = await response.json();
      return !!json.data?.createBite;
    } catch (err) {
      console.error("[Fireflies] Failed to create soundbite:", err);
      return false;
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.setStatus("disconnected");
  }

  private setStatus(status: ServiceStatus): void {
    this.status = status;
    this.statusCb?.(status);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/services/fireflies.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/fireflies.ts tests/services/fireflies.test.ts package.json package-lock.json
git commit -m "feat: add FirefliesService for meeting detection, realtime WS, and GraphQL mutations"
```

---

## Task 11: OpenClawService (Pi Gateway)

**Files:**
- Create: `src/services/openclaw.ts`
- Create: `tests/services/openclaw.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/services/openclaw.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenClawService } from "../../src/services/openclaw";

// Mock WebSocket
class MockWebSocket {
  static instance: MockWebSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = 0;
  sentMessages: string[] = [];

  constructor(_url: string, _protocols?: string[]) {
    MockWebSocket.instance = this;
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
    this.onclose?.();
  }

  simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

vi.stubGlobal("WebSocket", MockWebSocket);

describe("OpenClawService", () => {
  let service: OpenClawService;

  beforeEach(() => {
    MockWebSocket.instance = null;
    service = new OpenClawService("wss://test-gateway.ts.net", "test-token");
  });

  afterEach(() => {
    service.disconnect();
  });

  it("initializes in disconnected state", () => {
    expect(service.getStatus()).toBe("disconnected");
  });

  it("transitions to connecting then connected", () => {
    const statusCb = vi.fn();
    service.onStatusChange(statusCb);
    service.connect();

    expect(statusCb).toHaveBeenCalledWith("connecting");

    MockWebSocket.instance!.simulateOpen();
    expect(statusCb).toHaveBeenCalledWith("connected");
  });

  it("sends messages as JSON with auth token", () => {
    service.connect();
    MockWebSocket.instance!.simulateOpen();

    service.send({
      type: "chat",
      content: "Tell me about London Alley",
    });

    const sent = JSON.parse(MockWebSocket.instance!.sentMessages[0]);
    expect(sent.type).toBe("chat");
    expect(sent.content).toBe("Tell me about London Alley");
    expect(sent.token).toBe("test-token");
  });

  it("routes pi_response messages to the response callback", () => {
    const responseCb = vi.fn();
    service.onResponse(responseCb);
    service.connect();
    MockWebSocket.instance!.simulateOpen();

    MockWebSocket.instance!.simulateMessage({
      type: "pi_response",
      context_card: {
        entity: "London Alley",
        summary: "Active client",
        suggested_question: null,
        confidence: 0.87,
      },
    });

    expect(responseCb).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pi_response",
        context_card: expect.objectContaining({ entity: "London Alley" }),
      })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/services/openclaw.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/services/openclaw.ts`**

```typescript
import type { ServiceStatus, PiRequest, PiResponse } from "../types";

type ResponseCallback = (response: PiResponse) => void;
type StatusCallback = (status: ServiceStatus) => void;

export class OpenClawService {
  private wsUrl: string;
  private token: string;
  private ws: WebSocket | null = null;
  private status: ServiceStatus = "disconnected";
  private responseCb: ResponseCallback | null = null;
  private statusCb: StatusCallback | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(wsUrl: string, token: string) {
    this.wsUrl = wsUrl;
    this.token = token;
  }

  getStatus(): ServiceStatus {
    return this.status;
  }

  onResponse(cb: ResponseCallback): void {
    this.responseCb = cb;
  }

  onStatusChange(cb: StatusCallback): void {
    this.statusCb = cb;
  }

  connect(): void {
    this.setStatus("connecting");

    this.ws = new WebSocket(this.wsUrl);

    this.ws.onopen = () => {
      this.setStatus("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pi_response") {
          this.responseCb?.(data as PiResponse);
        }
      } catch (err) {
        console.error("[OpenClaw] Failed to parse message:", err);
      }
    };

    this.ws.onclose = () => {
      this.setStatus("disconnected");
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("[OpenClaw] WebSocket error:", err);
      this.setStatus("error");
    };
  }

  send(message: PiRequest): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[OpenClaw] Cannot send — not connected");
      return;
    }

    this.ws.send(JSON.stringify({ ...message, token: this.token }));
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      if (this.status === "disconnected") {
        this.connect();
      }
    }, 5000);
  }

  private setStatus(status: ServiceStatus): void {
    this.status = status;
    this.statusCb?.(status);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/openclaw.test.ts
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/openclaw.ts tests/services/openclaw.test.ts
git commit -m "feat: add OpenClawService for Pi gateway WebSocket connection"
```

---

## Task 12: AnalysisWorker

**Files:**
- Create: `src/services/analysis.ts`
- Create: `tests/services/analysis.test.ts`

- [ ] **Step 1: Write failing test**

Create `tests/services/analysis.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnalysisWorker } from "../../src/services/analysis";
import type { TranscriptEntry, PiResponse } from "../../src/types";

describe("AnalysisWorker", () => {
  let worker: AnalysisWorker;
  let mockSendToPI: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSendToPI = vi.fn();
    worker = new AnalysisWorker(mockSendToPI, {
      intervalSeconds: 30,
      contextWindowSeconds: 60,
    });
  });

  afterEach(() => {
    worker.stop();
    vi.useRealTimers();
  });

  it("does not send analysis when no transcript entries exist", () => {
    worker.start();
    vi.advanceTimersByTime(30000);
    expect(mockSendToPI).not.toHaveBeenCalled();
  });

  it("sends analysis request after interval when transcript has entries", () => {
    const now = Date.now();
    worker.addEntry({
      id: "1",
      speaker: "Dirk",
      text: "Let's discuss the SOW",
      timestamp: now,
      isFinal: true,
      source: "deepgram",
    });

    worker.start();
    vi.advanceTimersByTime(30000);

    expect(mockSendToPI).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "analysis_request",
        transcript_chunk: expect.stringContaining("Let's discuss the SOW"),
      })
    );
  });

  it("only includes entries within the context window", () => {
    const now = Date.now();
    worker.addEntry({
      id: "old",
      speaker: "Dirk",
      text: "Old message",
      timestamp: now - 120000,
      isFinal: true,
      source: "deepgram",
    });
    worker.addEntry({
      id: "new",
      speaker: "Dirk",
      text: "Recent message",
      timestamp: now,
      isFinal: true,
      source: "deepgram",
    });

    worker.start();
    vi.advanceTimersByTime(30000);

    const call = mockSendToPI.mock.calls[0][0];
    expect(call.transcript_chunk).toContain("Recent message");
    expect(call.transcript_chunk).not.toContain("Old message");
  });

  it("stops the analysis cycle", () => {
    worker.addEntry({
      id: "1",
      speaker: "Dirk",
      text: "Hello",
      timestamp: Date.now(),
      isFinal: true,
      source: "deepgram",
    });

    worker.start();
    worker.stop();
    vi.advanceTimersByTime(60000);

    expect(mockSendToPI).not.toHaveBeenCalled();
  });

  it("supports manual trigger", () => {
    worker.addEntry({
      id: "1",
      speaker: "Dirk",
      text: "Manual trigger test",
      timestamp: Date.now(),
      isFinal: true,
      source: "deepgram",
    });

    worker.triggerNow();

    expect(mockSendToPI).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/services/analysis.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/services/analysis.ts`**

```typescript
import type { TranscriptEntry, PiRequest } from "../types";

type SendFn = (request: PiRequest) => void;

interface AnalysisConfig {
  intervalSeconds: number;
  contextWindowSeconds: number;
}

export class AnalysisWorker {
  private sendToPi: SendFn;
  private config: AnalysisConfig;
  private entries: TranscriptEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private meetingId: string | null = null;
  private client: string | null = null;

  constructor(sendToPi: SendFn, config: AnalysisConfig) {
    this.sendToPi = sendToPi;
    this.config = config;
  }

  setMeetingContext(meetingId: string, client: string | null): void {
    this.meetingId = meetingId;
    this.client = client;
  }

  addEntry(entry: TranscriptEntry): void {
    this.entries.push(entry);
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      this.runAnalysis();
    }, this.config.intervalSeconds * 1000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  triggerNow(): void {
    this.runAnalysis();
  }

  private runAnalysis(): void {
    const now = Date.now();
    const windowStart = now - this.config.contextWindowSeconds * 1000;
    const recentEntries = this.entries.filter((e) => e.timestamp >= windowStart && e.isFinal);

    if (recentEntries.length === 0) return;

    const chunk = recentEntries.map((e) => `${e.speaker}: ${e.text}`).join("\n");

    this.sendToPi({
      type: "analysis_request",
      context: {
        transcript_chunk: chunk,
        entities: [],
        meeting_id: this.meetingId ?? undefined,
        client: this.client ?? undefined,
      },
    });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/services/analysis.test.ts
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/analysis.ts tests/services/analysis.test.ts
git commit -m "feat: add AnalysisWorker with 30s cycle, context window, and manual trigger"
```

---

## Task 13: Rust Audio Capture (Microphone)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/capabilities/default.json`

- [ ] **Step 1: Add `cpal` dependency to `src-tauri/Cargo.toml`**

Add to `[dependencies]`:

```toml
cpal = "0.15"
tokio = { version = "1", features = ["sync"] }
```

- [ ] **Step 2: Implement audio capture in `src-tauri/src/lib.rs`**

Replace the full file:

```rust
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

struct AudioState {
    stream: Option<cpal::Stream>,
}

#[tauri::command]
fn start_audio_capture(app: AppHandle) -> Result<String, String> {
    let host = cpal::default_host();
    let device = host.default_input_device().ok_or("No input device found")?;
    let device_name = device.name().unwrap_or_else(|_| "Unknown".to_string());

    let config = cpal::StreamConfig {
        channels: 1,
        sample_rate: cpal::SampleRate(16000),
        buffer_size: cpal::BufferSize::Default,
    };

    let app_handle = app.clone();

    let stream = device
        .build_input_stream(
            &config,
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                // Convert f32 samples to i16 (linear16 for Deepgram)
                let samples: Vec<i16> = data.iter().map(|&s| (s * 32767.0) as i16).collect();
                let bytes: Vec<u8> = samples
                    .iter()
                    .flat_map(|s| s.to_le_bytes())
                    .collect();

                let _ = app_handle.emit("audio-data", bytes);
            },
            |err| {
                eprintln!("[Audio] Stream error: {}", err);
            },
            None,
        )
        .map_err(|e| format!("Failed to build stream: {}", e))?;

    stream.play().map_err(|e| format!("Failed to start stream: {}", e))?;

    // Store stream in managed state so it stays alive
    let state = app.state::<Arc<Mutex<AudioState>>>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.stream = Some(stream);

    Ok(format!("Capturing from: {}", device_name))
}

#[tauri::command]
fn stop_audio_capture(app: AppHandle) -> Result<(), String> {
    let state = app.state::<Arc<Mutex<AudioState>>>();
    let mut guard = state.lock().map_err(|e| e.to_string())?;
    guard.stream = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Arc::new(Mutex::new(AudioState { stream: None })))
        .invoke_handler(tauri::generate_handler![
            start_audio_capture,
            stop_audio_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Update `src-tauri/capabilities/default.json`**

```json
{
  "identifier": "default",
  "description": "Default capability for AI-BOS Lens",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:allow-emit",
    "core:event:allow-listen",
    "shell:allow-open"
  ]
}
```

- [ ] **Step 4: Verify it compiles**

```bash
cd src-tauri && cargo build
```

Expected: Build succeeds. (Audio permissions will be requested at runtime on macOS.)

- [ ] **Step 5: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/capabilities/default.json
git commit -m "feat: add Rust audio capture with cpal, emit PCM data to frontend via IPC"
```

---

## Task 14: Wire App.tsx — Full Integration

**Files:**
- Modify: `src/App.tsx`

This task wires all components and services together into the main App.

- [ ] **Step 1: Create `src/App.tsx` (full integration)**

Replace the full file:

```tsx
import { useEffect, useRef, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "./store";
import OverlayHeader from "./components/OverlayHeader";
import TranscriptFeed from "./components/TranscriptFeed";
import ContextCard from "./components/ContextCard";
import QuickActions from "./components/QuickActions";
import PiChat from "./components/PiChat";
import { DeepgramService } from "./services/deepgram";
import { FirefliesService } from "./services/fireflies";
import { OpenClawService } from "./services/openclaw";
import { AnalysisWorker } from "./services/analysis";
import type { QuickAction, PiResponse } from "./types";

const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY ?? "";
const FIREFLIES_API_KEY = import.meta.env.VITE_FIREFLIES_API_KEY ?? "";
const FIREFLIES_GRAPHQL_URL = import.meta.env.VITE_FIREFLIES_GRAPHQL_URL ?? "https://api.fireflies.ai/graphql";
const OPENCLAW_WS_URL = import.meta.env.VITE_OPENCLAW_WS_URL ?? "";
const OPENCLAW_TOKEN = import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN ?? "";
const ANALYSIS_INTERVAL = Number(import.meta.env.VITE_ANALYSIS_INTERVAL_SECONDS ?? "30");
const CONTEXT_WINDOW = Number(import.meta.env.VITE_CONTEXT_WINDOW_SECONDS ?? "60");

export default function App() {
  const addTranscriptEntry = useAppStore((s) => s.addTranscriptEntry);
  const setContextCard = useAppStore((s) => s.setContextCard);
  const setQuickActions = useAppStore((s) => s.setQuickActions);
  const addPiMessage = useAppStore((s) => s.addPiMessage);
  const setServiceStatus = useAppStore((s) => s.setServiceStatus);
  const meeting = useAppStore((s) => s.meeting);

  const deepgramRef = useRef<DeepgramService | null>(null);
  const firefliesRef = useRef<FirefliesService | null>(null);
  const openclawRef = useRef<OpenClawService | null>(null);
  const analysisRef = useRef<AnalysisWorker | null>(null);

  // Handle Pi response — update context card and quick actions
  const handlePiResponse = useCallback(
    (response: PiResponse) => {
      if (response.context_card) {
        setContextCard({
          id: `ctx-${Date.now()}`,
          entity: response.context_card.entity,
          summary: response.context_card.summary,
          suggestedQuestion: response.context_card.suggested_question,
          confidence: response.context_card.confidence,
          timestamp: Date.now(),
        });
      }

      if (response.quick_actions) {
        setQuickActions(
          response.quick_actions.map((a, i) => ({
            id: `pi-action-${i}`,
            label: a.label,
            action: a.action,
            params: a.params,
          }))
        );
      }

      if (response.chat_response) {
        addPiMessage({
          id: `pi-${Date.now()}`,
          role: "assistant",
          content: response.chat_response,
          timestamp: Date.now(),
        });
      }
    },
    [setContextCard, setQuickActions, addPiMessage]
  );

  // Initialize services
  useEffect(() => {
    // Deepgram
    const deepgram = new DeepgramService(DEEPGRAM_API_KEY);
    deepgram.onStatusChange((s) => setServiceStatus("deepgram", s));
    deepgram.onTranscript((entry) => {
      addTranscriptEntry(entry);
      analysisRef.current?.addEntry(entry);
    });
    deepgramRef.current = deepgram;

    // Fireflies
    const fireflies = new FirefliesService(FIREFLIES_API_KEY, FIREFLIES_GRAPHQL_URL);
    fireflies.onStatusChange((s) => setServiceStatus("fireflies", s));
    fireflies.onTranscript((entry) => {
      addTranscriptEntry(entry);
      analysisRef.current?.addEntry(entry);
    });
    firefliesRef.current = fireflies;

    // OpenClaw
    const openclaw = new OpenClawService(OPENCLAW_WS_URL, OPENCLAW_TOKEN);
    openclaw.onStatusChange((s) => setServiceStatus("openclaw", s));
    openclaw.onResponse(handlePiResponse);
    openclawRef.current = openclaw;

    // Analysis Worker
    const analysis = new AnalysisWorker(
      (req) => openclaw.send(req),
      { intervalSeconds: ANALYSIS_INTERVAL, contextWindowSeconds: CONTEXT_WINDOW }
    );
    analysisRef.current = analysis;

    // Connect services
    if (OPENCLAW_WS_URL) openclaw.connect();
    if (DEEPGRAM_API_KEY) deepgram.connect();

    // Listen for audio data from Rust
    let unlisten: (() => void) | undefined;
    listen<number[]>("audio-data", (event) => {
      const bytes = new Uint8Array(event.payload);
      deepgram.sendAudio(bytes.buffer);
    }).then((fn) => {
      unlisten = fn;
    });

    // Start audio capture in Rust
    invoke("start_audio_capture").catch((err) => {
      console.warn("[App] Audio capture failed:", err);
    });

    // Poll for Fireflies active meetings
    const meetingPoll = setInterval(async () => {
      if (!FIREFLIES_API_KEY) return;
      const meetings = await fireflies.getActiveMeetings();
      if (meetings.length > 0 && fireflies.getStatus() === "disconnected") {
        fireflies.connectRealtime(meetings[0].id);
      }
    }, 30000);

    // Start analysis cycle
    analysis.start();

    return () => {
      deepgram.disconnect();
      fireflies.disconnect();
      openclaw.disconnect();
      analysis.stop();
      unlisten?.();
      clearInterval(meetingPoll);
      invoke("stop_audio_capture").catch(() => {});
    };
  }, [addTranscriptEntry, setServiceStatus, handlePiResponse]);

  // Update analysis worker with meeting context
  useEffect(() => {
    if (meeting) {
      analysisRef.current?.setMeetingContext(meeting.id, meeting.client);
    }
  }, [meeting]);

  // Handle quick action execution
  const handleAction = useCallback(
    (action: QuickAction) => {
      const openclaw = openclawRef.current;
      if (!openclaw) return;

      openclaw.send({
        type: "action_request",
        params: {
          action: action.action,
          ...action.params,
          meeting_id: meeting?.id,
          client: meeting?.client,
        },
      });
    },
    [meeting]
  );

  // Handle Pi chat message
  const handlePiSend = useCallback(
    (message: string) => {
      addPiMessage({
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      });

      openclawRef.current?.send({
        type: "chat",
        content: message,
        context: {
          meeting_id: meeting?.id,
          client: meeting?.client ?? undefined,
        },
      });
    },
    [meeting, addPiMessage]
  );

  return (
    <div className="overlay">
      <OverlayHeader />
      <div className="overlay-body">
        <TranscriptFeed />
        <ContextCard />
        <PiChat onSend={handlePiSend} />
      </div>
      <QuickActions onAction={handleAction} />
    </div>
  );
}
```

- [ ] **Step 2: Update `.env.example` with VITE_ prefix vars**

Add to the existing `.env.example`:

```env
# ─── Vite-exposed variables (frontend access) ─────────────
# Vite only exposes env vars prefixed with VITE_
VITE_DEEPGRAM_API_KEY=${DEEPGRAM_API_KEY}
VITE_FIREFLIES_API_KEY=${FIREFLIES_API_KEY}
VITE_FIREFLIES_GRAPHQL_URL=${FIREFLIES_GRAPHQL_URL}
VITE_OPENCLAW_WS_URL=${OPENCLAW_WS_URL}
VITE_OPENCLAW_GATEWAY_TOKEN=${OPENCLAW_GATEWAY_TOKEN}
VITE_ANALYSIS_INTERVAL_SECONDS=${ANALYSIS_INTERVAL_SECONDS}
VITE_CONTEXT_WINDOW_SECONDS=${CONTEXT_WINDOW_SECONDS}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

Expected: TypeScript compiles and Vite builds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx .env.example
git commit -m "feat: wire all components and services in App.tsx with full integration"
```

---

## Task 15: Keyboard Shortcuts

**Files:**
- Modify: `src-tauri/src/lib.rs` (register global shortcuts)
- Modify: `src/App.tsx` (listen for shortcut events)

- [ ] **Step 1: Add global shortcut plugin to Cargo.toml**

Add to `src-tauri/Cargo.toml` `[dependencies]`:

```toml
tauri-plugin-global-shortcut = "2"
```

- [ ] **Step 2: Register shortcuts in `src-tauri/src/lib.rs`**

Add the plugin to the builder. In the `run()` function, add before `.run()`:

```rust
.plugin(tauri_plugin_global_shortcut::Builder::new().build())
```

The full plugin line in the builder chain:

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(Mutex::new(AudioState { stream: None })))
        .invoke_handler(tauri::generate_handler![
            start_audio_capture,
            stop_audio_capture,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 3: Update capabilities for global shortcuts**

Update `src-tauri/capabilities/default.json`:

```json
{
  "identifier": "default",
  "description": "Default capability for AI-BOS Lens",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "core:event:allow-emit",
    "core:event:allow-listen",
    "shell:allow-open",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister"
  ]
}
```

- [ ] **Step 4: Register shortcuts in the frontend**

Add to `src/App.tsx` — inside the main `useEffect`, after other setup:

```typescript
// Register keyboard shortcuts
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

// Inside useEffect:
const registerShortcuts = async () => {
  try {
    await register("CommandOrControl+Shift+L", (event) => {
      if (event.state === "Pressed") {
        // Toggle overlay visibility
        import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
          const win = getCurrentWindow();
          win.isVisible().then((visible) => {
            visible ? win.hide() : win.show();
          });
        });
      }
    });

    await register("CommandOrControl+Shift+P", (event) => {
      if (event.state === "Pressed") {
        analysisRef.current?.triggerNow();
      }
    });

    await register("CommandOrControl+Shift+A", (event) => {
      if (event.state === "Pressed") {
        handleAction({
          id: "shortcut-action",
          label: "Action Item",
          action: "create_action_item",
          params: {},
        });
      }
    });

    await register("CommandOrControl+Shift+N", (event) => {
      if (event.state === "Pressed") {
        handleAction({
          id: "shortcut-note",
          label: "Note",
          action: "create_note",
          params: {},
        });
      }
    });

    await register("CommandOrControl+Shift+C", (event) => {
      if (event.state === "Pressed") {
        // Copy last Pi suggestion to clipboard
        const card = useAppStore.getState().contextCard;
        if (card) {
          const text = card.suggestedQuestion
            ? `${card.entity}: ${card.summary}\nAsk: "${card.suggestedQuestion}"`
            : `${card.entity}: ${card.summary}`;
          navigator.clipboard.writeText(text).catch(() => {});
        }
      }
    });

    await register("Escape", (event) => {
      if (event.state === "Pressed") {
        useAppStore.getState().clearContextCard();
      }
    });
  } catch (err) {
    console.warn("[App] Failed to register shortcuts:", err);
  }
};

registerShortcuts();

// In cleanup:
return () => {
  // ...existing cleanup...
  unregister("CommandOrControl+Shift+L").catch(() => {});
  unregister("CommandOrControl+Shift+P").catch(() => {});
  unregister("CommandOrControl+Shift+A").catch(() => {});
  unregister("CommandOrControl+Shift+N").catch(() => {});
  unregister("CommandOrControl+Shift+C").catch(() => {});
  unregister("Escape").catch(() => {});
};
```

- [ ] **Step 5: Install the global shortcut frontend plugin**

```bash
npm install @tauri-apps/plugin-global-shortcut
```

- [ ] **Step 6: Verify shortcuts register on launch**

```bash
npm run tauri dev
```

Expected: App launches, Cmd+Shift+L toggles the window, Cmd+Shift+P triggers analysis. No errors in console about shortcut registration.

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/src/lib.rs src-tauri/capabilities/default.json src/App.tsx package.json package-lock.json
git commit -m "feat: add global keyboard shortcuts (Cmd+Shift+L/P/A/N) via Tauri plugin"
```

---

## Task 16: Fireflies Meeting Detection + Auto-Connect Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/store.ts`

This task improves the meeting detection flow so Fireflies meetings are detected and the app transitions to "active" state automatically.

- [ ] **Step 1: Add meeting detection logic to store**

Add to `src/store.ts`:

```typescript
setMeetingStatus: (status: MeetingStatus) => void;
```

Implementation:

```typescript
setMeetingStatus: (status) => set({ meetingStatus: status }),
```

- [ ] **Step 2: Update the Fireflies polling in `src/App.tsx`**

Replace the `meetingPoll` interval in the `useEffect`:

```typescript
const startMeeting = useAppStore.getState().startMeeting;
const setMeetingStatus = useAppStore.getState().setMeetingStatus;

// Set to detecting on launch
setMeetingStatus("detecting");

// Initial poll immediately
if (FIREFLIES_API_KEY) {
  fireflies.getActiveMeetings().then((meetings) => {
    if (meetings.length > 0) {
      const m = meetings[0];
      startMeeting({
        id: m.id,
        title: m.title,
        client: null,
        attendees: [],
        startedAt: new Date(m.started_at).getTime(),
        firefliesConnected: true,
      });
      fireflies.connectRealtime(m.id);
    }
  });
}

const meetingPoll = setInterval(async () => {
  if (!FIREFLIES_API_KEY) return;
  const currentMeeting = useAppStore.getState().meeting;
  if (currentMeeting?.firefliesConnected) return;

  const meetings = await fireflies.getActiveMeetings();
  if (meetings.length > 0 && !currentMeeting) {
    const m = meetings[0];
    startMeeting({
      id: m.id,
      title: m.title,
      client: null,
      attendees: [],
      startedAt: new Date(m.started_at).getTime(),
      firefliesConnected: true,
    });
    fireflies.connectRealtime(m.id);
  }
}, 30000);
```

- [ ] **Step 3: Verify the flow**

```bash
npm run tauri dev
```

Expected: App shows "Detecting..." state on launch. When a Fireflies meeting is active, it auto-connects and transitions to "LIVE" state.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/store.ts
git commit -m "feat: add Fireflies meeting auto-detection and active state transition"
```

---

## Task 17: Post-Meeting Ingest Trigger

**Files:**
- Modify: `src/services/openclaw.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add a triggerPostMeetingIngest method to OpenClawService**

Add to `src/services/openclaw.ts`:

```typescript
triggerPostMeetingIngest(meetingId: string, client: string | null): void {
  this.send({
    type: "action_request",
    params: {
      action: "post_meeting_ingest",
      meeting_id: meetingId,
      client: client,
    },
  });
}
```

- [ ] **Step 2: Add meeting-end detection in App.tsx**

Add a useEffect in `src/App.tsx` that watches for meeting status change to "ended":

```typescript
const meetingStatus = useAppStore((s) => s.meetingStatus);

useEffect(() => {
  if (meetingStatus === "ended" && meeting) {
    openclawRef.current?.triggerPostMeetingIngest(meeting.id, meeting.client);
  }
}, [meetingStatus, meeting]);
```

- [ ] **Step 3: Add an "End Meeting" button to OverlayHeader**

Add to `src/components/OverlayHeader.tsx`, in the controls section (inside the `-webkit-app-region-no-drag` div):

```tsx
const endMeeting = useAppStore((s) => s.endMeeting);

// Inside the JSX, after ServiceIndicators:
{isLive && (
  <button
    onClick={endMeeting}
    className="text-zinc-500 hover:text-red-400 text-xs p-1 transition-colors"
    title="End meeting"
  >
    ✕
  </button>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/openclaw.ts src/App.tsx src/components/OverlayHeader.tsx
git commit -m "feat: add post-meeting ingest trigger and end-meeting control"
```

---

## Task 18: Run All Tests + Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (store, components, services).

- [ ] **Step 2: Build the Tauri app**

```bash
npm run tauri build
```

Expected: Compiles Rust + TypeScript, produces a macOS app bundle.

- [ ] **Step 3: Manual smoke test**

Launch the built app:
1. Verify overlay appears (frameless, dark, always-on-top)
2. Verify header shows status
3. Verify transcript area shows "Waiting for audio..."
4. Verify Cmd+Shift+L toggles visibility
5. If mic permissions granted, verify audio data flows (check console for Deepgram events)

- [ ] **Step 4: Final commit with all remaining changes**

```bash
git add -A
git status
# Verify no .env files or secrets are staged
git commit -m "feat: complete v0.1 Foundation — Tauri overlay with transcript, Pi, and quick actions"
```

---

## Dependency Summary

**npm packages:**
```
react@18, react-dom@18, @tauri-apps/api@^2, @tauri-apps/plugin-shell@^2,
@tauri-apps/plugin-global-shortcut@^2, @deepgram/sdk@^5, socket.io-client@^4, zustand@^5
```

**npm devDependencies:**
```
@tauri-apps/cli@^2, @types/react, @types/react-dom, typescript, vite,
@vitejs/plugin-react, tailwindcss, @tailwindcss/vite,
vitest, @testing-library/react, @testing-library/jest-dom, jsdom
```

**Cargo dependencies:**
```
tauri@2, tauri-plugin-shell@2, tauri-plugin-global-shortcut@2,
cpal@0.15, serde@1, serde_json@1, tokio@1
```
