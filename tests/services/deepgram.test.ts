import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepgramService } from "../../src/services/deepgram";

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
  beforeEach(() => { service = new DeepgramService("test-api-key"); });

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
