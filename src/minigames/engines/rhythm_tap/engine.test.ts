import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  rhythmTapBeats, rhythmTapEnd, rhythmTapFairness, rhythmTapInterval, rhythmTapJudge, rhythmTapRecordOf, rhythmTapRules,
  rhythmTapTuningSchema, rhythmTapVsPartner, type RhythmTapTuning,
} from "./engine";

// The rhythm_tap engine's rules in its own words (docs/13 6.2): a skin's test passes its tuning through rhythmTapFairness.
const beats = [1000, 1600, 2200, 2800, 3400];
const tuning: RhythmTapTuning = { beats, earlyMs: 120, lateMs: 200, endAfterMs: 600 };
const judge = (taps: number[], stopMs: number | null = null, extra: Partial<RhythmTapTuning> = {}, now?: number) =>
  rhythmTapJudge({ taps, stopMs }, { ...tuning, ...extra }, now);

describe("the rhythm_tap engine", () => {
  it("hits a beat with a tap inside its window, misses it without one, and calls other taps strays", () => {
    expect(judge(beats)).toMatchObject({ hits: 5, misses: 0, strays: 0, streak: 5, longestStreak: 5, ended: "end", endMs: rhythmTapEnd(tuning) });
    // The window's edges: earlyMs before, lateMs after.
    expect(judge([1000 - 120, 1600 + 200]).judged.slice(0, 2)).toEqual(["hit", "hit"]);
    expect(judge([1000 - 121, 1600 + 201]).judged.slice(0, 2)).toEqual(["miss", "miss"]);
    expect(judge([1000 - 121, 1600 + 201])).toMatchObject({ hits: 0, strays: 2 });
    // A second tap on a beat already hit is a stray; a tap between windows is one too.
    expect(judge([1000, 1010, 1300, 1600])).toMatchObject({ hits: 2, strays: 2, judged: ["hit", "hit", "miss", "miss", "miss"] });
    // The runs of hits.
    expect(judge([1000, 1600, 2800, 3400])).toMatchObject({ streak: 2, longestStreak: 2, misses: 1 });
  });

  it("judges as of a moment: an open window is not yet a miss, a passed one is", () => {
    expect(judge([], null, {}, 1100)).toMatchObject({ judged: [], came: 1, ended: null, endMs: null });
    expect(judge([], null, {}, 1200)).toMatchObject({ judged: ["miss"], ended: null });
    expect(judge([1000], null, {}, 1001)).toMatchObject({ judged: ["hit"], taps: 1 });
    // A tap later than `now` is not seen yet.
    expect(judge([1000], null, {}, 999)).toMatchObject({ judged: [], taps: 0 });
  });

  it("ends at the stop: what came after it does not count, an open window at the stop is neither hit nor miss", () => {
    const stopped = judge([1000, 1600, 2200, 2800], 1700);
    expect(stopped).toMatchObject({ ended: "stop", endMs: 1700, stopCount: 2, hits: 2, misses: 0, taps: 2, judged: ["hit", "hit"] });
    expect(judge([1000], 1700)).toMatchObject({ stopCount: 2, judged: ["hit"] });
    expect(judge([1000], 2000)).toMatchObject({ stopCount: 2, judged: ["hit", "miss"] });
    // A stop before the first beat, and one after the end (no stop: the play had ended).
    expect(judge([], 10)).toMatchObject({ ended: "stop", stopCount: 0 });
    expect(judge(beats, rhythmTapEnd(tuning) + 1)).toMatchObject({ ended: "end", stopCount: null });
    // Not yet pressed as of `now`.
    expect(judge([1000], 1700, {}, 1500).ended).toBeNull();
  });

  it("ends when the misses reach the limit, before a later stop", () => {
    const choked = judge([1000], 3000, { missLimit: 2 });
    expect(choked).toMatchObject({ ended: "misses", endMs: 2200 + 200, misses: 2, stopCount: null, judged: ["hit", "miss", "miss"] });
    expect(judge([1000, 2200], null, { missLimit: 2 })).toMatchObject({ ended: "misses", endMs: 2800 + 200 });
    expect(judge([1000, 1600], 1700, { missLimit: 1 })).toMatchObject({ ended: "stop" });
  });

  it("compares the stop with the partner's", () => {
    const partner = { ...tuning, partnerStop: 3 };
    expect(rhythmTapVsPartner(rhythmTapJudge({ taps: [], stopMs: 2300 }, partner), partner)).toBe(0);
    expect(rhythmTapVsPartner(rhythmTapJudge({ taps: [], stopMs: 1700 }, partner), partner)).toBe(-1);
    expect(rhythmTapVsPartner(rhythmTapJudge({ taps: [], stopMs: null }, partner), partner)).toBeNull();
    expect(rhythmTapVsPartner(rhythmTapJudge({ taps: [], stopMs: 2300 }, tuning), tuning)).toBeNull();
  });

  it("reads a broken record without throwing", () => {
    expect(judge([Number.NaN, -5, Number.POSITIVE_INFINITY], Number.NaN)).toMatchObject({ taps: 0, hits: 0, ended: "end", stopCount: null });
    expect(rhythmTapJudge({ taps: undefined as unknown as number[], stopMs: null }, tuning).taps).toBe(0);
  });

  it("writes the record of a plan that reads back the same", () => {
    const plan = rhythmTapRecordOf({ hit: (index) => index < 3, strays: [1300], stopAfter: 3 }, tuning);
    expect(judge(plan.taps as number[], plan.stopMs)).toMatchObject({ hits: 3, strays: 1, stopCount: 3, ended: "stop", misses: 0 });
    for (let after = 0; after <= beats.length; after += 1)
      expect(rhythmTapJudge(rhythmTapRecordOf({ stopAfter: after }, tuning), tuning).stopCount, `stop after ${after}`).toBe(after);
    expect(rhythmTapRecordOf({}, tuning)).toEqual({ taps: [], stopMs: null });
  });

  it("makes beats from a tempo, steady or changing evenly, the same every time", () => {
    expect(rhythmTapBeats({ firstMs: 1000, count: 4, intervalMs: 500 })).toEqual([1000, 1500, 2000, 2500]);
    const faster = rhythmTapBeats({ firstMs: 1000, count: 6, intervalMs: 1200, endIntervalMs: 600, rampBeats: 4 });
    expect(faster).toEqual([1000, 2200, 3100, 3700, 4300, 4900]);
    expect(rhythmTapBeats({ firstMs: 1000, count: 6, intervalMs: 1200, endIntervalMs: 600, rampBeats: 4 })).toEqual(faster);
    expect(rhythmTapInterval(96)).toBe(625);
  });

  it("calls a tuning unfair when a phone's tap lag, the start's double tap, crowded beats or the end would decide the play", () => {
    expect(rhythmTapFairness(tuning)).toEqual([]);
    expect(rhythmTapFairness({ ...tuning, earlyMs: 40 }).join()).toContain("earlyMs 40");
    expect(rhythmTapFairness({ ...tuning, lateMs: 100 }).join()).toContain("narrower than earlyMs");
    expect(rhythmTapFairness({ ...tuning, beats: [1000, 1250] }).join()).toContain("less than 300");
    expect(rhythmTapFairness({ ...tuning, earlyMs: 250, lateMs: 350 }).join()).toContain("touches the one before");
    expect(rhythmTapFairness({ ...tuning, beats: [500, 1100] }).join()).toContain("double-tap guard");
    expect(rhythmTapFairness({ ...tuning, endAfterMs: 150 }).join()).toContain("inside the last beat's window");
    expect(rhythmTapFairness({ ...tuning, partnerStop: 5 }).join()).toContain("partnerStop 5");
    expect(rhythmTapFairness({ ...tuning, beats: [1000] }).join()).toContain("not a rhythm_tap tuning");
    expect(() => rhythmTapTuningSchema.parse({ ...tuning, lateMs: 0 })).toThrow();
  });

  it("gives a skin its outcomes from the summary, and 「おまかせ」 to each of them through its plan", () => {
    const rules = rhythmTapRules<object, "steady" | "still">(tuning, (summary) => (summary.taps === 0 ? "still" : "steady"),
      { steady: { hit: () => true }, still: {} });
    expect(rules.outcomeOf({ taps: [1000], stopMs: null }, {})).toBe("steady");
    for (const outcome of ["steady", "still"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {})).toBe(outcome);
    expect(() => rules.autoRecord("other" as "still", {})).toThrow();
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
