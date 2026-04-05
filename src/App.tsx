import { useEffect, useRef, useCallback } from "react";
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
  const meetingStatus = useAppStore((s) => s.meetingStatus);

  const deepgramRef = useRef<DeepgramService | null>(null);
  const firefliesRef = useRef<FirefliesService | null>(null);
  const openclawRef = useRef<OpenClawService | null>(null);
  const analysisRef = useRef<AnalysisWorker | null>(null);

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

    // Listen for audio data from Rust (Tauri IPC)
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<number[]>("audio-data", (event) => {
          const bytes = new Uint8Array(event.payload);
          deepgram.sendAudio(bytes.buffer);
        })
      )
      .then((fn) => { unlisten = fn; })
      .catch(() => { /* Not in Tauri context */ });

    // Start audio capture in Rust
    import("@tauri-apps/api/core")
      .then(({ invoke }) => invoke("start_audio_capture"))
      .catch(() => { /* Not in Tauri context */ });

    // Poll for Fireflies active meetings
    const startMeeting = useAppStore.getState().startMeeting;

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

    // Start analysis cycle
    analysis.start();

    return () => {
      deepgram.disconnect();
      fireflies.disconnect();
      openclaw.disconnect();
      analysis.stop();
      unlisten?.();
      clearInterval(meetingPoll);
      import("@tauri-apps/api/core")
        .then(({ invoke }) => invoke("stop_audio_capture"))
        .catch(() => {});
    };
  }, [addTranscriptEntry, setServiceStatus, handlePiResponse]);

  useEffect(() => {
    if (meeting) {
      analysisRef.current?.setMeetingContext(meeting.id, meeting.client);
    }
  }, [meeting]);

  // Handle quick action execution
  const handleAction = useCallback(
    (action: QuickAction) => {
      openclawRef.current?.send({
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

  // Post-meeting ingest trigger
  useEffect(() => {
    if (meetingStatus === "ended" && meeting) {
      openclawRef.current?.send({
        type: "action_request",
        params: {
          action: "post_meeting_ingest",
          meeting_id: meeting.id,
          client: meeting.client,
        },
      });
    }
  }, [meetingStatus, meeting]);

  // Keyboard shortcuts
  useEffect(() => {
    let cleanup: (() => void)[] = [];

    import("@tauri-apps/plugin-global-shortcut")
      .then(({ register, unregister }) => {
        const registerAll = async () => {
          try {
            await register("CommandOrControl+Shift+L", (event) => {
              if (event.state === "Pressed") {
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
                  id: "shortcut-action", label: "Action Item",
                  action: "create_action_item", params: {},
                });
              }
            });

            await register("CommandOrControl+Shift+N", (event) => {
              if (event.state === "Pressed") {
                handleAction({
                  id: "shortcut-note", label: "Note",
                  action: "create_note", params: {},
                });
              }
            });

            await register("CommandOrControl+Shift+C", (event) => {
              if (event.state === "Pressed") {
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

            cleanup = [
              () => unregister("CommandOrControl+Shift+L").catch(() => {}),
              () => unregister("CommandOrControl+Shift+P").catch(() => {}),
              () => unregister("CommandOrControl+Shift+A").catch(() => {}),
              () => unregister("CommandOrControl+Shift+N").catch(() => {}),
              () => unregister("CommandOrControl+Shift+C").catch(() => {}),
              () => unregister("Escape").catch(() => {}),
            ];
          } catch (err) {
            console.warn("[App] Failed to register shortcuts:", err);
          }
        };
        registerAll();
      })
      .catch(() => { /* Not in Tauri context */ });

    return () => { cleanup.forEach((fn) => fn()); };
  }, [handleAction]);

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
