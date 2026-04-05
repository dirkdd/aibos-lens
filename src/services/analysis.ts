import type { TranscriptEntry, PiRequest } from "../types";

type SendFn = (request: PiRequest) => void;

interface AnalysisConfig {
  intervalSeconds: number;
  contextWindowSeconds: number;
}

export class AnalysisWorker {
  private sendToPi: SendFn;
  private config: AnalysisConfig;
  private entries: TranscriptEntry[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private meetingId: string | null = null;
  private client: string | null = null;

  constructor(sendToPi: SendFn, config: AnalysisConfig) {
    this.sendToPi = sendToPi;
    this.config = config;
  }

  setMeetingContext(meetingId: string, client: string | null): void {
    this.meetingId = meetingId;
    this.client = client;
  }

  addEntry(entry: TranscriptEntry): void { this.entries.push(entry); }

  start(): void {
    this.stop();
    this.timer = setInterval(() => { this.runAnalysis(); }, this.config.intervalSeconds * 1000);
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  triggerNow(): void { this.runAnalysis(); }

  private runAnalysis(): void {
    const now = Date.now();
    const windowStart = now - this.config.contextWindowSeconds * 1000;
    const recentEntries = this.entries.filter((e) => e.timestamp >= windowStart && e.isFinal);
    if (recentEntries.length === 0) return;
    const chunk = recentEntries.map((e) => `${e.speaker}: ${e.text}`).join("\n");
    this.sendToPi({
      type: "analysis_request",
      context: {
        transcript_chunk: chunk,
        entities: [],
        meeting_id: this.meetingId ?? undefined,
        client: this.client ?? undefined,
      },
    });
  }
}
