import { randomUUID } from "node:crypto";
import { MAX_PLAYERS_PER_ROOM } from "@ai-dixit/shared";
import { GameEngine, type GameEventCallback } from "./GameEngine.js";

/**
 * GameManager — the lobby. Routes players to GameEngine instances.
 *
 *   Player arrives → find room with space → join
 *                  → no room with space → create new room → join
 */
export type RoomEventCallback = (
  event: string,
  playerId: string | null,
  data: unknown,
  roomId: string
) => void;

export class GameManager {
  private rooms = new Map<string, GameEngine>();
  private playerRooms = new Map<string, string>(); // playerId → roomId
  private onEvent: RoomEventCallback;

  constructor(onEvent: RoomEventCallback) {
    this.onEvent = onEvent;
  }

  /** Find or create a room for the player */
  joinPlayer(playerId: string, nickname: string): GameEngine {
    // Check if player is already in a room (reconnection)
    const existingRoomId = this.playerRooms.get(playerId);
    if (existingRoomId) {
      const room = this.rooms.get(existingRoomId);
      if (room && room.hasPlayer(playerId)) {
        room.reconnectPlayer(playerId);
        return room;
      }
    }

    // Find a room with space
    let room: GameEngine | undefined;
    for (const r of this.rooms.values()) {
      if (!r.isFull) {
        room = r;
        break;
      }
    }

    // Create new room if needed
    if (!room) {
      const roomId = randomUUID().slice(0, 8);
      // Create room-scoped callback so events include roomId
      const roomCallback: GameEventCallback = (event, playerId, data) => {
        this.onEvent(event, playerId, data, roomId);
      };
      room = new GameEngine(roomId, roomCallback);
      this.rooms.set(roomId, room);
      console.log(
        JSON.stringify({
          event: "room_created",
          roomId,
          totalRooms: this.rooms.size,
        })
      );
    }

    room.addPlayer(playerId, nickname);
    this.playerRooms.set(playerId, room.roomId);

    return room;
  }

  disconnectPlayer(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    room.disconnectPlayer(playerId);
  }

  removePlayer(playerId: string): void {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(playerId);
      if (room.isEmpty) {
        room.destroy();
        this.rooms.delete(roomId);
        console.log(
          JSON.stringify({
            event: "room_destroyed",
            roomId,
            totalRooms: this.rooms.size,
          })
        );
      }
    }

    this.playerRooms.delete(playerId);
  }

  getRoomForPlayer(playerId: string): GameEngine | undefined {
    const roomId = this.playerRooms.get(playerId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /** Get admin stats for all rooms */
  getStats(): {
    totalRooms: number;
    totalPlayers: number;
    rooms: Array<{
      roomId: string;
      phase: string;
      playerCount: number;
      round: number;
    }>;
  } {
    const rooms = Array.from(this.rooms.values()).map((r) => r.getStats());
    return {
      totalRooms: this.rooms.size,
      totalPlayers: this.playerRooms.size,
      rooms,
    };
  }

  /** Periodic cleanup of stale disconnected players */
  cleanupStale(): void {
    for (const room of this.rooms.values()) {
      room.cleanupDisconnected();
      if (room.isEmpty) {
        room.destroy();
        this.rooms.delete(room.roomId);
      }
    }
  }
}
