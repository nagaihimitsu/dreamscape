import { describe, expect, it } from "vitest";
import { rhythmTapEnd, rhythmTapFairness, rhythmTapRecordOf } from "../engines/rhythm_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { golgappaDuel } from "./definition";
import { GOLGAPPA_FIELD, GOLGAPPA_HER_HAND_MS, GOLGAPPA_HER_STOP, GOLGAPPA_TUNING, golgappaHerLandings, golgappaRules } from "./rules";

const { beats } = GOLGAPPA_TUNING;
const end = rhythmTapEnd(GOLGAPPA_TUNING);

describeMiniGameRules(golgappaDuel, golgappaRules, { records: [
  { taps: [], stopMs: null }, { taps: [], stopMs: 0 }, { taps: beats, stopMs: null }, { taps: beats, stopMs: end },
  { taps: [Number.NaN], stopMs: Number.NaN }, { taps: [end + 1], stopMs: end + 1 },
] });

describe("the golgappa duel", () => {
  const outcome = (plan: Parameters<typeof rhythmTapRecordOf>[0]) => golgappaRules.outcomeOf(rhythmTapRecordOf(plan, GOLGAPPA_TUNING), {});
  const all = () => true;

  it("is fair on a phone, about 15 seconds, faster and faster to 0.6 s by her 14th", () => {
    expect(rhythmTapFairness(GOLGAPPA_TUNING)).toEqual([]);
    expect(beats).toHaveLength(17);
    expect(beats[1] - beats[0]).toBe(1200);
    expect(beats[GOLGAPPA_HER_STOP - 1] - beats[GOLGAPPA_HER_STOP - 2]).toBe(600);
    expect(beats[16] - beats[15]).toBe(600);
    expect(end).toBeGreaterThan(14000);
    expect(end).toBeLessThan(16500);
  });

  it("drops hers halfway before each of the player's, falling no longer than the gap, and her hand goes up between the 14th and 15th", () => {
    const hers = golgappaHerLandings();
    expect(hers).toHaveLength(GOLGAPPA_HER_STOP);
    hers.forEach((land, index) => {
      expect(land).toBeLessThan(beats[index]);
      if (index > 0) expect(land).toBeGreaterThan(beats[index - 1]);
    });
    expect(hers[0]).toBeGreaterThan(GOLGAPPA_FIELD.fallMs);
    expect(beats[GOLGAPPA_HER_STOP] - beats[GOLGAPPA_HER_STOP - 1]).toBeGreaterThan(GOLGAPPA_FIELD.fallMs);
    expect(GOLGAPPA_HER_HAND_MS).toBeGreaterThan(beats[GOLGAPPA_HER_STOP - 2]);
    expect(GOLGAPPA_HER_HAND_MS).toBeLessThan(beats[GOLGAPPA_HER_STOP]);
  });

  it("raises together within one of her 14th, first before that, outlasts after it or by eating them all", () => {
    expect(outcome({ hit: all, stopAfter: 13 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 14 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 15 })).toBe("together");
    expect(outcome({ hit: all, stopAfter: 12 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 0 })).toBe("you_first");
    expect(outcome({ hit: all, stopAfter: 16 })).toBe("outlast");
    expect(outcome({ hit: all })).toBe("outlast");
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
});
