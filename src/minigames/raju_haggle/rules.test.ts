import { describe, expect, it } from "vitest";
import { stepPickEnding, stepPickFairness, stepPickRoutine, stepPickStanding, stepPickStretchAt, type StepPickRecord } from "../engines/step_pick/engine";
import { availableOutcome } from "../fallback";
import { describeMiniGameRules } from "../testing/rules-contract";
import { rajuHaggle } from "./definition";
import { RAJU_HAGGLE_TUNING, RAJU_MAP, RAJU_PRICES, RAJU_PRIDE, RAJU_TUNING, rajuHaggleRules, rajuStepTuning } from "./rules";

describeMiniGameRules(rajuHaggle, rajuHaggleRules, {
  records: [
    { pushes: [], end: null }, { pushes: [], end: { kind: "take", ms: 0 } }, { pushes: [], end: { kind: "leave", ms: 0 } },
    { pushes: [500, 510, 520, 530, 540, 550], end: null }, { pushes: [], end: { kind: "take", ms: Number.NaN } }, null as unknown as StepPickRecord,
  ],
});

/** When his routine (for where the play stands after `pushes`) is in `look`, a little into it, from `from` on. */
function whenLook(pushes: readonly number[], look: string, from = 0): number {
  const { standing } = stepPickStanding(pushes, RAJU_TUNING);
  const routine = stepPickRoutine(RAJU_TUNING, standing);
  for (let at = Math.max(from, standing.since); at < standing.since + 30000; at += 50) {
    if (stepPickStretchAt(routine, at - standing.since).stretch.look === look) return at + 400;
  }
  throw new Error(`no ${look}`);
}
/** Stares each in his next wobble (or `look`), from the start. */
function staresIn(count: number, look = "wobble"): number[] {
  const pushes: number[] = [];
  for (let index = 0; index < count; index++) pushes.push(whenLook(pushes, look, (pushes.at(-1) ?? 0) + 400));
  return pushes;
}
const takeAfter = (pushes: readonly number[]) => rajuHaggleRules.outcomeOf({ pushes, end: { kind: "take", ms: (pushes.at(-1) ?? 0) + 500 } }, {});

