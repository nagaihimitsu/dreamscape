import { describe, expect, it } from "vitest";
import { RHYTHM_TAP_BOTS, rhythmTapBotRandom, rhythmTapBotTally, rhythmTapBotTaps } from "../engines/rhythm_tap/bot";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, rhythmTapWindow, type RhythmTapPlan } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { baraatDance } from "./definition";
import {
  BARAAT_BEATS, BARAAT_BIG_BEATS, BARAAT_COUNT_IN, BARAAT_COUNT_IN_BEATS, BARAAT_GAME, BARAAT_IN_STEP_EXTRA, BARAAT_IN_STEP_HITS, BARAAT_NUMBERS,
  BARAAT_TUNING, baraatFeet, baraatGame, baraatRules,
} from "./rules";

const { beats } = BARAAT_TUNING;
const rests = BARAAT_TUNING.rests?.at ?? [];
const end = rhythmTapEnd(BARAAT_TUNING);
const gapsOf = (times: readonly number[]) => times.slice(1).map((time, index) => time - times[index]);

describeMiniGameRules(baraatDance, baraatRules, { records: [
  { taps: [], stopMs: null }, { taps: [0], stopMs: null }, { taps: beats, stopMs: null }, { taps: [end + 1], stopMs: 5 },
  { taps: [Number.NaN], stopMs: Number.NaN }, { taps: [...beats, ...rests], stopMs: null },
] });

