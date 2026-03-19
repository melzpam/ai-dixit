import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GameEngine, type GameEventCallback } from "./GameEngine.js";

function createEngine(): {
  engine: GameEngine;
  events: Array<{ event: string; playerId: string | null; data: unknown }>;
} {
  const events: Array<{
    event: string;
    playerId: string | null;
    data: unknown;
  }> = [];
  const onEvent: GameEventCallback = (event, playerId, data) => {
    events.push({ event, playerId, data });
  };
  const engine = new GameEngine("test-room", onEvent);
  return { engine, events };
}

describe("GameEngine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════
  // Room Operations
  // ═══════════════════════════════════════════

  describe("room operations", () => {
    it("first player joins — stays in WAITING", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");

      expect(engine.currentPhase).toBe("waiting");
      expect(engine.playerCount).toBe(1);
    });

    it("second player joins — transitions to ASSOCIATION", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      expect(engine.currentPhase).toBe("association");
      expect(engine.playerCount).toBe(2);
    });

    it("rejects player when room is full (10 players)", () => {
      const { engine } = createEngine();
      for (let i = 0; i < 10; i++) {
        engine.addPlayer(`p${i}`, `Player${i}`);
      }

      expect(engine.isFull).toBe(true);
      const result = engine.addPlayer("p11", "Extra");
      expect(result).toBe(false);
      expect(engine.playerCount).toBe(10);
    });

    it("player disconnect below 2 — pauses to WAITING", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");
      expect(engine.currentPhase).toBe("association");

      engine.disconnectPlayer("p2");
      expect(engine.currentPhase).toBe("waiting");
    });

    it("player reconnects successfully", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");
      engine.disconnectPlayer("p2");
      expect(engine.connectedPlayerCount).toBe(1);

      const reconnected = engine.reconnectPlayer("p2");
      expect(reconnected).toBe(true);
      expect(engine.connectedPlayerCount).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  // Phase Transitions
  // ═══════════════════════════════════════════

  describe("phase transitions", () => {
    it("follows correct phase order: ASSOCIATION → DRAWING → VOTING → REVEAL → ASSOCIATION", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      expect(engine.currentPhase).toBe("association");

      // Storyteller submits association
      engine.submitAssociation("p1", "Love");
      expect(engine.currentPhase).toBe("drawing");

      // All players submit prompts and mark ready
      engine.submitPrompt("p2", "hearts");
      engine.setCard("p2", "base64data", "hearts");
      engine.markReady("p2");
      // Storyteller also needs a card and marks ready
      engine.submitPrompt("p1", "roses");
      engine.setCard("p1", "base64data2", "roses");
      engine.markReady("p1");

      // All players ready → advance to voting
      expect(engine.currentPhase).toBe("voting");

      // Timer expires for voting (15s)
      vi.advanceTimersByTime(15_000);
      expect(engine.currentPhase).toBe("reveal");

      // Timer expires for reveal (10s)
      vi.advanceTimersByTime(10_000);
      expect(engine.currentPhase).toBe("association");
    });

    it("timer expiry forces ASSOCIATION → DRAWING with random word", () => {
      const { engine, events } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      expect(engine.currentPhase).toBe("association");

      // Advance 30 seconds (association timer)
      vi.advanceTimersByTime(30_000);

      expect(engine.currentPhase).toBe("drawing");
      // Should have a message about random word
      const messageEvent = events.find(
        (e) =>
          e.event === "game:message" &&
          (e.data as any).message?.includes("Random word")
      );
      expect(messageEvent).toBeDefined();
    });

    it("rejects association from non-storyteller", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      const result = engine.submitAssociation("p2", "Cheating");
      expect(result).toBe(false);
      expect(engine.currentPhase).toBe("association");
    });

    it("rejects empty association", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      const result = engine.submitAssociation("p1", "   ");
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════
  // Voting
  // ═══════════════════════════════════════════

  describe("voting", () => {
    function setupVotingPhase() {
      const { engine, events } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");
      engine.addPlayer("p3", "Charlie");

      // Association phase
      engine.submitAssociation("p1", "Love");

      // Drawing phase — all players submit
      engine.submitPrompt("p1", "hearts");
      engine.setCard("p1", "img1", "hearts");
      engine.submitPrompt("p2", "roses");
      engine.setCard("p2", "img2", "roses");
      engine.submitPrompt("p3", "sunset");
      engine.setCard("p3", "img3", "sunset");

      engine.markReady("p1");
      engine.markReady("p2");
      engine.markReady("p3");

      expect(engine.currentPhase).toBe("voting");

      return { engine, events };
    }

    it("valid vote is accepted", () => {
      const { engine } = setupVotingPhase();
      const state = engine.getStateForPlayer("p2");
      // Find a card that isn't p2's own
      const otherCard = state.cards.find(
        (c) => c.imageBase64 !== null
      );
      expect(otherCard).toBeDefined();

      const result = engine.submitVote("p2", otherCard!.cardId);
      expect(result.success).toBe(true);
    });

    it("rejects duplicate vote", () => {
      const { engine } = setupVotingPhase();
      const state = engine.getStateForPlayer("p2");
      // Find a card that p2 can vote for (not their own)
      // We need to try cards until we find one that isn't rejected as "own card"
      let votableCard = state.cards[0];
      for (const card of state.cards) {
        const tryResult = engine.submitVote("p2", card.cardId);
        if (tryResult.success) {
          votableCard = card;
          break;
        }
        if (tryResult.error === "Cannot vote for your own card") {
          continue;
        }
      }

      // Now try to vote again — should be rejected as duplicate
      const result = engine.submitVote("p2", votableCard.cardId);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Already voted");
    });

    it("rejects vote for non-existent card", () => {
      const { engine } = setupVotingPhase();
      const result = engine.submitVote("p2", "fake-card-id");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Card not found");
    });

    it("auto-votes on timer expiry", () => {
      const { engine, events } = setupVotingPhase();

      // Don't vote manually — let timer expire
      vi.advanceTimersByTime(15_000);

      // Should transition to reveal
      expect(engine.currentPhase).toBe("reveal");

      // Round result should have been emitted
      const resultEvent = events.find((e) => e.event === "game:round-result");
      expect(resultEvent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // Storyteller Disconnect
  // ═══════════════════════════════════════════

  describe("storyteller disconnect", () => {
    it("auto-passes storyteller after 10s grace period", () => {
      const { engine, events } = createEngine();
      engine.addPlayer("p1", "Alice"); // storyteller
      engine.addPlayer("p2", "Bob");
      engine.addPlayer("p3", "Charlie");

      expect(engine.currentPhase).toBe("association");

      // Storyteller disconnects
      engine.disconnectPlayer("p1");

      // Still in game (3 players, 2 connected)
      expect(engine.currentPhase).toBe("association");

      // After 10 seconds, storyteller passes
      vi.advanceTimersByTime(10_000);

      // Should have a message about new storyteller
      const passEvent = events.find(
        (e) =>
          e.event === "game:message" &&
          (e.data as any).message?.includes("new storyteller")
      );
      expect(passEvent).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════
  // Player State View
  // ═══════════════════════════════════════════

  describe("getStateForPlayer", () => {
    it("hides card ownership during voting phase", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      engine.submitAssociation("p1", "Test");
      engine.submitPrompt("p1", "prompt1");
      engine.setCard("p1", "img1", "prompt1");
      engine.submitPrompt("p2", "prompt2");
      engine.setCard("p2", "img2", "prompt2");
      engine.markReady("p1");
      engine.markReady("p2");

      expect(engine.currentPhase).toBe("voting");

      const view = engine.getStateForPlayer("p2");
      // Cards should have opaque IDs, not player IDs
      for (const card of view.cards) {
        expect(card.cardId).toBeDefined();
        expect(card.cardId).not.toBe("p1");
        expect(card.cardId).not.toBe("p2");
      }
    });

    it("shows own card during drawing phase", () => {
      const { engine } = createEngine();
      engine.addPlayer("p1", "Alice");
      engine.addPlayer("p2", "Bob");

      engine.submitAssociation("p1", "Test");
      engine.submitPrompt("p2", "my prompt");
      engine.setCard("p2", "myimg", "my prompt");

      const view = engine.getStateForPlayer("p2");
      expect(view.myCard).toBeDefined();
      expect(view.myCard?.imageBase64).toBe("myimg");
    });
  });
});
