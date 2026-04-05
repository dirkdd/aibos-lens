import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepgramService } from "../../src/services/deepgram";

const mockSocket = {
  on: vi.fn(),
  sendMedia: vi.fn(),
  close: vi.fn(),
};

vi.mock("@deepgram/sdk", () => {
  class DeepgramClient {
    listen = {
      v1: {
        connect: vi.fn(() => Promise.resolve(mockSocket)),
      },
    };
    constructor(_apiKey: string) {}
  }
  return {
    DeepgramClient,
    ListenV1Model: {
      Nova3: "nova-3",
    },
  };
});

describe("DeepgramService", () => {
  let service: DeepgramService;
  beforeEach(() => {
    vi.clearAllMocks();
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
