import { describe, expect, it } from "vitest";
import { DOUBLE_TAP_WINDOW_MS } from "../../components/double-tap";
import { answerBeat, CORRECT_HOLD_MS } from "./answer-beat";

// ためと決め (2026-11-13): a right answer is held still for a moment, then pulses; reduced motion only glows; a wrong
// answer stays quiet (a special battle's keeps its stamp).

describe("an answer's beat", () => {
  it("holds a right answer when motion is allowed, and only glows it under reduced motion", () => {
    expect(answerBeat({ right: true, moving: true, special: false })).toBe("hold");
    expect(answerBeat({ right: true, moving: true, special: true })).toBe("hold");
    expect(answerBeat({ right: true, moving: false, special: false })).toBe("glow");
  });

  it("keeps a wrong answer quiet, a special battle's stamp aside", () => {
    expect(answerBeat({ right: false, moving: true, special: false })).toBe("none");
    expect(answerBeat({ right: false, moving: false, special: true })).toBe("none");
    expect(answerBeat({ right: false, moving: true, special: true })).toBe("stamp");
  });

  it("holds for a short moment within the double tap's, whose taps are ignored anyway", () => {
    expect(CORRECT_HOLD_MS).toBeGreaterThanOrEqual(100);
    expect(CORRECT_HOLD_MS).toBeLessThan(DOUBLE_TAP_WINDOW_MS);
  });
});
