import { describe, expect, it } from "vitest";
import fixture from "../../tests/fixtures/castle-clear-unplayed.json";
import {
  advanceDate, canConfessSuccessfully, chooseDate, completedDateCount, finishDate,
  getDateAvailability, isEventVisible, startDate, validateGameState, type GameState,
} from "./game";

const recoveryId = "milano_recovery_01";
const confessionId = "milano_confession_01";

function stranded(): GameState {
  const base = validateGameState(JSON.parse(JSON.stringify(fixture)));
  // One genuine previous normal date; low relationships and no AP model
  // repeated unfortunate choices after the travel rewards have been spent.
  return validateGameState({
    ...base, ap: 0, affection: -8, trust: -8, spark: -8,
    playedDateIds: ["milano_love_date_01"],
  });
}

function toChoice(state: GameState): GameState {
  for (let i = 0; i < 50 && state.activeDate && !state.activeDate.frame.choices.length && !state.activeDate.frame.ended; i++)
    state = advanceDate(state, state.revision);
  return state;
}

function toEnd(state: GameState): GameState {
  for (let i = 0; i < 50 && state.activeDate && !state.activeDate.frame.ended; i++) {
    if (state.activeDate.frame.choices.length) throw new Error("Unexpected additional choice");
    state = advanceDate(state, state.revision);
  }
  expect(state.activeDate?.frame.ended).toBe(true);
  return state;
}

function complete(state: GameState, dateId: string, choice = 0, roll = 0): GameState {
  state = startDate(state, dateId, () => roll);
  expect(state.activeDate?.dateId).toBe(dateId);
  state = toChoice(state);
  expect(state.activeDate?.frame.choices).toHaveLength(3);
  state = chooseDate(state, choice, state.revision);
  state = toEnd(state);
  return finishDate(state, state.revision);
}

describe("relationship recovery when free time is exhausted", () => {
  it("appears only when a previous experience exists, the relationship needs repair and no normal date is available", () => {
    const stuck = stranded();
    expect(isEventVisible(stuck, recoveryId)).toBe(true);
    expect(getDateAvailability(stuck, recoveryId).available).toBe(true);
    expect(isEventVisible({ ...stuck, playedDateIds: [] }, recoveryId)).toBe(false);
    expect(isEventVisible({ ...stuck, ap: 2 }, recoveryId)).toBe(false);
    const settled = { ...stuck, affection: 10, trust: 10, spark: 10, completedRecoveryCount: 2,
      playedDateIds: [...stuck.playedDateIds, recoveryId] };
    expect(canConfessSuccessfully(settled)).toBe(true);
    expect(isEventVisible(settled, recoveryId)).toBe(false);
  });

  it("lets badly hurt relationships recover repeatedly without granting AP, rewards or memories", () => {
    let state = stranded();
    const originalMemories = [...state.memories];
    const originalRewards = [...state.claimedRewardIds];
    // Each completed conversation is genuine. Experience is capped at three,
    // while subsequent attempts remain possible if the relationship is poor.
    for (let i = 0; i < 4; i++) {
      state = complete(state, recoveryId, 0, 0);
      expect(state.ap).toBe(0);
      expect(state.memories).toEqual(originalMemories);
      expect(state.claimedRewardIds).toEqual(originalRewards);
      expect(state.playedDateIds.filter((id) => id === recoveryId)).toHaveLength(1);
      expect(state.playedDateIds.filter((id) => id === "milano_love_date_01")).toHaveLength(1);
      expect(state.completedRecoveryCount).toBe(Math.min(i + 1, 3));
      expect(completedDateCount(state)).toBe(1 + Math.min(i + 1, 3));
      state = validateGameState(JSON.parse(JSON.stringify(state)));
    }
    expect(state.affection).toBeGreaterThan(-8);
    expect(state.trust).toBeGreaterThan(-8);
    expect(getDateAvailability(state, recoveryId).available).toBe(true);
  });

  it("can reach a successful confession from negative values, one ordinary date and no AP", () => {
    let state = stranded();
    const originalMemories = [...state.memories];
    const originalRewards = [...state.claimedRewardIds];
    // Fixed successful tickets exercise a possible recovery path, including
    // the need to rebuild trust and romantic interest through different choices.
    for (let i = 0; i < 6; i++) state = complete(state, recoveryId, 0, 0);
    for (let i = 0; i < 18; i++) state = complete(state, recoveryId, 1, 0);
    expect(state.ap).toBe(0);
    expect(state.memories).toEqual(originalMemories);
    expect(state.claimedRewardIds).toEqual(originalRewards);
    expect(state.completedRecoveryCount).toBe(3);
    expect(completedDateCount(state)).toBe(4); // 1 normal + at most 3 recoveries
    expect(state.romanceStage).toBe(4);
    expect(canConfessSuccessfully(state)).toBe(true);
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(getDateAvailability(state, confessionId).available).toBe(true);
    state = complete(state, confessionId);
    expect(state.confessionStatus).toBe("accepted");
    expect(state.endingReached).toBe(true);
  });

  it("allows retrying after a negative roll without redrawing during reload", () => {
    let state = startDate(stranded(), recoveryId, () => 9999);
    state = toChoice(state);
    const beforeChoice = validateGameState(JSON.parse(JSON.stringify(state)));
    const result = chooseDate(beforeChoice, 0, beforeChoice.revision);
    expect(result.activeDate?.resolvedChoices[0]?.result).toBe("negative");
    expect(chooseDate(result, 0, beforeChoice.revision)).toBe(result);
    const restored = validateGameState(JSON.parse(JSON.stringify(result)));
    expect(restored.activeDate?.resolvedChoices).toEqual(result.activeDate?.resolvedChoices);
    state = toEnd(restored);
    state = finishDate(state, state.revision);
    expect(getDateAvailability(state, recoveryId).available).toBe(true);
  });

  it("requires completing a new conversation after rejection before re-confessing", () => {
    let state: GameState = { ...stranded(), romanceStage: 2, affection: 0, trust: 0, spark: 0 };
    state = complete(state, confessionId);
    expect(state.confessionStatus).toBe("rejected");
    const rejectedCount = state.lastRejectedDateCount;
    expect(getDateAvailability(state, confessionId).available).toBe(false);
    state = startDate(state, recoveryId, () => 0);
    expect(getDateAvailability(state, confessionId).available).toBe(false);
    state = toChoice(state);
    state = chooseDate(state, 0, state.revision);
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    expect(getDateAvailability(state, confessionId).available).toBe(false);
    state = toEnd(state);
    state = finishDate(state, state.revision);
    expect(state.lastRejectedDateCount).toBe(rejectedCount);
    expect(state.recoveryAfterRejection).toBe(true);
    expect(getDateAvailability(state, confessionId).available).toBe(true);
    state = validateGameState(JSON.parse(JSON.stringify(state)));
    state = complete(state, confessionId);
    expect(state.confessionStatus).toBe("rejected");
    expect(getDateAvailability(state, confessionId).available).toBe(false);
  });
});
