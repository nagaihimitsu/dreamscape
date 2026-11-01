import { describe, expect, it } from "vitest";
import fixture from "../../tests/fixtures/castle-clear-unplayed.json";
import { dates } from "../content";
import {
  advanceDate, canConfessSuccessfully, chooseDate, confessionResult, evaluateProgression,
  finishDate, getDateAvailability, isEventVisible, startDate, validateGameState, type GameState,
} from "./game";

const initial = () => validateGameState(JSON.parse(JSON.stringify(fixture)));
function nextChoice(state: GameState): GameState {
  for (let i = 0; state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended && i < 80; i++)
    state = advanceDate(state, state.revision);
  return state;
}
function play(state: GameState, id: string, choices: number[], seen: string[] = []): GameState {
  state = startDate(state, id, stableRolls());
  expect(state.activeDate?.dateId).toBe(id);
  for (const choice of choices) {
    for (let i = 0; state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended && i < 80; i++) {
      seen.push(state.activeDate.frame.text);
      state = advanceDate(state, state.revision);
    }
    const revision = state.revision;
    state = chooseDate(state, choice, revision);
    expect(chooseDate(state, choice, revision)).toBe(state);
    state = validateGameState(JSON.parse(JSON.stringify(state)));
  }
  state = nextChoice(state);
  expect(state.activeDate?.frame.ended).toBe(true);
  return finishDate(state, state.revision);
}

describe("open romance progression", () => {
  it("offers several independent destinations without the old cafe path", () => {
    const state = initial();
    for (const id of ["milano_la_scala_date_01", "milano_brera_date_01", "milano_navigli_date_01", "milano_love_date_01"]) {
      expect(isEventVisible(state, id)).toBe(true);
      expect(getDateAvailability(state, id).available).toBe(true);
      expect(dates.find((date) => date.id === id)?.requiredPlayedDateIds).toEqual([]);
    }
    expect(state.playedDateIds).not.toContain("milano_cafe_01");
  });

  it("applies negative affection and trust, restores them, and keeps other dates available", () => {
    let state = startDate(initial(), "milano_love_date_01", negativeRolls());
    state = nextChoice(state);
    state = chooseDate(state, 1, state.revision);
    expect(state.affection).toBe(-1);
    expect(state.trust).toBe(-1);
    expect(state.spark).toBe(0);
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    state = nextChoice(state);
    state = chooseDate(state, 2, state.revision);
    state = nextChoice(state);
    state = finishDate(state, state.revision);
    expect(getDateAvailability(state, "milano_brera_date_01").available).toBe(true);
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("does not invent a cafe visit when another memory exists", () => {
    let state = play(initial(), "milano_brera_date_01", [0, 0]);
    const seen: string[] = [];
    state = play(state, "milano_navigli_date_01", [0, 0], seen);
    expect(seen.join("\n")).not.toContain("前にも運河の近くで話しましたね");
    expect(state.memories.some((id) => id.startsWith("milano_cafe_"))).toBe(false);
  });

  it("advances by the relationship and experience rather than particular event IDs, and never lowers a stage", () => {
    const state = { ...initial(), affection: 10, trust: 5, spark: 5,
      playedDateIds: ["milano_love_date_01", "milano_brera_date_01", "milano_la_scala_date_01"] };
    const advanced = evaluateProgression(state);
    expect(advanced.romanceStage).toBe(4);
    expect(evaluateProgression({ ...advanced, affection: -5, trust: -5, spark: -5 }).romanceStage).toBe(4);
  });

  it.each([
    ["rejected", 20, -2, 10, ["milano_love_date_01"]],
    ["deferred", 4, 2, 0, ["milano_love_date_01", "milano_la_scala_date_01"]],
    ["accepted", 8, 4, 4, ["milano_love_date_01", "milano_la_scala_date_01", "milano_brera_date_01"]],
  ] as const)("actually records %s instead of using affection alone", (outcome, affection, trust, spark, playedDateIds) => {
    const state = { ...initial(), romanceStage: 2 as const, affection, trust, spark, playedDateIds: [...playedDateIds] };
    expect(confessionResult(state)).toBe(outcome);
    expect(canConfessSuccessfully(state)).toBe(outcome === "accepted");
    const result = play(state, "milano_confession_01", [0]);
    expect(result.confessionStatus).toBe(outcome);
    expect(result.endingReached).toBe(outcome === "accepted");
    expect(validateGameState(JSON.parse(JSON.stringify(result)))).toEqual(result);
  });

  it("requires a new shared date after rejection, while travel and other dates remain available", () => {
    const seed = { ...initial(), romanceStage: 2 as const, affection: 0, trust: 0, spark: 0,
      playedDateIds: ["milano_love_date_01"] };
    let state = play(seed, "milano_confession_01", [0]);
    expect(state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(state, "milano_confession_01").available).toBe(false);
    expect(startDate(state, "milano_confession_01")).toBe(state);
    expect(getDateAvailability(state, "milano_navigli_date_01").available).toBe(true);
    state = play(state, "milano_navigli_date_01", [0, 2]);
    expect(state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(state, "milano_confession_01").available).toBe(true);
  });
});

/** Reproducible positive outcomes with varied delta tickets for these progression tests. */
function stableRolls() {
  let index = 0;
  const tickets = [0, 5000, 5000, 0];
  return () => tickets[index++ % tickets.length];
}

/** Force a failed response and the lower end of each delta range. */
function negativeRolls() {
  let index = 0;
  const tickets = [9999, 0, 0, 0];
  return () => tickets[index++ % tickets.length];
}
