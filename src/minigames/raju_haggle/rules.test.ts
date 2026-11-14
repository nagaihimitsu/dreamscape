import { describe, expect, it } from "vitest";
import { stepPickEnding, stepPickFairness, type StepPickRecord } from "../engines/step_pick/engine";
import { availableOutcome } from "../fallback";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rajuHaggle } from "./definition";
import { RAJU_MAP, RAJU_PATIENCE, RAJU_PRICES, RAJU_TUNING, rajuHaggleRules } from "./rules";

describeMiniGameRules(rajuHaggle, rajuHaggleRules, {
  records: [
    { pushes: [], end: null }, { pushes: [], end: { kind: "take", ms: 0 } }, { pushes: [], end: { kind: "leave", ms: 0 } },
    { pushes: [500, 510, 520, 530, 540, 550], end: null }, { pushes: [], end: { kind: "take", ms: Number.NaN } }, null as unknown as StepPickRecord,
  ],
});

describe("Raju's haggle", () => {
  /** Stares a second apart from the start, then 「この値段で」 half a second after the last. */
  const stares = (count: number): number[] => Array.from({ length: count }, (_, index) => 1000 + index * 1000);
  const takeAfter = (count: number) => rajuHaggleRules.outcomeOf({ pushes: stares(count), end: { kind: "take", ms: 1500 + count * 1000 } }, {});

  it("is the staring contest: two stares a price down, his asking price, then ₹40, then ₹30 at the fourth stare", () => {
    expect(takeAfter(0)).toBe("buy_map");
    expect(takeAfter(1)).toBe("buy_map");
    expect(takeAfter(2)).toBe("fair_map");
    expect(takeAfter(3)).toBe("fair_map");
    expect(takeAfter(4)).toBe("haggle_map");
  });

  it("loses the map on a fifth stare, on 「やめておく」, or after twelve seconds of nothing; time alone never lowers the price", () => {
    expect(RAJU_PATIENCE).toBe(5);
    expect(takeAfter(5)).toBe("decline_map");
    expect(stepPickEnding({ pushes: stares(5), end: null }, RAJU_TUNING)).toEqual({ kind: "out" });
    expect(rajuHaggleRules.outcomeOf({ pushes: [1000], end: { kind: "leave", ms: 1500 } }, {})).toBe("decline_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: null }, {})).toBe("decline_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: { kind: "take", ms: 11900 } }, {})).toBe("buy_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: { kind: "take", ms: 12000 } }, {})).toBe("decline_map");
  });

  it("counts stares closer than 350 ms once: mashing the button is one stare", () => {
    expect(RAJU_TUNING.pushGapMs).toBe(350);
    expect(rajuHaggleRules.outcomeOf({ pushes: [1000, 1100, 1200, 1300], end: { kind: "take", ms: 1500 } }, {})).toBe("buy_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [1000, 1350], end: { kind: "take", ms: 1500 } }, {})).toBe("fair_map");
    // A quick burst is one stare; mashing on is a stare every 350 ms, and loses the map soon (not a mashing game).
    expect(rajuHaggleRules.outcomeOf({ pushes: Array.from({ length: 7 }, (_, index) => 1000 + index * 50), end: { kind: "take", ms: 1400 } }, {})).toBe("buy_map");
    expect(stepPickEnding({ pushes: Array.from({ length: 30 }, (_, index) => 1000 + index * 50), end: null }, RAJU_TUNING)).toEqual({ kind: "out" });
  });

  it("plays 「おまかせ」 by replaying the stares each deal needs", () => {
    expect(rajuHaggleRules.autoRecord("buy_map", {}).pushes).toHaveLength(0);
    expect(rajuHaggleRules.autoRecord("fair_map", {}).pushes).toHaveLength(2);
    expect(rajuHaggleRules.autoRecord("haggle_map", {}).pushes).toHaveLength(4);
    expect(rajuHaggleRules.autoRecord("decline_map", {})).toEqual({ pushes: [], end: { kind: "leave", ms: 1000 } });
  });

  it("is fair on a phone: ₹30 is reachable before his patience ends, and there is time to decide", () => {
    expect(stepPickFairness(RAJU_TUNING)).toEqual([]);
  });

  it("goes down in price, and a price the player cannot pay falls back to the next lower one, then to no deal", () => {
    const prices = RAJU_MAP.steps.map((step) => RAJU_PRICES[step]!);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(RAJU_PRICES[RAJU_MAP.leave]).toBeNull();
    expect(RAJU_PRICES[RAJU_MAP.out]).toBeNull();
    const all = rajuHaggle.outcomes.map((item) => item.id);
    // Each priced outcome falls back to the next lower price (Raju lowers it to what the player has), the last to no deal.
    expect(availableOutcome(rajuHaggle, "buy_map", all.filter((id) => id !== "buy_map"))).toBe("fair_map");
    expect(availableOutcome(rajuHaggle, "buy_map", ["haggle_map", "decline_map"])).toBe("haggle_map");
    expect(availableOutcome(rajuHaggle, "fair_map", ["decline_map"])).toBe("decline_map");
    // No deal needs nothing: it has no fallback, and every way ends there.
    expect(rajuHaggle.outcomes.find((item) => item.id === "decline_map")?.fallback).toBeUndefined();
    for (const id of all) expect(availableOutcome(rajuHaggle, id, ["decline_map"])).toBe("decline_map");
  });
});
