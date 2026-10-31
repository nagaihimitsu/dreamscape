import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/last_supper_B1.json" with { type: "json" };
import phase2 from "../fixtures/phase2-saves.json" with { type: "json" };
import {
  SAVE_KEY,
  saved,
  startLegacyJourney,
  expectNoOverflow,
} from "./helpers";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  playBattle,
  reloadUnchanged,
  romanceProgress,
  startBattleFromEntry,
} from "./battle-helpers";

test.use({ reducedMotion: "reduce" });

const battleId = "milano_last_supper_01";
const cases = [
  { correctness: [true, true, true], score: 3, title: "PERFECT VICTORY" },
  { correctness: [true, false, true], score: 2, title: "VICTORY" },
  { correctness: [false, true, false], score: 1, title: "DEFEAT" },
  { correctness: [false, false, false], score: 0, title: "DEFEAT" },
];

for (const example of cases) {
  test(`${example.score} correct answers reach ${example.title} without modifying romance progress`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 360, height: 740 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await startLegacyJourney(page);
    const romance = romanceProgress(await saved(page));
    await startBattleFromEntry(page);
    const result = await playBattle(page, quiz.questions, example.correctness);
    expect(result.state.activeBattle!.score).toBe(example.score);
    expect(result.state.ap).toBe(example.score >= 2 ? 6 : 5);
    expect(result.state.completedEpisodeIds).toEqual([
      "milano_last_supper_episode",
    ]);
    expect(result.state.completedCityIds).toEqual([]);
    expect(
      result.state.claimedRewardIds.filter(
        (id) => id === "chapter_milano_first_clear",
      ),
    ).toHaveLength(1);
    expect(romanceProgress(result.state)).toEqual(romance);
    expect(result.state.battleRecords).toEqual([
      {
        battleId,
        attempts: 1,
        firstScore: example.score,
        bestScore: example.score,
        lastScore: example.score,
      },
    ]);
    await expect(
      page
        .getByTestId("battle-result")
        .getByRole("heading", { name: example.title, exact: true }),
    ).toBeVisible();
    await expectNoOverflow(page);
    await reloadUnchanged(page);
    await expect(page.getByTestId("battle-result")).toBeVisible();
    await page
      .getByRole("button", { name: "自由時間へ進む", exact: true })
      .click();
    expect((await saved(page)).activeBattle).toBeNull();
    expect(romanceProgress(await saved(page))).toEqual(romance);
    expect(errors).toEqual([]);
  });
}

