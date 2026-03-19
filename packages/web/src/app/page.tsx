"use client";

import { useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { PlayerList } from "@/components/PlayerList";
import { WaitingPhase } from "@/components/phases/WaitingPhase";
import { AssociationPhase } from "@/components/phases/AssociationPhase";
import { DrawingPhase } from "@/components/phases/DrawingPhase";
import { VotingPhase } from "@/components/phases/VotingPhase";
import { RevealPhase } from "@/components/phases/RevealPhase";

export default function Home() {
  const [nickname, setNickname] = useState("");
  const [joined, setJoined] = useState(false);
  const {
    connected,
    gameState,
    timerSeconds,
    myImage,
    imageLoading,
    imageFailed,
    roundResult,
    error,
    message,
    joinGame,
    submitAssociation,
    submitPrompt,
    markReady,
    submitVote,
  } = useSocket();

  // Landing screen — nickname input
  if (!joined || !gameState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Floating decorative cards */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Left card */}
          <div className="absolute -left-8 top-1/4 w-32 opacity-20 -rotate-12 blur-[1px]">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-amber-400 via-rose-500 to-purple-700" style={{ aspectRatio: "3/4" }}>
              <div className="w-full h-full flex items-center justify-center p-3">
                <svg viewBox="0 0 64 64" className="w-16 h-16 text-white/40">
                  <circle cx="32" cy="20" r="10" fill="currentColor" />
                  <path d="M32 34c-12 0-20 8-20 16h40c0-8-8-16-20-16z" fill="currentColor" />
                  <circle cx="20" cy="12" r="4" fill="currentColor" opacity="0.3" />
                  <circle cx="44" cy="8" r="3" fill="currentColor" opacity="0.3" />
                </svg>
              </div>
            </div>
          </div>
          {/* Right card */}
          <div className="absolute -right-6 top-1/3 w-28 opacity-15 rotate-[18deg] blur-[1px]">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-teal-400 via-indigo-500 to-violet-800" style={{ aspectRatio: "3/4" }}>
              <div className="w-full h-full flex items-center justify-center p-3">
                <svg viewBox="0 0 64 64" className="w-14 h-14 text-white/40">
                  <path d="M32 8l6 18h18l-14 10 6 18-16-12-16 12 6-18L8 26h18z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
          {/* Bottom-left card */}
          <div className="absolute left-16 -bottom-4 w-24 opacity-10 rotate-[25deg] blur-[2px]">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-pink-400 via-orange-400 to-yellow-500" style={{ aspectRatio: "3/4" }}>
              <div className="w-full h-full flex items-center justify-center p-2">
                <svg viewBox="0 0 64 64" className="w-12 h-12 text-white/40">
                  <path d="M32 12c-8 0-16 6-16 16 0 14 16 28 16 28s16-14 16-28c0-10-8-16-16-16z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
          {/* Top-right card */}
          <div className="absolute right-20 top-12 w-20 opacity-10 -rotate-[30deg] blur-[2px]">
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-cyan-300 via-blue-500 to-indigo-700" style={{ aspectRatio: "3/4" }}>
              <div className="w-full h-full flex items-center justify-center p-2">
                <svg viewBox="0 0 64 64" className="w-10 h-10 text-white/40">
                  <circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" strokeWidth="3" />
                  <circle cx="32" cy="32" r="6" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>

          {/* Glowing orbs */}
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-1/4 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
        </div>

        {/* Main content */}
        <div className="max-w-md w-full space-y-8 text-center relative z-10">
          <div className="space-y-3">
            <div className="text-5xl mb-2">&#x2728;</div>
            <h1 className="text-7xl font-extrabold bg-gradient-to-r from-purple-300 via-pink-400 to-amber-300 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              AI Dixit
            </h1>
            <p className="text-lg text-white/50 font-light leading-relaxed max-w-sm mx-auto">
              Imagine, create, and guess. Turn words into magical AI art cards and outsmart your friends.
            </p>
          </div>

          <div className="space-y-4">
            {/* How it works — brief */}
            <div className="flex justify-center gap-6 text-white/30 text-xs py-2">
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">&#x1F3A8;</span>
                <span>Create</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">&#x2192;</span>
                <span className="opacity-0">.</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">&#x1F0CF;</span>
                <span>Bluff</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">&#x2192;</span>
                <span className="opacity-0">.</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-lg">&#x1F50D;</span>
                <span>Guess</span>
              </div>
            </div>

            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nickname.trim()) {
                  joinGame(nickname.trim());
                  setJoined(true);
                }
              }}
              placeholder="Your nickname"
              maxLength={20}
              className="w-full bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-purple-400/40 text-center transition-all"
              autoFocus
            />
            <button
              onClick={() => {
                if (nickname.trim()) {
                  joinGame(nickname.trim());
                  setJoined(true);
                }
              }}
              disabled={!nickname.trim() || !connected}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 rounded-xl font-bold text-xl transition-all shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40"
            >
              {connected ? "Play" : "Connecting..."}
            </button>
          </div>

          <p className="text-xs text-white/20">
            Inspired by Dixit. Powered by AI.
          </p>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen flex">
      {/* Sidebar — player list */}
      <aside className="hidden md:flex w-64 flex-col gap-4 p-4 border-r border-white/10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          AI Dixit
        </h1>
        <div className="text-xs text-white/40">
          Room: {gameState.roomId} | Round {gameState.round}
        </div>
        <PlayerList
          players={gameState.players}
          storytellerId={gameState.storytellerId}
        />
      </aside>

      {/* Main game area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {/* Notifications */}
        {error && (
          <div className="fixed top-4 right-4 bg-red-600/90 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-pulse">
            {error}
          </div>
        )}
        {message && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {message}
          </div>
        )}

        {/* Mobile player count */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <span className="text-sm text-white/50">
            Room: {gameState.roomId} | Round {gameState.round}
          </span>
          <span className="text-sm text-white/50">
            {gameState.players.length} players
          </span>
        </div>

        {/* Phase-specific UI */}
        {gameState.phase === "waiting" && (
          <WaitingPhase players={gameState.players} />
        )}
        {gameState.phase === "association" && (
          <AssociationPhase
            state={gameState}
            timerSeconds={timerSeconds}
            onSubmit={submitAssociation}
          />
        )}
        {gameState.phase === "drawing" && (
          <DrawingPhase
            state={gameState}
            timerSeconds={timerSeconds}
            myImage={myImage}
            imageLoading={imageLoading}
            imageFailed={imageFailed}
            onSubmitPrompt={submitPrompt}
            onReady={markReady}
          />
        )}
        {gameState.phase === "voting" && (
          <VotingPhase
            state={gameState}
            timerSeconds={timerSeconds}
            onVote={submitVote}
          />
        )}
        {gameState.phase === "reveal" && (
          <RevealPhase
            state={gameState}
            timerSeconds={timerSeconds}
            roundResult={roundResult}
          />
        )}
      </main>
    </div>
  );
}
