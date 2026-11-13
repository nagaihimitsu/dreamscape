import { describe, expect, it } from "vitest";
import { dates, scenes } from "../../../src/content";
import { cityStart, finishEpisode, startDateScene, withAp } from "../../../src/dev/scenario-builders";
import { usableMoney } from "../../../src/domain/reservations";
import { openMiniGame } from "../../../src/domain/minigame";
import { chooseMiniGameOutcome, listPlayerActions, miniGameAvailableOutcomes } from "../../../src/domain/player-action";
import { advanceDate, chooseDate, finishDate, validateGameState, type GameState } from "../../../src/domain/game";
import { availableOutcome } from "../../../src/minigames/fallback";
import { rajuHaggle } from "../../../src/minigames/raju_haggle/definition";
import { RAJU_PRICES, type RajuHaggleOutcome } from "../../../src/minigames/raju_haggle/rules";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

/**
 * Raju's map at Jaigarh (2026-11-13): a haggle mini-game in the date's helper knot. The price the player takes is what
 * they pay (each outcome's choice pays the price the game shows), once; a price the player cannot pay falls back to the
 * next lower one, then to no deal (docs/13 4.2); a save at the choice point plays the game again.
 */
const DATE_ID = "gt_jaipur_date_jaigarh_fort";
const SCENE = scenes.find((scene) => scene.id === DATE_ID)!;
const OUTCOMES = rajuHaggle.outcomes.map((outcome) => outcome.id) as RajuHaggleOutcome[];

function memoryStorage(): StorageLike {
  const values = new Map<string, string>();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
}

/** The date opened, read up to the haggle (the line before it is Raju's price). */
function atHaggle(): GameState {
  const apCost = dates.find((date) => date.id === DATE_ID)!.apCost;
  let state = startDateScene(withAp(finishEpisode(cityStart("jaipur"), "gt_jaipur_main_amber_fort"), apCost), DATE_ID, 4500);
  for (let step = 0; !openMiniGame(state); step++) {
    expect(step).toBeLessThan(40);
    state = validateGameState(advanceDate(state, state.revision));
  }
  return state;
}
/** The same state with the money to spend set (the rest kept back as before). */
const withUsable = (state: GameState, money: number): GameState => ({ ...state, travelBudget: state.travelBudget - usableMoney(state) + money });

/** Play on from the haggle to the date's end, taking the first open choice at each later choice point. */
function finish(state: GameState): GameState {
  for (let step = 0; state.activeDate; step++) {
    expect(step).toBeLessThan(200);
    const frame = state.activeDate.frame;
    if (frame.ended) state = finishDate(state, state.revision);
    else if (frame.choices.length) state = chooseDate(state, frame.choices[0].index, state.revision);
    else state = advanceDate(state, state.revision);
    state = validateGameState(state);
  }
  return state;
}

describe("Raju's haggle at Jaigarh", () => {
  it("plays on Raju's price line, おまかせ's fair deal, with one choice per outcome", () => {
    const state = atHaggle();
    const game = openMiniGame(state)!;
    expect(game.tag).toEqual({ id: "raju_haggle", auto: "fair_map" });
    expect(state.activeDate!.frame.text).toContain("五十ルピー");
    expect(game.choices.map((choice) => choice.optionId)).toEqual(OUTCOMES);
    expect(listPlayerActions(state)).toEqual(OUTCOMES.map((outcome) => ({ kind: "minigame", outcome })));
  });

  it("pays the price the game shows for each deal, and nothing for no deal", () => {
    for (const outcome of OUTCOMES) expect(0 - (SCENE.options.find((option) => option.id === outcome)!.money ?? 0), outcome).toBe(RAJU_PRICES[outcome] ?? 0);
  });

  it("takes each outcome once: the money paid once, no deal guided by Raju, and the date goes on to its end", () => {
    for (const outcome of OUTCOMES) {
      const start = atHaggle();
      const taken = chooseMiniGameOutcome(start, outcome, start.revision);
      expect(taken, outcome).not.toBe(start);
      expect(start.travelBudget - taken.travelBudget, outcome).toBe(RAJU_PRICES[outcome] ?? 0);
      // A second take with the same revision changes nothing (no double payment).
      expect(chooseMiniGameOutcome(taken, outcome, start.revision)).toBe(taken);
      expect(taken.storyProgress.flags.includes("gt_jaipur_raju_guided"), outcome).toBe(outcome === "decline_map");
      const end = finish(taken);
      expect(end.playedDateIds).toContain(DATE_ID);
      expect(end.travelBudget).toBeGreaterThanOrEqual(0);
    }
  });

  it("greys a price the player cannot pay: the play falls back to the next lower one, then to no deal, never below zero", () => {
    const cases: [number, RajuHaggleOutcome[]][] = [
      [49, ["fair_map", "haggle_map", "decline_map"]],
      [39, ["haggle_map", "decline_map"]],
      [29, ["decline_map"]],
      [0, ["decline_map"]],
    ];
    for (const [money, available] of cases) {
      const state = withUsable(atHaggle(), money);
      expect(miniGameAvailableOutcomes(state), `₹${money}`).toEqual(available);
      for (const outcome of OUTCOMES) {
        const fallback = availableOutcome(rajuHaggle, outcome, available) as RajuHaggleOutcome;
        expect(available, `₹${money} ${outcome}`).toContain(fallback);
        // The outcome itself cannot be taken when greyed (the host takes the fallback instead); the fallback pays what it shows.
        if (!available.includes(outcome)) expect(chooseMiniGameOutcome(state, outcome, state.revision), `₹${money} ${outcome}`).toBe(state);
        const taken = chooseMiniGameOutcome(state, fallback, state.revision);
        expect(state.travelBudget - taken.travelBudget, `₹${money} ${outcome} → ${fallback}`).toBe(RAJU_PRICES[fallback] ?? 0);
        expect(usableMoney(taken), `₹${money} ${outcome}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("saves at the choice point and plays the game again on loading, with nothing new in the save", () => {
    const state = withUsable(atHaggle(), 45);
    const storage = memoryStorage();
    expect(saveGame(storage, state).ok).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded).toEqual({ status: "loaded", state });
    if (loaded.status !== "loaded") return;
    expect(openMiniGame(loaded.state)?.tag.id).toBe("raju_haggle");
    expect(miniGameAvailableOutcomes(loaded.state)).toEqual(["fair_map", "haggle_map", "decline_map"]);
    expect(JSON.stringify(loaded.state.activeDate!.frame.minigame)).toBe(JSON.stringify({ id: "raju_haggle", auto: "fair_map" }));
  });
});
