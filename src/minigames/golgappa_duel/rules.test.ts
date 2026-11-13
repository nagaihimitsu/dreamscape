import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapJudge, rhythmTapRecordOf, rhythmTapWindow } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { golgappaDuel } from "./definition";
import {
  GOLGAPPA_FIELD, GOLGAPPA_HER_HAND_MS, GOLGAPPA_HER_STOP, GOLGAPPA_TOGETHER_BEFORE_MS, GOLGAPPA_TUNING, golgappaHerLandings,
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
    expect(beats.slice(GOLGAPPA_HER_STOP - 1).map((beat, index, after) => (index ? beat - after[index - 1] : 0)).slice(1)).toEqual([480, 420, 420]);
    expect(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP - 1).lateMs).toBeGreaterThan(rhythmTapWindow(GOLGAPPA_TUNING, GOLGAPPA_HER_STOP).lateMs);
    expect(end).toBeGreaterThan(14000);
    expect(end).toBeLessThan(16500);
  });

  it("drops hers halfway before each of the player's, falling no longer than the gap, and her hand goes up just before the player's 14th", () => {
    const hers = golgappaHerLandings();
    expect(hers).toHaveLength(GOLGAPPA_HER_STOP);
    hers.forEach((land, index) => {
      expect(land).toBeLessThan(beats[index]);
      if (index > 0) expect(land).toBeGreaterThan(beats[index - 1]);
    });
    expect(hers[0]).toBeGreaterThan(GOLGAPPA_FIELD.fallMs);
    // One falls at a time: each drop (hers or the player's) starts after the one before has landed.
    const drops = [...hers, ...beats].sort((a, b) => a - b);
    for (const [index, drop] of drops.slice(1).entries()) expect(drop - drops[index], `drop ${index + 2}`).toBeGreaterThan(GOLGAPPA_FIELD.fallMs);
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
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_TOGETHER_BEFORE_MS)).toBe("together");
    expect(at(GOLGAPPA_HER_HAND_MS - GOLGAPPA_TOGETHER_BEFORE_MS - 1)).toBe("you_first");
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
});
