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
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const iAmStoryteller = state.myPlayerId === state.storytellerId;

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

  // Already voted
  if (state.hasSubmitted) {
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <Timer seconds={timerSeconds} />
        <h2 className="text-xl font-semibold text-green-300">Vote submitted!</h2>
        <p className="text-white/60">Waiting for other players to vote...</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-4xl">
          {state.cards.map((card) => (
            <Card
              key={card.cardId}
              card={card}
              selected={card.cardId === selectedCardId}
              disabled
              zoomOnHover
            />
          ))}
        </div>
      </div>
    );
  }

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
            selected={card.cardId === selectedCardId}
            onClick={() => setSelectedCardId(card.cardId)}
            zoomOnHover
          />
        ))}
      </div>

      {selectedCardId && (
        <button
          onClick={() => onVote(selectedCardId)}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-amber-600/20"
        >
          Confirm Vote
        </button>
      )}
    </div>
  );
}
