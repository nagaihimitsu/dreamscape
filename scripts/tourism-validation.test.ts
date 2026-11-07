import { describe, expect, it } from "vitest";
import type { BattleDefinition, QuizDefinition } from "../src/content/schemas";
import { isObservationOnlyClue, type TourismCatalog, type TourismClue } from "../src/content/tourism-schemas";
import { compileInk } from "./ink-validation";
import { validateTourism } from "./tourism-validation";

// The clue → question links (docs/07 「観察だけの手がかり」) on a small
// in-memory city: two landmarks with their own quizzes and a city finale.

const guide = compileInk([
  'VAR player_name = ""',
  'VAR heroine_name = ""',
  'VAR player_address = ""',
  "見本の塔の前で、短い案内を聞く。",
  "-> END",
].join("\n"));
const landmark = (id: string, clueIds: string[]) => ({
  id, cityId: "a_city", nameJa: "見本の場所", nameEn: "Sample place", descriptionJa: "見本の説明。",
  imageAssetId: "a_photo", guideStoryId: `tourism/${id}`, battleId: `${id}_battle`, clueIds,
});
const quiz = (id: string, landmarkId: string | null, questionIds: string[]) =>
  ({ id, landmarkId, questions: questionIds.map((questionId) => ({ id: questionId })) }) as unknown as QuizDefinition;
const quizzes: Record<string, QuizDefinition> = {
  tower_quiz: quiz("tower_quiz", "a_tower", ["tower_q1", "tower_q2"]),
  gate_quiz: quiz("gate_quiz", "a_gate", ["gate_q1"]),
  // A city finale quiz has no landmark.
  finale_quiz: quiz("finale_quiz", null, ["finale_q1"]),
};
const battles = ["a_tower", "a_gate"].map((id) => ({ id: `${id}_battle`, landmarkId: id }) as BattleDefinition);

/** Validate the city with the tower's one clue linked to `relatedQuestionIds`. */
function validateWithLinks(relatedQuestionIds: string[]): number {
  const clue = { id: "tower_view", landmarkId: "a_tower", relatedQuestionIds } as unknown as TourismClue;
  const catalog = {
    schemaVersion: 1,
    assets: [{ id: "a_photo" }],
    landmarks: [landmark("a_tower", [clue.id]), landmark("a_gate", [])],
    clues: [clue],
  } as unknown as TourismCatalog;
  return validateTourism(catalog, "a_city", ["a_tower", "a_gate"], battles, quizzes,
    { "tourism/a_tower": guide, "tourism/a_gate": guide }, { effectIds: [], backgroundIds: [], emotionIds: [] });
}

describe("clue links to quiz questions", () => {
  it("accepts an observation-only clue: an empty list links no question", () => {
    expect(isObservationOnlyClue({ relatedQuestionIds: [] })).toBe(true);
    expect(validateWithLinks([])).toBe(2);
  });

  it("accepts questions of a quiz of the clue's own landmark, which make it no longer observation-only", () => {
    expect(isObservationOnlyClue({ relatedQuestionIds: ["tower_q2"] })).toBe(false);
    expect(validateWithLinks(["tower_q2"])).toBe(2);
    expect(validateWithLinks(["tower_q1", "tower_q2"])).toBe(2);
  });

  it.each([
    ["another landmark's quiz in the same city", "gate_q1"],
    ["the city finale (its quiz has no landmark)", "finale_q1"],
    ["no quiz", "missing_q"],
  ])("refuses a question of %s", (_, questionId) => {
    expect(() => validateWithLinks(["tower_q1", questionId])).toThrow(`Unknown related tourism question: ${questionId}`);
  });
});
