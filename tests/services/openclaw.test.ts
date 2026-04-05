import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenClawService } from "../../src/services/openclaw";

class MockWebSocket {
  static instance: MockWebSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: any) => void) | null = null;
  readyState = 0;
  sentMessages: string[] = [];
  constructor(_url: string, _protocols?: string[]) { MockWebSocket.instance = this; }
  send(data: string) { this.sentMessages.push(data); }
  close() { this.readyState = 3; this.onclose?.(); }
  simulateOpen() { this.readyState = 1; this.onopen?.(); }
  simulateMessage(data: object) { this.onmessage?.({ data: JSON.stringify(data) }); }
}

vi.stubGlobal("WebSocket", MockWebSocket);

describe("OpenClawService", () => {
  let service: OpenClawService;
  beforeEach(() => { MockWebSocket.instance = null; service = new OpenClawService("wss://test-gateway.ts.net", "test-token"); });
  afterEach(() => { service.disconnect(); });

  it("initializes in disconnected state", () => { expect(service.getStatus()).toBe("disconnected"); });

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
    service.send({ type: "chat", content: "Tell me about London Alley" });
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
      context_card: { entity: "London Alley", summary: "Active client", suggested_question: null, confidence: 0.87 },
    });
    expect(responseCb).toHaveBeenCalledWith(
      expect.objectContaining({ type: "pi_response", context_card: expect.objectContaining({ entity: "London Alley" }) })
    );
  });
});
