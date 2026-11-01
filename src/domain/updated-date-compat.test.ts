import { describe, expect, it } from "vitest";
import phase6 from "../../tests/fixtures/phase6-saves.json";
import published from "../../tests/fixtures/fa0e7e0-v10-mid-scene.json";
import { seedLegacyChapter } from "../../tests/fixtures/legacy-game";
import {
  advanceDate, chooseDate, finishDate, getDateAvailability, isEventVisible,
  isUpdatedDateReplay, startDate, validateGameState, type GameState,
} from "./game";

function finish(state: GameState, onStep?: (state: GameState) => void): GameState {
  for (let i = 0; state.activeDate && i < 100; i++) {
    const frame = state.activeDate.frame;
    const next = frame.ended ? finishDate(state, state.revision)
      : frame.choices.length ? chooseDate(state, 0, state.revision)
      : advanceDate(state, state.revision);
    expect(next).not.toBe(state);
    state = validateGameState(JSON.parse(JSON.stringify(next)));
    onStep?.(state);
  }
  expect(state.activeDate).toBeNull();
  return state;
}

describe("rewritten date available once to earlier players", () => {
  it("migrates v10 and shows a completed old date once, without consuming or awarding anything", () => {
    const old = validateGameState(phase6.ending);
    const initial = validateGameState({ ...old, ap: 0,
      pendingApRewards: [{ rewardId: "chapter_milano_first_clear", earnedAp: 4, remainingAp: 4 }],
    });
    const id = "milano_cafe_01";
    expect(isUpdatedDateReplay(initial, id)).toBe(true);
    expect(isEventVisible(initial, id)).toBe(true);
    expect(getDateAvailability(initial, id).available).toBe(true);
    const stable = (state: GameState) => ({
      ap: state.ap, pendingApRewards: state.pendingApRewards, affection: state.affection,
      trust: state.trust, spark: state.spark, memories: state.memories,
      claimedRewardIds: state.claimedRewardIds, playedDateIds: state.playedDateIds,
      romanceStage: state.romanceStage, confessionStatus: state.confessionStatus,
      travelBudget: state.travelBudget, inventory: state.inventory,
    });
    const before = stable(initial);
    let state = startDate(initial, id, () => 4321);
    expect(state.activeDate?.replay).toBe(true);
    expect(stable(state)).toEqual(before);
    state = finish(state, (snapshot) => expect(stable(snapshot)).toEqual(before));
    expect(state.updatedDateIds).toContain(id);
    expect(isEventVisible(state, id)).toBe(false);
    expect(getDateAvailability(state, id).available).toBe(false);
    expect(startDate(state, id)).toBe(state);
  });

  it("does not offer the rewritten scene a second time after its ordinary first completion", () => {
    const initial = seedLegacyChapter();
    const state = finish(startDate(initial, "milano_cafe_01", () => 4321));
    expect(state.updatedDateIds).toContain("milano_cafe_01");
    expect(isEventVisible(state, "milano_cafe_01")).toBe(false);
    expect(getDateAvailability(state, "milano_cafe_01").available).toBe(false);
  });

  it("lets a published in-progress old scene finish, then offers its rewrite", () => {
    const initial = validateGameState(published.date);
    expect(initial.updatedDateIds).toEqual([]);
    expect(initial.activeDate?.replay).toBe(false);
    const state = finish(initial);
    expect(state.playedDateIds).toContain("milano_cafe_01");
    expect(state.updatedDateIds).not.toContain("milano_cafe_01");
    expect(isUpdatedDateReplay(state, "milano_cafe_01")).toBe(true);
  });

  it("never reopens LOVE, a confession or recovery as rewritten normal dates", () => {
    const state = validateGameState(phase6.ending);
    for (const id of ["milano_love_date_01", "milano_confession_01", "milano_recovery_01"])
      expect(isUpdatedDateReplay(state, id)).toBe(false);
    expect(isEventVisible(state, "milano_love_date_01")).toBe(false);
  });

  it("rejects fabricated updated IDs while preserving the original unparsed data", () => {
    const state = validateGameState(phase6.ending);
    expect(() => validateGameState({ ...state, updatedDateIds: ["unknown"] })).toThrow();
    expect(() => validateGameState({ ...state, updatedDateIds: ["milano_novecento_date_01"] })).toThrow();
  });
});
