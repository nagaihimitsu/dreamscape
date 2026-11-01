import { expect, test, type Page } from "@playwright/test";
import tourism from "../../content/tourism/catalog.json" with { type: "json" };
const tourismAssets = tourism.assets;
const tourismClues = tourism.clues;
import phase5 from "../fixtures/phase5-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import {
  SAVE_KEY,
  saved,
  expectNoOverflow,
} from "./helpers";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  reloadUnchanged,
} from "./battle-helpers";
import { openCluebook, showClue } from "./tourism-helpers";
import {
  nonBattleProgress,
  playSpecialBattle,
  setEvidence,
  specialBattle,
  startSpecialFromEntry,
  submitEvidence,
} from "./reasoning-helpers";

test.use({ reducedMotion: "reduce" });

async function loadSnapshot(page: Page, value: unknown) {
  await page.goto("/");
  await page.evaluate(
    ({ key, snapshot }) => localStorage.setItem(key, JSON.stringify(snapshot)),
    { key: SAVE_KEY, snapshot: value },
  );
  await page.reload();
}

async function closeBookUnchanged(page: Page) {
  const before = await saved(page);
  await page.getByTestId("cluebook-close").click();
  expect(await saved(page)).toEqual(before);
}

async function assertCaseImage(page: Page, clueId: string) {
  const image = page.getByTestId(`clue-image-${clueId}`);
  await expect(image).toBeVisible();
  const href = await image.locator("image").getAttribute("href");
  expect(href).toBeTruthy();
  const width = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url!;
    await img.decode();
    return img.naturalWidth;
  }, href);
  expect(width).toBe(tourismAssets[0].width);
}