test("hints, vocabulary, locked answers and saved reactions survive reload, then replay improves the record", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await startLegacyJourney(page, ["航", "澪"]);
  const initial = romanceProgress(await saved(page));
  await startBattleFromEntry(page);
  await reloadUnchanged(page); // Intro dialogue.
  await battleDialogueUntilQuestionOrResult(page);
  const question = quiz.questions[0];
  for (const vocabulary of question.vocabularyJa) {
    await expect(
      page
        .getByLabel("難単語の補足")
        .getByText(vocabulary.word, { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByLabel("難単語の補足")
        .getByText(vocabulary.meaning, { exact: true }),
    ).toBeVisible();
  }
  // Explanations and the optional hint are not answer-revealing material shown before an answer.
  await expect(
    page.getByText(question.correctExplanationJa, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(question.hintJa, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  await expect(page.getByText(question.hintJa, { exact: true })).toBeVisible();
  await reloadUnchanged(page); // Question and open hint.
  await expect(page.getByText(question.hintJa, { exact: true })).toBeVisible();
  const locked = await answerRound(page, question, false, true);
  expect(locked.activeBattle!.answers[0].hintUsed).toBe(true);
  await expect(
    page.getByText(question.incorrectExplanationJa, { exact: true }),
  ).toBeVisible();
  await page.getByText("解説の根拠を読む", { exact: true }).click();
  await expect(page.locator(".quiz-sources a").first()).toHaveAttribute(
    "href",
    question.sources[0].url,
  );
  await reloadUnchanged(page); // Feedback with the chosen answer locked.
  for (const option of question.options)
    await expect(page.getByTestId(`answer-${option.id}`)).toBeDisabled();
  await page.screenshot({
    path: "artifacts/phase3-mobile-feedback.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "artifacts/phase3-mobile-feedback-viewport.png",
  });
  await page.getByTestId("battle-advance").click();
  await reloadUnchanged(page); // The first enemy reaction.
  const wrongReaction: string[] = [];
  await battleDialogueUntilQuestionOrResult(page, wrongReaction);
  for (const next of quiz.questions.slice(1)) {
    await answerRound(page, next, false);
    await page.getByTestId("battle-advance").click();
    await battleDialogueUntilQuestionOrResult(page);
  }
  const first = await saved(page);
  expect(first.activeBattle!.phase).toBe("result");
  expect(first.activeBattle!.score).toBe(0);
  expect(first.ap).toBe(5);
  expect(romanceProgress(first)).toEqual(initial);
  await page
    .getByRole("button", { name: "再戦する", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  expect((await saved(page)).battleRecords[0].attempts).toBe(1);
  await battleDialogueUntilQuestionOrResult(page);
  await answerRound(page, question, true, true);
  await expect(
    page.getByText(question.correctExplanationJa, { exact: true }),
  ).toBeVisible();
  await page.getByTestId("battle-advance").click();
  const correctReaction: string[] = [];
  await battleDialogueUntilQuestionOrResult(page, correctReaction);
  expect(correctReaction.join("\n")).not.toBe(wrongReaction.join("\n"));
  for (const next of quiz.questions.slice(1)) {
    await answerRound(page, next, true);
    await page.getByTestId("battle-advance").click();
    await battleDialogueUntilQuestionOrResult(page);
  }
  const replay = await saved(page);
  expect(replay.activeBattle!.phase).toBe("result");
  expect(replay.ap).toBe(6);
  expect(replay.battleRecords).toEqual([
    { battleId, attempts: 2, firstScore: 0, bestScore: 3, lastScore: 3 },
  ]);
  expect(romanceProgress(replay)).toEqual(initial);
  await reloadUnchanged(page);
  expect((await saved(page)).battleRecords[0].attempts).toBe(2);
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "再戦する", exact: true }).click();
  const third = await playBattle(page, quiz.questions, [true, true, false]);
  expect(third.state.ap).toBe(6);
  expect(third.state.battleRecords[0]).toEqual({
    battleId,
    attempts: 3,
    firstScore: 0,
    bestScore: 3,
    lastScore: 2,
  });
  expect(
    third.state.claimedRewardIds.filter(
      (id) => id === "battle_last_supper_first_victory",
    ),
  ).toHaveLength(1);
});

test("a real Phase 2 ending save can play a battle and return to the same ending", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: phase2.ending },
  );
  await page.reload();
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  const before = romanceProgress(await saved(page));
  await startBattleFromEntry(page);
  const result = await playBattle(page, quiz.questions, [true, false, true]);
  expect(result.state.schemaVersion).toBe(7);
  expect(romanceProgress(result.state)).toEqual(before);
  await page
    .getByRole("button", { name: "自由時間へ進む", exact: true })
    .click();
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  await reloadUnchanged(page);
  expect(romanceProgress(await saved(page))).toEqual(before);
});

test("a real Phase 2 romance conversation resumes safely and blocks battle entry", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: phase2.activeDate },
  );
  await page.reload();
  await expect(page.locator(".dialogue-text")).toContainText(
    phase2.activeDate.activeDate!.frame.text,
  );
  await expect(
    page.getByRole("button", { name: "クイズバトルを試す", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "観光・観察を試す", exact: true }),
  ).toHaveCount(0);
  const before = await saved(page);
  expect(before.activeDate!.storyState).toBe(
    phase2.activeDate.activeDate!.storyState,
  );
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  await expect
    .poll(async () => (await saved(page)).revision)
    .toBeGreaterThan(before.revision);
  expect((await saved(page)).schemaVersion).toBe(7);
  expect((await saved(page)).activeBattle).toBeNull();
  expect((await saved(page)).ap).toBe(before.ap);
});
