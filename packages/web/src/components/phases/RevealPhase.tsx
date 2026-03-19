"use client";

import type { PlayerGameView, RoundResult } from "@ai-dixit/shared";
import { Timer } from "../Timer";
import { Card } from "../Card";

interface Props {
  state: PlayerGameView;
  timerSeconds: number;
  roundResult: RoundResult | null;
}

export function RevealPhase({ state, timerSeconds, roundResult }: Props) {
  const result = roundResult ?? state.lastRoundResult;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Timer seconds={timerSeconds} />

      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Round Results</h2>
        {result && (
          <p className="text-white/60">
            The association was:{" "}
            <span className="text-amber-300 font-semibold">
              &ldquo;{result.association}&rdquo;
            </span>
          </p>
        )}
      </div>

      {/* Cards with revealed owners */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full max-w-4xl">
        {state.cards.map((card) => {
          const playerName = card.playerId
            ? state.players.find((p) => p.id === card.playerId)?.nickname
            : undefined;
          const isStoryteller = card.playerId === result?.storytellerId;

          return (
            <div key={card.cardId} className="relative">
              <Card
                card={card}
                showOwner={
                  playerName
                    ? `${playerName}${isStoryteller ? " (Storyteller)" : ""}`
                    : undefined
                }
              />
              {isStoryteller && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                  ST
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scores this round */}
      {result && (
        <div className="bg-white/5 rounded-xl p-6 w-full max-w-md">
          <h3 className="text-lg font-bold mb-3 text-center">Points This Round</h3>
          <div className="space-y-2">
            {Object.entries(result.pointsEarned)
              .sort(([, a], [, b]) => b - a)
              .map(([playerId, pts]) => {
                const player = state.players.find((p) => p.id === playerId);
                return (
                  <div
                    key={playerId}
                    className="flex justify-between items-center px-3 py-1"
                  >
                    <span className="text-sm">
                      {player?.nickname ?? "Unknown"}
                      {playerId === result.storytellerId && (
                        <span className="text-amber-300 ml-1">(ST)</span>
                      )}
                    </span>
                    <span
                      className={`font-bold ${
                        pts > 0 ? "text-green-400" : "text-white/40"
                      }`}
                    >
                      +{pts}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
