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
