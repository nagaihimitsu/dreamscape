import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, type RhythmTapPlan } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { baraatDance } from "./definition";
import {
  BARAAT_BEATS, BARAAT_COUNT_IN_BEATS, BARAAT_FAST_INTERVAL_MS, BARAAT_IN_STEP_EXTRA, BARAAT_IN_STEP_HITS, BARAAT_INTERVAL_MS,
  BARAAT_NUMBERS, BARAAT_SLOW_BEATS, BARAAT_TUNING, baraatFeet, baraatGame, baraatRules,
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
    // Extra taps (a second one on a beat): a few are forgiven; more with most beats met is a stumble (group2 N7), with
    // fewer met dancing off the beat.
    const doubled = (count: number, met = beats.length) => beats.flatMap((beat, index) =>
      index >= met ? [beat + 300] : index < count ? [beat, beat + 140] : [beat]);
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA))).toBe("in_step");
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA + 1))).toBe("stumble");
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA + 1, BARAAT_IN_STEP_HITS - 1))).toBe("off_beat_together");
    // A tap that tried for a beat and missed its window is a miss, not an extra tap.
    expect(taps(beats.map((beat, index) => (index < 4 ? beat + 250 : beat)))).toBe("in_step");
  });

  it("stumbles when every beat is met and then mashed in the excitement at the end (group2 N7)", () => {
    // 14 beats met, then a tap every 120 ms over the last 1.5 s: 16 met, 11 extra.
    const climax = [...beats.slice(0, 14).map((beat) => beat + 30), ...Array.from({ length: 13 }, (_, index) => beats[13] + 500 + index * 120)];
    const summary = rhythmTapJudge({ taps: climax, stopMs: null }, BARAAT_TUNING);
    expect(summary.hits).toBeGreaterThanOrEqual(BARAAT_IN_STEP_HITS);
    expect(taps(climax)).toBe("stumble");
  });

  it("shows the feet tangling from a beat's second extra tap, never for a double tap or a tap far off (group2 N6)", () => {
    const feet = (list: readonly number[], ms: number) => baraatFeet(list, ms, BARAAT_TUNING);
    const [first, second, third] = beats;
    expect(feet([], second)).toEqual({ extra: 0, tangled: false });
    // A double tap: one extra, no tangle. A third tap on the same beat: tangled, and the next beat still is.
    expect(feet([second, second + 150], second + 200)).toEqual({ extra: 1, tangled: false });
    expect(feet([second - 100, second + 50, second + 200], second + 250)).toEqual({ extra: 2, tangled: true });
    expect(feet([second - 100, second + 50, second + 200, third], third + 10)).toEqual({ extra: 0, tangled: true });
    expect(feet([second - 100, second + 50, second + 200, third, beats[3]], beats[3] + 10).tangled).toBe(false);
    // A late tap and the next beat's early one: each in its own beat's time.
    expect(feet([first + 250, second - 200], second - 150)).toEqual({ extra: 0, tangled: false });
    // Taps not yet made, and the count-in's clapping, do not count.
    expect(feet([second, second + 100, second + 200], second + 50).extra).toBe(0);
    expect(feet([...BARAAT_COUNT_IN_BEATS, BARAAT_COUNT_IN_BEATS[3] + 100, BARAAT_COUNT_IN_BEATS[3] + 200], first - 200)).toEqual({ extra: 0, tangled: false });
    // Over a mash every 200 ms, most beats met show no success; over a dance with a double tap now
    // and then (never two beats running), every beat met does.
    const tangledHits = (record: readonly number[]) => beats.filter((at) => {
      const hit = record.find((tap) => tap >= at - 120 && tap <= at + 180);
      return hit !== undefined && feet(record, hit).tangled;
    }).length;
    expect(tangledHits(mash(200))).toBeGreaterThanOrEqual(BARAAT_BEATS * 0.75);
    const careful = beats.flatMap((at, index) => (index % 3 === 1 ? [at + 20, at + 180] : [at + 20]));
    expect(tangledHits(careful)).toBe(0);
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
