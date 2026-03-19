"use client";

import { useState } from "react";
import type { PlayerGameView } from "@ai-dixit/shared";
import { Timer } from "../Timer";
import { Card } from "../Card";

interface Props {
  state: PlayerGameView;
  timerSeconds: number;
  onVote: (cardId: string) => void;
}

export function VotingPhase({ state, timerSeconds, onVote }: Props) {
  const [votedCardId, setVotedCardId] = useState<string | null>(null);
  const iAmStoryteller = state.myPlayerId === state.storytellerId;

  const hasVoted = state.hasSubmitted || votedCardId !== null;

  function handleCardClick(cardId: string) {
    if (hasVoted) return;
    setVotedCardId(cardId);
    onVote(cardId);
  }

  // Storyteller waits
  if (iAmStoryteller) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer seconds={timerSeconds} />
        <h2 className="text-2xl font-bold">Players are voting...</h2>
        <p className="text-white/60">Wait for everyone to guess which card is yours.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-4xl">
          {state.cards.map((card) => (
            <Card key={card.cardId} card={card} disabled zoomOnHover />
          ))}
        </div>
      </div>
    );
  }

  // After voting — show only the chosen card with glow
  if (hasVoted) {
    const chosenId = votedCardId ?? null;
    const chosenCard = state.cards.find((c) => c.cardId === chosenId);

    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer seconds={timerSeconds} />
        <h2 className="text-xl font-semibold text-green-300">Vote submitted!</h2>
        <p className="text-white/40 text-sm">Waiting for other players...</p>

        {chosenCard && (
          <div className="relative animate-[fadeInScale_0.5s_ease-out]">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/30 via-purple-500/20 to-amber-500/30 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-48 h-64">
              <Card card={chosenCard} selected disabled />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active voting
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Timer seconds={timerSeconds} />

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Which card is the storyteller&apos;s?</h2>
        <p className="text-white/60">
          The association was: <span className="text-amber-300 font-semibold">&ldquo;{state.association}&rdquo;</span>
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {state.cards.map((card) => (
          <Card
            key={card.cardId}
            card={card}
            onClick={() => handleCardClick(card.cardId)}
            zoomOnHover
          />
        ))}
      </div>
    </div>
  );
}
