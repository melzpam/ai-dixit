/** Game phase state machine:
 *
 *   WAITING (< 2 players)
 *       │ player_count >= 2
 *       ▼
 *   ASSOCIATION (storyteller types word, 30s)
 *       │ submitted
 *       ▼
 *   DRAWING (all generate AI cards, 60s)
 *       │ all_ready OR timer
 *       ▼
 *   VOTING (guess storyteller's card, 15s)
 *       │ all_voted OR timer
 *       ▼
 *   REVEAL (show who drew what + scores, 10s)
 *       │ next_storyteller
 *       └──▶ ASSOCIATION
 */
export type GamePhase =
  | "waiting"
  | "association"
  | "drawing"
  | "voting"
  | "reveal";

export interface Player {
  id: string;
  nickname: string;
  score: number;
  connected: boolean;
  /** Timestamp when disconnected, for grace period tracking */
  disconnectedAt?: number;
}

export interface Card {
  playerId: string;
  /** JPEG base64 data, or null if generation failed */
  imageBase64: string | null;
  /** Player's original prompt (shown as text card on failure) */
  prompt: string;
}

export interface Vote {
  voterId: string;
  /** The playerId whose card was voted for */
  cardOwnerId: string;
}

export interface RoundResult {
  storytellerId: string;
  association: string;
  cards: Card[];
  votes: Vote[];
  /** Map of playerId → points earned this round */
  pointsEarned: Record<string, number>;
}

export interface GameState {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  round: number;
  storytellerIndex: number;
  /** The association word for the current round */
  association: string | null;
  /** Cards submitted this round */
  cards: Card[];
  /** Votes cast this round */
  votes: Vote[];
  /** Seconds remaining in current phase timer */
  timerSeconds: number;
  /** Previous round result (shown during reveal) */
  lastRoundResult: RoundResult | null;
}

/** Minimal state sent to a specific player (hides other players' cards during drawing) */
export interface PlayerGameView {
  roomId: string;
  phase: GamePhase;
  players: Player[];
  round: number;
  storytellerId: string;
  /** The current player's ID */
  myPlayerId: string;
  association: string | null;
  /** Only populated during voting/reveal — cards are shuffled and anonymous during voting */
  cards: CardView[];
  /** The player's own card (during drawing phase) */
  myCard: Card | null;
  timerSeconds: number;
  lastRoundResult: RoundResult | null;
  /** Whether this player has submitted their action for the current phase */
  hasSubmitted: boolean;
}

export interface CardView {
  /** Opaque card ID (not the player ID — hidden during voting) */
  cardId: string;
  imageBase64: string | null;
  prompt: string;
  /** Player ID — only populated during reveal phase (hidden during voting) */
  playerId?: string;
}

export const PHASE_DURATIONS: Record<GamePhase, number> = {
  waiting: 0,
  association: 30,
  drawing: 60,
  voting: 15,
  reveal: 10,
};

export const MAX_PLAYERS_PER_ROOM = 10;
export const MIN_PLAYERS_TO_START = 2;
export const STORYTELLER_DISCONNECT_GRACE_SECONDS = 10;
export const PLAYER_RECONNECT_GRACE_SECONDS = 30;
