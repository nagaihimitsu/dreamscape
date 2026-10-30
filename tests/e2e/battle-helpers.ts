import { expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";
import { expectNoOverflow, saved, openRevisits } from "./helpers";

export interface QuizQuestionForTest {
  id: string;
  questionEn: string;
  options: { id: string; textEn: string }[];
  correctOptionId: string;
}

/** Romance state is independent of quiz score. AP and chapter unlocks now change through integration rewards. */
export function romanceProgress(state: GameState) {
  return {
    playerName: state.playerName,
    heroineName: state.heroineName,
    affection: state.affection,
    romanceStage: state.romanceStage,
    playedDateIds: state.playedDateIds,
    memories: state.memories,
    activeDate: state.activeDate,
    unlockedEventIds: state.unlockedEventIds,
    confessionStatus: state.confessionStatus,
    endingReached: state.endingReached,
  };
}

export async function startBattleFromEntry(page: Page) {
  if ((await saved(page)).activeTourism?.landmarkId === "last_supper") {
    await page
      .getByRole("button", { name: "バトルを始める", exact: true })
      .click();
  } else {
    await openRevisits(page);
    await page.getByTestId("revisit-battle-milano_last_supper_01").click();
  }
  await expect
    .poll(async () => (await saved(page)).activeBattle?.phase)
    .toBe("dialogue");
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

export async function battleDialogueUntilQuestionOrResult(
  page: Page,
  transcript: string[] = [],
) {
  for (let count = 0; count < 80; count++) {
    const state = await saved(page);
    const active = state.activeBattle;
    if (!active) throw new Error("Expected an active battle");
    await expectNoOverflow(page);
    if (active.phase !== "dialogue") return state;
    if (active.frame) transcript.push(active.frame.text);
    await page.getByTestId("battle-advance").click();
    await expect
      .poll(async () => (await saved(page)).revision)
      .toBeGreaterThan(state.revision);
  }
  throw new Error("Battle dialogue did not finish within 80 lines");
}

export async function answerRound(
  page: Page,
  question: QuizQuestionForTest,
  correct: boolean,
  doubleClick = false,
) {
  const before = await saved(page);
  expect(before.activeBattle!.phase).toBe("question");
  await expect(
    page.getByRole("button", { name: "手がかり帳", exact: true }),
  ).toBeInViewport();
  const option = correct
    ? question.options.find((item) => item.id === question.correctOptionId)!
    : question.options.find((item) => item.id !== question.correctOptionId)!;
  await expect(page.getByTestId("battle-question")).toContainText(
    question.questionEn,
  );
  for (const candidate of question.options) {
    const button = page.getByTestId(`answer-${candidate.id}`);
    await expect(button).toContainText(candidate.textEn);
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  if (doubleClick) {
    await page
      .getByTestId(`answer-${option.id}`)
      .evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
  } else await page.getByTestId(`answer-${option.id}`).click();
  await expect
    .poll(async () => (await saved(page)).activeBattle?.phase)
    .toBe("feedback");
  await expect(page.getByTestId("battle-feedback")).toBeFocused();
  await expect(
    page.getByTestId("battle-feedback").getByRole("status"),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "手がかり帳", exact: true }),
  ).toBeInViewport();
  const after = await saved(page);
  expect(after.activeBattle!.answers).toHaveLength(
    before.activeBattle!.answers.length + 1,
  );
  expect(after.activeBattle!.answers.at(-1)).toMatchObject({
    questionId: question.id,
    optionId: option.id,
    correct,
  });
  expect(after.activeBattle!.score).toBe(
    before.activeBattle!.score + Number(correct),
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  for (const candidate of question.options)
    await expect(page.getByTestId(`answer-${candidate.id}`)).toBeDisabled();
  return after;
}

export async function playBattle(
  page: Page,
  questions: QuizQuestionForTest[],
  correctness: boolean[],
) {
  const transcript: string[] = [];
  for (let index = 0; index < questions.length; index++) {
    const state = await battleDialogueUntilQuestionOrResult(page, transcript);
    expect(state.activeBattle!.phase).toBe("question");
    expect(state.activeBattle!.roundIndex).toBe(index);
    await answerRound(page, questions[index], correctness[index]);
    await page.getByTestId("battle-advance").click();
  }
  const result = await battleDialogueUntilQuestionOrResult(page, transcript);
  expect(result.activeBattle!.phase).toBe("result");
  await expect(page.getByTestId("battle-result")).toBeVisible();
  return { state: result, transcript: transcript.join("\n") };
}

export async function reloadUnchanged(page: Page) {
  const before = await saved(page);
  await page.reload();
  await expect
    .poll(async () => (await saved(page)).revision)
    .toBe(before.revision);
  expect(await saved(page)).toEqual(before);
  return before;
}
