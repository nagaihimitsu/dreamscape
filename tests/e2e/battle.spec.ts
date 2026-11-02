import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import {
  saved,
  startCurrentSupperJourney,
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
    await startCurrentSupperJourney(page);
    const before = await saved(page);
    const romance = romanceProgress(before);
    await startBattleFromEntry(page);
    const result = await playBattle(page, quiz.questions, example.correctness);
    expect(result.state.activeBattle!.score).toBe(example.score);
    expect(result.state.ap).toBe(Math.min(12, before.ap + (example.score >= 2 ? 6 : 5)));
    expect(result.state.completedEpisodeIds).toEqual([
      ...before.completedEpisodeIds,
      "milano_last_supper_episode",
    ]);
    expect(result.state.completedCityIds).toEqual([]);
    expect(
      result.state.claimedRewardIds.filter(
        (id) => id === "chapter_milano_first_clear",
      ),
    ).toHaveLength(1);
    expect(romanceProgress(result.state)).toEqual(romance);
    expect(result.state.battleRecords.find((record) => record.battleId === battleId)).toEqual(
      {
        battleId,
        attempts: 1,
        firstScore: example.score,
        bestScore: example.score,
        lastScore: example.score,
      },
    );
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

test("hints, vocabulary, locked answers and saved reactions survive reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await startCurrentSupperJourney(page, ["航", "澪"]);
  const before = await saved(page);
  const initial = romanceProgress(before);
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
  expect(first.ap).toBe(Math.min(12, before.ap + 5));
  expect(romanceProgress(first)).toEqual(initial);
  await expect(page.getByRole("button", { name: "再戦する", exact: true })).toHaveCount(0);
  await reloadUnchanged(page);
  expect((await saved(page)).battleRecords.find((record) => record.battleId === battleId)!.attempts).toBe(1);
  await expectNoOverflow(page);
});
