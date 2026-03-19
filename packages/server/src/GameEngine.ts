import { randomUUID } from "node:crypto";
import {
  type GamePhase,
  type Player,
  type Card,
  type Vote,
  type RoundResult,
  type PlayerGameView,
  type CardView,
  PHASE_DURATIONS,
  MAX_PLAYERS_PER_ROOM,
  MIN_PLAYERS_TO_START,
  STORYTELLER_DISCONNECT_GRACE_SECONDS,
  PLAYER_RECONNECT_GRACE_SECONDS,
  calculateScores,
} from "@ai-dixit/shared";

/**
 * GameEngine — owns both room state and game state machine.
 *
 * State machine:
 *
 *   WAITING (< 2 players)
 *       │ player_count >= 2
 *       ▼
 *   ASSOCIATION (storyteller types word, 30s)
 *       │ submitted OR timer
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
 *
 * Internal regions:
 *   1. Room operations (join, leave, reconnect)
 *   2. Phase transitions
 *   3. Timer management
 *   4. Player actions (association, prompt, vote)
 */

export type GameEventCallback = (
  event: string,
  playerId: string | null,
  data: unknown
) => void;

/** Shuffled card with opaque ID (hides owner during voting) */
interface ShuffledCard {
  cardId: string;
  card: Card;
}

export class GameEngine {
  readonly roomId: string;
  private players: Player[] = [];
  private phase: GamePhase = "waiting";
  private round = 0;
  private storytellerIndex = 0;
  private association: string | null = null;
  private cards: Card[] = [];
  private votes: Vote[] = [];
  private lastRoundResult: RoundResult | null = null;

  /** Players who clicked "ready" during drawing phase */
  private readyPlayers = new Set<string>();
  /** Players who voted during voting phase */
  private votedPlayers = new Set<string>();
  /** Players who generated an image this round */
  private generatedPlayers = new Set<string>();

  /** Shuffled cards for the voting phase (hides ownership) */
  private shuffledCards: ShuffledCard[] = [];

  /** Phase timer handle */
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private timerSeconds = 0;

  /** Storyteller disconnect grace timer */
  private storytellerGraceHandle: ReturnType<typeof setTimeout> | null = null;

  /** Callback for emitting events to clients */
  private onEvent: GameEventCallback;

