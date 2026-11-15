import { describe, expect, it, onTestFinished } from "vitest";
import { installRepeatableDate } from "../../tests/fixtures/repeatable-date";
import { dates } from "../content";
import type { Condition } from "../content/condition-schemas";
import { createDebugState } from "../dev/debug-state";
import { dateSinceRejection } from "./conditions";
import {
  advanceDate, canConfessSuccessfully, chooseDate, completedDateCount, finishDate,
  getDateAvailability, isEventVisible, startDate, validateGameState, type GameState,
} from "./game";


/** Generate a valid history via the current game rules. */
function currentFreeTime(): GameState {
  const state = createDebugState({ scene: "tourism", id: "duomo_milano", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  return validateGameState({ ...state, activeTourism: null });
}

const recoveryId = "milano_recovery_01";
const confessionId = "milano_confession_01";

function stranded(): GameState {
  const base = currentFreeTime();
  // One genuine previous normal date; low relationships and no AP model
  // repeated unfortunate choices after the travel rewards have been spent.
  return validateGameState({
    ...base, ap: 0, affection: -8, trust: -8, spark: -8,
    playedDateIds: ["milano_cafe_01"],
  });
}

/** Tests only: the catalog's date with another `when`; the returned function puts the catalog's own back. */
function withWhen(dateId: string, when: Condition | undefined): () => void {
  const definition = dates.find((date) => date.id === dateId)!;
  const original = definition.when;
  definition.when = when;
  return () => { definition.when = original; };
}

const ordinaryAvailable = (state: GameState) => dates.some((date) => date.kind === "normal" && getDateAvailability(state, date.id).available);

/**
 * The rule the game itself put on every relationship repair until 2026-11-15 (date-rules.ts canRecoverRelationship),
 * kept here only as the reference Milan's own conditions must match: no ending, a completed date, the relationship not
 * settled (the confession would not succeed, or the wait after a rejection holds) and no ordinary date to start.
 */
function formerRule(state: GameState): boolean {
  if (state.endingReached || completedDateCount(state) === 0) return false;
  if (canConfessSuccessfully(state) && dateSinceRejection(state)) return false;
  return !ordinaryAvailable(state);
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

  it("shows Milan's recovery exactly when the former rule of the game did: its writer wrote that rule in its when (2026-11-15)", () => {
    // The when the repair had before (its city's first episode) with the former rule: the reference.
    const before = (state: GameState) => {
      const restore = withWhen(recoveryId, { episodesCompleted: { city: "milano", atLeast: 1 } });
      try {
        return { visible: formerRule(state) && isEventVisible(state, recoveryId),
          available: formerRule(state) && getDateAvailability(state, recoveryId).available };
      } finally { restore(); }
    };
    const ordinary = dates.filter((date) => date.kind === "normal" && date.chapterId === "milano").map((date) => date.id);
    let shown = 0;
    let states = 0;
    for (const start of [currentFreeTime(), stranded()])
      for (const ap of [0, 1, 2, 12])
        for (const played of [[], ["milano_cafe_01"], ordinary])
          for (const values of [{ affection: -8, trust: -8, spark: -8 }, { affection: 10, trust: 10, spark: 10 }])
            for (const answer of ["none", "rejected", "repaired", "accepted"] as const) {
              let state: GameState = { ...start, ap, ...values, playedDateIds: played };
              if (answer !== "none") state = { ...state, playedDateIds: [...played, confessionId],
                confessionStatus: answer === "repaired" ? "rejected" : answer, endingReached: answer === "accepted",
                lastRejectedDateCount: answer === "accepted" ? null : completedDateCount(state) };
              if (answer === "repaired")
                state = { ...state, playedDateIds: [...state.playedDateIds, recoveryId], completedRecoveryCount: 1, recoveryAfterRejection: true };
              const expected = before(state);
              expect({ visible: isEventVisible(state, recoveryId), available: getDateAvailability(state, recoveryId).available },
                JSON.stringify({ ap, played: played.length, values, answer })).toEqual(expected);
              shown += expected.visible ? 1 : 0;
              states++;
            }
    // The grid holds states on both sides of the rule.
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(states);
  });

  it("gives the former reason while an ordinary date can be chosen instead", () => {
    const stuck = stranded();
    expect(ordinaryAvailable({ ...stuck, ap: 12 })).toBe(true);
    expect(getDateAvailability({ ...stuck, ap: 12 }, recoveryId)).toEqual({ available: false, reason: "今は別のひとときを選べます。" });
    expect(getDateAvailability(stuck, recoveryId)).toEqual({ available: true, reason: "" });
  });

  it("shows a recovery date its writer gave no conditions whenever its other conditions hold: the game forces no rule (2026-11-15)", () => {
    onTestFinished(withWhen(recoveryId, undefined));
    // Free time with AP, no date completed yet, and ordinary dates to start: the former rule would hide it.
    const free = currentFreeTime();
    expect(ordinaryAvailable(free)).toBe(true);
    expect(completedDateCount(free)).toBe(0);
    expect(isEventVisible(free, recoveryId)).toBe(true);
    expect(getDateAvailability(free, recoveryId)).toEqual({ available: true, reason: "" });
    // A relationship that is settled, too.
    const settled = { ...free, affection: 10, trust: 10, spark: 10, playedDateIds: ["milano_cafe_01", "milano_walk_01", "milano_night_01"] };
    expect(canConfessSuccessfully(settled)).toBe(true);
    expect(isEventVisible(settled, recoveryId)).toBe(true);
    // What every special date keeps: after the ending it closes.
    const ended: GameState = { ...settled, confessionStatus: "accepted", endingReached: true, playedDateIds: [...settled.playedDateIds, confessionId] };
    expect(isEventVisible(ended, recoveryId)).toBe(false);
    expect(getDateAvailability(ended, recoveryId)).toEqual({ available: false, reason: "ふたりの物語は、交際エンディングを迎えました。" });
    // It plays and counts as a recovery as before.
    const played = complete(free, recoveryId, 0, 0);
    expect(played.completedRecoveryCount).toBe(1);
    expect(isEventVisible(played, recoveryId)).toBe(true);
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
      expect(state.playedDateIds.filter((id) => id === "milano_cafe_01")).toHaveLength(1);
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
    // The wait after a rejection, on Milan's confession made repeatable for the test with the wait its writer would write
    // (# when: date_since_rejection; the journey's own is played once, and no confession can follow it).
    onTestFinished(installRepeatableDate(confessionId, { waitsAfterRejection: true }));
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
