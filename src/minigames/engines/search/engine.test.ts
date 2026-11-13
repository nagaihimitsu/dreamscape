import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SEARCH_AUTO_LEAD_MS, searchActionEnding, searchAutoActionAt, searchAutoRecord, searchEnding, searchFairness, searchRules, searchSetupSchema,
  type SearchEnding, type SearchPlan, type SearchSetup,
} from "./engine";

// The search engine's rules in its own words (docs/13 6.2): a skin's test passes its setup through searchFairness.
const setup: SearchSetup = {
  spots: 5, targets: [3], wrongEnds: false, buttons: [{ id: "call", presses: 3 }, { id: "later", presses: 1 }], timeLimitMs: 20000, idleMs: 8000,
};

describe("the search engine", () => {
  it("ends at the first event that ends the play: the target, a button's last press, else the lapse", () => {
    expect(searchEnding({ actions: [{ spot: 3 }], lapse: null }, setup)).toEqual({ kind: "found", spot: 3, misses: 0 });
    expect(searchEnding({ actions: [{ spot: 0 }, { spot: 1 }, { spot: 0 }, { spot: 3 }], lapse: null }, setup)).toEqual({ kind: "found", spot: 3, misses: 2 });
    expect(searchEnding({ actions: [{ button: "later" }, { spot: 3 }], lapse: null }, setup)).toEqual({ kind: "button", button: "later", misses: 0 });
    expect(searchEnding({ actions: [{ button: "call" }, { spot: 1 }, { button: "call" }, { button: "call" }], lapse: null }, setup))
      .toEqual({ kind: "button", button: "call", misses: 1 });
    expect(searchEnding({ actions: [{ spot: 2 }], lapse: "timeout" }, setup)).toEqual({ kind: "timeout", misses: 1 });
    expect(searchEnding({ actions: [], lapse: "idle" }, setup)).toEqual({ kind: "idle", misses: 0 });
    // Stopped with nothing that ends it: the player stopped (idle). Unknown spots and buttons do nothing.
    expect(searchEnding({ actions: [{ spot: 9 }, { spot: -1 }, { button: "nope" }], lapse: null }, setup)).toEqual({ kind: "idle", misses: 0 });
  });

  it("ends at a wrong spot when the skin says a wrong one ends the play", () => {
    const pointing = { ...setup, wrongEnds: true };
    expect(searchEnding({ actions: [{ spot: 1 }, { spot: 3 }], lapse: null }, pointing)).toEqual({ kind: "wrong", spot: 1, misses: 0 });
    expect(searchActionEnding([{ spot: 1 }], pointing)).toEqual({ kind: "wrong", spot: 1, misses: 0 });
    expect(searchActionEnding([{ spot: 1 }], setup)).toBeNull();
  });

  it("plays 「おまかせ」 to every kind of ending, after the start's guard and in time", () => {
    const plans: [SearchPlan, SearchEnding["kind"]][] = [
      [{ kind: "found", misses: 0 }, "found"], [{ kind: "found", misses: 9 }, "found"], [{ kind: "button", button: "call" }, "button"],
      [{ kind: "button", button: "later" }, "button"], [{ kind: "timeout" }, "timeout"], [{ kind: "idle" }, "idle"],
    ];
    for (const [plan, kind] of plans) expect(searchEnding(searchAutoRecord(plan, setup), setup).kind, plan.kind).toBe(kind);
    expect(searchEnding(searchAutoRecord({ kind: "found", misses: 9 }, setup), setup)).toEqual({ kind: "found", spot: 3, misses: 4 });
    expect(searchEnding(searchAutoRecord({ kind: "wrong" }, { ...setup, wrongEnds: true }), { ...setup, wrongEnds: true }).kind).toBe("wrong");
    expect(searchAutoRecord({ kind: "button", button: "call" }, setup).actions).toHaveLength(3);
    expect(searchAutoActionAt(0)).toBe(SEARCH_AUTO_LEAD_MS);
    expect(SEARCH_AUTO_LEAD_MS).toBeGreaterThan(450);
  });

  it("calls a setup unfair or broken when there is no time to look or nothing to search", () => {
    expect(searchFairness(setup)).toEqual([]);
    expect(searchFairness({ ...setup, idleMs: 3000 }).join()).toContain("idleMs 3000");
    expect(searchFairness({ ...setup, timeLimitMs: 5000, idleMs: null }).join()).toContain("timeLimitMs 5000");
    expect(searchFairness({ ...setup, idleMs: 20000 }).join()).toContain("before doing nothing");
    expect(searchFairness({ ...setup, targets: [7] }).join()).toContain("target 7");
    expect(searchFairness({ ...setup, spots: 2, targets: [0, 1] }).join()).toContain("nothing to search");
    expect(searchFairness({ ...setup, buttons: [{ id: "a", presses: 1 }, { id: "a", presses: 2 }] }).join()).toContain("twice");
    expect(() => searchSetupSchema.parse({ ...setup, spots: 1 })).toThrow();
  });

  it("gives a skin its outcomes through its game, and 「おまかせ」 to each of them", () => {
    const rules = searchRules<object, "found" | "lost">({
      setup: () => setup,
      outcome: (ending) => (ending.kind === "found" ? "found" : "lost"),
      auto: (outcome) => (outcome === "found" ? { kind: "found", misses: 1 } : { kind: "idle" }),
    });
    expect(rules.outcomeOf({ actions: [{ spot: 3 }], lapse: null }, {})).toBe("found");
    expect(rules.outcomeOf({ actions: [], lapse: "timeout" }, {})).toBe("lost");
    for (const outcome of ["found", "lost"] as const) expect(rules.outcomeOf(rules.autoRecord(outcome, {}), {})).toBe(outcome);
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
