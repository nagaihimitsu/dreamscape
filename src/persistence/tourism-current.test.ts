import { describe, expect, it } from "vitest";
import { landmarks, tourismClues } from "../content";
import { createGame } from "../domain/game";
import { discoverClue, openTourism, skipTourismGuide } from "../domain/tourism";
import { loadGame, SAVE_KEY, saveGame, type StorageLike } from "./index";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("tourism saves protect inconsistent input", () => {
  it.each([
    "unknown-clue",
    "duplicate-clue",
    "unvisited-clue",
    "unknown-landmark",
    "hash",
    "snapshot",
    "frame",
    "exploring-with-guide-frame",
    "unknown-version",
  ])("retains raw %s data without deleting or overwriting it", (kind) => {
    const landmark = landmarks.find((item) => item.id === "duomo_milano")!;
    let state = openTourism(createGame(), landmark.id);
    expect(state.activeTourism?.landmarkId).toBe(landmark.id);
    if (kind.includes("clue")) {
      state = skipTourismGuide(state, state.revision);
      const clue = tourismClues.find((item) => item.landmarkId === landmark.id)!;
      state = discoverClue(state, clue.id, state.revision);
    }
    const corrupted = {
      ...structuredClone(state),
      schemaVersion: Number(state.schemaVersion),
    };
    const active = corrupted.activeTourism!;
    if (kind === "unknown-clue") corrupted.discoveredClueIds = ["missing"];
    if (kind === "duplicate-clue")
      corrupted.discoveredClueIds.push(corrupted.discoveredClueIds[0]);
    if (kind === "unvisited-clue") corrupted.visitedLandmarkIds = [];
    if (kind === "unknown-landmark") active.landmarkId = "missing";
    if (kind === "hash") active.contentHash = "outdated";
    if (kind === "snapshot") active.storyState = "{}";
    if (kind === "frame") active.frame!.text = "保存されていない台詞";
    if (kind === "exploring-with-guide-frame") active.phase = "exploring";
    if (kind === "unknown-version") corrupted.schemaVersion = 99;
    const raw = JSON.stringify(corrupted);
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, raw);
    storage.setItem("another-game", "keep");
    expect(loadGame(storage)).toMatchObject({ status: "invalid", raw });
    expect(saveGame(storage, state).ok).toBe(false);
    expect(storage.getItem(SAVE_KEY)).toBe(raw);
    expect(storage.getItem("another-game")).toBe("keep");
  });
});
