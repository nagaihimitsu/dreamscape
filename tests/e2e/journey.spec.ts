import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import {
  saved,
  startCurrentSupperJourney,
  startCafe,
  expectNoOverflow,
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
  await expect(page.getByTestId("battle-rewards")).toContainText("7 AP");
  await expect(page.getByTestId("episode-clear")).toBeVisible();
  await page.getByTestId("battle-rewards").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "artifacts/phase5-mobile-rewards.png",
    fullPage: true,
  });
  await reloadUnchanged(page);
  await enterFreeTime(page);
  await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
  expect((await saved(page)).ap).toBe(12);
  await startCafe(page);
  expect((await saved(page)).ap).toBe(11);
  expect((await saved(page)).pendingApRewards).toEqual([]);
  await reloadUnchanged(page);
  await expect(page.locator(".dialogue-text")).toBeVisible();
  await expectNoOverflow(page);
});
