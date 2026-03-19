import { describe, it, expect } from "vitest";
import { calculateScores, type ScoringInput } from "./scoring.js";

function makeInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    storytellerId: "storyteller",
    playerIds: ["storyteller", "p1", "p2", "p3"],
    cardOwners: ["storyteller", "p1", "p2", "p3"],
    votes: [],
    ...overrides,
  };
}

describe("calculateScores", () => {
  it("awards 3 pts to storyteller and correct guessers when SOME guess right", () => {
    const input = makeInput({
      votes: [
        { voterId: "p1", cardOwnerId: "storyteller" }, // correct
        { voterId: "p2", cardOwnerId: "p1" }, // wrong
        { voterId: "p3", cardOwnerId: "storyteller" }, // correct
      ],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(3);
    expect(result.points.p1).toBe(3 + 1); // correct guess + 1 vote on own card from p2
    expect(result.points.p2).toBe(0);
    expect(result.points.p3).toBe(3);
    expect(result.correctGuessCount).toBe(2);
  });

  it("awards 0 to storyteller, 2 to everyone else when ALL guess right", () => {
    const input = makeInput({
      votes: [
        { voterId: "p1", cardOwnerId: "storyteller" },
        { voterId: "p2", cardOwnerId: "storyteller" },
        { voterId: "p3", cardOwnerId: "storyteller" },
      ],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(0);
    expect(result.points.p1).toBe(2);
    expect(result.points.p2).toBe(2);
    expect(result.points.p3).toBe(2);
    expect(result.correctGuessCount).toBe(3);
  });

  it("awards 0 to storyteller, 2 to everyone else when NONE guess right", () => {
    const input = makeInput({
      votes: [
        { voterId: "p1", cardOwnerId: "p2" },
        { voterId: "p2", cardOwnerId: "p3" },
        { voterId: "p3", cardOwnerId: "p1" },
      ],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(0);
    expect(result.points.p1).toBe(2 + 1); // 2 for none-right + 1 bonus vote from p3
    expect(result.points.p2).toBe(2 + 1); // 2 + 1 bonus from p1
    expect(result.points.p3).toBe(2 + 1); // 2 + 1 bonus from p2
    expect(result.correctGuessCount).toBe(0);
  });

  it("awards bonus points for votes on own card (non-storyteller)", () => {
    const input = makeInput({
      playerIds: ["storyteller", "p1", "p2", "p3", "p4"],
      cardOwners: ["storyteller", "p1", "p2", "p3", "p4"],
      votes: [
        { voterId: "p1", cardOwnerId: "storyteller" }, // correct
        { voterId: "p2", cardOwnerId: "p3" }, // wrong, gives p3 a bonus
        { voterId: "p3", cardOwnerId: "p1" }, // wrong, gives p1 a bonus
        { voterId: "p4", cardOwnerId: "p3" }, // wrong, gives p3 another bonus
      ],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(3);
    expect(result.points.p1).toBe(3 + 1); // correct + 1 bonus
    expect(result.points.p2).toBe(0);
    expect(result.points.p3).toBe(0 + 2); // wrong + 2 bonus votes
    expect(result.points.p4).toBe(0);
  });

  it("handles 2-player game (1 non-storyteller)", () => {
    const input = makeInput({
      playerIds: ["storyteller", "p1"],
      cardOwners: ["storyteller", "p1"],
      votes: [{ voterId: "p1", cardOwnerId: "storyteller" }],
    });

    const result = calculateScores(input);

    // All guessed right (1/1) → storyteller 0, p1 gets 2
    expect(result.points.storyteller).toBe(0);
    expect(result.points.p1).toBe(2);
    expect(result.correctGuessCount).toBe(1);
    expect(result.totalVoters).toBe(1);
  });

  it("handles 10-player game with max bonus points", () => {
    const players = [
      "storyteller",
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
    ];
    const input = makeInput({
      playerIds: players,
      cardOwners: players,
      votes: [
        { voterId: "p1", cardOwnerId: "storyteller" }, // correct
        // All others vote for p2's card
        { voterId: "p2", cardOwnerId: "p3" },
        { voterId: "p3", cardOwnerId: "p2" },
        { voterId: "p4", cardOwnerId: "p2" },
        { voterId: "p5", cardOwnerId: "p2" },
        { voterId: "p6", cardOwnerId: "p2" },
        { voterId: "p7", cardOwnerId: "p2" },
        { voterId: "p8", cardOwnerId: "p2" },
        { voterId: "p9", cardOwnerId: "p2" },
      ],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(3);
    expect(result.points.p1).toBe(3); // correct guess
    expect(result.points.p2).toBe(0 + 7); // wrong guess + 7 bonus votes
    expect(result.points.p3).toBe(0 + 1); // 1 bonus from p2
    expect(result.correctGuessCount).toBe(1);
    expect(result.totalVoters).toBe(9);
  });

  it("handles no voters (single player edge case)", () => {
    const input = makeInput({
      playerIds: ["storyteller"],
      cardOwners: ["storyteller"],
      votes: [],
    });

    const result = calculateScores(input);

    expect(result.points.storyteller).toBe(0);
    expect(result.correctGuessCount).toBe(0);
    expect(result.totalVoters).toBe(0);
  });

  it("does not award bonus for voting on your own card", () => {
    // This shouldn't happen (server rejects it) but scoring should be safe
    const input = makeInput({
      votes: [
        { voterId: "p1", cardOwnerId: "p1" }, // self-vote (invalid but safe)
        { voterId: "p2", cardOwnerId: "storyteller" },
        { voterId: "p3", cardOwnerId: "p1" },
      ],
    });

    const result = calculateScores(input);

    // p1 voted for self — not counted as correct, and no self-bonus
    expect(result.points.p1).toBe(0 + 1); // only bonus from p3's vote
  });
});
