import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapRecordOf, type RhythmTapPlan } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { baraatDance } from "./definition";
import { BARAAT_BEATS, BARAAT_COUNT_IN_BEATS, BARAAT_IN_STEP_HITS, BARAAT_INTERVAL_MS, BARAAT_TUNING, baraatRules } from "./rules";

const { beats } = BARAAT_TUNING;
const end = rhythmTapEnd(BARAAT_TUNING);

describeMiniGameRules(baraatDance, baraatRules, { records: [
  { taps: [], stopMs: null }, { taps: [0], stopMs: null }, { taps: beats, stopMs: null }, { taps: [end + 1], stopMs: 5 },
  { taps: [Number.NaN], stopMs: Number.NaN },
] });

describe("the baraat dance", () => {
  const outcome = (plan: RhythmTapPlan) => baraatRules.outcomeOf(rhythmTapRecordOf(plan, BARAAT_TUNING), {});
  const between = (index: number) => beats[index] + BARAAT_INTERVAL_MS / 2;

  it("is fair on a phone: a steady drum after a count-in of four, 12 to 15 seconds", () => {
    expect(rhythmTapFairness(BARAAT_TUNING)).toEqual([]);
    expect(beats).toHaveLength(BARAAT_BEATS);
    for (const [index, beat] of beats.slice(1).entries()) expect(beat - beats[index]).toBe(BARAAT_INTERVAL_MS);
    expect(beats[0] - BARAAT_COUNT_IN_BEATS[BARAAT_COUNT_IN_BEATS.length - 1]).toBe(BARAAT_INTERVAL_MS);
    expect(end).toBeGreaterThanOrEqual(12000);
    expect(end).toBeLessThanOrEqual(15000);
  });

  it("is in step with most beats met, a little off either side of a beat still counting", () => {
    expect(outcome({ hit: () => true })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS - 1 })).toBe("off_beat_together");
    expect(baraatRules.outcomeOf({ taps: beats.map((beat, index) => beat + (index % 2 ? 150 : -100)), stopMs: null }, {})).toBe("in_step");
  });

  it("stumbles when more taps fall between the beats than on them, stands still without a tap", () => {
    expect(outcome({ hit: (index) => index < 3, strays: [5, 6, 7, 8].map(between) })).toBe("stumble");
    expect(outcome({ hit: (index) => index < 4, strays: [5, 6, 7, 8].map(between) })).toBe("off_beat_together");
    expect(outcome({ strays: [between(3)] })).toBe("stumble");
    expect(outcome({})).toBe("stood_still");
    // A tap during the count-in is a tap: not standing still.
    expect(baraatRules.outcomeOf({ taps: [BARAAT_COUNT_IN_BEATS[1]], stopMs: null }, {})).toBe("stumble");
  });
});