describe("Raju's haggle: a staring contest you read", () => {
  it("opens with his boast (a stare bounces), then his eyes wander (a stare lands), by turns", () => {
    const routine = stepPickRoutine(RAJU_TUNING, { step: 0, landed: 0 });
    expect(routine.map((stretch) => stretch.look)).toEqual(["boast", "wobble", "boast", "wobble"]);
    expect(stepPickStretchAt(routine, 100).stretch.mood).toBe("closed");
    expect(stepPickStretchAt(routine, RAJU_HAGGLE_TUNING.boastFirstMs + 100).stretch.mood).toBe("open");
    // His last two take turns for as long as the player waits.
    const later = stepPickStretchAt(routine, 60000);
    expect(["boast", "wobble"]).toContain(later.stretch.look);
  });

  it("lowers his price a step for two stares that land in his wobbles: ₹50, ₹40, ₹30", () => {
    expect(takeAfter([])).toBe("buy_map");
    expect(takeAfter(staresIn(1))).toBe("buy_map");
    expect(takeAfter(staresIn(2))).toBe("fair_map");
    expect(takeAfter(staresIn(3))).toBe("fair_map");
    expect(takeAfter(staresIn(4))).toBe("haggle_map");
  });

  it("bounces a stare in his boast: no lower price, his pride hurt; three and he keeps the map", () => {
    expect(RAJU_PRIDE).toBe(3);
    const boasts = [600, 1000];
    expect(takeAfter(boasts)).toBe("buy_map");
    expect(stepPickStanding(boasts, RAJU_TUNING).standing.bounces).toBe(2);
    expect(stepPickEnding({ pushes: [600, 1000, 1350], end: null }, RAJU_TUNING)).toEqual({ kind: "out" });
    expect(rajuHaggleRules.outcomeOf({ pushes: [600, 1000, 1350], end: { kind: "take", ms: 1500 } }, {})).toBe("decline_map");
  });

  it("pretends to walk away after his first landed stare at ₹40: a stare at his peek calls the bluff (₹30 at once); waited out, he comes back", () => {
    const toForty = staresIn(3);
    const routine = stepPickRoutine(RAJU_TUNING, stepPickStanding(toForty, RAJU_TUNING).standing);
    expect(routine.map((stretch) => stretch.look).slice(0, 3)).toEqual(["turn", "peek", "back"]);
    // A stare at the peek.
    const called = [...toForty, whenLook(toForty, "peek")];
    expect(stepPickStanding(called, RAJU_TUNING).results.at(-1)).toBe("called");
    expect(takeAfter(called)).toBe("haggle_map");
    // A stare as he turns away (before the peek) bounces.
    const turning = [...toForty, whenLook(toForty, "turn")];
    expect(stepPickStanding(turning, RAJU_TUNING).results.at(-1)).toBe("bounced");
    expect(takeAfter(turning)).toBe("fair_map");
    // Waited out: he comes back, and his wobble still takes a stare.
    const after = [...toForty, whenLook(toForty, "wobble", toForty.at(-1)! + 3000)];
    expect(takeAfter(after)).toBe("haggle_map");
  });

  it("has nothing left at ₹30: every stare bounces, and pushing on loses the map", () => {
    const thirty = staresIn(4);
    const more = [...thirty, thirty.at(-1)! + 800];
    expect(stepPickStanding(more, RAJU_TUNING).results.at(-1)).toBe("bounced");
    expect(takeAfter(more)).toBe("haggle_map");
    expect(stepPickEnding({ pushes: [...thirty, thirty.at(-1)! + 800, thirty.at(-1)! + 1600, thirty.at(-1)! + 2400], end: null }, RAJU_TUNING)).toEqual({ kind: "out" });
  });

  it("never lowers the price by time alone; 「やめておく」 or twelve seconds of nothing is no deal", () => {
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: { kind: "take", ms: 11900 } }, {})).toBe("buy_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: { kind: "take", ms: 12000 } }, {})).toBe("decline_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: [], end: null }, {})).toBe("decline_map");
    expect(rajuHaggleRules.outcomeOf({ pushes: staresIn(2), end: { kind: "leave", ms: 9000 } }, {})).toBe("decline_map");
  });

  it("counts stares closer than 350 ms once: mashing the button is one stare", () => {
    expect(RAJU_TUNING.pushGapMs).toBe(350);
    const wobble = whenLook([], "wobble");
    expect(stepPickStanding([wobble, wobble + 100, wobble + 200], RAJU_TUNING).results).toEqual(["landed"]);
    // Mashing on through his moods bounces in his boasts and soon loses the map (not a mashing game).
    expect(stepPickEnding({ pushes: Array.from({ length: 40 }, (_, index) => 500 + index * 360), end: null }, RAJU_TUNING)).toEqual({ kind: "out" });
  });

  it("plays 「おまかせ」 by staring in his wobbles (and at his peek), and bouncing for no deal", () => {
    expect(rajuHaggleRules.autoRecord("buy_map", {}).pushes).toHaveLength(0);
    const fair = rajuHaggleRules.autoRecord("fair_map", {});
    expect(stepPickStanding(fair.pushes, RAJU_TUNING).results).toEqual(["landed", "landed"]);
    const haggle = rajuHaggleRules.autoRecord("haggle_map", {});
    expect(stepPickStanding(haggle.pushes, RAJU_TUNING).results).toEqual(["landed", "landed", "landed", "called"]);
    expect(rajuHaggleRules.autoRecord("decline_map", {})).toEqual({ pushes: [], end: { kind: "leave", ms: 1000 } });
  });

  it("is fair on a phone: his openings long enough to read, ₹30 always reachable, time to decide; the room names an unfair edit", () => {
    expect(stepPickFairness(RAJU_TUNING)).toEqual([]);
    expect(stepPickFairness(rajuStepTuning({ ...RAJU_HAGGLE_TUNING, wobble40Ms: 500 })).join()).toContain("no time to read it");
    expect(stepPickFairness(rajuStepTuning({ ...RAJU_HAGGLE_TUNING, idleMs: 4000 })).join()).toContain("time to decide");
  });

  it("goes down in price, and a price the player cannot pay falls back to the next lower one, then to no deal", () => {
    const prices = RAJU_MAP.steps.map((step) => RAJU_PRICES[step]!);
    expect(prices).toEqual([...prices].sort((a, b) => b - a));
    expect(RAJU_PRICES[RAJU_MAP.leave]).toBeNull();
    expect(RAJU_PRICES[RAJU_MAP.out]).toBeNull();
    const all = rajuHaggle.outcomes.map((item) => item.id);
    expect(availableOutcome(rajuHaggle, "buy_map", all.filter((id) => id !== "buy_map"))).toBe("fair_map");
    expect(availableOutcome(rajuHaggle, "buy_map", ["haggle_map", "decline_map"])).toBe("haggle_map");
    expect(availableOutcome(rajuHaggle, "fair_map", ["decline_map"])).toBe("decline_map");
    expect(rajuHaggle.outcomes.find((item) => item.id === "decline_map")?.fallback).toBeUndefined();
    for (const id of all) expect(availableOutcome(rajuHaggle, id, ["decline_map"])).toBe("decline_map");
  });
});
