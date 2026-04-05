import { createClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import type { ServiceStatus, TranscriptEntry } from "../types";

type TranscriptCallback = (entry: TranscriptEntry) => void;
type StatusCallback = (status: ServiceStatus) => void;

export class DeepgramService {
  private apiKey: string;
  private connection: ReturnType<ReturnType<typeof createClient>["listen"]["live"]> | null = null;
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
    const deepgram = createClient(this.apiKey);
    this.connection = deepgram.listen.live({
      model: "nova-3", punctuate: true, interim_results: true,
      utterance_end_ms: 1000, encoding: "linear16", sample_rate: 16000,
    });
    this.connection.on(LiveTranscriptionEvents.Open, () => { this.setStatus("connected"); });
    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (!transcript) return;
      const isFinal = data.is_final ?? false;
      const entryId = isFinal ? `dg-${++this.entryCounter}` : "dg-interim";
      this.transcriptCb?.({
        id: entryId,
        speaker: data.channel?.alternatives?.[0]?.words?.[0]?.speaker
          ? `Speaker ${data.channel.alternatives[0].words[0].speaker}` : "You",
        text: transcript, timestamp: Date.now(), isFinal, source: "deepgram",
      });
    });
    this.connection.on(LiveTranscriptionEvents.Error, (err: any) => {
      console.error("[Deepgram] Error:", err); this.setStatus("error");
    });
    this.connection.on(LiveTranscriptionEvents.Close, () => { this.setStatus("disconnected"); });
  }

  sendAudio(data: ArrayBuffer): void {
    if (this.connection && this.status === "connected") { this.connection.send(data); }
  }

  disconnect(): void {
    if (this.connection) { this.connection.requestClose(); this.connection = null; }
    this.setStatus("disconnected");
  }

  private setStatus(status: ServiceStatus): void {
    this.status = status; this.statusCb?.(status);
  }
}
