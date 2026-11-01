import { describe, expect, it } from "vitest";
import { Story } from "inkjs";
import fixture from "../../tests/fixtures/castle-clear-unplayed.json";
import { dates, stories } from "../content";
import { advanceDate, chooseDate, startDate, validateGameState, type GameState } from "./game";
import { deriveRelationshipTone } from "./romance-tone";

function storyVariables(state: GameState) {
  const active = state.activeDate!;
  const date = dates.find((item) => item.id === active.dateId)!;
  const story = new Story(stories[date.storyId]);
  story.state.LoadJson(active.storyState);
  return story.variablesState;
}
function nextChoice(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && state.activeDate && !state.activeDate.frame.choices.length; i++) {
    expect(state.activeDate.frame.ended).toBe(false);
    state = advanceDate(state, state.revision);
  }
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  return state;
}

describe("relationship tone in an active date", () => {
  it("starts with current values, updates after the first choice and survives reload through the second", () => {
    const initial = { ...validateGameState(fixture), affection: 0, trust: 0, spark: 2 };
    expect(deriveRelationshipTone(initial)).toBe("reserved");
    let state = startDate(initial, "milano_love_date_01", () => 0);
    expect(state.activeDate).not.toBeNull();
    expect(storyVariables(state).$("relationship_tone")).toBe("reserved");
    state = nextChoice(state);
    state = chooseDate(state, 0, state.revision);
    expect(deriveRelationshipTone(state)).toBe("guarded_attraction");
    expect(storyVariables(state).$("relationship_tone_before")).toBe("reserved");
    expect(storyVariables(state).$("relationship_tone_after")).toBe("guarded_attraction");
    expect(storyVariables(state).$("relationship_tone")).toBe("guarded_attraction");
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(deriveRelationshipTone(state)).toBe("guarded_attraction");
    state = nextChoice(state);
    expect(storyVariables(state).$("relationship_tone")).toBe("guarded_attraction");
    state = chooseDate(state, 0, state.revision);
    expect(storyVariables(state).$("relationship_tone_before")).toBe("guarded_attraction");
    expect(storyVariables(state).$("relationship_tone_after")).toBe(deriveRelationshipTone(state));
    expect(validateGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rederives a previously saved tone from relationship values without rejecting the Ink snapshot", () => {
    const state = startDate(validateGameState(fixture), "milano_love_date_01", () => 0);
    const active = state.activeDate!;
    const date = dates.find((item) => item.id === active.dateId)!;
    const story = new Story(stories[date.storyId]);
    story.state.LoadJson(active.storyState);
    // Simulate a future change to tone thresholds: the already displayed frame
    // and story fingerprint remain valid even if the old derived tone differs.
    story.variablesState.$("relationship_tone", "romantic_tension");
    const saved = { ...state, activeDate: { ...active, storyState: story.state.ToJson() } };
    const restored = validateGameState(saved);
    expect(restored.activeDate?.frame).toEqual(active.frame);
    const next = advanceDate(restored, restored.revision);
    expect(storyVariables(next).$("relationship_tone")).toBe(deriveRelationshipTone(next));
    expect(storyVariables(next).$("relationship_tone_after")).toBe(deriveRelationshipTone(next));
  });
});