test("B exposes a definite contradiction with readable case evidence, persists retries, and grants no rewards", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await loadSnapshot(page, {
    ...phase6.freeTime,
    battleRecords: [...phase6.freeTime.battleRecords, ...phase6.B_result.battleRecords],
  });
  const original = await saved(page);
  expect(original.discoveredClueIds).not.toContain("last_supper_doorway");
  const protectedProgress = nonBattleProgress(original);
  const { battle, quiz, reasoning } = specialBattle("B");
  await startSpecialFromEntry(page, "B");
  await openCluebook(page);
  for (const id of reasoning.caseClueIds) {
    await showClue(page, id);
    await expect(page.getByTestId(`notebook-${id}`)).toBeAttached();
  }
  await showClue(page, reasoning.correctClueIds[0]);
  await expect(
    page.getByTestId(`select-evidence-${reasoning.correctClueIds[0]}`),
  ).toBeDisabled();
  await closeBookUnchanged(page);
  await battleDialogueUntilQuestionOrResult(page);
  await answerRound(page, quiz.questions[0], true);
  await page.getByTestId("battle-advance").click();
  await battleDialogueUntilQuestionOrResult(page);
  expect((await saved(page)).activeBattle!.phase).toBe("reasoning");
  await expect(page.getByTestId("reasoning-panel")).toBeVisible();
  await expect(page.getByTestId("reasoning-submit")).toBeDisabled();
  await expect(page.getByTestId("answer-A")).toHaveCount(0);
  await page.getByTestId("reasoning-press").click();
  await reloadUnchanged(page);
  const pressed = await battleDialogueUntilQuestionOrResult(page);
  expect(pressed.activeBattle!.reasoning!.pressed).toBe(true);
  expect(pressed.activeBattle!.phase).toBe("reasoning");
  const wrong = reasoning.caseClueIds.find(
    (id) => !reasoning.correctClueIds.includes(id),
  )!;
  await openCluebook(page);
  await expect(page.getByTestId("case-context")).toContainText(
    quiz.questions[reasoning.roundIndex].questionEn,
  );
  await showClue(page, wrong);
  const wrongCard = page.getByTestId(`notebook-${wrong}`);
  await expect(wrongCard).toContainText(
    tourismClues.find((clue) => clue.id === wrong)!.descriptionJa,
  );
  await wrongCard.scrollIntoViewIfNeeded();
  await expect(page.getByTestId("case-context")).toBeInViewport();
  const choice = page.getByTestId(`select-evidence-${wrong}`);
  expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await choice.click();
  await page.getByTestId("case-return").click();
  await submitEvidence(page, false, true);
  await reloadUnchanged(page);
  const rejected: string[] = [];
  await battleDialogueUntilQuestionOrResult(page, rejected);
  expect(rejected.join("\n")).toMatch(/[。？！]/);
  expect((await saved(page)).activeBattle!.phase).toBe("reasoning");
  expect((await saved(page)).activeBattle!.answers).toHaveLength(1);
  await setEvidence(page, reasoning.correctClueIds);
  await reloadUnchanged(page);
  for (let count = 0; count < 3; count++) {
    await openCluebook(page);
    await showClue(page, reasoning.correctClueIds[0]);
    await expect(
      page.getByTestId(`select-evidence-${reasoning.correctClueIds[0]}`),
    ).toHaveAttribute("aria-pressed", "true");
    await closeBookUnchanged(page);
  }
  await openCluebook(page);
  await showClue(page, reasoning.correctClueIds[0]);
  const evidence = page.getByTestId(`notebook-${reasoning.correctClueIds[0]}`);
  await assertCaseImage(page, reasoning.correctClueIds[0]);
  await evidence.getByText("根拠と解釈を確認する", { exact: true }).click();
  await expect(evidence.locator(".clue-sources a").first()).toHaveAttribute(
    "href",
    tourismClues.find((clue) => clue.id === reasoning.correctClueIds[0])!
      .sources[0].url,
  );
  await page
    .getByTestId(`select-evidence-${reasoning.correctClueIds[0]}`)
    .scrollIntoViewIfNeeded();
  await expect(page.getByTestId("case-context")).toBeInViewport();
  await page.screenshot({ path: "artifacts/phase6-b-case-notebook.png" });
  await closeBookUnchanged(page);
  await submitEvidence(page, true, true);
  await reloadUnchanged(page);
  await battleDialogueUntilQuestionOrResult(page);
  expect((await saved(page)).activeBattle!.answers).toHaveLength(1);
  expect((await saved(page)).activeBattle!.phase).toBe("question");
  await openCluebook(page);
  await showClue(page, reasoning.correctClueIds[0]);
  await expect(
    page.getByTestId(`select-evidence-${reasoning.correctClueIds[0]}`),
  ).toBeDisabled();
  await closeBookUnchanged(page);
  for (const question of quiz.questions.slice(1)) {
    await answerRound(page, question, true, true);
    await reloadUnchanged(page);
    await page.getByTestId("battle-advance").click();
    await battleDialogueUntilQuestionOrResult(page);
  }
  const result = await saved(page);
  expect(result.activeBattle!.score).toBe(3);
  expect(nonBattleProgress(result)).toEqual(protectedProgress);
  expect(
    result.battleRecords.find((record) => record.battleId === battle.id),
  ).toEqual({
    battleId: battle.id,
    attempts: 2,
    firstScore: 3,
    bestScore: 3,
    lastScore: 3,
  });
  await expect(page.getByTestId("episode-clear")).toHaveCount(0);
  await expect(page.getByTestId("battle-rewards")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "PERFECT VICTORY", exact: true }),
  ).toBeVisible();
  await reloadUnchanged(page);
  await page
    .getByRole("button", { name: "再戦する", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  const replay = await playSpecialBattle(page, "B", [false, false, false]);
  expect(replay.state.activeBattle!.score).toBe(0);
  expect(nonBattleProgress(replay.state)).toEqual(protectedProgress);
  expect(
    replay.state.battleRecords.find((record) => record.battleId === battle.id)
      ?.attempts,
  ).toBe(3);
  await page
    .getByRole("button", { name: "自由時間へ戻る", exact: true })
    .click();
  await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
  expect(nonBattleProgress(await saved(page))).toEqual(protectedProgress);
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test("C preserves two selected cards through notebook and reload, requires an English conclusion, and returns to the saved ending", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 740 });
  // A previous C attempt remains replayable from a completed romance save.
  const endingWithAttempt = { ...phase5.ending, battleRecords: phase6.C_result.battleRecords };
  await loadSnapshot(page, endingWithAttempt);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  expect(await saved(page)).toEqual(endingWithAttempt);
  const original = await saved(page);
  const protectedProgress = nonBattleProgress(original);
  expect(original.discoveredClueIds).toEqual([]);
  const { quiz, reasoning } = specialBattle("C");
  await startSpecialFromEntry(page, "C");
  for (const question of quiz.questions.slice(0, 2)) {
    await battleDialogueUntilQuestionOrResult(page);
    await answerRound(page, question, false);
    await page.getByTestId("battle-advance").click();
  }
  await battleDialogueUntilQuestionOrResult(page);
  expect((await saved(page)).activeBattle!.phase).toBe("reasoning");
  await expect(page.getByTestId("reasoning-press")).toHaveCount(0);
  await expect(page.getByTestId("reasoning-submit")).toBeDisabled();
  const unrelated = reasoning.caseClueIds.find(
    (id) => !reasoning.correctClueIds.includes(id),
  )!;
  const wrongPair = [reasoning.correctClueIds[0], unrelated];
  await setEvidence(page, wrongPair);
  await submitEvidence(page, false, true);
  await reloadUnchanged(page);
  await battleDialogueUntilQuestionOrResult(page);
  expect((await saved(page)).activeBattle!.phase).toBe("reasoning");
  await setEvidence(page, [reasoning.correctClueIds[1]]);
  await expect(page.getByTestId("reasoning-submit")).toBeDisabled();
  await reloadUnchanged(page);
  await openCluebook(page);
  await showClue(page, reasoning.correctClueIds[1]);
  await expect(
    page.getByTestId(`select-evidence-${reasoning.correctClueIds[1]}`),
  ).toHaveAttribute("aria-pressed", "true");
  await showClue(page, reasoning.correctClueIds[0]);
  await page
    .getByTestId(`select-evidence-${reasoning.correctClueIds[0]}`)
    .click();
  await showClue(page, unrelated);
  await expect(page.getByTestId(`select-evidence-${unrelated}`)).toBeDisabled();
  const beforeClose = await saved(page);
  expect(beforeClose.activeBattle!.reasoning!.selectedClueIds).toEqual(
    [...reasoning.correctClueIds].reverse(),
  );
  await page.screenshot({ path: "artifacts/phase6-c-case-notebook.png" });
  await closeBookUnchanged(page);
  await reloadUnchanged(page);
  await expect(page.getByTestId("reasoning-submit")).toBeEnabled();
  await page.screenshot({
    path: "artifacts/phase6-c-reasoning.png",
    fullPage: true,
  });
  await submitEvidence(page, true, true);
  await battleDialogueUntilQuestionOrResult(page);
  const needsConclusion = await saved(page);
  expect(needsConclusion.activeBattle!.phase).toBe("question");
  expect(needsConclusion.activeBattle!.answers).toHaveLength(2);
  expect(needsConclusion.activeBattle!.score).toBe(0);
  await openCluebook(page);
  await expect(page.getByTestId("case-context")).toContainText(
    quiz.questions[2].questionEn,
  );
  for (const id of reasoning.correctClueIds) {
    await showClue(page, id);
    await expect(page.getByTestId(`select-evidence-${id}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId(`select-evidence-${id}`)).toBeDisabled();
  }
  await closeBookUnchanged(page);
  await reloadUnchanged(page);
  await answerRound(page, quiz.questions[2], false, true);
  await page.getByTestId("battle-advance").click();
  const result = await battleDialogueUntilQuestionOrResult(page);
  expect(result.activeBattle!.score).toBe(0);
  expect(nonBattleProgress(result)).toEqual(protectedProgress);
  await expect(
    page.getByRole("heading", { name: "DEFEAT", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("episode-clear")).toHaveCount(0);
  await reloadUnchanged(page);
  await page
    .getByRole("button", { name: "自由時間へ戻る", exact: true })
    .click();
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  expect(nonBattleProgress(await saved(page))).toEqual(protectedProgress);
  await expectNoOverflow(page);
});

test("an authentic Phase 5 A question remains intact until the next action migrates its save", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await loadSnapshot(page, phase5.battleQuestion);
  await expect(page.getByTestId("battle-question")).toBeVisible();
  expect(await saved(page)).toEqual(phase5.battleQuestion);
  await openCluebook(page);
  await expect(page.getByTestId("case-context")).toHaveCount(0);
  await closeBookUnchanged(page);
  await page.getByRole("button", { name: "ヒントを見る", exact: true }).click();
  const migrated = await saved(page);
  expect(migrated.schemaVersion).toBe(10);
  expect(migrated.activeBattle).toEqual({
    ...phase5.battleQuestion.activeBattle,
    reasoning: null,
    hintOpen: true,
    hintUsed: true,
  });
  expect(nonBattleProgress(migrated)).toEqual(
    nonBattleProgress(phase5.battleQuestion as unknown as typeof migrated),
  );
  await reloadUnchanged(page);
});
