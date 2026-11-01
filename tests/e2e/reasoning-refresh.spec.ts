import { expect, test } from "@playwright/test";
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import scalaQuiz from "../../content/quizzes/la_scala_b_reasoning_B1.json" with { type: "json" };
import breraQuiz from "../../content/quizzes/brera_c_reasoning_B1.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, saved } from "./helpers";
import { answerRound, battleDialogueUntilQuestionOrResult, reloadUnchanged } from "./battle-helpers";
import { setEvidence, submitEvidence } from "./reasoning-helpers";

test.use({ reducedMotion: "reduce" });

test("old records stay intact while the new Scala and Brera cases play on the main route", async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 360, height: 780 });
  const oldRecords = ["milano_last_supper_b01", "milano_last_supper_c01"].map((battleId) => ({ battleId, attempts: 1, firstScore: 0, bestScore: 0, lastScore: 0 }));
  const oldSnapshot = { ...phase7.cityClearViewed, battleRecords: [...phase7.cityClearViewed.battleRecords, ...oldRecords] };
  // Loading preserves the v7 bytes; its relationship values are derived in
  // memory and are written only when the player first advances the game.
  await loadSnapshot(page, oldSnapshot);
  const initial = await page.evaluate(async (fixture) => {
    const modulePath = "/src/domain/game.ts";
    const domain = await import(/* @vite-ignore */ modulePath);
    return domain.validateGameState(fixture);
  }, oldSnapshot);
  expect((await saved(page)).schemaVersion).toBe(7);
  expect(initial.schemaVersion).toBe(11);
  const cases = [
    { id: "milano_la_scala_b01", place: "スカラ座", quiz: scalaQuiz, wrong: ["scala_ducal_fire"], correct: ["scala_air_raid"] },
    { id: "milano_brera_c01", place: "ブレラ", quiz: breraQuiz, wrong: ["brera_collection_origins", "brera_mantegna_purchase"], correct: ["brera_original_altar", "brera_collection_transfer"] },
  ];
  for (const scenario of cases) {
    const entry = page.getByTestId(`next-story-battle-${scenario.id}`);
    await expect(entry).toBeVisible();
    await entry.click();
    await expect.poll(async () => (await saved(page)).activeBattle?.battleId).toBe(scenario.id);
    const started = await saved(page);
    expect(started.schemaVersion).toBe(11);
    expect(started.affection).toBe(initial.affection);
    expect(started.trust).toBe(initial.trust);
    expect(started.spark).toBe(initial.spark);
    await expect(page.locator("body")).toContainText(scenario.place);
    for (const [index, question] of scenario.quiz.questions.entries()) {
      let state = await battleDialogueUntilQuestionOrResult(page);
      if (state.activeBattle!.phase === "reasoning") {
        await expect(page.getByTestId("reasoning-panel")).not.toContainText("最後の晩餐");
        await expectNoOverflow(page);
        await setEvidence(page, scenario.wrong);
        await submitEvidence(page, false);
        state = await battleDialogueUntilQuestionOrResult(page);
        expect(state.activeBattle!.phase).toBe("reasoning");
        await setEvidence(page, scenario.correct);
        await reloadUnchanged(page);
        await submitEvidence(page, true);
        state = await battleDialogueUntilQuestionOrResult(page);
      }
      expect(state.activeBattle!.phase).toBe("question");
      await answerRound(page, question, index !== 0);
      await page.getByTestId("battle-advance").click();
    }
    const result = await battleDialogueUntilQuestionOrResult(page);
    expect(result.activeBattle!.phase).toBe("result");
    expect(result.activeBattle!.score).toBe(2);
    await page.getByRole("button", { name: "自由時間へ戻る", exact: true }).click();
    await expect.poll(async () => (await saved(page)).activeBattle).toBeNull();
  }
  const result = await saved(page);
  for (const old of oldRecords) expect(result.battleRecords).toContainEqual(old);
  expect(result.ap).toBe(initial.ap);
  expect(result.pendingApRewards).toEqual(initial.pendingApRewards);
  expect(result.affection).toBe(initial.affection);
  expect(result.trust).toBe(initial.trust);
  expect(result.spark).toBe(initial.spark);
});
