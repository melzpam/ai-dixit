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
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <h1 className="text-6xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">
              AI Dixit
            </h1>
            <p className="mt-4 text-lg text-white/60">
              Create AI art cards and outsmart your friends
            </p>
          </div>

          <div className="space-y-4">
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
              className="w-full bg-white/10 rounded-xl px-6 py-4 text-xl text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-purple-400 text-center"
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
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:bg-white/10 disabled:text-white/30 rounded-xl font-bold text-xl transition-colors shadow-lg shadow-purple-600/20"
            >
              {connected ? "Play" : "Connecting..."}
            </button>
          </div>

          <p className="text-xs text-white/30">
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
