import { describe, expect, it } from "vitest";
import { legacyPhase1Stage, legacyRomanceValues } from "./romance-migration";

const thresholds = {
  stages: [
    { stage: 1, minTrust: 0, minSpark: 0 },
    { stage: 2, minTrust: 1, minSpark: 0 },
    { stage: 3, minTrust: 2, minSpark: 2 },
    { stage: 4, minTrust: 4, minSpark: 3 },
  ],
  confession: { minTrust: 4, minSpark: 4 },
};
const oldDates = ["milano_cafe_01", "milano_walk_01", "milano_invitation_01", "milano_night_01"];

describe("version 1–7 romance migration", () => {
  it("recovers only the stages earned under the original version 1 rules", () => {
    expect(legacyPhase1Stage({ romanceStage: 1, affection: 9, playedDateIds: [] })).toBe(1);
    expect(legacyPhase1Stage({ romanceStage: 1, affection: 2, playedDateIds: oldDates.slice(0, 1) })).toBe(2);
    expect(legacyPhase1Stage({ romanceStage: 1, affection: 4, playedDateIds: oldDates.slice(0, 2) })).toBe(3);
    expect(legacyPhase1Stage({ romanceStage: 1, affection: 6, playedDateIds: oldDates })).toBe(4);
  });
  it.each([
    [1, 0, 0],
    [2, 1, 0],
    [3, 2, 2],
    [4, 4, 3],
  ])("keeps stage %i without inventing scores for unrecorded choices", (romanceStage, trust, spark) => {
    expect(legacyRomanceValues({ romanceStage, affection: 0, playedDateIds: [] }, thresholds))
      .toEqual({ trust, spark, lastRejectedDateCount: null });
  });

  it("preserves an already-earned opportunity to confess", () => {
    const before = { romanceStage: 4, affection: 8, playedDateIds: [...oldDates] };
    expect(legacyRomanceValues(before, thresholds))
      .toEqual({ trust: 4, spark: 4, lastRejectedDateCount: null });
    expect(before).toEqual({ romanceStage: 4, affection: 8, playedDateIds: oldDates });
  });

  it("does not infer the old confession qualification from affection alone or partial history", () => {
    for (const state of [
      { romanceStage: 4, affection: 7, playedDateIds: oldDates },
      { romanceStage: 4, affection: 8, playedDateIds: oldDates.slice(0, 3) },
      { romanceStage: 3, affection: 30, playedDateIds: oldDates },
    ]) expect(legacyRomanceValues(state, thresholds).spark).toBeLessThan(4);
  });

  it("rejects an unknown legacy stage rather than guessing", () => {
    expect(() => legacyRomanceValues({ romanceStage: 9, affection: 10, playedDateIds: [] }, thresholds)).toThrow();
  });
});
