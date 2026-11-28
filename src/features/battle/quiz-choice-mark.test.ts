import { describe, expect, it } from "vitest";
import { quizChoiceMark, quizChoiceStays } from "./quiz-choice-mark";

const marks = (answer?: { optionId: string; correct: boolean }) => ["A", "B", "C"].map((id) => quizChoiceMark(id, "B", answer));

describe("quizChoiceMark", () => {
  it("marks nothing before the answer shows", () => {
    expect(marks()).toEqual([undefined, undefined, undefined]);
  });
  it("marks only the chosen option after a right answer", () => {
    expect(marks({ optionId: "B", correct: true })).toEqual([undefined, "right", undefined]);
  });
  it("marks the chosen option missed and the right one after a wrong answer", () => {
    expect(marks({ optionId: "C", correct: false })).toEqual([undefined, "answer", "missed"]);
  });
});

describe("quizChoiceStays", () => {
  const stays = (answer?: { optionId: string; correct: boolean }) => ["A", "B", "C"].map((id) => quizChoiceStays(id, "B", answer));
  it("keeps every option before the answer shows", () => {
    expect(stays()).toEqual([true, true, true]);
  });
  it("keeps only the right one after a right answer", () => {
    expect(stays({ optionId: "B", correct: true })).toEqual([false, true, false]);
  });
  it("keeps the one chosen and the right one after a wrong answer", () => {
    expect(stays({ optionId: "C", correct: false })).toEqual([false, true, true]);
  });
});
