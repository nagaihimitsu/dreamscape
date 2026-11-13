import { describe, expect, it } from "vitest";
import { availableOutcome, fallbackProblems } from "./fallback";

// The rule for an outcome whose choice cannot be taken now (docs/13 4.2): the play takes the first available outcome along
// its declared fallbacks.

const haggle = {
  outcomes: [
    { id: "asking", labelJa: "言い値", fallback: "fair" },
    { id: "fair", labelJa: "ほどよい値", fallback: "low" },
    { id: "low", labelJa: "安い値", fallback: "leave" },
    { id: "leave", labelJa: "買わない" },
  ],
};
const all = ["asking", "fair", "low", "leave"];

describe("an outcome a play ends on, against the outcomes available now", () => {
  it("is itself when its choice can be taken", () => {
    for (const outcome of all) expect(availableOutcome(haggle, outcome, all)).toBe(outcome);
    expect(availableOutcome(haggle, "fair", ["fair", "leave"])).toBe("fair");
  });

  it("takes the first available one along its fallbacks", () => {
    expect(availableOutcome(haggle, "asking", ["fair", "low", "leave"])).toBe("fair");
    expect(availableOutcome(haggle, "asking", ["low", "leave"])).toBe("low");
    expect(availableOutcome(haggle, "fair", ["leave"])).toBe("leave");
    // A fallback is never an outcome above it: the way runs one direction.
    expect(availableOutcome(haggle, "low", ["asking", "fair", "leave"])).toBe("leave");
  });

  it("is null when the way reaches nothing available: no fallback, or none of them available", () => {
    expect(availableOutcome(haggle, "leave", ["asking"])).toBeNull();
    expect(availableOutcome(haggle, "asking", [])).toBeNull();
    expect(availableOutcome({ outcomes: [{ id: "a", labelJa: "あ" }, { id: "b", labelJa: "い" }] }, "a", ["b"])).toBeNull();
  });

  it("stops on a loop instead of running forever", () => {
    const loop = { outcomes: [{ id: "a", labelJa: "あ", fallback: "b" }, { id: "b", labelJa: "い", fallback: "a" }, { id: "c", labelJa: "う" }] };
    expect(availableOutcome(loop, "a", ["c"])).toBeNull();
  });
});

describe("a game's declared fallbacks", () => {
  it("are fine when each names another outcome and the way ends", () => {
    expect(fallbackProblems(haggle)).toEqual([]);
    expect(fallbackProblems({ outcomes: [{ id: "a", labelJa: "あ" }, { id: "b", labelJa: "い" }] })).toEqual([]);
  });

  it("names a fallback that is no outcome, and one that comes back", () => {
    expect(fallbackProblems({ outcomes: [{ id: "a", labelJa: "あ", fallback: "z" }, { id: "b", labelJa: "い" }] })).toEqual(["a's fallback z is not an outcome"]);
    expect(fallbackProblems({ outcomes: [{ id: "a", labelJa: "あ", fallback: "a" }, { id: "b", labelJa: "い" }] })).toEqual(["a's fallbacks come back to a"]);
    expect(fallbackProblems({ outcomes: [{ id: "a", labelJa: "あ", fallback: "b" }, { id: "b", labelJa: "い", fallback: "a" }] }))
      .toEqual(["a's fallbacks come back to a", "b's fallbacks come back to b"]);
  });
});