describe("the baraat dance", () => {
  const outcome = (plan: RhythmTapPlan) => baraatRules.outcomeOf(rhythmTapRecordOf(plan, BARAAT_TUNING), {});
  const taps = (list: readonly number[]) => baraatRules.outcomeOf({ taps: list, stopMs: null }, {});
  /** Taps every `gap` ms from 0.5 s to the end (mashing). */
  const mash = (gap: number) => Array.from({ length: Math.floor((end - 500) / gap) }, (_, index) => 500 + index * gap);

  it("is fair on a phone: a count-in of four at 96, then phrases that change: on the beat, off it, double time, a break, faster, two big ones", () => {
    expect(rhythmTapFairness(BARAAT_TUNING)).toEqual([]);
    expect(BARAAT_COUNT_IN_BEATS).toHaveLength(BARAAT_COUNT_IN);
    expect(gapsOf(BARAAT_COUNT_IN_BEATS)).toEqual([625, 625, 625]);
    expect(beats).toHaveLength(BARAAT_BEATS);
    expect(BARAAT_BEATS).toBe(20);
    expect(end).toBeGreaterThanOrEqual(15500);
    expect(end).toBeLessThanOrEqual(18000);
    const gaps = gapsOf(beats);
    // On the beat (625), off it (937: the 3-3-2), double time (312), the faster tempo's beat (556), and the long gaps of the rests.
    for (const gap of [625, 938, 312, 556]) expect(gaps.some((each) => Math.abs(each - gap) <= 1), `a gap of ${gap}`).toBe(true);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(300);
    expect(new Set(gaps).size).toBeGreaterThanOrEqual(5);
    // Three rests (the break's two, the stop before the finale); the last two beats are the big ones, in the finale's narrower window.
    expect(rests).toHaveLength(3);
    expect(BARAAT_GAME.bigBeats).toEqual([BARAAT_BEATS - 2, BARAAT_BEATS - 1]);
    expect(BARAAT_BIG_BEATS).toBe(2);
    expect(rhythmTapWindow(BARAAT_TUNING, BARAAT_BEATS - 1).lateMs).toBeLessThan(rhythmTapWindow(BARAAT_TUNING, 0).lateMs);
    expect(BARAAT_GAME.sections.map((section) => section.name)).toEqual(["count", "teach", "chaal", "burst", "break", "faster", "finale"]);
  });

  it("is in step with most beats met, a little off either side of a beat still counting, a double tap or two forgiven", () => {
    expect(outcome({ hit: () => true })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS })).toBe("in_step");
    expect(outcome({ hit: (index) => index < BARAAT_IN_STEP_HITS - 1 })).toBe("off_beat_together");
    expect(taps(beats.map((beat, index) => beat + (index % 2 ? 150 : -90)))).toBe("in_step");
    const doubled = (count: number, met = beats.length) => beats.flatMap((beat, index) =>
      index >= met ? [beat + 260] : index < count ? [beat, beat + 140] : [beat]);
    // The first beats are a second apart and more (no burst there): the second tap of a double is no beat's.
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA))).toBe("in_step");
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA + 1))).toBe("stumble");
    expect(taps(doubled(BARAAT_IN_STEP_EXTRA + 1, BARAAT_IN_STEP_HITS - 1))).toBe("off_beat_together");
    // A tap that tried for a beat and missed its window is a miss, not an extra tap.
    expect(taps(beats.map((beat, index) => (index < 2 ? beat + 250 : beat)))).toBe("in_step");
  });

  it("counts a tap at a rest as an extra tap: held, the dance is clean; tapped, it costs the ★ and, with more, the step", () => {
    expect(rhythmTapJudge({ taps: beats, stopMs: null }, BARAAT_TUNING)).toMatchObject({ fooled: 0, rests: ["kept", "kept", "kept"] });
    const intoRests = [...beats, ...rests.map((rest) => rest + 30)];
    expect(rhythmTapJudge({ taps: intoRests, stopMs: null }, BARAAT_TUNING)).toMatchObject({ fooled: 3, rests: ["fooled", "fooled", "fooled"] });
    expect(taps(intoRests)).toBe("in_step");
    expect(baraatRules.rate!({ taps: intoRests, stopMs: null }, {})).toMatchObject({ stars: 2 });
    // Clapping through the break on the old beat and doubling two beats: too many extra taps for every beat met.
    expect(taps([...intoRests, beats[0] + 150, beats[1] + 150])).toBe("stumble");
  });

  it("stumbles when every beat is met and then mashed in the excitement at the end (group2 N7)", () => {
    const last = beats.length - 1;
    const climax = [...beats.slice(0, last - 1).map((beat) => beat + 30), ...Array.from({ length: 13 }, (_, index) => beats[last - 2] + 300 + index * 120)];
    expect(rhythmTapJudge({ taps: climax, stopMs: null }, BARAAT_TUNING).hits).toBeGreaterThanOrEqual(BARAAT_IN_STEP_HITS);
    expect(taps(climax)).toBe("stumble");
  });

  it("shows the feet tangling from a beat's second extra tap, never for a double tap or a tap far off (group2 N6)", () => {
    const feet = (list: readonly number[], ms: number) => baraatFeet(list, ms, BARAAT_TUNING);
    const [first, second, third] = beats;
    expect(feet([], second)).toEqual({ extra: 0, tangled: false });
    expect(feet([second, second + 150], second + 200)).toEqual({ extra: 1, tangled: false });
    expect(feet([second - 100, second + 50, second + 200], second + 250)).toEqual({ extra: 2, tangled: true });
    expect(feet([second - 100, second + 50, second + 200, third], third + 10)).toEqual({ extra: 0, tangled: true });
    expect(feet([second - 100, second + 50, second + 200, third, beats[3]], beats[3] + 10).tangled).toBe(false);
    expect(feet([first + 250, second - 200], second - 150)).toEqual({ extra: 0, tangled: false });
    expect(feet([second, second + 100, second + 200], second + 50).extra).toBe(0);
    expect(feet([...BARAAT_COUNT_IN_BEATS, BARAAT_COUNT_IN_BEATS[3] + 100, BARAAT_COUNT_IN_BEATS[3] + 200], first - 200)).toEqual({ extra: 0, tangled: false });
    const tangledHits = (record: readonly number[]) => beats.filter((at, index) => {
      const { earlyMs, lateMs } = rhythmTapWindow(BARAAT_TUNING, index);
      const hit = record.find((tap) => tap >= at - earlyMs && tap <= at + lateMs);
      return hit !== undefined && feet(record, hit).tangled;
    }).length;
    expect(tangledHits(mash(200))).toBeGreaterThanOrEqual(BARAAT_BEATS * 0.5);
    const careful = beats.flatMap((at, index) => (index % 3 === 1 && index < 7 ? [at + 20, at + 180] : [at + 20]));
    expect(tangledHits(careful)).toBe(0);
  });

  it("does not count taps along the count-in: clapping along is no fault, and alone it is standing still", () => {
    expect(taps([...BARAAT_COUNT_IN_BEATS, ...beats])).toBe("in_step");
    expect(taps(BARAAT_COUNT_IN_BEATS)).toBe("stood_still");
    expect(rhythmTapJudge({ taps: BARAAT_COUNT_IN_BEATS, stopMs: null }, BARAAT_TUNING)).toMatchObject({ taps: 0, strays: 0 });
  });

  it("stumbles when mashing: extra taps at least as many as the beats met; no rate of mashing is in step", () => {
    expect(taps(beats.flatMap((beat) => [beat, beat + 150]))).toBe("stumble");
    for (const gap of [120, 150, 200, 250, 280]) expect(taps(mash(gap)), `every ${gap} ms`).toBe("stumble");
    for (const gap of [120, 150, 200, 250, 280, 300, 350, 400, 450, 500, 625]) expect(taps(mash(gap)), `every ${gap} ms`).not.toBe("in_step");
    expect(outcome({})).toBe("stood_still");
  });

  it("rates in step with the outcome: in step ★2, ★3 with 16 beats or more right on the drum and every rest held, off the beat or stumbling ★1, still none", () => {
    const rate = (list: readonly number[]) => baraatRules.rate!({ taps: list, stopMs: null }, {});
    expect(rate(beats)).toEqual({ stars: 3, scoreJa: "ぴったり 20拍・20拍中20拍" });
    expect(rate(beats.map((beat) => beat + 140))).toEqual({ stars: 2, scoreJa: "ぴったり 0拍・20拍中20拍" });
    const { threeStarPerfects } = BARAAT_NUMBERS;
    expect(rate(beats.map((beat, index) => beat + (index < threeStarPerfects ? 0 : 140)))).toMatchObject({ stars: 3 });
    expect(rate(beats.map((beat, index) => beat + (index < threeStarPerfects - 1 ? 0 : 140)))).toMatchObject({ stars: 2 });
    expect(rate([...beats, rests[0]])).toMatchObject({ stars: 2 });
    expect(rate(beats.slice(0, 8))).toMatchObject({ stars: 1 });
    expect(rate(mash(200))).toMatchObject({ stars: 1 });
    expect(rate([])).toBeNull();
    expect(rate(BARAAT_COUNT_IN_BEATS)).toBeNull();
  });

  it("builds the same dance from its numbers, and another from edited ones (Debug's room)", () => {
    expect(baraatGame(BARAAT_NUMBERS).tuning).toEqual(BARAAT_TUNING);
    const slower = baraatGame({ ...BARAAT_NUMBERS, bpm: 88, fastBpm: 100 });
    expect(slower.tuning.beats[1] - slower.tuning.beats[0]).toBe(682);
    expect(rhythmTapFairness(slower.tuning)).toEqual([]);
    expect(slower.rules.outcomeOf({ taps: slower.tuning.beats, stopMs: null }, {})).toBe("in_step");
    // Faster than 96, the burst's eighths come closer than a thumb can keep: the room says so.
    expect(rhythmTapFairness(baraatGame({ ...BARAAT_NUMBERS, bpm: 104 }).tuning).join()).toContain("less than 300");
  });
});

