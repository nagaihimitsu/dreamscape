import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, rhythmTapWindow } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { golgappaDuel } from "./definition";
import {
  GOLGAPPA_HER_HAND_MS, GOLGAPPA_HER_STOP, GOLGAPPA_NUMBERS, GOLGAPPA_TUNING, golgappaGame, golgappaHerLandings,
  golgappaRules,
} from "./rules";

const { beats } = GOLGAPPA_TUNING;
const end = rhythmTapEnd(GOLGAPPA_TUNING);

describeMiniGameRules(golgappaDuel, golgappaRules, { records: [
  { taps: [], stopMs: null }, { taps: [], stopMs: 0 }, { taps: beats, stopMs: null }, { taps: beats, stopMs: end },
  { taps: [Number.NaN], stopMs: Number.NaN }, { taps: [end + 1], stopMs: end + 1 },
] });

describe("the golgappa duel", () => {
  const outcome = (plan: Parameters<typeof rhythmTapRecordOf>[0]) => golgappaRules.outcomeOf(rhythmTapRecordOf(plan, GOLGAPPA_TUNING), {});
  const all = () => true;
  /** Taps every `gap` ms from `from` to the end (mashing). */
  const mash = (gap: number, from = 500, to = end) => Array.from({ length: Math.floor((to - from) / gap) }, (_, index) => from + index * gap);

  it("is fair on a phone, about 15 seconds, faster and faster to 0.6 s by her 14th, then faster still with narrower windows", () => {
    expect(rhythmTapFairness(GOLGAPPA_TUNING)).toEqual([]);
    expect(beats).toHaveLength(17);
    expect(beats[1] - beats[0]).toBe(1200);
    expect(beats[GOLGAPPA_HER_STOP - 1] - beats[GOLGAPPA_HER_STOP - 2]).toBe(600);
    expect(beats.slice(GOLGAPPA_HER_STOP - 1).map((beat, index, after) => (index ? beat - after[index - 1] : 0)).slice(1)).toEqual([460, 400, 360]);
    expect(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP - 1).lateMs).toBeGreaterThan(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP).lateMs);
    expect(end).toBeGreaterThan(14000);
    expect(end).toBeLessThan(16500);
  });

  it("drops hers halfway before each of the player's, falling no longer than the gap, and her hand goes up just before the player's 14th", () => {
    const hers = golgappaHerLandings(GOLGAPPA_TUNING);
    expect(hers).toHaveLength(GOLGAPPA_HER_STOP);
    hers.forEach((land, index) => {
      expect(land).toBeLessThan(beats[index]);
      if (index > 0) expect(land).toBeGreaterThan(beats[index - 1]);
    });
    expect(hers[0]).toBeGreaterThan(GOLGAPPA_NUMBERS.fallMs);
    // One falls at a time: each drop (hers or the player's) starts after the one before has landed.
    const drops = [...hers, ...beats].sort((a, b) => a - b);
    for (const [index, drop] of drops.slice(1).entries()) expect(drop - drops[index], `drop ${index + 2}`).toBeGreaterThan(GOLGAPPA_NUMBERS.fallMs);
    expect(GOLGAPPA_HER_HAND_MS).toBeGreaterThan(beats[GOLGAPPA_HER_STOP - 2]);
    expect(GOLGAPPA_HER_HAND_MS).toBeLessThan(beats[GOLGAPPA_HER_STOP - 1]);
  });

  it("raises together from just before her hand until the player's 16th lands, first before that, outlasts after it or by eating them all", () => {
    expect(outcome({ hit: all, stopAfter: 14 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 15 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 12 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 0 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 16 })).toBe("outlast");
    expect(outcome({ hit: all })).toBe("outlast");
    // After her 13th: together only when nobody could tell (within 0.15 s before her hand).
    const at = (stopMs: number) => golgappaRules.outcomeOf({ taps: beats.filter((beat) => beat < stopMs), stopMs }, {});
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_NUMBERS.togetherBeforeMs)).toBe("together");
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_NUMBERS.togetherBeforeMs - 1)).toBe("you_first");
    expect(at(beats[GOLGAPPA_HER_STOP - 2] + 10)).toBe("you_first");
    // One left in the bowl does not stop the duel.
    expect(outcome({ hit: (index) => index !== 3, stopAfter: 14 })).toBe("together");
    expect(outcome({ hit: (index) => index !== 3 })).toBe("outlast");
  });

  it("chokes on the second one left in the bowl, before any later 「バス」; doing nothing chokes early", () => {
    expect(outcome({ hit: (index) => index !== 3 && index !== 9, stopAfter: 14 })).toBe("choke");
    expect(outcome({})).toBe("choke");
    // 「バス」 before the second one is left: that 「バス」 counts.
    expect(outcome({ hit: (index) => index < 5, stopAfter: 6 })).toBe("you_first");
  });

  it("chokes on a single one missed after her hand (the vendor no longer waits), never with her 「バス」 before it", () => {
    for (const index of [GOLGAPPA_HER_STOP, GOLGAPPA_HER_STOP + 1, GOLGAPPA_HER_STOP + 2])
      expect(outcome({ hit: (beat) => beat !== index }), `missing the ${index + 1}th`).toBe("choke");
    // The same slip before her hand leaves one in the bowl and goes on.
    expect(outcome({ hit: (beat) => beat !== GOLGAPPA_HER_STOP - 1 })).toBe("outlast");
    // Raising the hand with her: the fast ones after it do not count.
    expect(outcome({ hit: (beat) => beat < GOLGAPPA_HER_STOP, stopAfter: GOLGAPPA_HER_STOP })).toBe("together");
    // Late and a little early on the fast ones (inside −110/+200) is still eaten.
    const { earlyMs, lateMs } = rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP);
    expect([earlyMs, lateMs]).toEqual([GOLGAPPA_NUMBERS.peakEarlyMs, GOLGAPPA_NUMBERS.peakLateMs]);
    const edges = beats.map((beat, index) => (index < GOLGAPPA_HER_STOP ? beat : index % 2 ? beat + lateMs : beat - earlyMs));
    expect(golgappaRules.outcomeOf({ taps: edges, stopMs: null }, {})).toBe("outlast");
    const past = beats.map((beat, index) => (index === GOLGAPPA_HER_STOP ? beat + lateMs + 1 : beat));
    expect(golgappaRules.outcomeOf({ taps: past, stopMs: null }, {})).toBe("choke");
  });

  it("chokes a masher at any speed, with or without a 「バス」 after her; a double tap now and then is no fault", () => {
    for (const gap of [100, 150, 200, 250, 300, 350, 400]) {
      expect(golgappaRules.outcomeOf({ taps: mash(gap), stopMs: null }, {}), `every ${gap} ms`).toBe("choke");
      expect(golgappaRules.outcomeOf({ taps: mash(gap, 500, GOLGAPPA_HER_HAND_MS + 300), stopMs: GOLGAPPA_HER_HAND_MS + 300 }, {}), `every ${gap} ms, then バス`).toBe("choke");
    }
    // Eating honestly to her 14th, then mashing the fast end.
    expect(golgappaRules.outcomeOf({ taps: [...beats.slice(0, GOLGAPPA_HER_STOP), ...mash(150, beats[GOLGAPPA_HER_STOP - 1] + 200)], stopMs: null }, {})).toBe("choke");
    // A second tap on every third golgappa: each eaten one empties a drop again.
    const doubled = beats.flatMap((beat, index) => (index % 3 === 0 ? [beat, beat + 150] : [beat]));
    expect(golgappaRules.outcomeOf({ taps: doubled, stopMs: null }, {})).toBe("outlast");
    // Taps while the vendor reaches for the first (before its window) are not counted.
    expect(rhythmTapJudge({ taps: [600, 900, 1100], stopMs: null }, GOLGAPPA_TUNING, 1200)).toMatchObject({ taps: 0, strays: 0, gauge: 0 });
  });

  it("rates in step with the outcome: a choke or an early バス ★1, with her or past her ★3 when nothing was left, else ★2", () => {
    const rate = (record: { taps: readonly number[]; stopMs: number | null }) => golgappaRules.rate!(record, {});
    const plan = (hit: (index: number) => boolean, stopAfter?: number) => rhythmTapRecordOf({ hit, ...(stopAfter === undefined ? {} : { stopAfter }) }, GOLGAPPA_TUNING);
    expect(rate(plan(all, 14))).toEqual({ stars: 3, scoreJa: "14個食べた・ぴったり14" });
    expect(rate(plan((index) => index !== 3, 14))).toMatchObject({ stars: 2 });
    expect(rate(plan(all))).toMatchObject({ stars: 3, scoreJa: "17個食べた・ぴったり17" });
    expect(rate(plan((index) => index !== 3))).toMatchObject({ stars: 2 });
    expect(rate(plan(all, 10))).toMatchObject({ stars: 1, scoreJa: "10個食べた・ぴったり10" });
    expect(rate(plan((index) => index < 8))).toMatchObject({ stars: 1 });
    expect(rate({ taps: mash(150), stopMs: null })).toMatchObject({ stars: 1 });
    // Over many plays: no record of a better outcome has fewer ★ than one of a worse (choke, you_first < together, outlast).
    let seed = 7;
    const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const worst = { together: 3, outlast: 3, you_first: 1, choke: 1 } as Record<string, number>;
    const best = { together: 0, outlast: 0, you_first: 0, choke: 0 } as Record<string, number>;
    for (let play = 0; play < 400; play++) {
      const stopAt = random() < 0.7 ? Math.round(9000 + random() * 6000) : null;
      const record = { taps: beats.map((beat) => beat + 40 + (random() - 0.5) * 400).filter((tap) => stopAt === null || tap < stopAt), stopMs: stopAt };
      const outcome = golgappaRules.outcomeOf(record, {});
      const stars = rate(record)?.stars ?? 0;
      worst[outcome] = Math.min(worst[outcome], stars);
      best[outcome] = Math.max(best[outcome], stars);
    }
    expect(Math.max(best.choke, best.you_first)).toBeLessThanOrEqual(Math.min(worst.together, worst.outlast));
  });

  it("builds the same duel from its numbers, and another from edited ones (Debug's room)", () => {
    expect(golgappaGame(GOLGAPPA_NUMBERS).tuning).toEqual(GOLGAPPA_TUNING);
    const slower = golgappaGame({ ...GOLGAPPA_NUMBERS, firstGapMs: 1500, peakLateMs: 240 });
    expect(slower.tuning.beats[1] - slower.tuning.beats[0]).toBe(1500);
    expect(slower.tuning.peak?.lateMs).toBe(240);
    expect(rhythmTapFairness(slower.tuning)).toEqual([]);
    expect(slower.handMs).toBeGreaterThan(GOLGAPPA_HER_HAND_MS);
  });
});
