"use client";

import { useState } from "react";
import type { PlayerGameView } from "@ai-dixit/shared";
import { Timer } from "../Timer";

interface Props {
  state: PlayerGameView;
  timerSeconds: number;
  onSubmit: (association: string) => void;
}

export function AssociationPhase({ state, timerSeconds, onSubmit }: Props) {
  const [word, setWord] = useState("");
  const iAmStoryteller = state.myPlayerId === state.storytellerId;

  // Association already submitted — everyone sees the word
  if (state.association) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <Timer seconds={timerSeconds} />
        <h2 className="text-xl font-semibold text-white/70">The association is:</h2>
        <div className="text-5xl font-bold bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-transparent">
          &ldquo;{state.association}&rdquo;
        </div>
        <p className="text-white/50">Get ready to create your card...</p>
      </div>
    );
  }

  // Storyteller: show the input form
  if (iAmStoryteller) {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <Timer seconds={timerSeconds} />
        <h2 className="text-2xl font-bold">You are the storyteller!</h2>
        <div className="w-full max-w-md space-y-4">
          <p className="text-white/60 text-center">
            Type an association word for other players to illustrate.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && word.trim()) onSubmit(word.trim());
              }}
              placeholder="e.g. Love, Mystery, Freedom..."
              maxLength={100}
              className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-400 text-lg"
              autoFocus
            />
            <button
              onClick={() => word.trim() && onSubmit(word.trim())}
              disabled={!word.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg font-semibold transition-colors"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-storyteller: wait
  const storytellerName = state.players.find(
    (p) => p.id === state.storytellerId
  )?.nickname;

  return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Timer seconds={timerSeconds} />
      <h2 className="text-2xl font-bold">
        {storytellerName} is choosing a word...
      </h2>
      <p className="text-white/60">Wait for the storyteller to pick an association.</p>
    </div>
  );
}
