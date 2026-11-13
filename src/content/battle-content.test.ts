import { dataLanguageWarnings } from "../../scripts/data-language";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture, quizSourceFile, storySourceFile } from "./test-fixtures";
import battleData from "./generated/content/battles/catalog.json";
import { quizSchema, type BattleDefinition } from "./schemas";
import { splitStoryAddress, storyFileOf } from "./story-address";
import { parseStoryTags } from "./tags";

let fixture: string;
/** The Last Supper battle; its quiz and Ink (a knot of its place file), edited below, are found by their IDs. */
const battleId = "milano_last_supper_01";
const battle = battleData.battles.find((entry) => entry.id === battleId)!;
const quizPath = quizSourceFile(battle.quizId);
const inkPath = storySourceFile(storyFileOf(battle.storyId));
// The quiz as written in its file; the tests below write invalid values into it on purpose.
const quizData: Record<string, any> = JSON.parse(readFileSync(quizPath, "utf8"));

beforeEach(async () => {
  fixture = await mkdtemp(path.join(tmpdir(), "dreamscape-battle-content-"));
  await prepareContentFixture(fixture);
});
afterEach(async () => {
  await rm(fixture, { recursive: true, force: true });
});

async function changeQuiz(change: (quiz: typeof quizData) => void) {
  const quiz = structuredClone(quizData);
  change(quiz);
  await writeFile(path.join(fixture, quizPath), JSON.stringify(quiz));
}
async function changeBattle(change: (battle: BattleDefinition, catalog: { battles: BattleDefinition[] }) => void) {
  await changeCatalogEntry(fixture, "battles/catalog.json", "battles", battleId, change);
}
async function changeInk(before: string, after: string) {
  const file = path.join(fixture, inkPath);
  const source = await readFile(file, "utf8");
  expect(source).toContain(before);
  await writeFile(file, source.replace(before, after));
}

/**
 * The battle's lines between its calls, each quiz answered as `answers` says (as the game returns from `-> quiz(n) ->`):
 * the lines before quiz(1), after quiz(1), …, after the last quiz. `knot`: where the battle starts (its place file's knot).
 */
function dialogueParts(compiled: string, answers: boolean[], knot?: string): string[] {
  const story = new Story(compiled);
  story.allowExternalFunctionFallbacks = true;
  if (knot !== undefined) story.ChoosePathString(knot);
  const parts: string[] = [];
  for (let answered = 0; ; answered++) {
    const lines: string[] = [];
    while (story.canContinue) lines.push(story.Continue() ?? "");
    parts.push(lines.join("\n"));
    if (!story.currentChoices.length) return parts;
    const correct = answers[answered];
    story.variablesState.$("quiz_correct", correct);
    story.variablesState.$("answer_correct", correct);
    story.variablesState.$("battle_score", answers.slice(0, answered + 1).filter(Boolean).length);
    story.ChooseChoiceIndex(0);
  }
}

