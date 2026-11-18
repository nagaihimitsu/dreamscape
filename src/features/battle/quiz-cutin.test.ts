import { describe, expect, it } from "vitest";
import { DOUBLE_TAP_WINDOW_MS } from "../../components/double-tap";
import { QUIZ_CUTIN_MS, QUIZ_CUTIN_STILL_MS, quizCutInDuration, shouldShowQuizCutIn, type BattleCutInView } from "./quiz-cutin";

// 「Quiz」 (2026-11-18): a short cut-in once per run, as the battle's flow first moves from its talk to its first question
// in the mounted screen; never on a reload into a question, for a later question, across runs or at a reasoning stop.

const view = (overrides: Partial<BattleCutInView> = {}): BattleCutInView =>
  ({ runId: "battle:1", phase: "dialogue", roundIndex: 0, answered: 0, proof: false, ...overrides });
const firstQuestion = view({ phase: "question" });

describe("when 「Quiz」 shows", () => {
  it("shows as the talk gives way to the run's first question", () => {
    expect(shouldShowQuizCutIn(view(), firstQuestion)).toBe(true);
  });

  it("does not show for a screen that mounts on a question (a reload, a resumed save)", () => {
    // The mounted screen's first view is the question itself.
    expect(shouldShowQuizCutIn(firstQuestion, firstQuestion)).toBe(false);
  });

  it("does not show for a later question, whether the talk or the answer's feedback comes before it", () => {
    const second = view({ phase: "question", roundIndex: 1, answered: 1 });
    expect(shouldShowQuizCutIn(view({ roundIndex: 1, answered: 1 }), second)).toBe(false);
    expect(shouldShowQuizCutIn(view({ phase: "feedback", answered: 1 }), second)).toBe(false);
  });

  it("does not show again for the first round's feedback, the talk after it and the next question", () => {
    const feedback = view({ phase: "feedback", answered: 1 });
    const talk = view({ roundIndex: 1, answered: 1 });
    const next = view({ phase: "question", roundIndex: 1, answered: 1 });
    expect(shouldShowQuizCutIn(firstQuestion, feedback)).toBe(false);
    expect(shouldShowQuizCutIn(feedback, talk)).toBe(false);
    expect(shouldShowQuizCutIn(talk, next)).toBe(false);
  });

  it("does not show at a reasoning stop, nor at the question its proof leads to", () => {
    expect(shouldShowQuizCutIn(view(), view({ phase: "reasoning" }))).toBe(false);
    // A proof at the first round (roundIndex 0): its question follows the proof's talk.
    expect(shouldShowQuizCutIn(view({ proof: true }), view({ phase: "question", proof: true }))).toBe(false);
  });

  it("shows for a special battle's ordinary first question, before its proof", () => {
    expect(shouldShowQuizCutIn(view({ runId: "special:4" }), view({ runId: "special:4", phase: "question" }))).toBe(true);
  });

  it("does not carry over to another run, unless that run's own talk leads to its first question", () => {
    expect(shouldShowQuizCutIn(view({ runId: "battle:1" }), view({ runId: "battle:7", phase: "question" }))).toBe(false);
    expect(shouldShowQuizCutIn(view({ runId: "battle:1", phase: "result", answered: 3 }), view({ runId: "battle:7" }))).toBe(false);
    expect(shouldShowQuizCutIn(view({ runId: "battle:7" }), view({ runId: "battle:7", phase: "question" }))).toBe(true);
  });
});

describe("how long 「Quiz」 shows", () => {
  it("is short, shorter and still with reduced motion, and outlasts a double tap so a later tap can end it", () => {
    expect(quizCutInDuration(false)).toBe(QUIZ_CUTIN_MS);
    expect(quizCutInDuration(true)).toBe(QUIZ_CUTIN_STILL_MS);
    expect(QUIZ_CUTIN_MS).toBeLessThan(1000);
    expect(QUIZ_CUTIN_STILL_MS).toBeLessThan(QUIZ_CUTIN_MS);
    expect(QUIZ_CUTIN_STILL_MS).toBeGreaterThan(DOUBLE_TAP_WINDOW_MS);
  });
});
