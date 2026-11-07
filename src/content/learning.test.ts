import { describe, expect, it } from "vitest";
import { zodIssues } from "../../tests/fixtures/zod-issues";
import raw from "./generated/content/learning/translations.json";
import details from "./generated/content/learning/details.json";
import { battleQuizzes } from "./index";
import { learningCatalogSchema, validateLearning } from "./learning-schema";
import {
  learningDetailsSchema,
  validateLearningDetails,
} from "./learning-details";

describe("learning content", () => {
  // Every production quiz question has a translation.
  const ids = Object.keys(battleQuizzes);
  it("covers every published question and all three choices", () => {
    const catalog = learningCatalogSchema.parse(raw);
    expect(() => validateLearning(catalog, battleQuizzes, ids)).not.toThrow();
    const published = ids.flatMap((id) => battleQuizzes[id].questions.map((question) => question.id));
    expect(Object.keys(catalog.questions).sort()).toEqual([...new Set(published)].sort());
    expect(published).toEqual(expect.arrayContaining([
      "last_supper_b_doorway_counterexample", "last_supper_c_shared_focus",
      "sound_scala_2", "sound_brera_3",
    ]));
    for (const entry of Object.values(catalog.questions))
      expect(Object.keys(entry.optionsJa).sort()).toEqual(["A", "B", "C"]);
  });
  it("rejects missing translations and changed wording, options or answer", () => {
    const id = "sound_supper_1";
    const expected = {
      question: "Translation source changed: sound_supper_1",
      option: "Translation source changed: sound_supper_1",
      answer: "Translation source changed: sound_supper_1",
      missing: "Missing translation: sound_supper_1",
    };
    for (const field of ["question", "option", "answer", "missing"] as const) {
      const data = structuredClone(raw) as any;
      if (field === "question") data.questions[id].source.questionEn += "x";
      if (field === "option")
        data.questions[id].source.options[0].textEn += "x";
      if (field === "answer") data.questions[id].source.correctOptionId = "A";
      if (field === "missing") delete data.questions[id];
      expect(() =>
        validateLearning(learningCatalogSchema.parse(data), battleQuizzes, ids),
      ).toThrow(expected[field]);
    }
  });
  it("rejects a missing option and non-Japanese translation", () => {
    const missing = structuredClone(raw) as any;
    delete missing.questions.sound_supper_1.optionsJa.A;
    expect(() => learningCatalogSchema.parse(missing)).toThrow(zodIssues({ code: "invalid_type", path: ["questions", "sound_supper_1", "optionsJa", "A"] }));
    const english = structuredClone(raw);
    english.questions.sound_supper_1.questionJa = "English only";
    expect(() => learningCatalogSchema.parse(english)).toThrow(zodIssues({ code: "custom", path: ["questions", "sound_supper_1", "questionJa"], message: "Expected Japanese text" }));
  });
  it("checks detailed explanations refer to actual English", () => {
    const value = learningDetailsSchema.parse(details);
    expect(() => validateLearningDetails(value, battleQuizzes)).not.toThrow();
    value.questions.sound_supper_1.topics[0].targetEn =
      "not in sentence";
    expect(() => validateLearningDetails(value, battleQuizzes)).toThrow(
      "target missing",
    );
  });

  it("allows no details at all, but every question with details names its own story", () => {
    // The value content:build uses when no journey folder provides learning/details.json.
    expect(learningDetailsSchema.parse({ schemaVersion: 1, questions: {} })).toEqual({ schemaVersion: 1, questions: {} });
    const value = learningDetailsSchema.parse(details);
    for (const detail of Object.values(value.questions)) expect(detail.storyId).toBe("learning/sound_english");
    const issues = (value: unknown) => learningDetailsSchema.safeParse(value).error?.issues
      .map((issue) => ({ code: issue.code, path: issue.path }));
    const withoutStory = structuredClone(details) as any;
    delete withoutStory.questions.sound_supper_2.storyId;
    expect(issues(withoutStory)).toEqual([{ code: "invalid_type", path: ["questions", "sound_supper_2", "storyId"] }]);
    // One story for the whole file is no longer a field.
    expect(issues({ ...structuredClone(details), storyId: "learning/sound_english" }))
      .toEqual([{ code: "unrecognized_keys", path: [] }]);
  });
});
