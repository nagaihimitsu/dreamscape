import { expect, type Page } from "@playwright/test";
import catalog from "../../content/battles/catalog.json" with { type: "json" };
import quizzes from "../../src/content/generated/quizzes.json" with { type: "json" };
import type {
  BattleDefinition,
  QuizDefinition,
} from "../../src/content/schemas";
const battles = catalog.battles as BattleDefinition[];
const battleQuizzes = quizzes as Record<string, QuizDefinition>;
import type { GameState } from "../../src/domain/game";
import { saved, openRevisits } from "./helpers";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  romanceProgress,
} from "./battle-helpers";
import { openCluebook } from "./tourism-helpers";

export function specialBattle(format: "B" | "C") {
  const battle = battles.find((item) => item.format === format);
  if (!battle?.reasoning) throw new Error(`Missing ${format} battle`);
  return {
    battle,
    reasoning: battle.reasoning,
    quiz: battleQuizzes[battle.quizId],
  };
}

/** Everything outside the independent battle record must stay unchanged. */
export function nonBattleProgress(state: GameState) {
  return {
    ...romanceProgress(state),
    ap: state.ap,
    completedChapters: state.completedChapters,
    completedEpisodeIds: state.completedEpisodeIds,
    completedCityIds: state.completedCityIds,
    completedGuideIds: state.completedGuideIds,
    claimedRewardIds: state.claimedRewardIds,
    pendingApRewards: state.pendingApRewards,
    discoveredClueIds: state.discoveredClueIds,
    visitedLandmarkIds: state.visitedLandmarkIds,
  };
}

export async function startSpecialFromEntry(page: Page, format: "B" | "C") {
  const { battle } = specialBattle(format);
  await openRevisits(page);
  await page.getByTestId(`revisit-battle-${battle.id}`).click();
  await expect
    .poll(async () => (await saved(page)).activeBattle?.battleId)
    .toBe(battle.id);
}

export async function setEvidence(page: Page, ids: string[]) {
  await openCluebook(page);
  const before = (await saved(page)).activeBattle!.reasoning!;
  for (const id of before.selectedClueIds) {
    if (!ids.includes(id))
      await page.getByTestId(`select-evidence-${id}`).click();
  }
  for (const id of ids) {
    if (
      !(await saved(page)).activeBattle!.reasoning!.selectedClueIds.includes(id)
    )
      await page.getByTestId(`select-evidence-${id}`).click();
  }
  expect(
    (await saved(page)).activeBattle!.reasoning!.selectedClueIds.slice().sort(),
  ).toEqual(ids.slice().sort());
  for (const id of ids)
    await expect(page.getByTestId(`select-evidence-${id}`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  await page.getByTestId("case-return").click();
}

export async function submitEvidence(
  page: Page,
  accepted: boolean,
  doubleClick = false,
) {
  const before = await saved(page);
  const button = page.getByTestId("reasoning-submit");
  if (doubleClick)
    await button.evaluate((element: HTMLButtonElement) => {
      element.click();
      element.click();
    });
  else await button.click();
  await expect
    .poll(async () => (await saved(page)).activeBattle?.phase)
    .toBe("dialogue");
  const after = await saved(page);
  expect(after.activeBattle!.reasoning!.status).toBe(
    accepted ? "accepted" : "incorrect",
  );
  expect(after.activeBattle!.answers).toEqual(before.activeBattle!.answers);
  expect(after.activeBattle!.score).toBe(before.activeBattle!.score);
  expect(after.revision).toBe(before.revision + 1);
  return after;
}

export async function playSpecialBattle(
  page: Page,
  format: "B" | "C",
  correctness: boolean[],
) {
  const { quiz, reasoning } = specialBattle(format);
  const transcript: string[] = [];
  for (let index = 0; index < quiz.questions.length; index++) {
    let state = await battleDialogueUntilQuestionOrResult(page, transcript);
    if (state.activeBattle!.phase === "reasoning") {
      expect(index).toBe(reasoning.roundIndex);
      await setEvidence(page, reasoning.correctClueIds);
      await submitEvidence(page, true);
      state = await battleDialogueUntilQuestionOrResult(page, transcript);
    }
    expect(state.activeBattle!.phase).toBe("question");
    await answerRound(page, quiz.questions[index], correctness[index], true);
    await page.getByTestId("battle-advance").click();
  }
  const state = await battleDialogueUntilQuestionOrResult(page, transcript);
  expect(state.activeBattle!.phase).toBe("result");
  return { state, transcript: transcript.join("\n") };
}
