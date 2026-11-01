import { describe, expect, it } from "vitest";
import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import { effects } from "../content";
import { beginStory, storyFingerprint } from "../story/runtime";
import { advanceDate, chooseDate, createGame, finishDate, startDate, validateGameState, type GameState } from "./game";

const dateId = "milano_cafe_01";
const oldStoryId = "milano/cafe_tourism_01";
const effectId = "milano_cafe_first_flirt";

function baseState(stage: 1 | 4): GameState {
  const base = seedLegacyChapter(createGame());
  return stage === 1 ? base : { ...base, romanceStage: 4, affection: 10, trust: 10, spark: 10 };
}

function untilChoice(state: GameState): GameState {
  for (let n = 0; n < 100 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; n++)
    state = advanceDate(state, state.revision);
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  return state;
}

function finish(state: GameState): GameState {
  for (let n = 0; n < 100 && state.activeDate; n++) {
    if (state.activeDate.frame.ended) state = finishDate(state, state.revision);
    else if (state.activeDate.frame.choices.length) state = chooseDate(state, 0, state.revision);
    else state = advanceDate(state, state.revision);
  }
  expect(state.activeDate).toBeNull();
  return state;
}

/** Construct an authentic v8-shaped in-progress snapshot using the retained
 * published Ink and fingerprint, then let the real migration parse it. */
function oldV8Date(stage: 1 | 4): GameState {
  const base = baseState(stage);
  const started = startDate(base, dateId, () => 0);
  const step = beginStory(oldStoryId, base.playerName, base.heroineName);
  const { resolutionMode: _mode, randomPlan: _rolls, resolvedChoices: _resolved,
    responseSnapshot: _snapshot, ...v8Active } = started.activeDate!;
  const { recoveryAfterRejection: _recovery, completedRecoveryCount: _count,
    travelBudget: _budget, inventory: _inventory, completedEncounterIds: _encounters,
    encounterRewards: _encounterRewards, activeEncounter: _activeEncounter,
    activeDate: _active, ...v8State } = started;
  return validateGameState({
    ...v8State, schemaVersion: 8,
    activeDate: { ...v8Active, storyState: step.storyState, storyHash: storyFingerprint(oldStoryId), frame: step.frame },
  });
}

describe("stage delta compatibility at the same bold choice", () => {
  const effect = effects.find((item) => item.id === effectId)!;

  it.each([
    [1, 0, "positive"], [1, 9999, "negative"],
    [4, 0, "positive"], [4, 9999, "negative"],
  ] as const)("applies only the saved random deltas at stage %i and roll %i", (stage, roll, outcome) => {
    expect(effect.responseProfileId).toBe("bold");
    expect(effect.stageDeltas?.["4"]).toBeDefined();
    const ready = untilChoice(startDate(baseState(stage), dateId, () => roll));
    const after = chooseDate(ready, 1, ready.revision);
    const resolved = after.activeDate!.resolvedChoices[0];
    expect(resolved.effectId).toBe(effectId);
    expect(resolved.result).toBe(outcome);
    expect(after.affection - ready.affection).toBe(resolved.deltas.affection);
    expect(after.trust - ready.trust).toBe(resolved.deltas.trust);
    expect(after.spark - ready.spark).toBe(resolved.deltas.spark);
    expect(after.activeDate!.appliedEffectIds.filter((id) => id.endsWith(`:${effectId}`))).toHaveLength(1);
    expect(after.memories.filter((id) => id === effect.memoryId)).toHaveLength(1);
    expect(chooseDate(after, 1, ready.revision)).toBe(after);
    expect(validateGameState(JSON.parse(JSON.stringify(after)))).toEqual(after);
  });

  it.each([1, 4] as const)("migrates the v8 in-progress stage %i story and applies its fixed stage delta", (stage) => {
    const migrated = oldV8Date(stage);
    expect(migrated.activeDate).toMatchObject({ resolutionMode: "legacy_fixed", randomPlan: [], resolvedChoices: [], responseSnapshot: null });
    const ready = untilChoice(migrated);
    const after = chooseDate(ready, 1, ready.revision);
    const fixed = effect.stageDeltas?.[String(stage) as "1" | "4"] ?? effect;
    expect(after.affection - ready.affection).toBe(fixed.affectionDelta);
    expect(after.trust - ready.trust).toBe(fixed.trustDelta ?? 0);
    expect(after.spark - ready.spark).toBe(fixed.sparkDelta ?? 0);
    expect(after.activeDate!.appliedEffectIds.filter((id) => id.endsWith(`:${effectId}`))).toHaveLength(1);
    expect(after.activeDate!.resolvedChoices).toEqual([]);
    expect(after.memories.filter((id) => id === effect.memoryId)).toHaveLength(1);
    expect(chooseDate(after, 1, ready.revision)).toBe(after);
    const restored = validateGameState(JSON.parse(JSON.stringify(after)));
    expect(restored).toEqual(after);
    const finished = finish(restored);
    expect(finished.ap).toBe(migrated.ap);
    expect(finished.memories.filter((id) => id === effect.memoryId)).toHaveLength(1);
  });
});