  constructor(roomId: string, onEvent: GameEventCallback) {
    this.roomId = roomId;
    this.onEvent = onEvent;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Region 1: Room Operations
  // ═══════════════════════════════════════════════════════════════════════

  get playerCount(): number {
    return this.players.length;
  }

  get connectedPlayerCount(): number {
    return this.players.filter((p) => p.connected).length;
  }

  get isFull(): boolean {
    return this.players.length >= MAX_PLAYERS_PER_ROOM;
  }

  get isEmpty(): boolean {
    return this.players.length === 0;
  }

  get currentPhase(): GamePhase {
    return this.phase;
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  hasPlayer(playerId: string): boolean {
    return this.players.some((p) => p.id === playerId);
  }

  addPlayer(id: string, nickname: string): boolean {
    if (this.isFull) return false;
    if (this.hasPlayer(id)) return false;

    this.players.push({
      id,
      nickname,
      score: 0,
      connected: true,
    });

    this.onEvent("game:player-joined", null, { id, nickname });
    this.broadcastState();

    // Start game if we now have enough players
    if (
      this.phase === "waiting" &&
      this.connectedPlayerCount >= MIN_PLAYERS_TO_START
    ) {
      this.startNewRound();
    }

    return true;
  }

  reconnectPlayer(playerId: string): boolean {
    const player = this.getPlayer(playerId);
    if (!player) return false;

    player.connected = true;
    player.disconnectedAt = undefined;

    // Cancel storyteller grace timer if storyteller reconnected
    if (this.storytellerGraceHandle && this.isStoryteller(playerId)) {
      clearTimeout(this.storytellerGraceHandle);
      this.storytellerGraceHandle = null;
    }

    this.onEvent("game:player-joined", null, {
      id: player.id,
      nickname: player.nickname,
    });
    // Send full state to reconnected player
    this.sendStateTo(playerId);

    return true;
  }

  disconnectPlayer(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;

    player.connected = false;
    player.disconnectedAt = Date.now();

    this.onEvent("game:player-left", null, {
      id: player.id,
      nickname: player.nickname,
    });

    // If storyteller disconnected, start grace timer
    if (this.isStoryteller(playerId) && this.phase !== "waiting") {
      this.startStorytellerGraceTimer();
    }

    // If not enough connected players, pause
    if (this.connectedPlayerCount < MIN_PLAYERS_TO_START) {
      this.transitionTo("waiting");
      return;
    }

    // Check if the disconnect unblocks phase advancement
    this.checkPhaseAdvancement();
  }

  removePlayer(playerId: string): void {
    const idx = this.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;

    const removed = this.players.splice(idx, 1)[0];
    this.onEvent("game:player-left", null, {
      id: removed.id,
      nickname: removed.nickname,
    });

    // Adjust storyteller index if needed
    if (idx < this.storytellerIndex) {
      this.storytellerIndex--;
    } else if (idx === this.storytellerIndex) {
      // Current storyteller removed — adjust index
      if (this.players.length > 0) {
        this.storytellerIndex = this.storytellerIndex % this.players.length;
      }
    }

    if (this.connectedPlayerCount < MIN_PLAYERS_TO_START) {
      this.transitionTo("waiting");
    } else {
      this.checkPhaseAdvancement();
    }

    this.broadcastState();
  }

  /** Remove stale disconnected players (past grace period) */
  cleanupDisconnected(): void {
    const now = Date.now();
    const stale = this.players.filter(
      (p) =>
        !p.connected &&
        p.disconnectedAt &&
        now - p.disconnectedAt > PLAYER_RECONNECT_GRACE_SECONDS * 1000
    );
    for (const p of stale) {
      this.removePlayer(p.id);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Region 2: Phase Transitions
  // ═══════════════════════════════════════════════════════════════════════

  private transitionTo(newPhase: GamePhase): void {
    this.stopTimer();
    this.phase = newPhase;

    if (newPhase === "waiting") {
      this.broadcastState();
      return;
    }

    const duration = PHASE_DURATIONS[newPhase];
    if (duration > 0) {
      this.startTimer(duration);
    }

    this.broadcastState();
  }

  private startNewRound(): void {
    this.round++;
    this.association = null;
    this.cards = [];
    this.votes = [];
    this.readyPlayers.clear();
    this.votedPlayers.clear();
    this.generatedPlayers.clear();
    this.shuffledCards = [];

    // Advance storyteller
    if (this.round > 1) {
      this.storytellerIndex =
        (this.storytellerIndex + 1) % this.players.length;
    }

    this.transitionTo("association");
    this.onEvent("game:message", null, {
      message: `Round ${this.round}! ${this.getStoryteller()?.nickname ?? "Someone"} is the storyteller.`,
    });
  }

  private advancePhase(): void {
    switch (this.phase) {
      case "association":
        this.transitionTo("drawing");
        break;
      case "drawing":
        this.prepareVotingPhase();
        this.transitionTo("voting");
        break;
      case "voting":
        this.resolveRound();
        this.transitionTo("reveal");
        break;
      case "reveal":
        this.startNewRound();
        break;
      default:
        break;
    }
  }

  private checkPhaseAdvancement(): void {
    const connected = this.players.filter((p) => p.connected);

    switch (this.phase) {
      case "drawing": {
        // Advance if all connected players (including storyteller) are ready
        const allReady = connected.every(
          (p) => this.readyPlayers.has(p.id)
        );
        if (allReady && connected.length >= MIN_PLAYERS_TO_START) {
          this.advancePhase();
        }
        break;
      }
      case "voting": {
        // Advance if all connected non-storytellers have voted
        const nonStorytellers = connected.filter(
          (p) => !this.isStoryteller(p.id)
        );
        const allVoted = nonStorytellers.every((p) =>
          this.votedPlayers.has(p.id)
        );
        if (allVoted && nonStorytellers.length > 0) {
          this.advancePhase();
        }
        break;
      }
      default:
        break;
    }
  }

  private prepareVotingPhase(): void {
    // Ensure all connected non-storyteller players have a card
    // (those who didn't submit get an empty text card)
    for (const player of this.players) {
      if (player.connected && !this.isStoryteller(player.id)) {
        const hasCard = this.cards.some((c) => c.playerId === player.id);
        if (!hasCard) {
          this.cards.push({
            playerId: player.id,
            imageBase64: null,
            prompt: "(no prompt submitted)",
          });
        }
      }
    }

    // Also ensure storyteller has a card
    const storyteller = this.getStoryteller();
    if (storyteller) {
      const hasCard = this.cards.some((c) => c.playerId === storyteller.id);
      if (!hasCard) {
        this.cards.push({
          playerId: storyteller.id,
          imageBase64: null,
          prompt: this.association ?? "(no association)",
        });
      }
    }

    // Shuffle cards with opaque IDs
    this.shuffledCards = this.cards
      .map((card) => ({
        cardId: randomUUID(),
        card,
      }))
      .sort(() => Math.random() - 0.5);
  }

  private resolveRound(): void {
    const storyteller = this.getStoryteller();
    if (!storyteller) return;

    // Auto-vote for connected players who didn't vote
    const connected = this.players.filter(
      (p) => p.connected && !this.isStoryteller(p.id)
    );
    for (const player of connected) {
      if (!this.votedPlayers.has(player.id)) {
        // Random vote (excluding own card)
        const options = this.shuffledCards.filter(
          (sc) => sc.card.playerId !== player.id
        );
        if (options.length > 0) {
          const pick = options[Math.floor(Math.random() * options.length)];
          this.votes.push({
            voterId: player.id,
            cardOwnerId: pick.card.playerId,
          });
        }
      }
    }

    // Calculate scores
    const participatingIds = this.players
      .filter(
        (p) =>
          p.connected || this.cards.some((c) => c.playerId === p.id)
      )
      .map((p) => p.id);

    const result = calculateScores({
      storytellerId: storyteller.id,
      playerIds: participatingIds,
      cardOwners: this.cards.map((c) => c.playerId),
      votes: this.votes,
    });

    // Apply scores
    for (const [playerId, pts] of Object.entries(result.points)) {
      const player = this.getPlayer(playerId);
      if (player) {
        player.score += pts;
      }
    }

    this.lastRoundResult = {
      storytellerId: storyteller.id,
      association: this.association ?? "",
      cards: this.cards,
      votes: this.votes,
      pointsEarned: result.points,
    };

    this.onEvent("game:round-result", null, this.lastRoundResult);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Region 3: Timer Management
  // ═══════════════════════════════════════════════════════════════════════

  private startTimer(seconds: number): void {
    this.stopTimer();
    this.timerSeconds = seconds;

    this.timerHandle = setInterval(() => {
      this.timerSeconds--;
      this.onEvent("game:timer", null, { seconds: this.timerSeconds });

      if (this.timerSeconds <= 0) {
        this.onTimerExpired();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.timerSeconds = 0;
  }

  private onTimerExpired(): void {
    this.stopTimer();

    switch (this.phase) {
      case "association":
        // Auto-pick a random word if storyteller didn't submit
        if (!this.association) {
          const fallbacks = [
            "Dream",
            "Journey",
            "Secret",
            "Wonder",
            "Shadow",
            "Light",
            "Storm",
            "Memory",
            "Hope",
            "Fear",
          ];
          this.association =
            fallbacks[Math.floor(Math.random() * fallbacks.length)];
          this.onEvent("game:message", null, {
            message: `Time's up! Random word chosen: "${this.association}"`,
          });
        }
        this.advancePhase();
        break;

      case "drawing":
      case "voting":
      case "reveal":
        this.advancePhase();
        break;

      default:
        break;
    }
  }

  private startStorytellerGraceTimer(): void {
    if (this.storytellerGraceHandle) {
      clearTimeout(this.storytellerGraceHandle);
    }

    this.storytellerGraceHandle = setTimeout(() => {
      this.storytellerGraceHandle = null;

      // Pass storyteller role to next connected player
      const connected = this.players.filter((p) => p.connected);
      if (connected.length < MIN_PLAYERS_TO_START) {
        this.transitionTo("waiting");
        return;
      }

      // Find next connected player
      let nextIdx = (this.storytellerIndex + 1) % this.players.length;
      let attempts = 0;
      while (
        !this.players[nextIdx].connected &&
        attempts < this.players.length
      ) {
        nextIdx = (nextIdx + 1) % this.players.length;
        attempts++;
      }

      this.storytellerIndex = nextIdx;
      const newStoryteller = this.players[nextIdx];

      this.onEvent("game:message", null, {
        message: `Storyteller left! ${newStoryteller.nickname} is the new storyteller.`,
      });

      // Restart the current phase for the new storyteller
      if (this.phase === "association") {
        this.transitionTo("association");
      }
    }, STORYTELLER_DISCONNECT_GRACE_SECONDS * 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Region 4: Player Actions
  // ═══════════════════════════════════════════════════════════════════════

  submitAssociation(playerId: string, word: string): boolean {
    if (this.phase !== "association") return false;
    if (!this.isStoryteller(playerId)) return false;

    const trimmed = word.trim();
    if (trimmed.length === 0 || trimmed.length > 100) return false;

    this.association = trimmed;
    this.onEvent("game:message", null, {
      message: `Association: "${this.association}"`,
    });
    this.advancePhase();
    return true;
  }

  /** Record that a player submitted a prompt (card will be set via setCard) */
  submitPrompt(playerId: string, prompt: string): boolean {
    if (this.phase !== "drawing") return false;
    if (this.isStoryteller(playerId)) {
      // Storyteller also draws a card
    }

    const player = this.getPlayer(playerId);
    if (!player || !player.connected) return false;
    if (this.generatedPlayers.has(playerId)) return false; // 1 generation per round

    this.generatedPlayers.add(playerId);
    return true;
  }

  /** Set a player's card (called after image generation completes).
   *  Accepts cards during drawing phase AND early voting (before cards are shuffled),
   *  to handle late-arriving AI generations. */
  setCard(playerId: string, imageBase64: string | null, prompt: string): void {
    if (this.phase !== "drawing" && this.phase !== "voting") return;

    // Remove any existing card for this player
    this.cards = this.cards.filter((c) => c.playerId !== playerId);
    this.cards.push({ playerId, imageBase64, prompt });
  }

  markReady(playerId: string): boolean {
    if (this.phase !== "drawing") return false;

    const player = this.getPlayer(playerId);
    if (!player || !player.connected) return false;

    this.readyPlayers.add(playerId);
    this.checkPhaseAdvancement();
    return true;
  }

  submitVote(playerId: string, cardId: string): {
    success: boolean;
    error?: string;
  } {
    if (this.phase !== "voting") {
      return { success: false, error: "Not in voting phase" };
    }
    if (this.isStoryteller(playerId)) {
      return { success: false, error: "Storyteller cannot vote" };
    }
    if (this.votedPlayers.has(playerId)) {
      return { success: false, error: "Already voted" };
    }

    // Find the card by shuffled ID
    const shuffled = this.shuffledCards.find((sc) => sc.cardId === cardId);
    if (!shuffled) {
      return { success: false, error: "Card not found" };
    }

    // Can't vote for own card
    if (shuffled.card.playerId === playerId) {
      return { success: false, error: "Cannot vote for your own card" };
    }

    this.votes.push({
      voterId: playerId,
      cardOwnerId: shuffled.card.playerId,
    });
    this.votedPlayers.add(playerId);

    this.checkPhaseAdvancement();
    return { success: true };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════════

  private isStoryteller(playerId: string): boolean {
    const storyteller = this.getStoryteller();
    return storyteller?.id === playerId;
  }

  private getStoryteller(): Player | undefined {
    return this.players[this.storytellerIndex];
  }

  getStorytellerInfo(): { id: string; nickname: string } | null {
    const s = this.getStoryteller();
    return s ? { id: s.id, nickname: s.nickname } : null;
  }

  /** Build the player-specific view of the game state */
  getStateForPlayer(playerId: string): PlayerGameView {
    const storyteller = this.getStoryteller();
    const player = this.getPlayer(playerId);

    let cards: CardView[] = [];
    let myCard: Card | null = null;

    if (this.phase === "drawing") {
      // During drawing, player only sees their own card
      const ownCard = this.cards.find((c) => c.playerId === playerId);
      myCard = ownCard ?? null;
    } else if (this.phase === "voting") {
      // During voting, show shuffled anonymous cards
      cards = this.shuffledCards.map((sc) => ({
        cardId: sc.cardId,
        imageBase64: sc.card.imageBase64,
        prompt: sc.card.imageBase64 ? "" : sc.card.prompt, // show prompt only for text cards
      }));
    } else if (this.phase === "reveal") {
      // During reveal, show all cards with ownership revealed
      cards = this.shuffledCards.map((sc) => ({
        cardId: sc.cardId,
        imageBase64: sc.card.imageBase64,
        prompt: sc.card.prompt,
        playerId: sc.card.playerId,
      }));
    }

    let hasSubmitted = false;
    if (this.phase === "association") {
      hasSubmitted = this.association !== null && this.isStoryteller(playerId);
    } else if (this.phase === "drawing") {
      hasSubmitted = this.readyPlayers.has(playerId);
    } else if (this.phase === "voting") {
      hasSubmitted = this.votedPlayers.has(playerId);
    }

    return {
      roomId: this.roomId,
      phase: this.phase,
      players: this.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        score: p.score,
        connected: p.connected,
      })),
      round: this.round,
      storytellerId: storyteller?.id ?? "",
      myPlayerId: playerId,
      association: this.phase === "waiting" ? null : this.association,
      cards,
      myCard,
      timerSeconds: this.timerSeconds,
      lastRoundResult: this.phase === "reveal" ? this.lastRoundResult : null,
      hasSubmitted,
    };
  }

  private sendStateTo(playerId: string): void {
    const state = this.getStateForPlayer(playerId);
    this.onEvent("game:state", playerId, state);
  }

  private broadcastState(): void {
    for (const player of this.players) {
      if (player.connected) {
        this.sendStateTo(player.id);
      }
    }
  }

  /** Get admin stats */
  getStats(): {
    roomId: string;
    phase: GamePhase;
    playerCount: number;
    round: number;
  } {
    return {
      roomId: this.roomId,
      phase: this.phase,
      playerCount: this.playerCount,
      round: this.round,
    };
  }

  destroy(): void {
    this.stopTimer();
    if (this.storytellerGraceHandle) {
      clearTimeout(this.storytellerGraceHandle);
      this.storytellerGraceHandle = null;
    }
  }
}
