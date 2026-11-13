import { describe, expect, it } from "vitest";
import { dates } from "../../../src/content";
import { miniGameOutcomeIds } from "../../../src/minigames/tag";
import { chooseMiniGameOutcome, listPlayerActions } from "../../../src/domain/player-action";
import { cityStart, finishEpisode, startDateScene, withAp } from "../../../src/dev/scenario-builders";
import { advanceDate, chooseDate, finishDate, validateGameState, type GameState } from "../../../src/domain/game";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

/**
 * The Mehtab Bagh date's last ball (2026-11-13): a cricket mini-game instead of a choice. Its outcome takes the choice of
 * the same option ID, whose # profile: is the date's second mesh choice; no swing leads to one more ball whose choices are
 * in-scene (option IDs again_*), so a play has exactly one mesh resolution for the last ball. The outcome is taken as the
 * screen takes it (chooseMiniGameOutcome, docs/13 1.5).
 */
const DATE_ID = "gt_agra_date_mehtab_bagh";

/** Play the date: the first choice by index, then each mini-game by the given outcomes in turn (as the screen takes them). */
function play(outcomes: string[]): { state: GameState; games: string[][]; lines: string[]; autos: string[] } {
  const apCost = dates.find((date) => date.id === DATE_ID)!.apCost;
  let state = startDateScene(withAp(finishEpisode(cityStart("agra"), "gt_agra_main_taj_mahal"), apCost), DATE_ID, 4500);
  const games: string[][] = [];
  const autos: string[] = [];
  const lines: string[] = [];
  const left = [...outcomes];
  for (let step = 0; state.activeDate; step++) {
    expect(step).toBeLessThan(200);
    const frame = state.activeDate.frame;
    lines.push(frame.text);
    if (frame.ended) state = finishDate(state, state.revision);
    else if (frame.choices.length && frame.minigame) {
      games.push(frame.choices.map((choice) => choice.optionId ?? ""));
      autos.push(frame.minigame.auto);
      // The player's actions there are the game's outcomes, not the choices.
      expect(listPlayerActions(state)).toEqual(miniGameOutcomeIds("cricket_batting").map((outcome) => ({ kind: "minigame", outcome })));
      const next = chooseMiniGameOutcome(state, left.shift()!, state.revision);
      expect(next, "the outcome's choice").not.toBe(state);
      state = next;
    } else if (frame.choices.length) state = chooseDate(state, frame.choices[0].index, state.revision);
    else state = advanceDate(state, state.revision);
    state = validateGameState(state);
  }
  expect(left).toEqual([]);
  return { state, games, lines, autos };
}

describe("the Mehtab Bagh date's cricket mini-game", () => {
  it("plays the last ball as the mini-game on her line, with one choice per outcome and おまかせ's over_wall", () => {
    const { games, lines, state, autos } = play(["six"]);
    expect(autos).toEqual(["over_wall"]);
    expect(games).toEqual([miniGameOutcomeIds("cricket_batting")]);
    expect(lines).toContain("本気で投げるから。本気で打ってね");
    expect(state.playedDateIds).toContain(DATE_ID);
  });

  it("resolves the last ball's mesh once per play: each outcome, and no swing followed by one more ball", () => {
    for (const outcome of miniGameOutcomeIds("cricket_batting").filter((id) => id !== "no_swing")) {
      const { state } = play([outcome]);
      expect(state.activeDate).toBeNull();
    }
    for (const second of miniGameOutcomeIds("cricket_batting")) {
      const { games } = play(["no_swing", second]);
      expect(games[1]).toEqual(miniGameOutcomeIds("cricket_batting").map((id) => `again_${id}`));
    }
  });

  it("keeps one mesh resolution per play in the saved date: the replay draws no second ticket", () => {
    // Stop just before the date ends to read the resolved choices.
    const apCost = dates.find((date) => date.id === DATE_ID)!.apCost;
    let state = startDateScene(withAp(finishEpisode(cityStart("agra"), "gt_agra_main_taj_mahal"), apCost), DATE_ID, 4500);
    const outcomes = ["no_swing", "edge"];
    while (state.activeDate && !state.activeDate.frame.ended) {
      const frame = state.activeDate.frame;
      if (frame.minigame) {
        // The save point is the choice point: a reload comes back to the game's start (nothing new in the save).
        const values = new Map<string, string>();
        const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
        expect(saveGame(storage, state).ok).toBe(true);
        expect(loadGame(storage)).toEqual({ status: "loaded", state });
      }
      if (frame.choices.length && frame.minigame) state = chooseMiniGameOutcome(state, outcomes.shift()!, state.revision);
      else if (frame.choices.length) state = chooseDate(state, frame.choices[0].index, state.revision);
      else state = advanceDate(state, state.revision);
    }
    expect(outcomes).toEqual([]);
    const active = state.activeDate!;
    expect(active.choiceCount).toBe(2);
    expect(active.resolvedChoices.map((choice) => choice.optionId)).toEqual([expect.any(String), "no_swing"]);
  });
});
