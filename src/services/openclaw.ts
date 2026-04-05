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

  constructor(wsUrl: string, token: string) { this.wsUrl = wsUrl; this.token = token; }
  getStatus(): ServiceStatus { return this.status; }
  onResponse(cb: ResponseCallback): void { this.responseCb = cb; }
  onStatusChange(cb: StatusCallback): void { this.statusCb = cb; }

  connect(): void {
    this.setStatus("connecting");
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = () => { this.setStatus("connected"); };
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "pi_response") { this.responseCb?.(data as PiResponse); }
      } catch (err) { console.error("[OpenClaw] Failed to parse message:", err); }
    };
    this.ws.onclose = () => { this.setStatus("disconnected"); this.scheduleReconnect(); };
    this.ws.onerror = (err) => { console.error("[OpenClaw] WebSocket error:", err); this.setStatus("error"); };
  }

  send(message: PiRequest): void {
    // readyState 1 === OPEN (using literal for test-environment compatibility)
    if (!this.ws || this.ws.readyState !== 1) {
      console.warn("[OpenClaw] Cannot send — not connected"); return;
    }
    this.ws.send(JSON.stringify({ ...message, token: this.token }));
  }

  disconnect(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
    this.setStatus("disconnected");
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => {
      if (this.status === "disconnected") { this.connect(); }
    }, 5000);
  }

  private setStatus(status: ServiceStatus): void { this.status = status; this.statusCb?.(status); }
}
