import { expect, test } from "@playwright/test";
import { saved, startNewGame } from "./helpers";
import { skipTourismGuide } from "./tourism-helpers";

test.use({ actionTimeout: 10_000 });

test("battle observation resumes the same fight without consuming travel resources", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  await skipTourismGuide(page);
  const first = await saved(page);
  expect(first.travel.activeEvent?.eventId).toBe("milano_duomo_episode");
  await expect(page.getByRole("button", { name: "自由時間へ戻る" })).toHaveCount(0);
  await page.getByRole("button", { name: "進む", exact: true }).click();
  const battle = await saved(page);
  expect(battle.activeBattle?.battleId).toBe("milano_duomo_01");
  await page.getByRole("button", { name: "手がかり帳", exact: true }).click();
  await page.getByRole("button", { name: "観光に戻って調べる" }).click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  const observing = await saved(page);
  expect(observing.activeBattle?.runId).toBe(battle.activeBattle?.runId);
  expect(observing.travel).toEqual(battle.travel);
  await page.getByRole("button", { name: "進む", exact: true }).click();
  const resumed = await saved(page);
  expect(resumed.activeTourism).toBeNull();
  expect(resumed.activeBattle?.runId).toBe(battle.activeBattle?.runId);
  expect(resumed.travel).toEqual(battle.travel);
});
