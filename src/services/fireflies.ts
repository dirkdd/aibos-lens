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

  getStatus(): ServiceStatus { return this.status; }
  onTranscript(cb: TranscriptCallback): void { this.transcriptCb = cb; }
  onStatusChange(cb: StatusCallback): void { this.statusCb = cb; }

  async getActiveMeetings(): Promise<ActiveMeeting[]> {
    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({ query: `query { active_meetings { id title started_at } }` }),
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
      auth: { token: `Bearer ${this.apiKey}`, transcriptId: meetingId },
      reconnection: true,
    });
    this.socket.on("auth.success", () => { this.setStatus("connected"); });
    this.socket.on("auth.failed", () => { console.error("[Fireflies] Auth failed"); this.setStatus("error"); });
    this.socket.on("transcription.broadcast", (data: any) => {
      const entryId = data.is_final ? `ff-${++this.entryCounter}` : "ff-interim";
      this.transcriptCb?.({
        id: entryId, speaker: data.speaker ?? "Unknown", text: data.text ?? "",
        timestamp: data.timestamp ?? Date.now(), isFinal: data.is_final ?? false, source: "fireflies",
      });
    });
    this.socket.on("connection.error", (err: any) => { console.error("[Fireflies] Connection error:", err); this.setStatus("error"); });
  }

  async createActionItem(meetingId: string, text: string): Promise<boolean> {
    try {
      const response = await fetch(this.graphqlUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
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
