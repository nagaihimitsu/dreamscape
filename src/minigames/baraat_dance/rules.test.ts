import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, type RhythmTapPlan } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { baraatDance } from "./definition";
import {
  BARAAT_BEATS, BARAAT_COUNT_IN_BEATS, BARAAT_FAST_INTERVAL_MS, BARAAT_IN_STEP_EXTRA, BARAAT_IN_STEP_HITS, BARAAT_INTERVAL_MS,
  BARAAT_NUMBERS, BARAAT_SLOW_BEATS, BARAAT_TUNING, baraatGame, baraatRules,
} from "./rules";

const { beats } = BARAAT_TUNING;
const end = rhythmTapEnd(BARAAT_TUNING);

describeMiniGameRules(baraatDance, baraatRules, { records: [
  { taps: [], stopMs: null }, { taps: [0], stopMs: null }, { taps: beats, stopMs: null }, { taps: [end + 1], stopMs: 5 },
  { taps: [Number.NaN], stopMs: Number.NaN },
] });

describe("the baraat dance", () => {
  const outcome = (plan: RhythmTapPlan) => baraatRules.outcomeOf(rhythmTapRecordOf(plan, BARAAT_TUNING), {});
  const taps = (list: readonly number[]) => baraatRules.outcomeOf({ taps: list, stopMs: null }, {});
  const between = (index: number) => Math.round((beats[index] + beats[index + 1]) / 2);
  /** Taps every `gap` ms from 0.5 s to the end (mashing). */
  const mash = (gap: number) => Array.from({ length: Math.floor((end - 500) / gap) }, (_, index) => 500 + index * gap);

  it("is fair on a phone: a count-in of four, 8 beats at 96 a minute, 8 faster at 108, 12 to 14 seconds", () => {
    expect(rhythmTapFairness(BARAAT_TUNING)).toEqual([]);
    expect(beats).toHaveLength(BARAAT_BEATS);
    for (const [index, beat] of beats.slice(1).entries())
      expect(beat - beats[index], `beat ${index + 2}`).toBe(index + 1 < BARAAT_SLOW_BEATS ? BARAAT_INTERVAL_MS : BARAAT_FAST_INTERVAL_MS);
    expect(beats[0] - BARAAT_COUNT_IN_BEATS[BARAAT_COUNT_IN_BEATS.length - 1]).toBe(BARAAT_INTERVAL_MS);
    expect(end).toBeGreaterThanOrEqual(12000);
    expect(end).toBeLessThanOrEqual(14000);
  });

  it("is in step with most beats met, a little off either side of a beat still counting, a double tap or two forgiven", () => {
    expect(outcome({ hit: () => true })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS - 1 })).toBe("off_beat_together");
    expect(taps(beats.map((beat, index) => beat + (index % 2 ? 150 : -100)))).toBe("in_step");
    // Extra taps (a second one on a beat): a few are forgiven, more are not in step.
    const doubled = (count: number) => beats.flatMap((beat, index) => (index < count ? [beat, beat + 140] : [beat]));
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA))).toBe("in_step");
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA + 1))).toBe("off_beat_together");
    // A tap that tried for a beat and missed its window is a miss, not an extra tap.
    expect(taps(beats.map((beat, index) => (index < 4 ? beat + 250 : beat)))).toBe("in_step");
  });

  it("does not count taps along the count-in: clapping along is no fault, and alone it is standing still", () => {
    expect(taps([...BARAAT_COUNT_IN_BEATS, ...beats])).toBe("in_step");
    expect(taps(BARAAT_COUNT_IN_BEATS)).toBe("stood_still");
    expect(rhythmTapJudge({ taps: BARAAT_COUNT_IN_BEATS, stopMs: null }, BARAAT_TUNING)).toMatchObject({ taps: 0, strays: 0 });
  });

  it("stumbles when mashing: extra taps at least as many as the beats met; no rate of mashing is in step", () => {
    expect(outcome({ hit: (index) => index < 2, strays: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(between) })).toBe("off_beat_together");
    expect(taps(beats.flatMap((beat) => [beat, beat + 200]))).toBe("stumble");
    for (const gap of [150, 200, 250, 280]) expect(taps(mash(gap)), `every ${gap} ms`).toBe("stumble");
    for (const gap of [150, 200, 250, 280, 300, 350, 400, 450, 500]) expect(taps(mash(gap)), `every ${gap} ms`).not.toBe("in_step");
    expect(outcome({})).toBe("stood_still");
  });

  it("rates in step with the outcome: in step ★2, ★3 with 10 beats or more right on the drum, off the beat or stumbling ★1, standing still not", () => {
    const rate = (list: readonly number[]) => baraatRules.rate!({ taps: list, stopMs: null }, {});
    expect(rate(beats)).toEqual({ stars: 3, scoreJa: "ぴったり 16拍・16拍中16拍" });
    // Every beat met, but late (inside the window, past ぴったり): in step, ★2.
    expect(rate(beats.map((beat) => beat + 140))).toEqual({ stars: 2, scoreJa: "ぴったり 0拍・16拍中16拍" });
    expect(rate(beats.map((beat, index) => beat + (index < BARAAT_NUMBERS.threeStarPerfects ? 0 : 140)))).toMatchObject({ stars: 3 });
    expect(rate(beats.map((beat, index) => beat + (index < BARAAT_NUMBERS.threeStarPerfects - 1 ? 0 : 140)))).toMatchObject({ stars: 2 });
    expect(rate(beats.slice(0, 8))).toMatchObject({ stars: 1 });
    expect(rate(mash(200))).toMatchObject({ stars: 1 });
    expect(rate([])).toBeNull();
    expect(rate(BARAAT_COUNT_IN_BEATS)).toBeNull();
  });

  it("builds the same dance from its numbers, and another from edited ones (Debug's room)", () => {
    expect(baraatGame(BARAAT_NUMBERS).tuning).toEqual(BARAAT_TUNING);
    const faster = baraatGame({ ...BARAAT_NUMBERS, bpm: 104, fastBpm: 120 });
    expect(faster.tuning.beats[1] - faster.tuning.beats[0]).toBe(577);
    expect(rhythmTapFairness(faster.tuning)).toEqual([]);
    expect(faster.rules.outcomeOf({ taps: faster.tuning.beats, stopMs: null }, {})).toBe("in_step");
  });
});
