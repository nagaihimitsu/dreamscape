import { expect, type Page } from "@playwright/test";
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import { saved } from "./helpers";
import { playBattle } from "./battle-helpers";
import { finishTourismGuide, openTourismFromEntry } from "./tourism-helpers";

/** Complete the original route from its guide, without a development clear or reward shortcut. */
export async function completeEpisode(
  page: Page,
  correctness: boolean[],
  readGuide = false,
) {
  await expect(
    page.getByRole("button", { name: /仮クリア|ミラノ章初回クリア/ }),
  ).toHaveCount(0);
  await openTourismFromEntry(page);
  if (readGuide) await finishTourismGuide(page);
  await page
    .getByRole("button", { name: "バトルを始める", exact: true })
    .click();
  const result = await playBattle(page, quiz.questions, correctness);
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  expect(result.state.completedEpisodeIds).toEqual([
    "milano_last_supper_episode",
  ]);
  expect(result.state.completedCityIds).toEqual([]);
  return result.state;
}

export async function enterFreeTime(page: Page) {
  await page
    .getByRole("button", { name: "自由時間へ進む", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(async () => (await saved(page)).activeBattle).toBeNull();
}
