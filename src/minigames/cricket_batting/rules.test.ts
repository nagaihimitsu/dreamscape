import { describe, expect, it } from "vitest";
import { CUE_TAP_PLAYERS, cueTapBotTally, cueTapShares } from "../engines/cue_tap/bot";
import { CUE_TAP_TELL_MS } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { cricketBatting } from "./definition";
import {
  CRICKET_CONTACT_MS, CRICKET_END_MS, CRICKET_PLAN, CRICKET_RELEASE_MS, CRICKET_TUNING, cricketCounts, cricketFairness, cricketPlan, cricketRules, cricketTravel,
} from "./rules";

const { bouncer } = CRICKET_PLAN;
describeMiniGameRules(cricketBatting, cricketRules, {
  records: [null, 0, bouncer.release, bouncer.gone, CRICKET_RELEASE_MS, CRICKET_END_MS, CRICKET_END_MS + 1, Number.NaN],
});

describe("the cricket's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = CRICKET_TUNING;
  const outcome = (ms: number | null, ball: "quick" | "slower" = "quick") => cricketRules.outcomeOf(ms, { ball });

  it("hits clean around the real ball's arrival, pulls it a little early, edges it a little late, misses further off", () => {
    expect(outcome(CRICKET_CONTACT_MS)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS - cleanEarlyMs)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS + cleanLateMs)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS + cleanLateMs + 1)).toBe("edge");
    expect(outcome(CRICKET_CONTACT_MS - nearEarlyMs)).toBe("over_wall");
    expect(outcome(CRICKET_CONTACT_MS + nearLateMs + 1)).toBe("bowled");
    // A swing as the real ball leaves her hand is far too early: it misses. No swing in time: no_swing.
    expect(outcome(CRICKET_RELEASE_MS)).toBe("bowled");
    expect(outcome(null)).toBe("no_swing");
    expect(outcome(0)).toBe("no_swing");
  });

  it("tips a swing at the bouncer over the side wall (however timed); a swing once it is gone, or during her walk back, does not count", () => {
    for (const ms of [bouncer.release, bouncer.bounce, bouncer.bat, bouncer.reach]) expect(outcome(ms), String(ms)).toBe("over_wall");
    expect(cricketRules.rate!(bouncer.bat, {})).toEqual({ stars: 1, scoreJa: "高い球に振った" });
    for (const ms of [bouncer.reach + 1, bouncer.gone, CRICKET_RELEASE_MS - 1]) {
      expect(cricketCounts(CRICKET_PLAN, ms), String(ms)).toBe(false);
      expect(outcome(ms), String(ms)).toBe("no_swing");
    }
    expect(cricketCounts(CRICKET_PLAN, CRICKET_RELEASE_MS)).toBe(true);
    expect(cricketCounts(CRICKET_PLAN, bouncer.release - 1)).toBe(false);
    // Its kick off the crack shows it, a reaction and more before it passes the bat.
    const [trap] = CRICKET_PLAN.script.traps;
    expect(trap).toEqual({ kind: "decoy", at: bouncer.bat, tellAt: bouncer.bounce });
    expect(trap.at - trap.tellAt).toBeGreaterThanOrEqual(CUE_TAP_TELL_MS);
  });

  it("changes the real ball's pace at the bounce: the quick one holds up, the slower one skids on", () => {
    const quick = cricketPlan(CRICKET_TUNING, "quick");
    const slower = cricketPlan(CRICKET_TUNING, "slower");
    expect(quick.speeds.post).toBeLessThan(quick.speeds.pre);
    expect(quick.script.read.guessAt).toBeLessThan(quick.contact);
    expect(slower.speeds.post).toBeGreaterThan(slower.speeds.pre);
    expect(slower.script.read.guessAt).toBeGreaterThan(slower.contact);
    // A swing timed by the first part's pace: early on the quick ball, late on the slower one.
    expect(outcome(quick.script.read.guessAt)).toBe("over_wall");
    expect(outcome(slower.script.read.guessAt, "slower")).toBe("edge");
    // The needle follows the ball: 0 through the bouncer, at the bat (1) at its arrival, never back.
    expect(cricketTravel(quick, bouncer.bat)).toBe(0);
    expect(cricketTravel(quick, quick.contact)).toBeCloseTo(1, 9);
    let last = 0;
    for (let ms = 0; ms <= quick.script.end; ms += 10) {
      const travel = cricketTravel(quick, ms);
      expect(travel).toBeGreaterThanOrEqual(last);
      last = travel;
    }
  });

  it("rates a swing for the result card in step with its outcome (a clean hit ★3, near ★2, a miss ★1, no swing none), saying how far off", () => {
    const rate = (ms: number | null) => cricketRules.rate!(ms, {});
    expect(rate(CRICKET_CONTACT_MS)).toEqual({ stars: 3, scoreJa: "ずれ 0.00秒" });
    expect(rate(CRICKET_CONTACT_MS + 40)).toEqual({ stars: 3, scoreJa: "ずれ 0.04秒" });
    expect(rate(CRICKET_CONTACT_MS - 120)).toEqual({ stars: 2, scoreJa: "0.12秒早い" });
    expect(rate(CRICKET_CONTACT_MS + 150)).toEqual({ stars: 2, scoreJa: "0.15秒遅い" });
    expect(rate(CRICKET_CONTACT_MS + nearLateMs + 50)?.stars).toBe(1);
    expect(rate(null)).toBeNull();
    expect(rate(bouncer.gone)).toBeNull();
    // ★ never disagree with the story's outcome: each outcome's swings at the real ball have one number of ★ (and a swing
    // at the bouncer, over_wall, ★1: never more than a clean hit, never less than a miss).
    const stars = new Map<string, Set<number | null>>();
    for (let ms = CRICKET_RELEASE_MS; ms <= CRICKET_END_MS + 50; ms += 5) {
      const result = cricketRules.outcomeOf(ms, {});
      stars.set(result, (stars.get(result) ?? new Set()).add(rate(ms)?.stars ?? null));
    }
    expect(Object.fromEntries([...stars].map(([key, set]) => [key, [...set]]))).toEqual({ six: [3], over_wall: [2], edge: [2], bowled: [1], no_swing: [null] });
  });

  it("lets a ball go onto the still plank with letgo plank: a swing after it has met the plank is no swing (no ★), earlier ones as on any ball", () => {
    const plank = { ball: "slower" as const, letgo: "plank" as const };
    const slower = cricketPlan(CRICKET_TUNING, "slower");
    const outcomeOn = (ms: number | null) => cricketRules.outcomeOf(ms, plank);
    expect(outcomeOn(null)).toBe("no_swing");
    expect(outcomeOn(slower.contact + nearLateMs + 1)).toBe("no_swing");
    expect(outcomeOn(slower.script.end)).toBe("no_swing");
    expect(cricketRules.rate!(slower.contact + nearLateMs + 50, plank)).toBeNull();
    // Before the plank: the same outcomes and ★ as without it.
    for (const ms of [slower.release, slower.contact - nearEarlyMs, slower.contact, slower.contact + nearLateMs, bouncer.bat]) {
      expect(outcomeOn(ms)).toBe(outcome(ms, "slower"));
      expect(cricketRules.rate!(ms, plank)).toEqual(cricketRules.rate!(ms, { ball: "slower" }));
    }
  });

  it("is fair on a phone and in its tells, and an edited tuning that breaks them is called unfair", () => {
    expect(cricketFairness(CRICKET_TUNING)).toEqual([]);
    // After the host's 3・2・1 her run-up starts at once (the count already showed the pitch).
    expect(CRICKET_TUNING.settleMs).toBeLessThanOrEqual(200);
    expect(cricketFairness({ ...CRICKET_TUNING, bricksMs: 200 }).join()).toContain("inside the late near window");
    expect(cricketFairness({ ...CRICKET_TUNING, bouncerBounceMs: 600 }).join()).toContain("shows what it is 180 ms before it");
    expect(cricketFairness({ ...CRICKET_TUNING, quickPreMs: 300 }).join()).toContain("quick: the moment's last change shows");
  });
});

