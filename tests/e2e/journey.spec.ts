import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_supper_B1.json" with { type: "json" };
import phase4 from "../fixtures/phase4-saves.json" with { type: "json" };
import {
  SAVE_KEY,
  saved,
  startLegacyJourney,
  startCafe,
  expectNoOverflow,
} from "./helpers";
import {
  playBattle,
  reloadUnchanged,
  romanceProgress,
  startBattleFromEntry,
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
  await startLegacyJourney(page, ["航", "澪"]);
  expect((await saved(page)).activeTourism?.landmarkId).toBe("last_supper");
  await expect(
    page.getByRole("button", { name: /仮クリア|ミラノ章初回クリア/ }),
  ).toHaveCount(0);
  await openTourismFromEntry(page);
  await finishTourismGuide(page);
  const guide = await saved(page);
  expect(guide.ap).toBe(1);
  expect(guide.completedGuideIds).toEqual(["last_supper"]);
  expect(guide.claimedRewardIds).toEqual([rewards[0]]);
  await reloadUnchanged(page);
  await openObservationList(page);
  await page.getByTestId("guide-replay").click();
  await finishTourismGuide(page);
  expect((await saved(page)).ap).toBe(1);
  await page
    .getByRole("button", { name: "バトルを始める", exact: true })
    .click();
  const result = await playBattle(page, quiz.questions, [true, true, false]);
  expect(result.state.ap).toBe(7);
  expect(result.state.affection).toBe(0);
  expect(result.state.claimedRewardIds.slice().sort()).toEqual(
    rewards.slice().sort(),
  );
  expect(result.state.completedEpisodeIds).toEqual([
    "milano_last_supper_episode",
  ]);
  expect(result.state.completedCityIds).toEqual([]);
  expect(result.state.pendingApRewards).toEqual([]);
  expect(
    result.state.battleRewardReceipt!.entries.reduce(
      (sum, entry) => sum + entry.creditedAp,
      0,
    ),
  ).toBe(6);
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
  expect((await saved(page)).ap).toBe(7);
  await startCafe(page);
  expect((await saved(page)).ap).toBe(5);
  await reloadUnchanged(page);
  await expect(page.locator(".dialogue-text")).toBeVisible();
  await expectNoOverflow(page);
});

test("an existing chapter reward is not repeated and AP overflow waits until a date opens room", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  const old = { ...phase4.legacyChapter, ap: 12 };
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: old },
  );
  await page.reload();
  expect(await saved(page)).toEqual(old);
  const romance = romanceProgress(await saved(page));
  await startBattleFromEntry(page);
  const result = await playBattle(page, quiz.questions, [true, true, true]);
  expect(result.state.ap).toBe(12);
  expect(
    result.state.pendingApRewards.reduce(
      (sum, item) => sum + item.remainingAp,
      0,
    ),
  ).toBe(2);
  expect(
    result.state.claimedRewardIds.filter(
      (id) => id === "chapter_milano_first_clear",
    ),
  ).toHaveLength(1);
  expect(
    result.state
      .battleRewardReceipt!.entries.map((entry) => entry.rewardId)
      .sort(),
  ).toEqual(rewards.slice(1, 3).sort());
  expect(
    result.state.battleRewardReceipt!.entries.every(
      (entry) => entry.creditedAp === 0 && entry.pendingAp === 1,
    ),
  ).toBe(true);
  expect(romanceProgress(result.state)).toEqual(romance);
  await page.locator(".result-pending > summary").click();
  await expect(page.getByTestId("pending-rewards")).toContainText("2AP");
  await expect(page.getByTestId("pending-claim")).toBeDisabled();
  await reloadUnchanged(page);
  await enterFreeTime(page);
  await page.getByTestId("event-milano_cafe_01").getByRole("button").click();
  await page
    .getByRole("button", { name: "APを使って始める", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  const date = await saved(page);
  expect(date.activeDate!.dateId).toBe("milano_cafe_01");
  expect(date.ap).toBe(12); // 12 - 2 date cost + the 2 AP safely held at the cap.
  expect(date.pendingApRewards).toEqual([]);
  expect(date.claimedRewardIds).toEqual(result.state.claimedRewardIds);
  await reloadUnchanged(page);
  expect((await saved(page)).ap).toBe(12);
});

test("a real Phase 4 completed battle migrates without overwriting AP, then outstanding rewards are received once", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto("/");
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SAVE_KEY, value: phase4.result },
  );
  await page.reload();
  await expect(page.getByTestId("battle-result")).toBeVisible();
  expect(await saved(page)).toEqual(phase4.result);
  await page.locator(".result-pending > summary").click();
  await expect(page.getByTestId("pending-rewards")).toContainText("6AP");
  await page
    .getByTestId("pending-claim")
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  const migrated = await saved(page);
  expect(migrated.schemaVersion).toBe(11);
  expect(migrated.ap).toBe(6);
  expect(migrated.pendingApRewards).toEqual([]);
  expect(migrated.activeBattle).toEqual({
    ...phase4.result.activeBattle,
    reasoning: null,
  });
  expect(migrated.battleRecords).toEqual(phase4.result.battleRecords);
  expect(migrated.completedEpisodeIds).toEqual(["milano_last_supper_episode"]);
  expect(migrated.completedCityIds).toEqual([]);
  await reloadUnchanged(page);
  await page.getByRole("button", { name: "再戦する", exact: true }).click();
  const replay = await playBattle(page, quiz.questions, [false, false, false]);
  expect(replay.state.ap).toBe(6);
  expect(replay.state.battleRecords[0].attempts).toBe(2);
  expect(replay.state.battleRewardReceipt!.entries).toEqual([]);
  expect(replay.state.claimedRewardIds).toEqual(migrated.claimedRewardIds);
  await enterFreeTime(page);
  await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
});
