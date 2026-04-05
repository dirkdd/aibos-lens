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
