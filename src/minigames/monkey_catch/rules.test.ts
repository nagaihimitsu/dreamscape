import { describe, expect, it } from "vitest";
import { cueTapCounts, cueTapFairness, cueTapOutcome } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { monkeyCatch } from "./definition";
import { MONKEY_END_MS, MONKEY_FIELD, MONKEY_HANDS_MS, MONKEY_RELEASE_MS, MONKEY_SLIP_MS, MONKEY_TUNING, monkeyCatchRules } from "./rules";

describeMiniGameRules(monkeyCatch, monkeyCatchRules, { records: [null, 0, MONKEY_RELEASE_MS, MONKEY_END_MS, MONKEY_END_MS + 1, Number.NaN] });

describe("the catch's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = MONKEY_TUNING;
  const outcome = (ms: number | null) => monkeyCatchRules.outcomeOf(ms, { thing: "bottle" });

  it("catches it right as it reaches the hands, lets it bounce off a little early or late, misses it further off", () => {
    expect(outcome(MONKEY_HANDS_MS)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS - cleanEarlyMs)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS + cleanLateMs)).toBe("caught");
    expect(outcome(MONKEY_HANDS_MS - cleanEarlyMs - 1)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS + cleanLateMs + 1)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS - nearEarlyMs)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS + nearLateMs)).toBe("fumbled");
    expect(outcome(MONKEY_HANDS_MS - nearEarlyMs - 1)).toBe("missed");
    expect(outcome(MONKEY_HANDS_MS + nearLateMs + 1)).toBe("missed");
    // Hands closed as it leaves the monkey's hand close on nothing; no tap in time lets it fall past.
    expect(outcome(MONKEY_RELEASE_MS)).toBe("missed");
    expect(outcome(null)).toBe("missed");
  });

  it("does not count hands closed while the monkey still holds it: the player can still catch it", () => {
    // No tap (the play records none, and its next tap decides): the rules read one as none.
    for (const early of [0, MONKEY_SLIP_MS, MONKEY_RELEASE_MS - 1]) {
      expect(cueTapCounts(early, MONKEY_TUNING)).toBe(false);
      expect(cueTapOutcome(early, MONKEY_TUNING)).toBe("none");
    }
    expect(cueTapCounts(MONKEY_RELEASE_MS, MONKEY_TUNING)).toBe(true);
  });

  it("rates a catch for the result card in step with its outcome: caught ★3, fumbled ★2, missed ★1 or none without a tap", () => {
    const stars = new Map<string, Set<number | null>>();
    for (let ms = MONKEY_RELEASE_MS; ms <= MONKEY_END_MS + 50; ms += 5) {
      const rated = monkeyCatchRules.rate!(ms, { thing: "bottle" })?.stars ?? null;
      stars.set(outcome(ms), (stars.get(outcome(ms)) ?? new Set()).add(rated));
    }
    stars.get("missed")!.add(monkeyCatchRules.rate!(null, { thing: "bottle" })?.stars ?? null);
    expect(Object.fromEntries([...stars].map(([key, set]) => [key, [...set].sort()]))).toEqual({ caught: [3], fumbled: [2], missed: [1, null] });
    expect(monkeyCatchRules.rate!(MONKEY_HANDS_MS + 60, { thing: "glasses" })).toEqual({ stars: 3, scoreJa: "0.06秒差" });
  });

  it("is fair on a phone, its grip gives before it lets go, and a thing not caught is gone below the hands before the play ends", () => {
    expect(cueTapFairness(MONKEY_TUNING)).toEqual([]);
    expect(MONKEY_TUNING.leadMs).toBe(MONKEY_FIELD.holdMs + MONKEY_FIELD.slipMs);
    expect(MONKEY_SLIP_MS).toBeLessThan(MONKEY_RELEASE_MS);
    // A late catch or bounce finds it still inside the hands; the play ends after it has fallen out of the field.
    expect(MONKEY_FIELD.throughMs).toBeGreaterThan(nearLateMs);
    expect(MONKEY_TUNING.noneAfterMs).toBeGreaterThan(MONKEY_FIELD.throughMs + MONKEY_FIELD.goneMs);
  });
});
