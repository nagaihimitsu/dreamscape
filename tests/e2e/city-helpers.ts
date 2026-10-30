import { expect, type Page } from "@playwright/test";
import journey from "../../content/progression/journey.json" with { type: "json" };
import catalog from "../../content/battles/catalog.json" with { type: "json" };
import quizzes from "../../src/content/generated/quizzes.json" with { type: "json" };
import type {
  BattleDefinition,
  QuizDefinition,
} from "../../src/content/schemas";
import type { EpisodeDefinition } from "../../src/content/journey-schemas";
import {
  answerRound,
  battleDialogueUntilQuestionOrResult,
  reloadUnchanged,
} from "./battle-helpers";
import { expectNoOverflow, saved } from "./helpers";
import { openCluebook } from "./tourism-helpers";

export const cityEpisodes = (journey.episodes as EpisodeDefinition[]).filter(
  (episode) => episode.kind !== "city_finale",
);
export const cityFinale = () =>
  (journey.episodes as EpisodeDefinition[]).find(
    (episode) => episode.kind === "city_finale",
  )!;
const battles = catalog.battles as BattleDefinition[];
const battleQuizzes = quizzes as Record<string, QuizDefinition>;

export function episodeQuiz(episode: EpisodeDefinition) {
  const battle = battles.find((item) => item.id === episode.battleId)!;
  return battleQuizzes[battle.quizId];
}

export async function openCityRecords(page: Page) {
  const summary = page.getByText("観光地・発見・戦績を見る", { exact: true });
  if (
    !(await summary
      .locator("..")
      .evaluate((element: HTMLDetailsElement) => element.open))
  )
    await summary.click();
}

export async function playCityBattle(
  page: Page,
  episode: EpisodeDefinition,
  score: number,
  resumeEveryRound = false,
) {
  const quiz = episodeQuiz(episode);
  const transcript: string[] = [];
  for (const [index, question] of quiz.questions.entries()) {
    const state = await battleDialogueUntilQuestionOrResult(page, transcript);
    expect(state.activeBattle!.battleId).toBe(episode.battleId);
    expect(state.activeBattle!.roundIndex).toBe(index);
    await expect(page.locator(".battle-roundbar")).toContainText(
      `第${index + 1}問 / 全${quiz.questions.length}問`,
    );
    if (resumeEveryRound) {
      await reloadUnchanged(page);
      const before = await saved(page);
      await openCluebook(page);
      await page.getByTestId("cluebook-close").click();
      expect(await saved(page)).toEqual(before);
    }
    await answerRound(page, question, index < score, true);
    if (resumeEveryRound) await reloadUnchanged(page);
    await page.getByTestId("battle-advance").click();
  }
  const state = await battleDialogueUntilQuestionOrResult(page, transcript);
  expect(state.activeBattle!.phase).toBe("result");
  expect(state.activeBattle!.score).toBe(score);
  expect(state.activeBattle!.answers).toHaveLength(quiz.questions.length);
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expectNoOverflow(page);
  return { state, transcript: transcript.join("\n") };
}

export async function finishCityEpilogue(page: Page, reload = false) {
  const transcript: string[] = [];
  for (let step = 0; step < 30; step++) {
    const state = await saved(page);
    if (!state.activeEpilogue) return transcript.join("\n");
    await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
    transcript.push(state.activeEpilogue.frame.text);
    if (reload && step === 1) await reloadUnchanged(page);
    await page
      .getByTestId("epilogue-advance")
      .evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
    await expect
      .poll(async () => (await saved(page)).revision)
      .toBe(state.revision + 1);
    await expectNoOverflow(page);
  }
  throw new Error("City epilogue did not finish within 30 lines");
}
