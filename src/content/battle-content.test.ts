import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { changeCatalogEntry, prepareContentFixture, quizSourceFile, storySourceFile } from "./test-fixtures";
import battleData from "./generated/content/battles/catalog.json";
import type { BattleDefinition } from "./schemas";
import { parseStoryTags } from "./tags";

let fixture: string;
/** The Last Supper battle; its quiz and Ink, edited below, are found by their IDs. */
const battleId = "milano_last_supper_01";
const battle = battleData.battles.find((entry) => entry.id === battleId)!;
const quizPath = quizSourceFile(battle.quizId);
const inkPath = storySourceFile(battle.storyId);
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

function dialogue(
  compiled: string,
  scene: string,
  correct: boolean,
  score: number,
) {
  const story = new Story(compiled);
  story.variablesState.$("battle_scene", scene);
  story.variablesState.$("answer_correct", correct);
  story.variablesState.$("battle_score", score);
  const lines: string[] = [];
  while (story.canContinue) lines.push(story.Continue() ?? "");
  return lines.join("\n");
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
      "milano_last_supper_b1_example",
    );
    expect(
      new Set(quizData.questions.map((question: { correctOptionId: string }) => question.correctOptionId))
        .size,
    ).toBe(3);
  });

  it("uses distinct correct/wrong reactions and completes the ending without UI prose", async () => {
    const result = await buildContent(fixture, false);
    const battle = result.battles[0];
    const compiled = result.stories[battle.storyId];
    for (const [index, scene] of battle.scenes.afterRounds.entries()) {
      expect(dialogue(compiled, scene, true, index + 1)).not.toBe(
        dialogue(compiled, scene, false, 0),
      );
    }
    const endings = [0, 2, 3].map((score) =>
      dialogue(compiled, battle.scenes.outro, score > 0, score),
    );
    // The revised scene responds to the last answer, while the score still
    // remains available for the battle result and reward calculations.
    expect(endings[0]).not.toBe(endings[1]);
    expect(endings[1]).toBe(endings[2]);
    // The discovery for a later round must not be explained by the preceding scene.
    const intro = dialogue(compiled, battle.scenes.intro, false, 0);
    expect(intro).not.toMatch(/三角形|こめかみ|乾いた/);
    expect(
      dialogue(compiled, battle.scenes.afterRounds[0], true, 1),
    ).not.toMatch(/こめかみ|乾いた/);
    expect(
      dialogue(compiled, battle.scenes.afterRounds[1], true, 2),
    ).not.toMatch(/乾いた|漆喰/);
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

  it("rejects Japanese questions and English explanations", async () => {
    await changeQuiz((quiz) => {
      quiz.questions[0].questionEn = "どこに座っていますか？";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "must be English",
    );
    await changeQuiz((quiz) => {
      quiz.questions[0].correctExplanationJa = "He sits in the center.";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Expected Japanese text",
    );
  });

  it("rejects duplicate production quiz IDs across files", async () => {
    await writeFile(
      path.join(fixture, path.dirname(quizPath), "duplicate.json"),
      JSON.stringify(quizData),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate quizId",
    );
  });

  it("validates configured scenes rather than assuming an Ink route shape", async () => {
    await changeBattle((battle) => {
      battle.scenes.afterRounds[1] = "absent_scene";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Empty battle scene",
    );
  });

  it("requires the battle variables used for saved dialogue", async () => {
    await changeInk('VAR player_name = ""', "// removed variable");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Missing required battle Ink variable: player_name",
    );
  });

  it("rejects reward effects even in a wrong-answer branch", async () => {
    await changeInk(
      "「ランプを探してた。",
      "# effect: common_date_first_playful\n「ランプを探してた。",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle story cannot apply effects",
    );
  });

  it("rejects Ink choice menus in battle dialogue", async () => {
    await changeInk(
      "「お水、いりますか？」",
      "* [選ぶ]\n    続き",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle story cannot contain choices",
    );
  });

  it("requires Japanese dialogue on non-default branches", async () => {
    await changeInk(
      "「ランプを探してた。こっちの部屋の窓と、絵の光を合わせたんですね。」",
      "You missed it.",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle dialogue must be Japanese",
    );
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
