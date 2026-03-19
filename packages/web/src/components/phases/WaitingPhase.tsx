"use client";

import type { Player } from "@ai-dixit/shared";

export function WaitingPhase({ players }: { players: Player[] }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div className="w-16 h-16 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
      <h2 className="text-2xl font-bold">Waiting for Players</h2>
      <p className="text-white/60 text-center max-w-md">
        Need at least 2 players to start.
        Currently {players.length} player{players.length !== 1 ? "s" : ""} in the room.
      </p>
    </div>
  );
}
