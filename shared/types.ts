/** Shared types between frontend, backend clients, and Electron */

export interface WsEvent {
  event: string;
  payload: Record<string, unknown>;
  session_id?: string;
}

export interface CaptionPayload {
  id: string;
  original: string;
  translated: string;
  source_lang: string;
  target_lang: string;
  speaker: string | null;
  timestamp: number;
  is_final: boolean;
}
