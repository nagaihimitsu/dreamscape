import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SAMPLE_JOURNEY_DIRECTORY, SAMPLE_JOURNEY_ID, journeyDirectory } from "../../scripts/content-layout";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture, quizSourceFile } from "./test-fixtures";
import { quizSchema } from "./schemas";

const root = path.resolve(".");
let fixture: string;
beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-authoring-"));
  await prepareContentFixture(fixture);
  // The sample as an ordinary journey folder of the copy: the new quiz below joins it.
  await cp(path.join(root, SAMPLE_JOURNEY_DIRECTORY), journeyDirectory(fixture, SAMPLE_JOURNEY_ID), { recursive: true });
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function generatedQuizzes() {
  const generated = await readFile(
    path.join(fixture, "src/content/generated/quizzes.json"),
    "utf8",
  );
  return JSON.parse(generated);
}

describe("content authoring workflow", () => {
  it("accepts a new quiz from direct edits and transcribed JSON through the same pipeline", async () => {
    // The sample journey's quiz is the example of a quiz file (authoring/templates/sample_trip/).
    const templateText = await readFile(
      path.join(root, SAMPLE_JOURNEY_DIRECTORY, "quizzes/smp_mihon_main_clock_tower_quiz.json"),
      "utf8",
    );
    const template = quizSchema.parse(JSON.parse(templateText));
    const direct = structuredClone(template);
    direct.id = "smp_authoring_practice_quiz";
    direct.questions.forEach((question, index) => {
      question.id = `smp_authoring_practice_q${index + 1}`;
    });
    // Simulate transcribing a JSON response, without calling an AI service.
    let responseText = templateText.replace(template.id, direct.id);
    template.questions.forEach((question, index) => {
      responseText = responseText.replace(
        question.id,
        direct.questions[index].id,
      );
    });
    const transcribed = quizSchema.parse(JSON.parse(responseText));
    expect(transcribed).toEqual(direct);

    // Register the new quiz in the sample's battle catalog using data alone.
    const battleFile = path.join(fixture, "content/journeys/sample_trip/battles/catalog.json");
    const catalog = JSON.parse(await readFile(battleFile, "utf8"));
    const battle = catalog.battles.find(
      (item: { id: string }) => item.id === "smp_mihon_clock_tower_battle",
    );
    expect(battle).toBeDefined();
    battle.quizId = direct.id;
    await writeFile(battleFile, `${JSON.stringify(catalog, null, 2)}\n`);
    const quizFile = path.join(
      fixture,
      "content/journeys/sample_trip/quizzes/smp_authoring_practice_quiz.json",
    );
    const learningFile = path.join(
      fixture,
      "content/journeys/sample_trip/learning/translations.json",
    );
    const learning = JSON.parse(await readFile(learningFile, "utf8"));
    direct.questions.forEach((question, index) => {
      learning.questions[question.id] = {
        ...learning.questions[template.questions[index].id],
        source: {
          questionEn: question.questionEn,
          options: question.options,
          correctOptionId: question.correctOptionId,
        },
      };
    });
    await writeFile(learningFile, JSON.stringify(learning));
    for (const authoredQuiz of [direct, transcribed]) {
      await writeFile(quizFile, `${JSON.stringify(authoredQuiz, null, 2)}\n`);
      const result = await buildContent(fixture);
      expect(result.battles.find((item) => item.id === battle.id)?.quizId).toBe(
        direct.id,
      );
      // src/content/index.ts constructs battleQuizzes from this generated file
      // using the same schema. No TS or React source is copied into the fixture.
      const generated = await generatedQuizzes();
      expect(quizSchema.parse(generated[battle.quizId])).toEqual(direct);
    }
  }, 90_000);

  it("reflects an existing Milan quiz edit while leaving production text untouched", async () => {
    const productionFile = path.join(root, quizSourceFile("milano_main_duomo_quiz"));
    const original = await readFile(productionFile, "utf8");
    const screenFile = path.join(root, "src/features/battle/BattleScreen.tsx");
    const originalScreen = await readFile(screenFile, "utf8");
    const quiz = quizSchema.parse(JSON.parse(original));
    const editedQuestion =
      "Which stone gives Milan Cathedral much of its pale, pink-veined surface?";
    expect(quiz.questions[0].questionEn).not.toBe(editedQuestion);
    quiz.questions[0].questionEn = editedQuestion;
    await writeFile(
      path.join(fixture, quizSourceFile("milano_main_duomo_quiz")),
      `${JSON.stringify(quiz, null, 2)}\n`,
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Translation source changed",
    );
    const learningFile = path.join(
      fixture,
      "content/journeys/milano/learning/translations.json",
    );
    const learning = JSON.parse(await readFile(learningFile, "utf8"));
    learning.questions[quiz.questions[0].id].source.questionEn = editedQuestion;
    await writeFile(learningFile, JSON.stringify(learning));
    const result = await buildContent(fixture);
    const battle = result.battles.find(
      (item) => item.id === "milano_duomo_01",
    )!;
    const generated = await generatedQuizzes();
    expect(
      quizSchema.parse(generated[battle.quizId]).questions[0].questionEn,
    ).toBe(editedQuestion);
    expect(await readFile(productionFile, "utf8")).toBe(original);
    expect(await readFile(screenFile, "utf8")).toBe(originalScreen);
  }, 90_000);
});
