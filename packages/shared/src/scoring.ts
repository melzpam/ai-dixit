import type { Vote } from "./types.js";

/**
 * Dixit scoring rules (pure functions, no side effects):
 *
 *   ┌───────────────────────┬─────────────┬──────────────────┬──────────────┐
 *   │ Scenario              │ Storyteller  │ Correct guessers │ Wrong guess. │
 *   ├───────────────────────┼─────────────┼──────────────────┼──────────────┤
 *   │ Some guess right      │ 3 pts       │ 3 pts each       │ 0 pts        │
 *   │ ALL guess right       │ 0 pts       │ 2 pts each       │ —            │
 *   │ NONE guess right      │ 0 pts       │ —                │ 2 pts each   │
 *   └───────────────────────┴─────────────┴──────────────────┴──────────────┘
 *
 *   Bonus (always): each non-storyteller gets +1 per vote their own card received.
 */

export interface ScoringInput {
  storytellerId: string;
  /** All player IDs participating this round (including storyteller) */
  playerIds: string[];
  /** Each card's owner */
  cardOwners: string[];
  /** All votes cast */
  votes: Vote[];
}

export interface ScoringResult {
  /** Map of playerId → points earned this round */
  points: Record<string, number>;
  /** How many non-storytellers guessed the storyteller's card */
  correctGuessCount: number;
  /** Total non-storyteller voters */
  totalVoters: number;
}

export function calculateScores(input: ScoringInput): ScoringResult {
  const { storytellerId, playerIds, votes } = input;
  const points: Record<string, number> = {};

  // Initialize all players to 0
  for (const id of playerIds) {
    points[id] = 0;
  }

  const nonStorytellerIds = playerIds.filter((id) => id !== storytellerId);
  const totalVoters = nonStorytellerIds.length;

  if (totalVoters === 0) {
    return { points, correctGuessCount: 0, totalVoters: 0 };
  }

  // Count votes for the storyteller's card
  const correctGuessCount = votes.filter(
    (v) => v.cardOwnerId === storytellerId
  ).length;

  // Determine scenario
  const allGuessedRight = correctGuessCount === totalVoters;
  const noneGuessedRight = correctGuessCount === 0;

  if (allGuessedRight || noneGuessedRight) {
    // Storyteller gets 0, everyone else gets 2
    for (const id of nonStorytellerIds) {
      points[id] += 2;
    }
  } else {
    // Some guessed right: storyteller gets 3, correct guessers get 3
    points[storytellerId] += 3;
    for (const vote of votes) {
      if (vote.cardOwnerId === storytellerId) {
        points[vote.voterId] += 3;
      }
    }
  }

  // Bonus: +1 per vote received on own card (non-storytellers only)
  for (const vote of votes) {
    if (
      vote.cardOwnerId !== storytellerId &&
      vote.cardOwnerId !== vote.voterId
    ) {
      points[vote.cardOwnerId] += 1;
    }
  }

  return { points, correctGuessCount, totalVoters };
}
