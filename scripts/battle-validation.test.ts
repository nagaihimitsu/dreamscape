import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { quizSchema, type QuizDefinition } from "../src/content/schemas";
import type { TourismCatalog } from "../src/content/tourism-schemas";
import { SAMPLE_JOURNEY_DIRECTORY } from "./content-layout";
import { revealRegionProblem } from "./battle-validation";

// A battle question's reveal on its landmark photo (revealRegion, revealCaptionJa; user decision 2026-11-11):
// the region's form is the quiz schema's, the photo it needs is content:build's check.

const sampleQuiz = (): QuizDefinition => quizSchema.parse(JSON.parse(readFileSync(
  path.resolve(SAMPLE_JOURNEY_DIRECTORY, "quizzes/smp_mihon_main_clock_tower_quiz.json"), "utf8")));
const withRegion = (region: unknown) => {
  const quiz = JSON.parse(JSON.stringify(sampleQuiz()));
  quiz.questions[1].revealRegion = region;
  return quiz;
};
const tourism: Pick<TourismCatalog, "landmarks" | "assets"> = {
  landmarks: [{ id: "mihon_clock_tower", imageAssetId: "smp_img_mihon_clock_tower" }] as TourismCatalog["landmarks"],
  assets: [{ id: "smp_img_mihon_clock_tower" }] as TourismCatalog["assets"],
};

describe("a battle question's reveal", () => {
  it("reads the sample's region and caption, and is optional", () => {
    const [first, second] = sampleQuiz().questions;
    expect(first.revealRegion).toEqual({ x: 0.41, y: 0.23, width: 0.18, height: 0.26 });
    expect(first.revealCaptionJa).toMatch(/架空/u);
    expect(second.revealRegion).toBeUndefined();
  });

  it("stops a region outside the photo, of no size or with an unknown key", () => {
    expect(() => quizSchema.parse(withRegion({ x: 0.9, y: 0.1, width: 0.2, height: 0.2 }))).toThrow("写真の外にはみ出しています");
    expect(() => quizSchema.parse(withRegion({ x: 0.1, y: 0.7, width: 0.2, height: 0.4 }))).toThrow("Reveal region exceeds image bounds");
    expect(() => quizSchema.parse(withRegion({ x: 0.1, y: 0.1, width: 0, height: 0.2 }))).toThrow(/"width"[\s\S]*Too small: expected number to be >0/u);
    expect(() => quizSchema.parse(withRegion({ x: 0.1, y: 0.1, width: 0.2, height: 0.2, zoom: 2 }))).toThrow(/zoom/u);
    expect(() => quizSchema.parse(withRegion({ x: 0.8, y: 0.8, width: 0.2, height: 0.2 }))).not.toThrow();
  });

  it("needs its battle's landmark photo: none for a city finale's question, nor for a landmark without a registered photo", () => {
    const quiz = sampleQuiz();
    expect(revealRegionProblem(quiz, tourism, "quizzes/q.json")).toBeUndefined();
    expect(revealRegionProblem({ ...quiz, questions: quiz.questions.slice(1) }, { landmarks: [], assets: [] }, "quizzes/q.json")).toBeUndefined();
    expect(revealRegionProblem({ ...quiz, landmarkId: null }, tourism, "quizzes/q.json"))
      .toMatch(/^写真の種明かし（revealRegion）は、対決の観光地の写真に重ねて出します：quizzes\/q\.json の問い smp_mihon_clock_tower_q1 は都市フィナーレの問い/u);
    expect(revealRegionProblem(quiz, { landmarks: tourism.landmarks, assets: [] }, "quizzes/q.json"))
      .toMatch(/観光地 mihon_clock_tower の問いですが、tourism\/catalog\.json にその写真がありません/u);
    expect(revealRegionProblem(quiz, { landmarks: [], assets: tourism.assets }, "quizzes/q.json"))
      .toMatch(/No landmark photo for the revealRegion of smp_mihon_clock_tower_q1: mihon_clock_tower/u);
  });
});
