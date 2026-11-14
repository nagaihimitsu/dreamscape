import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { CUE_TAP_TELL_MS, cueTapOutcome } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_NICHE_MS, CLOTH_PLAN, CLOTH_START_MS, CLOTH_STEPS, CLOTH_TUNING, clothFlapFairness, clothFlapRules, clothPlan } from "./rules";

describeMiniGameRules(clothFlap, clothFlapRules, { records: [null, 0, CLOTH_START_MS, CLOTH_END_MS, CLOTH_END_MS + 1, Number.NaN] });

describe("the flap's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs } = CLOTH_TUNING;
  const outcome = (ms: number | null) => clothFlapRules.outcomeOf(ms, {});
  const [decoy, freeze, feint, held] = CLOTH_PLAN.script.traps;

  it("spreads it right in front of her, too early before and too late after, however far off; frozen without a tap", () => {
    expect(outcome(CLOTH_NICHE_MS)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanEarlyMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS + cleanLateMs)).toBe("perfect");
    expect(outcome(CLOTH_NICHE_MS - cleanEarlyMs - 1)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS - nearEarlyMs - 1)).toBe("early");
    expect(outcome(CLOTH_START_MS)).toBe("early");
    expect(outcome(CLOTH_NICHE_MS + cleanLateMs + 1)).toBe("late");
    expect(outcome(CLOTH_END_MS)).toBe("late");
    expect(outcome(null)).toBe("frozen");
    expect(outcome(CLOTH_END_MS + 1)).toBe("frozen");
    // Before she starts down, a tap does not count (the play records none, and the player can still spread it).
    expect(cueTapOutcome(0, CLOTH_PLAN.tuning)).toBe("none");
    expect(cueTapOutcome(CLOTH_START_MS - 1, CLOTH_PLAN.tuning)).toBe("none");
  });

  it("is early at every fake-out: the boy on the gold step, her freeze, her reached foot, her held bob", () => {
    expect(CLOTH_PLAN.script.traps.map((trap) => trap.kind)).toEqual(["decoy", "rest", "feint", "rest"]);
    for (const trap of [decoy, freeze, feint, held]) expect(outcome(trap.at), trap.kind).toBe("early");
    // Each shows what it is before a player who falls for it would tap (a reaction and a little more).
    for (const trap of [decoy, freeze, held]) expect(trap.at - trap.tellAt, trap.kind).toBeGreaterThanOrEqual(CUE_TAP_TELL_MS);
    // The boy runs past the niche while she waits on the third step; she freezes on the fourth, then steps back up.
    const steps = CLOTH_PLAN.moves.map((move) => `${move.from}>${move.to}`);
    expect(steps).toEqual(["0>1", "1>2", "2>3", "3>4", "4>3", `3>${CLOTH_STEPS.gold}`, "5>6", "6>7", "7>8"]);
    const toFreeze = CLOTH_PLAN.moves[3];
    expect(CLOTH_PLAN.boy[CLOTH_STEPS.gold - 1].land).toBeLessThan(toFreeze.lift);
  });

  it("puts the climax last: a leap two steps down onto the gold step, off the beat of her bobs", () => {
    const leap = CLOTH_PLAN.moves.find((move) => move.kind === "leap")!;
    expect([leap.from, leap.to]).toEqual([CLOTH_STEPS.wary, CLOTH_STEPS.gold]);
    expect(leap.land + cleanEarlyMs).toBe(CLOTH_NICHE_MS);
    // Off the beat: the bobs would put it later; only the leap shows it, a reaction's time and more before the moment.
    expect(CLOTH_PLAN.script.read.guessAt).toBeGreaterThan(CLOTH_NICHE_MS);
    expect(CLOTH_NICHE_MS - CLOTH_PLAN.script.read.tellAt).toBeGreaterThanOrEqual(250);
    expect(CLOTH_PLAN.bobs).toHaveLength(3);
    expect(leap.lift - CLOTH_PLAN.bobs[2]).toBe(CLOTH_TUNING.leapAfterMs);
  });

  it("rates a flap for the result card in step with its outcome: perfect ★3, early or late ★2 near and ★1 far, frozen none", () => {
    const stars = new Map<string, Set<number | null>>();
    for (let ms = CLOTH_START_MS; ms <= CLOTH_END_MS + 50; ms += 5) {
      const rated = clothFlapRules.rate!(ms, {})?.stars ?? null;
      stars.set(outcome(ms), (stars.get(outcome(ms)) ?? new Set()).add(rated));
    }
    stars.set("frozen", new Set([clothFlapRules.rate!(null, {})?.stars ?? null]));
    expect(Object.fromEntries([...stars].map(([key, set]) => [key, [...set].sort()]))).toEqual({ perfect: [3], early: [1, 2], late: [1, 2], frozen: [null] });
    expect(clothFlapRules.rate!(CLOTH_NICHE_MS + 30, {})).toEqual({ stars: 3, scoreJa: "0.03秒差" });
  });

  it("is fair on a phone and in its tells, and an edited walk that breaks them is called unfair", () => {
    expect(clothFlapFairness(CLOTH_TUNING)).toEqual([]);
    // Her freeze shows a step's move and the clean window's early side before the beat it stops: a quicker step tells it too late.
    expect(clothFlapFairness({ ...CLOTH_TUNING, moveMs: 200 }).join()).toContain("shows what it is 270 ms before it");
    expect(clothFlapFairness({ ...CLOTH_TUNING, cleanEarlyMs: 40 }).join()).toContain("cleanEarlyMs 40");
    expect(clothFlapFairness({ ...CLOTH_TUNING, backMs: -400 }).join()).toContain("lands before it leaves");
    // The edited walk is the one the rules judge.
    expect(clothPlan({ ...CLOTH_TUNING, leapAfterMs: 400 }).script.moment).toBe(CLOTH_NICHE_MS + 140);
  });
});

// The difficulty targets (round 3): seeded players with human-like timing (engines/cue_tap/bot.ts). Bounds, not the exact
// shares (docs/13 2.2 lists them): an average first play spreads it perfectly about two times in five, a skilled one
// mostly, a careless one rarely; practice (knowing the walk) helps.
describe("the flap's difficulty", () => {
  const share = (player: keyof typeof CUE_TAP_PLAYERS, knows = false) =>
    cueTapShares(cueTapBotTally(CLOTH_PLAN.script, clothFlapRules, {}, CUE_TAP_PLAYERS[player], { plays: 1000, seed: 3, knows })).outcomes;

  it("spreads it perfectly for about two average players in five, most skilled ones and few careless ones", () => {
    const average = share("average");
    expect(average.perfect).toBeGreaterThan(0.3);
    expect(average.perfect).toBeLessThan(0.52);
    expect(Math.max(...Object.values(average))).toBeLessThan(0.7);
    expect(share("skilled").perfect).toBeGreaterThan(0.75);
    expect(share("careless").perfect).toBeLessThan(0.2);
    expect(share("average", true).perfect).toBeGreaterThan(average.perfect + 0.2);
  });
});
