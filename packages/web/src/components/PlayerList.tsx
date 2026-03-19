"use client";

import type { Player } from "@ai-dixit/shared";

interface PlayerListProps {
  players: Player[];
  storytellerId: string;
}

export function PlayerList({ players, storytellerId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white/5 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">
        Players
      </h3>
      <div className="space-y-2">
        {sorted.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              player.connected
                ? "bg-white/5"
                : "bg-white/5 opacity-40"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  player.connected ? "bg-green-400" : "bg-gray-500"
                }`}
              />
              <span className="text-sm font-medium">{player.nickname}</span>
              {player.id === storytellerId && (
                <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  Storyteller
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-purple-300">
              {player.score} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
