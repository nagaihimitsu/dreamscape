import { describe, expect, it } from "vitest";
import raw from "../../content/learning/translations.json";
import details from "../../content/learning/details.json";
import { battleQuizzes } from "./index";
import { learningCatalogSchema, validateLearning } from "./learning-schema";
import {
  learningDetailsSchema,
  validateLearningDetails,
} from "./learning-details";

describe("learning content", () => {
  // Learning records may point to either a current or a published quiz.
  const ids = Object.keys(battleQuizzes);
  it("covers every published question and all three choices", () => {
    const catalog = learningCatalogSchema.parse(raw);
    expect(() => validateLearning(catalog, battleQuizzes, ids)).not.toThrow();
    const published = ids.flatMap((id) => battleQuizzes[id].questions.map((question) => question.id));
    expect(Object.keys(catalog.questions).sort()).toEqual([...new Set(published)].sort());
    expect(published).toEqual(expect.arrayContaining([
      "last_supper_b_doorway_counterexample", "last_supper_c_shared_focus",
      "scala_wartime_counterexample", "brera_camerino_joined_records",
    ]));
    for (const entry of Object.values(catalog.questions))
      expect(Object.keys(entry.optionsJa).sort()).toEqual(["A", "B", "C"]);
  });
  it("rejects missing translations and changed wording, options or answer", () => {
    const id = "last_supper_central_triangle";
    for (const field of ["question", "option", "answer", "missing"]) {
      const data = structuredClone(raw) as any;
      if (field === "question") data.questions[id].source.questionEn += "x";
      if (field === "option")
        data.questions[id].source.options[0].textEn += "x";
      if (field === "answer") data.questions[id].source.correctOptionId = "A";
      if (field === "missing") delete data.questions[id];
      expect(() =>
        validateLearning(learningCatalogSchema.parse(data), battleQuizzes, ids),
      ).toThrow();
    }
  });
  it("rejects a missing option and non-Japanese translation", () => {
    const missing = structuredClone(raw) as any;
    delete missing.questions.last_supper_central_triangle.optionsJa.A;
    expect(() => learningCatalogSchema.parse(missing)).toThrow();
    const english = structuredClone(raw);
    english.questions.last_supper_central_triangle.questionJa = "English only";
    expect(() => learningCatalogSchema.parse(english)).toThrow();
  });
  it("checks detailed explanations refer to actual English", () => {
    const value = learningDetailsSchema.parse(details);
    expect(() => validateLearningDetails(value, battleQuizzes)).not.toThrow();
    value.questions.last_supper_central_triangle.topics[0].targetEn =
      "not in sentence";
    expect(() => validateLearningDetails(value, battleQuizzes)).toThrow(
      "target missing",
    );
  });
});
