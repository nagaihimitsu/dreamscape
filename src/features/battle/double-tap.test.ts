import { describe, expect, it } from "vitest";
import { DOUBLE_TAP_WINDOW_MS, isAnswerDoubleTap } from "./double-tap";

// User decision (改善計画 B-7) and AGENTS.md 選択肢の誤タップ防止: the second tap of a
// double tap on an answer is ignored, whatever control has moved under it.
describe("answer double tap", () => {
  it("treats a tap within the double-tap window after an answer as its second tap", () => {
    expect(isAnswerDoubleTap(0)).toBe(true);
    expect(isAnswerDoubleTap(DOUBLE_TAP_WINDOW_MS - 1)).toBe(true);
  });

  it("lets every later tap through as the player's next action", () => {
    expect(isAnswerDoubleTap(DOUBLE_TAP_WINDOW_MS)).toBe(false);
    expect(isAnswerDoubleTap(5_000)).toBe(false);
  });

  it("covers a usual double tap (about 300 ms) and is far shorter than reading the feedback", () => {
    expect(DOUBLE_TAP_WINDOW_MS).toBeGreaterThanOrEqual(300);
    expect(DOUBLE_TAP_WINDOW_MS).toBeLessThanOrEqual(500);
    expect(isAnswerDoubleTap(-1)).toBe(false);
  });
});
