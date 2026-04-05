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
      id: "1", speaker: "Dirk", text: "Hello everyone",
      timestamp: Date.now(), isFinal: true, source: "deepgram",
    });
    render(<TranscriptFeed />);
    expect(screen.getByText("Dirk")).toBeTruthy();
    expect(screen.getByText(/Hello everyone/)).toBeTruthy();
  });

  it("groups consecutive entries from the same speaker", () => {
    const now = Date.now();
    useAppStore.getState().addTranscriptEntry({
      id: "1", speaker: "Dirk", text: "First sentence.",
      timestamp: now, isFinal: true, source: "deepgram",
    });
    useAppStore.getState().addTranscriptEntry({
      id: "2", speaker: "Dirk", text: "Second sentence.",
      timestamp: now + 1000, isFinal: true, source: "deepgram",
    });
    render(<TranscriptFeed />);
    const speakerLabels = screen.getAllByText("Dirk");
    expect(speakerLabels).toHaveLength(1);
  });
});