describe("battle content contract", () => {
  it("compiles all reachable dialogue inputs and bundles only reviewed production quizzes", async () => {
    const result = await buildContent(fixture);
    expect(result.routes).toBeGreaterThanOrEqual(105);
    expect(result.battleScenarios).toBeGreaterThanOrEqual(13);
    // Every battle's production quiz is generated (the battles of this build: the
    // repository's generated output may hold other journeys, e.g. the sample journey).
    expect(Object.keys(result.quizzes)).toEqual(
      expect.arrayContaining(result.battles.map((battle) => battle.quizId)),
    );
    const generated = JSON.parse(
      await readFile(
        path.join(fixture, "src/content/generated/quizzes.json"),
        "utf8",
      ),
    );
    expect(generated[quizData.id]).toEqual(quizData);
    expect(Object.keys(generated)).not.toContain(
      "milano_last_supper_example_quiz",
    );
    expect(
      new Set(quizData.questions.map((question: { correctOptionId: string }) => question.correctOptionId))
        .size,
    ).toBe(3);
  });

  it("uses distinct correct/wrong reactions and completes the ending without UI prose", async () => {
    const result = await buildContent(fixture, false);
    const { storyId, path: knot } = splitStoryAddress(result.battles.find((item) => item.id === battleId)!.storyId);
    const parts = (answers: boolean[]) => dialogueParts(result.stories[storyId], answers, knot);
    const right = parts([true, true, true]);
    const wrong = parts([false, false, false]);
    expect(right).toHaveLength(4);
    for (const index of [1, 2]) expect(right[index]).not.toBe(wrong[index]);
    // The ending responds to the last answer, while the score still
    // remains available for the battle result and reward calculations.
    const endings = [wrong, parts([false, true, true]), right].map((parts) => parts[3]);
    expect(endings[0]).not.toBe(endings[1]);
    expect(endings[1]).toBe(endings[2]);
    // The discovery for a later round must not be explained by the lines before it.
    expect(wrong[0]).not.toMatch(/三角形|こめかみ|乾いた/);
    expect(right[1]).not.toMatch(/こめかみ|乾いた/);
    expect(right[2]).not.toMatch(/乾いた|漆喰/);
  });

  it("rejects a missing production quiz reference", async () => {
    await changeBattle((battle) => {
      battle.quizId = "missing_quiz";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown battle quizId",
    );
  });

  it("rejects duplicate battle IDs", async () => {
    await changeBattle((battle, catalog) => {
      catalog.battles.push(structuredClone(battle));
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate battleId",
    );
  });

  it("rejects a mismatched landmark", async () => {
    await changeBattle((battle) => {
      battle.landmarkId = "duomo_milano";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle landmark mismatch",
    );
  });

  it("requires exactly three questions and three distinct options", async () => {
    await changeQuiz((quiz) => {
      quiz.questions.pop();
    });
    await expect(buildContent(fixture, false)).rejects.toThrow("A normal quiz needs three questions; a city finale needs five");
    await changeQuiz((quiz) => {
      quiz.questions[0].options[0].id = quiz.questions[0].options[1].id;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate quiz option ID",
    );
    await changeQuiz((quiz) => {
      quiz.questions[0].options[0].textEn = quiz.questions[0].options[1].textEn;
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate quiz option text",
    );
  });

  it("rejects a missing correct answer", async () => {
    await changeQuiz((quiz) => {
      quiz.questions[0].correctOptionId = "D";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"correctOptionId"[\s\S]*Invalid option/);
  });

  it("requires source evidence with claim category, URL and real calendar date", async () => {
    await changeQuiz((quiz) => {
      quiz.questions[0].sources = [];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"sources"[\s\S]*Too small: expected array to have >=1 items/);
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].checkedAt = "2026-02-30";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"checkedAt"[\s\S]*Invalid ISO date/);
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].url = "javascript:alert(1)";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"url"[\s\S]*Invalid URL/);
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].claimType = "probably_true";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(/"claimType"[\s\S]*Invalid option/);
  });

  it("warns about Japanese questions and English explanations without stopping the build (data-language)", async () => {
    const languageWarnings = async () => (await buildContent(fixture, false)).warnings.filter((warning) => warning.kind === "data-language");
    expect(await languageWarnings()).toEqual([]);
    // The English fields (a question in Japanese; its translation's source is checked on its own, so read with the schema here).
    const japaneseQuestion = structuredClone(quizData);
    japaneseQuestion.questions[0].questionEn = "どこに座っていますか？";
    expect(dataLanguageWarnings(quizSchema, japaneseQuestion, "q.json").map((warning) => warning.message)).toEqual([
      "クイズの英語の欄が英文になっていません：q.json の questions[0].questionEn「どこに座っていますか？」。クイズの画面と英語ノートは、この欄を英文として扱います（止めません）。"]);
    await changeQuiz((quiz) => {
      quiz.questions[0].correctExplanationJa = "He sits in the center.";
    });
    const japanese = await languageWarnings();
    expect(japanese).toHaveLength(1);
    expect(japanese[0].message).toMatch(/^日本語の欄に日本語がありません：.+ の questions\[0\]\.correctExplanationJa「He sits in the cente…」/u);
  });

  it("rejects duplicate production quiz IDs across files", async () => {
    // A quiz file is named after its ID, so the second file with the same ID sits in a subfolder.
    await mkdir(path.join(fixture, path.dirname(quizPath), "copy"), { recursive: true });
    await writeFile(
      path.join(fixture, path.dirname(quizPath), "copy", path.basename(quizPath)),
      JSON.stringify(quizData),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate quizId",
    );
  });

  it("rejects reward effects even in a wrong-answer branch", async () => {
    await changeInk(
      "ランプを探してた。",
      "# effect: common_date_first_playful\nランプを探してた。",
    );
    // The place file's reader reads every line of the battle's knot, the wrong answer's branch too (A7).
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "# effect: common_date_first_playful is on an ordinary line of milano_last_supper_01",
    );
  });

  it("accepts English dialogue on non-default branches (any language may be written: decision 28)", async () => {
    await changeInk(
      "ランプを探してた。こっちの部屋の窓と、絵の光を合わせたんですね",
      "You missed it.",
    );
    await expect(buildContent(fixture, false)).resolves.toBeDefined();
  });

  it("accepts the enemy speaker through the shared allowlisted metadata parser", () => {
    expect(
      parseStoryTags(["speaker: enemy"], {
        effectIds: [],
        backgroundIds: [],
        emotionIds: [],
      }).speaker,
    ).toBe("enemy");
  });
});
