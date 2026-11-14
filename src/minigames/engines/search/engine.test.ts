import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  SEARCH_AUTO_LEAD_MS, searchActionEnding, searchAutoActionAt, searchAutoRecord, searchEnding, searchFairness, searchFieldMs, searchIdleMs, searchProgress,
  searchRoundAt, searchRules,
  searchSetupSchema, type SearchEnding, type SearchPlan, type SearchSetup,
} from "./engine";

// The search engine's rules in its own words (docs/13 6.2): a skin's test passes its setup through searchFairness.
const setup: SearchSetup = {
  rounds: [{ spots: 5, targets: [3] }], wrongLimit: null,
  buttons: [{ id: "call", presses: 3, ends: "play" }, { id: "later", presses: 1, ends: "play" }], timeLimitMs: 20000, idleMs: 8000, idleEnds: "play",
};
/** Three rounds (the parasol's shape): a round button and doing nothing help the round on show through. */
const rounds: SearchSetup = {
  rounds: [{ spots: 5, targets: [3] }, { spots: 4, targets: [0] }, { spots: 3, targets: [2] }], wrongLimit: null,
  buttons: [{ id: "ask", presses: 1, ends: "round" }], timeLimitMs: null, idleMs: 8000, idleEnds: "round",
};

describe("the search engine", () => {
  it("ends at the first event that ends the play: the target, a button's last press, else the lapse", () => {
    expect(searchEnding({ actions: [{ spot: 3 }], lapse: null }, setup)).toEqual({ kind: "found", spot: 3, misses: 0, helped: 0 });
    expect(searchEnding({ actions: [{ spot: 0 }, { spot: 1 }, { spot: 0 }, { spot: 3 }], lapse: null }, setup)).toEqual({ kind: "found", spot: 3, misses: 2, helped: 0 });
    expect(searchEnding({ actions: [{ button: "later" }, { spot: 3 }], lapse: null }, setup)).toEqual({ kind: "button", button: "later", misses: 0, helped: 0 });
    expect(searchEnding({ actions: [{ button: "call" }, { spot: 1 }, { button: "call" }, { button: "call" }], lapse: null }, setup))
      .toEqual({ kind: "button", button: "call", misses: 1, helped: 0 });
    expect(searchEnding({ actions: [{ spot: 2 }], lapse: "timeout" }, setup)).toEqual({ kind: "timeout", misses: 1, helped: 0 });
    expect(searchEnding({ actions: [], lapse: "idle" }, setup)).toEqual({ kind: "idle", misses: 0, helped: 0 });
    expect(searchEnding({ actions: [{ idle: true }, { spot: 3 }], lapse: null }, setup)).toEqual({ kind: "idle", misses: 0, helped: 0 });
    // Stopped with nothing that ends it: the player stopped (idle). Unknown spots and buttons do nothing.
    expect(searchEnding({ actions: [{ spot: 9 }, { spot: -1 }, { button: "nope" }], lapse: null }, setup)).toEqual({ kind: "idle", misses: 0, helped: 0 });
  });

  it("ends at a wrong spot only past the setup's limit, each wrong spot counted once", () => {
    const pointing = { ...setup, wrongLimit: 1 };
    expect(searchEnding({ actions: [{ spot: 1 }, { spot: 3 }], lapse: null }, pointing)).toEqual({ kind: "wrong", spot: 1, misses: 0, helped: 0 });
    expect(searchActionEnding([{ spot: 1 }], pointing)).toEqual({ kind: "wrong", spot: 1, misses: 0, helped: 0 });
    expect(searchActionEnding([{ spot: 1 }], setup)).toBeNull();
    // Three wrong spots end the play (the third, after two); the same wrong spot again does not count.
    const third = { ...setup, wrongLimit: 3 };
    expect(searchActionEnding([{ spot: 1 }, { spot: 1 }, { spot: 0 }], third)).toBeNull();
    expect(searchActionEnding([{ spot: 1 }, { spot: 0 }, { spot: 2 }], third)).toEqual({ kind: "wrong", spot: 2, misses: 2, helped: 0 });
    expect(searchActionEnding([{ spot: 1 }, { spot: 0 }, { spot: 3 }], third)).toEqual({ kind: "found", spot: 3, misses: 2, helped: 0 });
  });

  it("ends a play by doing nothing only before the first action when the setup says so", () => {
    const first: SearchSetup = { ...setup, idleEnds: "before_action" };
    expect(searchActionEnding([{ idle: true }], first)).toEqual({ kind: "idle", misses: 0, helped: 0 });
    expect(searchActionEnding([{ spot: 0 }, { idle: true }], first)).toBeNull();
    expect(searchActionEnding([{ button: "call" }, { idle: true }, { idle: true }], first)).toBeNull();
    expect(searchProgress([{ spot: 0 }, { idle: true }], first).acted).toBe(true);
  });

  it("plays rounds one after another: found, or helped through by its button or by doing nothing", () => {
    expect(searchActionEnding([{ spot: 3 }, { spot: 0 }], rounds)).toBeNull();
    const progress = searchProgress([{ spot: 1 }, { spot: 3 }, { spot: 2 }], rounds);
    expect(progress).toMatchObject({ round: 1, searched: [2], misses: 2, helped: 0, ending: null });
    expect(progress.done).toEqual([{ searched: [1, 3], found: true }]);
    expect(searchActionEnding([{ spot: 3 }, { spot: 0 }, { spot: 2 }], rounds)).toEqual({ kind: "found", spot: 2, misses: 0, helped: 0 });
    expect(searchActionEnding([{ spot: 1 }, { spot: 3 }, { spot: 1 }, { spot: 0 }, { spot: 2 }], rounds)).toEqual({ kind: "found", spot: 2, misses: 2, helped: 0 });
    // A spot's index is the round's own: spot 3 does not exist in the last round.
    expect(searchActionEnding([{ spot: 3 }, { spot: 0 }, { spot: 3 }], rounds)).toBeNull();
    expect(searchActionEnding([{ button: "ask" }, { spot: 0 }, { spot: 2 }], rounds)).toEqual({ kind: "found", spot: 2, misses: 0, helped: 1 });
    expect(searchActionEnding([{ spot: 3 }, { idle: true }, { button: "ask" }], rounds)).toEqual({ kind: "helped", misses: 0, helped: 2 });
    // A round button's presses count again in the next round.
    const twice: SearchSetup = { ...rounds, buttons: [{ id: "ask", presses: 2, ends: "round" }] };
    expect(searchProgress([{ button: "ask" }, { button: "ask" }, { button: "ask" }], twice)).toMatchObject({ round: 1, presses: { ask: 1 } });
  });

  it("helps a round with its own time through when that runs out (its thing gone), and only such a round", () => {
    const walkOff: SearchSetup = { ...rounds, rounds: [rounds.rounds[0], rounds.rounds[1], { ...rounds.rounds[2], limitMs: 6000 }] };
    expect(searchFairness(walkOff)).toEqual([]);
    expect(searchActionEnding([{ spot: 3 }, { spot: 0 }, { gone: true }], walkOff)).toEqual({ kind: "helped", misses: 0, helped: 1 });
    // A round without its own time: a walk-off does nothing (the round waits for the player).
    expect(searchProgress([{ gone: true }], walkOff)).toMatchObject({ round: 0, helped: 0, ending: null });
    expect(searchActionEnding([{ gone: true }, { spot: 3 }, { spot: 0 }, { spot: 2 }], walkOff)).toEqual({ kind: "found", spot: 2, misses: 0, helped: 0 });
    // Not left to her (left: doing nothing in a round with nothing searched), and not a first action.
    expect(searchProgress([{ spot: 3 }, { spot: 0 }, { gone: true }], walkOff)).toMatchObject({ left: false });
    expect(searchFairness({ ...walkOff, rounds: [{ spots: 5, targets: [3], limitMs: 2000 }] }).join()).toContain("limitMs 2000");
    expect(() => searchSetupSchema.parse({ ...walkOff, rounds: [{ spots: 5, targets: [3], limitMs: 0 }] })).toThrow();
  });

  it("shortens the idle limit after a round left to doing nothing, where the setup says so", () => {
    const shorter: SearchSetup = { ...rounds, idleAfterLeftMs: 4000 };
    expect(searchIdleMs(searchProgress([], shorter), shorter)).toBe(8000);
    // Left to her: nothing searched in the round, doing nothing helped it through.
    expect(searchProgress([{ idle: true }], shorter).left).toBe(true);
    expect(searchIdleMs(searchProgress([{ idle: true }], shorter), shorter)).toBe(4000);
    // Not left: a look first, or her help asked for.
    expect(searchIdleMs(searchProgress([{ spot: 1 }, { idle: true }], shorter), shorter)).toBe(8000);
    expect(searchIdleMs(searchProgress([{ button: "ask" }], shorter), shorter)).toBe(8000);
    expect(searchIdleMs(searchProgress([{ idle: true }], rounds), rounds)).toBe(8000);
    expect(searchFairness(shorter)).toEqual([]);
    expect(searchFairness({ ...shorter, idleAfterLeftMs: 2000 }).join()).toContain("idleAfterLeftMs 2000");
    expect(searchFairness({ ...shorter, idleAfterLeftMs: 9000 }).join()).toContain("longer than idleMs");
    expect(searchFairness({ ...setup, idleAfterLeftMs: 4000 }).join()).toContain("idleEnds round");
  });

  it("plays 「おまかせ」 to every kind of ending, after the start's guard and in time", () => {
    const plans: [SearchPlan, SearchEnding["kind"]][] = [
      [{ kind: "found", misses: 0 }, "found"], [{ kind: "found", misses: 9 }, "found"], [{ kind: "button", button: "call" }, "button"],
      [{ kind: "button", button: "later" }, "button"], [{ kind: "timeout" }, "timeout"], [{ kind: "idle" }, "idle"],
    ];
    for (const [plan, kind] of plans) expect(searchEnding(searchAutoRecord(plan, setup), setup).kind, plan.kind).toBe(kind);
    expect(searchEnding(searchAutoRecord({ kind: "found", misses: 9 }, setup), setup)).toEqual({ kind: "found", spot: 3, misses: 4, helped: 0 });
    const third = { ...setup, wrongLimit: 3 };
    expect(searchEnding(searchAutoRecord({ kind: "wrong" }, third), third)).toMatchObject({ kind: "wrong", misses: 2 });
    expect(searchAutoRecord({ kind: "button", button: "call" }, setup).actions).toHaveLength(3);
    // In rounds: every round's thing (the misses in the first), or the round button in every round.
    expect(searchEnding(searchAutoRecord({ kind: "found", misses: 2 }, rounds), rounds)).toEqual({ kind: "found", spot: 2, misses: 2, helped: 0 });
    expect(searchEnding(searchAutoRecord({ kind: "button", button: "ask" }, rounds), rounds)).toEqual({ kind: "helped", misses: 0, helped: 3 });
    expect(searchAutoActionAt(0)).toBe(SEARCH_AUTO_LEAD_MS);
    expect(SEARCH_AUTO_LEAD_MS).toBeGreaterThan(450);
  });

  it("calls a setup unfair or broken when there is no time to look or nothing to search", () => {
    expect(searchFairness(setup)).toEqual([]);
    expect(searchFairness(rounds)).toEqual([]);
    expect(searchFairness({ ...setup, idleMs: 3000 }).join()).toContain("idleMs 3000");
    expect(searchFairness({ ...setup, timeLimitMs: 5000, idleMs: null }).join()).toContain("timeLimitMs 5000");
    expect(searchFairness({ ...setup, idleMs: 20000 }).join()).toContain("before doing nothing");
    expect(searchFairness({ ...setup, rounds: [{ spots: 5, targets: [7] }] }).join()).toContain("target 7");
    expect(searchFairness({ ...setup, rounds: [{ spots: 2, targets: [0, 1] }] }).join()).toContain("nothing to search");
    expect(searchFairness({ ...rounds, rounds: [...rounds.rounds, { spots: 3, targets: [5] }] }).join()).toContain("round 4: target 5");
    expect(searchFairness({ ...setup, wrongLimit: 5 }).join()).toContain("wrongLimit 5");
    expect(searchFairness({ ...setup, buttons: [{ id: "a", presses: 1, ends: "play" }, { id: "a", presses: 2, ends: "play" }] }).join()).toContain("twice");
    expect(() => searchSetupSchema.parse({ ...setup, rounds: [{ spots: 1, targets: [0] }] })).toThrow();
    expect(() => searchSetupSchema.parse({ ...setup, rounds: [] })).toThrow();
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
    // A record of no shape at all reads as doing nothing (the rules never throw).
    expect(rules.outcomeOf(null as never, {})).toBe("lost");
  });

  it("times a round from when it came on show, and holds the field as it was at the play's end (2026-11-14 playtest)", () => {
    // A find that brings the next round: it comes on show then.
    const first = searchProgress([], rounds);
    const second = searchProgress([{ spot: 3 }], rounds);
    expect(searchRoundAt(first, second, 2100, 0)).toBe(2100);
    // A wrong look changes no round.
    expect(searchRoundAt(second, searchProgress([{ spot: 3 }, { spot: 1 }], rounds), 2600, 2100)).toBe(2100);
    // The last round's find ends the play: its round keeps its start (the children stay where they were, not back at it).
    const last = searchProgress([{ spot: 3 }, { spot: 0 }], rounds);
    const ended = searchProgress([{ spot: 3 }, { spot: 0 }, { spot: 2 }], rounds);
    expect(ended.ending?.kind).toBe("found");
    expect(searchRoundAt(last, ended, 7400, 4000)).toBe(4000);
    // The field's time goes on with the play, then stays at the end's moment.
    expect(searchFieldMs({ roundAt: 4000 }, 6500)).toBe(2500);
    expect(searchFieldMs({ roundAt: 4000, endedAt: 7400 }, 8800)).toBe(3400);
  });

  it("keeps its rules pure: no randomness, clock, DOM or React", () => {
    const source = readFileSync(new URL("./engine.ts", import.meta.url), "utf8");
    for (const banned of ["Math.random", "crypto", "Date.now", "performance.now", "from \"react\"", "content/generated"]) expect(source).not.toContain(banned);
  });
});
