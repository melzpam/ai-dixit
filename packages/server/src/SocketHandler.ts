import type { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@ai-dixit/shared";
import { GameManager } from "./GameManager.js";
import { ImageGenerator } from "./ImageGenerator.js";
import {
  checkSocketRateLimit,
  clearSocketRateLimit,
  sanitizeInput,
} from "./rateLimiter.js";

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocketHandler {
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private gameManager: GameManager;
  private imageGenerator: ImageGenerator;

  /** Map socketId → playerId */
  private socketPlayerMap = new Map<string, string>();
  /** Map playerId → socketId (for sending events to specific players) */
  private playerSocketMap = new Map<string, string>();

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    imageGenerator: ImageGenerator
  ) {
    this.io = io;
    this.imageGenerator = imageGenerator;

    // Game event callback — routes events from GameEngine to clients
    this.gameManager = new GameManager((event, playerId, data, roomId) => {
      if (playerId) {
        // Send to specific player
        const socketId = this.playerSocketMap.get(playerId);
        if (socketId) {
          this.io.to(socketId).emit(event as any, data as any);
        }
      } else {
        // Broadcast to all sockets in this room only
        this.io.to(roomId).emit(event as any, data as any);
      }
    });

    // Periodic cleanup of stale players
    setInterval(() => this.gameManager.cleanupStale(), 30_000);

    this.io.on("connection", (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: TypedSocket): void {
    console.log(
      JSON.stringify({ event: "socket_connected", socketId: socket.id })
    );

    socket.on("player:join", (data) => {
      if (!checkSocketRateLimit(socket.id)) {
        socket.emit("game:error", { message: "Too many requests" });
        return;
      }

      const nickname = sanitizeInput(data.nickname, 20);
      if (nickname.length === 0) {
        socket.emit("game:error", {
          message: "Please enter a nickname",
        });
        return;
      }

      // Use session ID as player ID for reconnection support
      const playerId =
        (socket.request as any).session?.id ?? socket.id;

      this.socketPlayerMap.set(socket.id, playerId);
      this.playerSocketMap.set(playerId, socket.id);

      const room = this.gameManager.joinPlayer(playerId, nickname);

      console.log(
        JSON.stringify({
          event: "player_joined",
          playerId,
          nickname,
          roomId: room.roomId,
          socketId: socket.id,
        })
      );

      // Join Socket.IO room for room-level broadcasting
      socket.join(room.roomId);

      // Send initial state
      const state = room.getStateForPlayer(playerId);
      socket.emit("game:state", state);
    });

    socket.on("game:submit-association", (data) => {
      if (!checkSocketRateLimit(socket.id)) return;

      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const room = this.gameManager.getRoomForPlayer(playerId);
      if (!room) return;

      const association = sanitizeInput(data.association, 100);
      if (association.length === 0) {
        socket.emit("game:error", {
          message: "Please enter an association word",
        });
        return;
      }

      const success = room.submitAssociation(playerId, association);
      if (!success) {
        socket.emit("game:error", {
          message: "Cannot submit association right now",
        });
      }
    });

    socket.on("game:submit-prompt", async (data) => {
      if (!checkSocketRateLimit(socket.id)) return;

      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const room = this.gameManager.getRoomForPlayer(playerId);
      if (!room) return;

      const prompt = sanitizeInput(data.prompt, 500);
      if (prompt.length === 0) {
        socket.emit("game:error", { message: "Please enter a prompt" });
        return;
      }

      const canGenerate = room.submitPrompt(playerId, prompt);
      if (!canGenerate) {
        socket.emit("game:error", {
          message: "Cannot generate image right now",
        });
        return;
      }

      // Generate image asynchronously
      try {
        const imageBase64 = await this.imageGenerator.generate(prompt);
        room.setCard(playerId, imageBase64, prompt);

        if (imageBase64) {
          socket.emit("game:image-generated", { imageBase64, prompt });
        } else {
          socket.emit("game:image-failed", {
            prompt,
            reason: "Image generation failed — text card will be used",
          });
        }
      } catch (err) {
        console.error(
          JSON.stringify({
            event: "image_generation_error",
            playerId,
            error: String(err),
          })
        );
        room.setCard(playerId, null, prompt);
        socket.emit("game:image-failed", {
          prompt,
          reason: "Image generation failed — text card will be used",
        });
      }
    });

    socket.on("game:card-ready", () => {
      if (!checkSocketRateLimit(socket.id)) return;

      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const room = this.gameManager.getRoomForPlayer(playerId);
      if (!room) return;

      room.markReady(playerId);
    });

    socket.on("game:vote", (data) => {
      if (!checkSocketRateLimit(socket.id)) return;

      const playerId = this.socketPlayerMap.get(socket.id);
      if (!playerId) return;

      const room = this.gameManager.getRoomForPlayer(playerId);
      if (!room) return;

      const result = room.submitVote(playerId, data.cardId);
      if (!result.success && result.error) {
        socket.emit("game:error", { message: result.error });
      }
    });

    socket.on("disconnect", () => {
      const playerId = this.socketPlayerMap.get(socket.id);
      if (playerId) {
        this.gameManager.disconnectPlayer(playerId);
        this.socketPlayerMap.delete(socket.id);
        // Note: playerSocketMap is cleaned when player is fully removed
        // (stale player cleanup), not on temporary disconnect (for reconnection)
      }
      clearSocketRateLimit(socket.id);

      console.log(
        JSON.stringify({
          event: "socket_disconnected",
          socketId: socket.id,
          playerId,
        })
      );
    });
  }

  /** Get admin stats */
  getStats() {
    return {
      ...this.gameManager.getStats(),
      connectedSockets: this.io.engine?.clientsCount ?? 0,
      imageGenerator: {
        todayGenerations: this.imageGenerator.todayGenerations,
        isCapReached: this.imageGenerator.isCapReached,
      },
    };
  }
}
