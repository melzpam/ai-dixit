import type { PlayerGameView, RoundResult } from "./types.js";

// ─── Client → Server Events ───────────────────────────────────────────────

export interface ClientToServerEvents {
  /** Player sets their nickname and requests to join a game */
  "player:join": (data: { nickname: string }) => void;

  /** Storyteller submits the association word */
  "game:submit-association": (data: { association: string }) => void;

  /** Player submits their prompt for AI image generation */
  "game:submit-prompt": (data: { prompt: string }) => void;

  /** Player marks their card as ready (done with drawing phase) */
  "game:card-ready": () => void;

  /** Player votes for a card during voting phase */
  "game:vote": (data: { cardId: string }) => void;
}

// ─── Server → Client Events ───────────────────────────────────────────────

export interface ServerToClientEvents {
  /** Full game state sync (on join, reconnect, or phase change) */
  "game:state": (state: PlayerGameView) => void;

  /** Timer tick — seconds remaining */
  "game:timer": (data: { seconds: number }) => void;

  /** Player's AI image was generated successfully */
  "game:image-generated": (data: {
    imageBase64: string;
    prompt: string;
  }) => void;

  /** AI image generation failed — text card will be used */
  "game:image-failed": (data: { prompt: string; reason: string }) => void;

  /** Round results (during reveal phase) */
  "game:round-result": (result: RoundResult) => void;

  /** A player joined the room */
  "game:player-joined": (data: { id: string; nickname: string }) => void;

  /** A player left the room */
  "game:player-left": (data: { id: string; nickname: string }) => void;

  /** Error message */
  "game:error": (data: { message: string }) => void;

  /** System message (e.g., "New storyteller: Alice") */
  "game:message": (data: { message: string }) => void;
}
