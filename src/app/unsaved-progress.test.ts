// The unsaved-progress confirmation (AGENTS.md 「現在のバージョンで作成した有効なセーブは…正しく保存・
// 再開できる」, docs/07 acceptance 10): with manual saving, switching journeys, ロード and closing the
// page ask before discarding play that the last save does not hold.
import { describe, expect, it } from "vitest";
import { createGame, type GameState } from "../domain/game";
import { startCityArrival } from "../domain/epilogue";
import { beginTravelEvent } from "../domain/travel-game";
import { loadGame } from "../persistence";
import { journeyStorage } from "../persistence/journey-storage";
import { writeExplicitSave, writeNewGame, type SaveBaseline } from "./save-recovery";
import { hasUnsavedProgress, leaveStep } from "./unsaved-progress";

function memorySlot() {
  const data = new Map<string, string>();
  return journeyStorage({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  }, "milano");
}

function newGame(): GameState {
  const initial = createGame("航", "澪", { journeyId: "milano" });
  return startCityArrival(initial, initial.revision);
}

/** What each way of leaving does for this tab's game and last save. */
function leaving(current: GameState | null, savedGame: GameState | null) {
  const unsaved = hasUnsavedProgress(current, savedGame);
  return {
    switchJourney: leaveStep({ way: "switch_journey", from: "milano", to: "golden_triangle" }, unsaved),
    loadSave: leaveStep({ way: "load_save" }, unsaved),
    closePage: leaveStep({ way: "close_page", autoSave: false }, unsaved),
  };
}
const asks = { switchJourney: "ask", loadSave: "ask", closePage: "ask" };
const leaves = { switchJourney: "leave", loadSave: "leave", closePage: "leave" };

describe("unsaved progress", () => {
  it("is play the last save does not hold, compared by content", () => {
    const state = newGame();
    expect(hasUnsavedProgress(null, null)).toBe(false);
    expect(hasUnsavedProgress(null, state)).toBe(false);
    // A game started with manual saving and never saved.
    expect(hasUnsavedProgress(state, null)).toBe(true);
    // The same snapshot read back from storage (other objects, other property order).
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    const reordered = Object.fromEntries(Object.entries(copy).reverse()) as GameState;
    expect(hasUnsavedProgress(state, reordered)).toBe(false);
    expect(hasUnsavedProgress(state, { ...state, ap: state.ap + 1 })).toBe(true);
  });

  it("asks before switching journeys, ロード or closing the page, from the start of a manual-save game to the next セーブ", () => {
    const slot = memorySlot();
    const start = newGame();
    const started = writeNewGame(slot, start, loadGame(slot), false);
    if (!started.ok) throw new Error("start failed");
    let baseline: SaveBaseline = started.baseline;
    expect(leaving(start, baseline.savedGame)).toEqual(asks);

    const saved = writeExplicitSave(slot, start, baseline);
    if (!saved.ok) throw new Error("save failed");
    baseline = saved.baseline;
    expect(leaving(start, baseline.savedGame)).toEqual(leaves);

    // Walking to the Duomo after the save is unsaved play again.
    const walked = beginTravelEvent(start, "milano_duomo_episode", "walk", start.revision, () => 0);
    expect(walked).not.toBe(start);
    expect(leaving(walked, baseline.savedGame)).toEqual(asks);
    // After ロード the tab holds the saved game again.
    const restored = loadGame(slot);
    expect(restored.status).toBe("loaded");
    expect(leaving(restored.status === "loaded" ? restored.state : null, baseline.savedGame)).toEqual(leaves);
  });

  it("does nothing when the journey already shown is chosen again, even with unsaved play", () => {
    expect(leaveStep({ way: "switch_journey", from: "milano", to: "milano" }, true)).toBe("stay");
    expect(leaveStep({ way: "switch_journey", from: "milano", to: "milano" }, false)).toBe("stay");
  });

  it("closes the page without the browser's prompt while saving automatically", () => {
    expect(leaveStep({ way: "close_page", autoSave: true }, true)).toBe("leave");
    expect(leaveStep({ way: "close_page", autoSave: true }, false)).toBe("leave");
    expect(leaveStep({ way: "close_page", autoSave: false }, true)).toBe("ask");
  });

  it("leaves at once without a game (the title screen)", () => {
    expect(leaving(null, null)).toEqual(leaves);
  });
});
