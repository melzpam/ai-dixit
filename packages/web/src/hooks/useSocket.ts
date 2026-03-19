"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerGameView,
  RoundResult,
} from "@ai-dixit/shared";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000";

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<PlayerGameView | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [myImage, setMyImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState<string | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const socket: TypedSocket = io(SERVER_URL, {
      withCredentials: true,
      transports: ["polling", "websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("game:state", (state) => {
      setGameState(state);
      setTimerSeconds(state.timerSeconds);
      // Reset round-specific state on phase change
      if (state.phase === "association" || state.phase === "waiting") {
        setMyImage(null);
        setImageLoading(false);
        setImageFailed(null);
        setRoundResult(null);
      }
      if (state.myCard?.imageBase64) {
        setMyImage(state.myCard.imageBase64);
      }
    });

    socket.on("game:timer", (data) => {
      setTimerSeconds(data.seconds);
    });

    socket.on("game:image-generated", (data) => {
      setMyImage(data.imageBase64);
      setImageLoading(false);
    });

    socket.on("game:image-failed", (data) => {
      setImageFailed(data.reason);
      setImageLoading(false);
    });

    socket.on("game:round-result", (result) => {
      setRoundResult(result);
    });

    socket.on("game:error", (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on("game:message", (data) => {
      setMessage(data.message);
      setTimeout(() => setMessage(null), 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinGame = useCallback((nickname: string) => {
    socketRef.current?.emit("player:join", { nickname });
  }, []);

  const submitAssociation = useCallback((association: string) => {
    socketRef.current?.emit("game:submit-association", { association });
  }, []);

  const submitPrompt = useCallback((prompt: string) => {
    setImageLoading(true);
    setImageFailed(null);
    socketRef.current?.emit("game:submit-prompt", { prompt });
  }, []);

  const markReady = useCallback(() => {
    socketRef.current?.emit("game:card-ready");
  }, []);

  const submitVote = useCallback((cardId: string) => {
    socketRef.current?.emit("game:vote", { cardId });
  }, []);

  return {
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
  };
}