// Round 3's seeded players (engines/rhythm_tap/bot.ts), 500 plays each. The aims (common brief): ★3 about a third of the
// time for the average dancer, rarely for the careless one (who mostly dances off the beat: the story's default).
describe("the baraat dance, played by round 3's bots", () => {
  const PLAYS = 500;
  const play = (bot: (typeof RHYTHM_TAP_BOTS)[number], seed: number) => {
    const random = rhythmTapBotRandom(seed);
    const scene = { beats, rests: rests.map((at) => ({ at })), leadGapMs: 625 };
    return rhythmTapBotTally(Array.from({ length: PLAYS }, () => {
      const record = { taps: rhythmTapBotTaps(scene, bot, random), stopMs: null };
      return { outcome: baraatRules.outcomeOf(record, {}), stars: baraatRules.rate!(record, {})?.stars ?? null };
    }));
  };
  const [skilled, average, careless] = RHYTHM_TAP_BOTS;

  it("gives ★3 to a third of average dancers and few careless ones; the careless mostly dance off the beat", () => {
    const tally = { skilled: play(skilled, 11), average: play(average, 12), careless: play(careless, 13) };
    expect(tally.average.stars["★3"]).toBeGreaterThan(0.2);
    expect(tally.average.stars["★3"]).toBeLessThan(0.45);
    expect(tally.skilled.stars["★3"]).toBeGreaterThan(0.55);
    expect(tally.careless.stars["★3"] ?? 0).toBeLessThan(0.1);
    expect(tally.careless.outcomes.off_beat_together).toBeGreaterThan(0.4);
    expect(tally.average.outcomes.in_step).toBeGreaterThan(0.8);
  });
});
