// --- Transcript ---

export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  source: "deepgram" | "fireflies";
}

// --- Meeting ---

export type MeetingStatus = "idle" | "detecting" | "active" | "ended";

export interface MeetingInfo {
  id: string;
  title: string;
  client: string | null;
  attendees: string[];
  startedAt: number;
  firefliesConnected: boolean;
}

// --- Pi / Context ---

export interface ContextCard {
  id: string;
  entity: string;
  summary: string;
  suggestedQuestion: string | null;
  confidence: number;
  timestamp: number;
}

export interface QuickAction {
  id: string;
  label: string;
  action: string;
  params: Record<string, unknown>;
}

export interface PiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// --- Pi Gateway Messages ---

export interface PiRequest {
  type: "meeting_context" | "analysis_request" | "action_request" | "chat";
  content?: string;
  context?: {
    transcript_chunk?: string;
    entities?: string[];
    meeting_id?: string;
    client?: string;
  };
  params?: Record<string, unknown>;
}

export interface PiResponse {
  type: "pi_response";
  context_card?: {
    entity: string;
    summary: string;
    suggested_question: string | null;
    confidence: number;
  };
  quick_actions?: Array<{
    label: string;
    action: string;
    params: Record<string, unknown>;
  }>;
  chat_response?: string;
  action_result?: Record<string, unknown> | null;
}

// --- Service Status ---

export type ServiceStatus = "disconnected" | "connecting" | "connected" | "error";

export interface ServiceStatuses {
  deepgram: ServiceStatus;
  fireflies: ServiceStatus;
  openclaw: ServiceStatus;
}
