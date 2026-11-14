import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { CUE_TAP_TELL_MS, cueTapCounts, cueTapOutcome } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { monkeyCatch } from "./definition";
import { MONKEY_END_MS, MONKEY_HANDS_MS, MONKEY_PLAN, MONKEY_RELEASE_MS, MONKEY_START_MS, MONKEY_TUNING, monkeyCatchFairness, monkeyCatchRules, monkeyPlan } from "./rules";

describeMiniGameRules(monkeyCatch, monkeyCatchRules, { records: [null, 0, MONKEY_START_MS, MONKEY_RELEASE_MS, MONKEY_END_MS, MONKEY_END_MS + 1, Number.NaN] });

describe("the catch's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = MONKEY_TUNING;
  const outcome = (ms: number | null) => monkeyCatchRules.outcomeOf(ms, { thing: "bottle" });
  const [feint, shell, snatched, second] = MONKEY_PLAN.script.traps;

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
    expect(outcome(MONKEY_RELEASE_MS)).toBe("missed");
    expect(outcome(null)).toBe("missed");
  });

  it("does not count hands closed while the monkey only holds it out: the player can still catch it", () => {
    for (const early of [0, MONKEY_START_MS - 1]) {
      expect(cueTapCounts(early, MONKEY_PLAN.tuning)).toBe(false);
      expect(cueTapOutcome(early, MONKEY_PLAN.tuning)).toBe("none");
    }
    expect(cueTapCounts(MONKEY_START_MS, MONKEY_PLAN.tuning)).toBe(true);
  });

  it("teases in order: a feint, a shell, a fall snatched back, then the real fall with a second shell beside it", () => {
    expect(MONKEY_PLAN.script.traps.map((trap) => trap.kind)).toEqual(["feint", "decoy", "rest", "decoy"]);
    // Hands closed at the feint, on the first shell or on the snatched-back fall: it falls past them later.
    for (const trap of [feint, shell, snatched]) expect(outcome(trap.at), trap.kind).toBe("missed");
    // On the second shell (it reaches the hands first, beside the thing): the thing bounces off the closed fingers.
    expect(outcome(second.at)).toBe("fumbled");
    expect(second.at).toBe(MONKEY_PLAN.script.read.guessAt);
    for (const trap of [shell, snatched, second]) expect(trap.at - trap.tellAt, trap.kind).toBeGreaterThanOrEqual(CUE_TAP_TELL_MS);
    // The ledge: on the thing's way down, and it comes on later than a straight fall.
    expect(MONKEY_PLAN.ledge).toBeGreaterThan(MONKEY_RELEASE_MS);
    expect(MONKEY_HANDS_MS).toBeGreaterThan(MONKEY_RELEASE_MS + MONKEY_TUNING.fallMs);
    expect(MONKEY_HANDS_MS - MONKEY_PLAN.ledge).toBeGreaterThanOrEqual(250);
  });

  it("rates a catch for the result card in step with its outcome: caught ★3, fumbled ★2, missed ★1 or none without a tap", () => {
    const stars = new Map<string, Set<number | null>>();
    for (let ms = MONKEY_START_MS; ms <= MONKEY_END_MS + 50; ms += 5) {
      const rated = monkeyCatchRules.rate!(ms, { thing: "bottle" })?.stars ?? null;
      stars.set(outcome(ms), (stars.get(outcome(ms)) ?? new Set()).add(rated));
    }
    stars.get("missed")!.add(monkeyCatchRules.rate!(null, { thing: "bottle" })?.stars ?? null);
    expect(Object.fromEntries([...stars].map(([key, set]) => [key, [...set].sort()]))).toEqual({ caught: [3], fumbled: [2], missed: [1, null] });
    expect(monkeyCatchRules.rate!(MONKEY_HANDS_MS + 60, { thing: "glasses" })).toEqual({ stars: 3, scoreJa: "0.06秒差" });
  });

  it("is fair on a phone and in its tells, and an edited teasing that breaks them is called unfair", () => {
    expect(monkeyCatchFairness(MONKEY_TUNING)).toEqual([]);
    expect(monkeyCatchFairness({ ...MONKEY_TUNING, snatchMs: 900 }).join()).toContain("snatches the thing back after");
    expect(monkeyCatchFairness({ ...MONKEY_TUNING, ledgeMs: 600 }).join()).toContain("before where the pattern put it");
    expect(monkeyCatchFairness({ ...MONKEY_TUNING, cleanLateMs: 80 }).join()).toContain("a phone lands a tap late");
    expect(monkeyPlan({ ...MONKEY_TUNING, afterLedgeMs: 500 }).hands).toBe(MONKEY_HANDS_MS + 40);
  });
});

// The difficulty targets (round 3): seeded players with human-like timing (engines/cue_tap/bot.ts). Bounds, not the exact
// shares (docs/13 2.2 lists them).
describe("the catch's difficulty", () => {
  const share = (player: keyof typeof CUE_TAP_PLAYERS, knows = false) =>
    cueTapShares(cueTapBotTally(MONKEY_PLAN.script, monkeyCatchRules, { thing: "bottle" }, CUE_TAP_PLAYERS[player], { plays: 1000, seed: 5, knows })).outcomes;

  it("is caught by about two average players in five, most skilled ones and few careless ones", () => {
    const average = share("average");
    expect(average.caught).toBeGreaterThan(0.3);
    expect(average.caught).toBeLessThan(0.55);
    expect(Math.max(...Object.values(average))).toBeLessThan(0.7);
    expect(average.fumbled).toBeGreaterThan(0.08);
    expect(share("skilled").caught).toBeGreaterThan(0.75);
    expect(share("careless").caught).toBeLessThan(0.2);
    expect(share("average", true).caught).toBeGreaterThan(average.caught + 0.2);
  });
});
