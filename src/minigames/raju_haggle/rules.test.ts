import { describe, expect, it } from "vitest";
import { stepPickFairness, stepPickStarts } from "../engines/step_pick/engine";
import { availableOutcome } from "../fallback";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rajuHaggle } from "./definition";
import { RAJU_MAP, RAJU_PRICES, RAJU_TUNING, rajuHaggleRules } from "./rules";

describeMiniGameRules(rajuHaggle, rajuHaggleRules, {
  records: [null, { kind: "take", ms: 0 }, { kind: "leave", ms: 0 }, { kind: "take", ms: 5400 }, { kind: "take", ms: Number.NaN }],
});

describe("Raju's haggle", () => {
  const outcome = (ms: number) => rajuHaggleRules.outcomeOf({ kind: "take", ms }, {});
  const [, fair, low] = stepPickStarts(RAJU_TUNING);

  it("deals at the price on show: the asking price, the fair one, his last; no deal on a leave or holding out", () => {
    expect(outcome(500)).toBe("buy_map");
    expect(outcome(fair - 1)).toBe("buy_map");
    expect(outcome(fair)).toBe("fair_map");
    expect(outcome(low)).toBe("haggle_map");
    expect(rajuHaggleRules.outcomeOf({ kind: "leave", ms: 500 }, {})).toBe("decline_map");
    expect(rajuHaggleRules.outcomeOf(null, {})).toBe("decline_map");
  });

  it("is fair on a phone: each price on show long enough to decide; a few seconds in all", () => {
    expect(stepPickFairness(RAJU_TUNING)).toEqual([]);
    expect(RAJU_TUNING.stepsMs.reduce((sum, ms) => sum + ms, 0)).toBeLessThanOrEqual(6000);
  });

  it("goes down in price, and a price the player cannot pay falls back to the next lower one, then to no deal", () => {
    const prices = RAJU_MAP.steps.map((step) => RAJU_PRICES[step]!);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(RAJU_PRICES[RAJU_MAP.leave]).toBeNull();
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
