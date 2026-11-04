import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import {
  saved,
  startCurrentSupperJourney,
  expectNoOverflow,
  availableAp,
} from "./helpers";
import {
  playBattle,
  reloadUnchanged,
} from "./battle-helpers";
import { finishTourismGuide, openObservationList, openTourismFromEntry } from "./tourism-helpers";
import { enterFreeTime } from "./journey-helpers";

test.use({ reducedMotion: "reduce" });

const rewards = [
  "guide_last_supper_first_read",
  "battle_last_supper_first_complete",
  "battle_last_supper_first_victory",
  "chapter_milano_first_clear",
];

test("a full guide and successful battle grant seven AP once and lead directly to a paid date", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await startCurrentSupperJourney(page, ["航", "澪"]);
  const initial = await saved(page);
  expect((await saved(page)).activeTourism?.landmarkId).toBe("last_supper");
  await expect(
    page.getByRole("button", { name: /仮クリア|ミラノ章初回クリア/ }),
  ).toHaveCount(0);
  await openTourismFromEntry(page);
  await finishTourismGuide(page);
  const guide = await saved(page);
  expect(guide.ap).toBe(initial.ap + 1);
  expect(guide.completedGuideIds).toEqual(["last_supper"]);
  expect(guide.claimedRewardIds).toEqual([...initial.claimedRewardIds, rewards[0]]);
  await reloadUnchanged(page);
  await openObservationList(page);
  await page.getByTestId("guide-replay").click();
  await finishTourismGuide(page);
  expect((await saved(page)).ap).toBe(guide.ap);
  await page
    .getByRole("button", { name: "進む", exact: true })
    .click();
  const result = await playBattle(page, quiz.questions, [true, true, false]);
  expect(result.state.ap).toBe(12);
  expect(result.state.affection).toBe(0);
  expect(result.state.claimedRewardIds.slice().sort()).toEqual(
    [...initial.claimedRewardIds, ...rewards].sort(),
  );
  expect(result.state.completedEpisodeIds).toEqual([
    ...initial.completedEpisodeIds, "milano_last_supper_episode",
  ]);
  expect(result.state.completedCityIds).toEqual([]);
  expect(result.state.pendingApRewards.reduce((sum, reward) => sum + reward.remainingAp, 0)).toBe(1);
  expect(
    result.state.battleRewardReceipt!.entries.reduce(
      (sum, entry) => sum + entry.creditedAp,
      0,
    ),
  ).toBe(5);
  // The guide's 1 AP was credited earlier. The result lists only this
  // battle's 1 + 1 + 4 AP, while the complete visit still earns 7 AP once.
  expect(availableAp(result.state) - availableAp(initial)).toBe(7);
  await expect(page.getByTestId("battle-rewards")).toContainText("＋6 AP");
  await expect(page.getByTestId("episode-clear")).toBeVisible();
  await page.getByTestId("battle-rewards").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/phase5-mobile-rewards.png",
    fullPage: true,
  });
  await reloadUnchanged(page);
  await enterFreeTime(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await saved(page)).ap).toBe(12);
  await page.getByTestId("travel-place-p_roastery").getByRole("button").click();
  expect((await saved(page)).ap).toBe(12);
  const beforeDate = await saved(page);
  // A destination with one available mode starts directly; otherwise choose
  // walking in the route dialog. Both entry paths protect repeated clicks.
  await page.getByTestId("travel-event-milano_cafe_01").evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  if (!(await saved(page)).activeDate) {
    await page.getByRole("dialog").getByRole("button", { name: /^徒歩 / }).evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  }
  await expect.poll(async () => (await saved(page)).activeDate?.dateId).toBe("milano_cafe_01");
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  expect((await saved(page)).ap).toBe(11);
  expect(availableAp(beforeDate) - availableAp(await saved(page))).toBe(2);
  expect((await saved(page)).pendingApRewards).toEqual([]);
  await reloadUnchanged(page);
  await expect(page.locator(".dialogue-text")).toBeVisible();
  await expectNoOverflow(page);
});
