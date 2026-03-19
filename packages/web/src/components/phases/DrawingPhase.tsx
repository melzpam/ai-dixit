"use client";

import { useState } from "react";
import type { PlayerGameView } from "@ai-dixit/shared";
import { Timer } from "../Timer";

interface Props {
  state: PlayerGameView;
  timerSeconds: number;
  myImage: string | null;
  imageLoading: boolean;
  imageFailed: string | null;
  onSubmitPrompt: (prompt: string) => void;
  onReady: () => void;
}

export function DrawingPhase({
  state,
  timerSeconds,
  myImage,
  imageLoading,
  imageFailed,
  onSubmitPrompt,
  onReady,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleReady() {
    setIsSubmitting(true);
    onReady();
  }

  // After submitting OR after clicking Card Ready with animation
  if (state.hasSubmitted || isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-8 animate-[fadeInScale_0.5s_ease-out]">
        <Timer seconds={timerSeconds} />

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/25 via-amber-500/25 to-purple-500/25 rounded-2xl blur-xl animate-pulse" />
          <div className="relative w-56 h-72 rounded-xl overflow-hidden shadow-2xl shadow-purple-900/50 ring-1 ring-white/10">
            {myImage ? (
              <img
                src={`data:image/png;base64,${myImage}`}
                alt="Your card"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center p-4">
                <p className="text-center text-sm text-white/60 italic">{prompt || "Your card"}</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-lg font-semibold text-green-300">
          Your card is on the table
        </p>
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Waiting for other players...
        </div>

        {/* Other players status dots */}
        <div className="flex gap-3">
          {state.players
            .filter((p) => p.id !== state.myPlayerId)
            .map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-amber-400/60 animate-pulse" />
                </div>
                <span className="text-xs text-white/30">{p.nickname}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <Timer seconds={timerSeconds} />

      <div className="text-center">
        <h2 className="text-xl font-semibold text-white/70 mb-2">
          The association is:
        </h2>
        <div className="text-4xl font-bold bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-transparent">
          &ldquo;{state.association}&rdquo;
        </div>
      </div>

      <p className="text-white/60 text-center max-w-md">
        Describe an image that represents this word. AI will generate your card.
      </p>

      {/* Card preview area */}
      <div className="w-48 h-64 rounded-xl overflow-hidden bg-white/5 border border-white/10">
        {imageLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-4 border-purple-400/30 border-t-purple-400 animate-spin" />
            <span className="text-sm text-white/50">Generating...</span>
          </div>
        ) : myImage ? (
          <img
            src={`data:image/png;base64,${myImage}`}
            alt="Your generated card"
            className="w-full h-full object-cover"
          />
        ) : imageFailed ? (
          <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-purple-800 to-indigo-900">
            <p className="text-center text-sm text-white/70 italic">
              {imageFailed}
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-white/30 text-sm">Your card will appear here</span>
          </div>
        )}
      </div>

      {/* Prompt input */}
      <div className="w-full max-w-lg space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim() && !imageLoading) {
                onSubmitPrompt(prompt.trim());
              }
            }}
            placeholder="Describe your card..."
            maxLength={500}
            disabled={imageLoading}
            className="flex-1 bg-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
          />
          <button
            onClick={() => {
              if (prompt.trim() && !imageLoading) {
                onSubmitPrompt(prompt.trim());
              }
            }}
            disabled={!prompt.trim() || imageLoading}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 rounded-lg font-semibold transition-colors"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Ready button */}
      {myImage && (
        <button
          onClick={handleReady}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-green-600/20"
        >
          Card Ready!
        </button>
      )}
    </div>
  );
}
