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
      <div className="w-64 h-64 rounded-xl overflow-hidden bg-white/5 border border-white/10">
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
      {!state.hasSubmitted && (
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
      )}

      {/* Ready button */}
      {myImage && !state.hasSubmitted && (
        <button
          onClick={onReady}
          className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-bold text-lg transition-colors shadow-lg shadow-green-600/20"
        >
          Card Ready!
        </button>
      )}

      {state.hasSubmitted && (
        <div className="bg-green-600/20 text-green-300 px-6 py-3 rounded-lg font-semibold">
          Card submitted! Waiting for other players...
        </div>
      )}
    </div>
  );
}
