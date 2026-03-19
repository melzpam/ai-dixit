import { describe, it, expect } from "vitest";
import { GameManager } from "./GameManager.js";
import type { GameEventCallback } from "./GameEngine.js";

function createManager(): GameManager {
  const onEvent: GameEventCallback = () => {};
  return new GameManager(onEvent);
}

describe("GameManager", () => {
  it("creates a room for the first player", () => {
    const manager = createManager();
    const room = manager.joinPlayer("p1", "Alice");

    expect(room).toBeDefined();
    expect(room.playerCount).toBe(1);
    expect(manager.getStats().totalRooms).toBe(1);
  });

  it("routes second player to existing room", () => {
    const manager = createManager();
    const room1 = manager.joinPlayer("p1", "Alice");
    const room2 = manager.joinPlayer("p2", "Bob");

    expect(room1.roomId).toBe(room2.roomId);
    expect(room1.playerCount).toBe(2);
    expect(manager.getStats().totalRooms).toBe(1);
  });

  it("creates new room when first room is full (10 players)", () => {
    const manager = createManager();

    // Fill first room
    for (let i = 0; i < 10; i++) {
      manager.joinPlayer(`p${i}`, `Player${i}`);
    }

    expect(manager.getStats().totalRooms).toBe(1);

    // 11th player creates a new room
    const newRoom = manager.joinPlayer("p10", "Overflow");
    expect(manager.getStats().totalRooms).toBe(2);
    expect(newRoom.playerCount).toBe(1);
  });

  it("reconnects player to their existing room", () => {
    const manager = createManager();
    manager.joinPlayer("p1", "Alice");
    manager.joinPlayer("p2", "Bob");
    manager.disconnectPlayer("p1");

    const room = manager.joinPlayer("p1", "Alice");
    expect(room.playerCount).toBe(2);
    expect(manager.getStats().totalRooms).toBe(1);
  });

  it("destroys empty room when last player is removed", () => {
    const manager = createManager();
    manager.joinPlayer("p1", "Alice");

    expect(manager.getStats().totalRooms).toBe(1);

    manager.removePlayer("p1");
    expect(manager.getStats().totalRooms).toBe(0);
  });
});
