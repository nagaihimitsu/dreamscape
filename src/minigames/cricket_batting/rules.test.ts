import { describe, expect, it } from "vitest";
import { cueTapFairness } from "../engines/cue_tap/engine";
import { describeMiniGameRules } from "../testing/rules-contract";
import { cricketBatting } from "./definition";
import { CRICKET_CONTACT_MS, CRICKET_END_MS, CRICKET_FIELD, CRICKET_RELEASE_MS, CRICKET_TUNING, cricketRules } from "./rules";

describeMiniGameRules(cricketBatting, cricketRules, { records: [null, 0, CRICKET_RELEASE_MS, CRICKET_END_MS, CRICKET_END_MS + 1, Number.NaN] });

describe("the cricket's timing", () => {
  const { cleanEarlyMs, cleanLateMs, nearEarlyMs, nearLateMs } = CRICKET_TUNING;
  const outcome = (ms: number | null) => cricketRules.outcomeOf(ms, {});

  it("hits clean around the ball's arrival, pulls it a little early, edges it a little late, misses further off", () => {
    expect(outcome(CRICKET_CONTACT_MS)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS - cleanEarlyMs)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS + cleanLateMs)).toBe("six");
    expect(outcome(CRICKET_CONTACT_MS + cleanLateMs + 1)).toBe("edge");
    expect(outcome(CRICKET_CONTACT_MS - nearEarlyMs)).toBe("over_wall");
    expect(outcome(CRICKET_CONTACT_MS + nearLateMs + 1)).toBe("bowled");
    // A swing as the ball leaves her hand is far too early: it misses. One during her run-up does not count (the batter
    // can still swing at the ball); no swing in time: no_swing.
    expect(outcome(CRICKET_RELEASE_MS)).toBe("bowled");
    expect(outcome(CRICKET_RELEASE_MS - 1)).toBe("no_swing");
    expect(outcome(0)).toBe("no_swing");
    expect(outcome(null)).toBe("no_swing");
  });

  it("rates a swing for the result card in step with its outcome (a clean hit ★3, near ★2, a miss ★1, no swing none), saying how far off", () => {
    const rate = (ms: number | null) => cricketRules.rate!(ms, {});
    expect(rate(CRICKET_CONTACT_MS)).toEqual({ stars: 3, scoreJa: "ずれ 0.00秒" });
    expect(rate(CRICKET_CONTACT_MS + 40)).toEqual({ stars: 3, scoreJa: "ずれ 0.04秒" });
    expect(rate(CRICKET_CONTACT_MS - 120)).toEqual({ stars: 2, scoreJa: "0.12秒早い" });
    expect(rate(CRICKET_CONTACT_MS + 150)).toEqual({ stars: 2, scoreJa: "0.15秒遅い" });
    expect(rate(CRICKET_CONTACT_MS + nearLateMs + 50)?.stars).toBe(1);
    expect(rate(null)).toBeNull();
    // ★ never disagree with the story's outcome: each outcome's swings have one number of ★.
    const stars = new Map<string, Set<number | null>>();
    for (let ms = CRICKET_RELEASE_MS; ms <= CRICKET_END_MS + 50; ms += 5) {
      const outcome = cricketRules.outcomeOf(ms, {});
      stars.set(outcome, (stars.get(outcome) ?? new Set()).add(rate(ms)?.stars ?? null));
    }
    expect(Object.fromEntries([...stars].map(([outcome, set]) => [outcome, [...set]]))).toEqual({ six: [3], over_wall: [2], edge: [2], bowled: [1], no_swing: [null] });
  });

  it("lets a ball go onto the still plank with letgo plank: a swing after it has met the plank is no swing (no ★), earlier ones as on any ball", () => {
    const plank = { letgo: "plank" as const };
    const outcomeOn = (ms: number | null) => cricketRules.outcomeOf(ms, plank);
    expect(outcomeOn(null)).toBe("no_swing");
    expect(outcomeOn(CRICKET_CONTACT_MS + nearLateMs + 1)).toBe("no_swing");
    expect(outcomeOn(CRICKET_END_MS)).toBe("no_swing");
    expect(cricketRules.rate!(CRICKET_CONTACT_MS + nearLateMs + 50, plank)).toBeNull();
    // Before the plank: the same outcomes and ★ as the first ball's.
    for (const ms of [CRICKET_RELEASE_MS, CRICKET_CONTACT_MS - nearEarlyMs, CRICKET_CONTACT_MS, CRICKET_CONTACT_MS + nearLateMs]) {
      expect(outcomeOn(ms)).toBe(outcome(ms));
      expect(cricketRules.rate!(ms, plank)).toEqual(cricketRules.rate!(ms, {}));
    }
    // The plank's knock comes after the near window (a late swing there still edges the ball).
    expect(CRICKET_FIELD.bricksMs).toBeGreaterThan(nearLateMs);
  });

  it("is fair on a phone, and the ball reaches the bricks after the near window, before the end", () => {
    expect(cueTapFairness(CRICKET_TUNING)).toEqual([]);
    // After the host's 3・2・1 her run-up starts at once (the count already showed the pitch).
    expect(CRICKET_FIELD.settleMs).toBeLessThanOrEqual(200);
    expect(CRICKET_TUNING.leadMs).toBe(CRICKET_FIELD.settleMs + CRICKET_FIELD.runUpMs);
    expect(CRICKET_FIELD.bricksMs).toBeGreaterThan(nearLateMs);
    expect(CRICKET_TUNING.noneAfterMs).toBeGreaterThan(CRICKET_FIELD.bricksMs);
  });
});
