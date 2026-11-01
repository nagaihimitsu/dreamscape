import { describe, expect, it } from "vitest";
import oldFreeTime from "../../tests/fixtures/castle-clear-unplayed.json";
import publishedSaves from "../../tests/fixtures/fa0e7e0-v10-mid-scene.json";
import { dates } from "../content";
import {
  activeDateStoryId, advanceDate, chooseDate, finishDate, getDateAvailability,
  isEventVisible, startDate, validateGameState, type GameState,
} from "./game";

const oldId = "milano_love_date_01";
const newId = "milano_novecento_date_01";
const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
const seed = () => validateGameState(JSON.parse(JSON.stringify(oldFreeTime)));

function nextChoiceOrEnd(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && state.activeDate && !state.activeDate.frame.ended && !state.activeDate.frame.choices.length; i++)
    state = advanceDate(state, state.revision);
  expect(state.activeDate?.frame.ended || state.activeDate?.frame.choices.length).toBeTruthy();
  return state;
}


describe("Milan date rewrite compatibility", () => {
  it("does not list or start the retired LOVE date for an unplayed old save", () => {
    const state = seed();
    expect(state.playedDateIds).not.toContain(oldId);
    expect(isEventVisible(state, oldId)).toBe(false);
    expect(dates.filter((entry) => isEventVisible(state, entry.id)).map((entry) => entry.id)).not.toContain(oldId);
    expect(getDateAvailability(state, oldId).available).toBe(false);
    expect(startDate(state, oldId)).toBe(state);
    expect(state.ap).toBe(seed().ap);
  });

  it("starts the Novecento date independently without requiring the old LOVE date", () => {
    const state = seed();
    expect(state.playedDateIds).toEqual([]);
    const definition = dates.find((entry) => entry.id === newId)!;
    expect(definition.requiredPlayedDateIds).toEqual([]);
    expect(isEventVisible(state, newId)).toBe(true);
    expect(getDateAvailability(state, newId).available).toBe(true);
    const started = startDate(state, newId, () => 0);
    expect(started.activeDate?.dateId).toBe(newId);
    expect(started.ap).toBe(state.ap - definition.apCost);
    expect(restore(started)).toEqual(started);
    let completed = started;
    for (let i = 0; i < 100 && completed.activeDate; i++) {
      const active = completed.activeDate;
      if (active.frame.ended) completed = finishDate(completed, completed.revision);
      else if (active.frame.choices.length) completed = chooseDate(completed, 0, completed.revision);
      else completed = advanceDate(completed, completed.revision);
    }
    expect(completed.activeDate).toBeNull();
    expect(completed.playedDateIds).toContain(newId);
    expect(completed.playedDateIds).not.toContain(oldId);
    expect(completed.memories.filter((memory) => memory.startsWith("milano_novecento_"))).toHaveLength(2);
    expect(restore(completed)).toEqual(completed);
  });

  it("resumes and completes an in-progress LOVE date after retirement without charging AP twice", () => {
    const saved = validateGameState(JSON.parse(JSON.stringify(publishedSaves.love)));
    const definition = dates.find((entry) => entry.id === oldId)!;
    expect(definition.legacyOnly).toBe(true);
    let state = restore(saved);
    const ap = state.ap;
    expect(activeDateStoryId(definition, state.activeDate!)).toBe(definition.storyId);
    state = nextChoiceOrEnd(state);
    state = chooseDate(state, 0, state.revision);
    expect(state.activeDate?.choiceCount).toBe(1);
    state = restore(state);
    expect(state.ap).toBe(ap);
    state = nextChoiceOrEnd(state);
    state = chooseDate(state, 1, state.revision);
    state = nextChoiceOrEnd(state);
    expect(state.activeDate?.frame.ended).toBe(true);
    state = finishDate(state, state.revision);
    expect(state.activeDate).toBeNull();
    expect(state.playedDateIds.filter((id) => id === oldId)).toHaveLength(1);
    expect(state.memories.filter((id) => id.startsWith("milano_love_"))).toHaveLength(2);
    expect(state.ap).toBe(ap);
    expect(restore(state)).toEqual(state);
    expect(isEventVisible(state, oldId)).toBe(false);
    expect(getDateAvailability(state, newId).available).toBe(true);
  });

  it("keeps old completed LOVE history and memories without treating Novecento as played", () => {
    const original = seed();
    const oldHistory = { ...original, playedDateIds: [oldId], memories: ["milano_love_first_a", "milano_love_second_b"] };
    const restored = restore(oldHistory);
    expect(restored.playedDateIds).toEqual([oldId]);
    expect(restored.memories).toEqual(oldHistory.memories);
    expect(restored.claimedRewardIds).toEqual(original.claimedRewardIds);
    expect(restored.ap).toBe(original.ap);
    expect(restored.playedDateIds).not.toContain(newId);
    expect(isEventVisible(restored, oldId)).toBe(false);
    expect(getDateAvailability(restored, newId).available).toBe(true);
    expect(startDate(restored, newId, () => 0).activeDate?.dateId).toBe(newId);
  });
});
