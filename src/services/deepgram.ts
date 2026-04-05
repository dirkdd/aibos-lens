import { DeepgramClient, ListenV1Model } from "@deepgram/sdk";
import type { ServiceStatus, TranscriptEntry } from "../types";

type TranscriptCallback = (entry: TranscriptEntry) => void;
type StatusCallback = (status: ServiceStatus) => void;

// V1Socket type — resolved from connect() promise
type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>["listen"]["v1"]["connect"]>>;

export class DeepgramService {
  private apiKey: string;
  private socket: V1Socket | null = null;
  private status: ServiceStatus = "disconnected";
  private transcriptCb: TranscriptCallback | null = null;
  private statusCb: StatusCallback | null = null;
  private entryCounter = 0;

  constructor(apiKey: string) { this.apiKey = apiKey; }
  getStatus(): ServiceStatus { return this.status; }
  hasTranscriptCallback(): boolean { return this.transcriptCb !== null; }
  onTranscript(cb: TranscriptCallback): void { this.transcriptCb = cb; }
  onStatusChange(cb: StatusCallback): void { this.statusCb = cb; }

  connect(): void {
    this.setStatus("connecting");
    const client = new DeepgramClient(this.apiKey);
    client.listen.v1
      .connect({
        Authorization: this.apiKey,
        model: ListenV1Model.Nova3,
        punctuate: true,
        interim_results: true,
        utterance_end_ms: 1000,
        encoding: "linear16",
        sample_rate: 16000,
      })
      .then((socket) => {
        this.socket = socket;

        socket.on("open", () => { this.setStatus("connected"); });

        socket.on("message", (data) => {
          if (data.type !== "Results") return;
          const transcript = data.channel?.alternatives?.[0]?.transcript;
          if (!transcript) return;
          const isFinal = data.is_final ?? false;
          const entryId = isFinal ? `dg-${++this.entryCounter}` : "dg-interim";
          this.transcriptCb?.({
            id: entryId,
            speaker: data.channel.alternatives[0].words?.[0]?.speaker !== undefined
              ? `Speaker ${data.channel.alternatives[0].words[0].speaker}`
              : "You",
            text: transcript,
            timestamp: Date.now(),
            isFinal,
            source: "deepgram",
          });
        });

        socket.on("error", (err) => {
          console.error("[Deepgram] Error:", err);
          this.setStatus("error");
        });

        socket.on("close", () => { this.setStatus("disconnected"); });
      })
      .catch((err) => {
        console.error("[Deepgram] Connect failed:", err);
        this.setStatus("error");
      });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.socket && this.status === "connected") {
      this.socket.sendMedia(data);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.setStatus("disconnected");
  }

  private setStatus(status: ServiceStatus): void {
    this.status = status;
    this.statusCb?.(status);
  }
}
