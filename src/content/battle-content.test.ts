import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Story } from "inkjs";
import { buildContent } from "../../scripts/content-pipeline";
import { prepareContentFixture } from "./test-fixtures";
import quizData from "../../content/quizzes/last_supper_B1.json";
import battleData from "../../content/battles/catalog.json";
import { parseStoryTags } from "./tags";

let fixture: string;
const quizPath = "content/quizzes/last_supper_B1.json";
const battlePath = "content/battles/catalog.json";
const inkPath = "content/stories/battles/milano_last_supper.ink";

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
async function changeBattle(change: (catalog: typeof battleData) => void) {
  const data = structuredClone(battleData);
  change(data);
  await writeFile(path.join(fixture, battlePath), JSON.stringify(data));
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
    // Previously published quiz sets remain available for old save and
    // learning records alongside the revised battles' production quizzes.
    expect(Object.keys(result.quizzes)).toEqual(
      expect.arrayContaining(battleData.battles.map((battle) => battle.quizId)),
    );
    const generated = JSON.parse(
      await readFile(
        path.join(fixture, "src/content/generated/quizzes.json"),
        "utf8",
      ),
    );
    expect(generated[quizData.id]).toEqual(quizData);
    expect(Object.keys(generated)).not.toContain(
      "milano_last_supper_b1_sample",
    );
    expect(
      new Set(quizData.questions.map((question) => question.correctOptionId))
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
    await changeBattle((data) => {
      data.battles[0].quizId = "missing_quiz";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Unknown battle quizId",
    );
  });

  it("rejects duplicate battle IDs", async () => {
    await changeBattle((data) => {
      data.battles.push(structuredClone(data.battles[0]));
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate battleId",
    );
  });

  it("rejects a mismatched landmark", async () => {
    await changeBattle((data) => {
      data.battles[0].landmarkId = "duomo_milano";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle landmark mismatch",
    );
  });

  it("requires exactly three questions and three distinct options", async () => {
    await changeQuiz((quiz) => {
      quiz.questions.pop();
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
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
    await expect(buildContent(fixture, false)).rejects.toThrow();
  });

  it("requires source evidence with claim category, URL and real calendar date", async () => {
    await changeQuiz((quiz) => {
      quiz.questions[0].sources = [];
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].checkedAt = "2026-02-30";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].url = "javascript:alert(1)";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
    await changeQuiz((quiz) => {
      quiz.questions[0].sources[0].claimType = "probably_true";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow();
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
      path.join(fixture, "content/quizzes/duplicate.json"),
      JSON.stringify(quizData),
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Duplicate quizId",
    );
  });

  it("validates configured scenes rather than assuming an Ink route shape", async () => {
    await changeBattle((data) => {
      data.battles[0].scenes.afterRounds[1] = "absent_scene";
    });
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Empty battle scene",
    );
  });

  it("requires the battle variables used for saved dialogue", async () => {
    await changeInk('VAR player_name = "ユウ"', "// removed variable");
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Missing required battle Ink variable: player_name",
    );
  });

  it("rejects reward effects even in a wrong-answer branch", async () => {
    await changeInk(
      "「見落としたな。",
      "# effect: milano_cafe_first_joke\n    「見落としたな。",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle story cannot apply effects",
    );
  });

  it("rejects Ink choice menus in battle dialogue", async () => {
    await changeInk(
      "「ならば三つ、確かめよう。君たちが見ているのは絵か、それとも自分の思い込みか」",
      "* [選ぶ]\n    続き",
    );
    await expect(buildContent(fixture, false)).rejects.toThrow(
      "Battle story cannot contain choices",
    );
  });

  it("requires Japanese dialogue on non-default branches", async () => {
    await changeInk(
      "「見落としたな。中央のキリストは三角形の安定した姿で、周りの使徒たちとは対照的なのだ」",
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