// The difficulty targets (round 3): seeded players with human-like timing (engines/cue_tap/bot.ts). Bounds, not the exact
// shares (docs/13 2.2 lists them). One ball counts in the story, so the six stays commoner than the other games' best.
describe("the cricket's difficulty", () => {
  const share = (player: keyof typeof CUE_TAP_PLAYERS, ball: "quick" | "slower" = "quick", knows = false) => {
    const plan = cricketPlan(CRICKET_TUNING, ball);
    // A swing during her walk back is turned away (cricketCounts): the player swings again at the real ball.
    const counts = (ms: number) => cricketCounts(plan, ms);
    return cueTapShares(cueTapBotTally(plan.script, cricketRules, { ball }, CUE_TAP_PLAYERS[player], { plays: 1000, seed: 9, knows, counts })).outcomes;
  };

  it("is hit for six by about half the average players, most skilled ones and few careless ones, with either ball", () => {
    for (const ball of ["quick", "slower"] as const) {
      const average = share("average", ball);
      expect(average.six, ball).toBeGreaterThan(0.45);
      expect(average.six, ball).toBeLessThan(0.7);
      expect(average.over_wall, ball).toBeGreaterThan(0.15);
      expect(share("skilled", ball).six, ball).toBeGreaterThan(0.85);
      expect(share("careless", ball).six, ball).toBeLessThan(0.35);
      expect(share("average", ball, true).six, ball).toBeGreaterThan(average.six + 0.15);
    }
  });
});
