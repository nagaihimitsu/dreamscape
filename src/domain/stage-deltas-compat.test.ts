import { describe, expect, it } from "vitest";
import { effects } from "../content";
import { createDebugState, type DebugSettings } from "../dev/debug-state";
import { advanceDate, chooseDate, validateGameState, type GameState } from "./game";

const seed: DebugSettings = { scene: "date", id: "milano_novecento_date_01", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" };

function untilChoice(initial: GameState): GameState {
  let state = initial;
  for (let n = 0; n < 100 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; n++)
    state = advanceDate(state, state.revision);
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  return state;
}

describe("current date effect application", () => {
  it.each([
    [1, 0, "positive"], [1, 9999, "negative"],
    [4, 0, "positive"], [4, 9999, "negative"],
  ] as const)("applies only saved random deltas at stage %i and roll %i", (stage, roll, outcome) => {
    const currentId = "common_date_first_bold";
    expect(effects.find((item) => item.id === currentId)?.responseProfileId).toBe("bold");
    const ready = untilChoice(createDebugState({ ...seed, roll: roll === 0 ? "positive" : "negative", affection: stage === 1 ? 0 : 10, trust: stage === 1 ? 0 : 10, spark: stage === 1 ? 0 : 10 }));
    // Stage is independent of the current relationship values; use a valid
    // v11 state to confirm the saved random result isn't applied twice.
    const prepared = stage === 1 ? ready : validateGameState({ ...ready, romanceStage: 4 });
    const after = chooseDate(prepared, 2, prepared.revision);
    const resolved = after.activeDate!.resolvedChoices[0];
    expect(resolved.effectId).toBe(currentId);
    expect(resolved.result).toBe(outcome);
    expect(after.affection - prepared.affection).toBe(resolved.deltas.affection);
    expect(after.trust - prepared.trust).toBe(resolved.deltas.trust);
    expect(after.spark - prepared.spark).toBe(resolved.deltas.spark);
    expect(after.activeDate!.appliedEffectIds.filter((id) => id.endsWith(`:${currentId}`))).toHaveLength(1);
    expect(after.memories).toEqual(prepared.memories);
    expect(chooseDate(after, 2, prepared.revision)).toBe(after);
    expect(validateGameState(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });
});
