import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnalysisWorker } from "../../src/services/analysis";

describe("AnalysisWorker", () => {
  let worker: AnalysisWorker;
  let mockSendToPI: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSendToPI = vi.fn();
    worker = new AnalysisWorker(mockSendToPI, { intervalSeconds: 30, contextWindowSeconds: 60 });
  });

  afterEach(() => { worker.stop(); vi.useRealTimers(); });

  it("does not send analysis when no transcript entries exist", () => {
    worker.start();
    vi.advanceTimersByTime(30000);
    expect(mockSendToPI).not.toHaveBeenCalled();
  });

  it("sends analysis request after interval when transcript has entries", () => {
    const now = Date.now();
    worker.addEntry({ id: "1", speaker: "Dirk", text: "Let's discuss the SOW", timestamp: now, isFinal: true, source: "deepgram" });
    worker.start();
    vi.advanceTimersByTime(30000);
    expect(mockSendToPI).toHaveBeenCalledWith(
      expect.objectContaining({ type: "analysis_request" })
    );
  });

  it("only includes entries within the context window", () => {
    const now = Date.now();
    worker.addEntry({ id: "old", speaker: "Dirk", text: "Old message", timestamp: now - 120000, isFinal: true, source: "deepgram" });
    worker.addEntry({ id: "new", speaker: "Dirk", text: "Recent message", timestamp: now, isFinal: true, source: "deepgram" });
    worker.start();
    vi.advanceTimersByTime(30000);
    const call = mockSendToPI.mock.calls[0][0];
    expect(call.context.transcript_chunk).toContain("Recent message");
    expect(call.context.transcript_chunk).not.toContain("Old message");
  });

  it("stops the analysis cycle", () => {
    worker.addEntry({ id: "1", speaker: "Dirk", text: "Hello", timestamp: Date.now(), isFinal: true, source: "deepgram" });
    worker.start();
    worker.stop();
    vi.advanceTimersByTime(60000);
    expect(mockSendToPI).not.toHaveBeenCalled();
  });

  it("supports manual trigger", () => {
    worker.addEntry({ id: "1", speaker: "Dirk", text: "Manual trigger test", timestamp: Date.now(), isFinal: true, source: "deepgram" });
    worker.triggerNow();
    expect(mockSendToPI).toHaveBeenCalledTimes(1);
  });
});
