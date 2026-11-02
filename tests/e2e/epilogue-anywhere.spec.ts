import { expect, test } from "@playwright/test";
import { advanceDialogue, loadCurrentCompletedFreeTime, saved, setDialogueSpeed, startNewGame } from "./helpers";

test("the unread city epilogue can be read after leaving Darsena", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await loadCurrentCompletedFreeTime(page);
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.travel.currentPlaceId = "p_darsena";
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  const atDarsena = await saved(page);
  expect(atDarsena.travel.currentPlaceId).toBe("p_darsena");
  expect(atDarsena.completedCityIds).toContain("milano");

  await page.getByRole("button", { name: "滞在先で休む" }).click();
  const lodging = page.getByRole("dialog", { name: "滞在先で休む" });
  await lodging.getByRole("button", { name: /^徒歩 / }).click();
  const afterTravel = await saved(page);
  expect(afterTravel.travel.currentPlaceId).toBe(afterTravel.travel.hotelPlaceId);
  expect(afterTravel.travel.day).toBe(atDarsena.travel.day + 1);
  expect(afterTravel.viewedEpilogueCityIds).not.toContain("milano");

  await setDialogueSpeed(page, "0");
  const epilogueButton = page.getByTestId("city-epilogue");
  await expect(epilogueButton).toBeVisible();
  await expect(epilogueButton).toBeEnabled();
  await expect(page.getByText("ダルセナで続きを読めます。", { exact: true })).toHaveCount(0);
  await epilogueButton.click();
  await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
  const started = await saved(page);
  expect(started.activeEpilogue).not.toBeNull();
  expect(started.travel).toEqual(afterTravel.travel);
  expect(started.travelBudget).toBe(afterTravel.travelBudget);
  expect(started.ap).toBe(afterTravel.ap);

  await page.reload();
  await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
  expect(await saved(page)).toEqual(started);
  for (let count = 0; (await saved(page)).activeEpilogue && count < 50; count++) {
    const before = await saved(page);
    await advanceDialogue(page, "epilogue-advance");
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const completed = await saved(page);
  expect(completed.activeEpilogue).toBeNull();
  expect(completed.viewedEpilogueCityIds).toContain("milano");
  expect(completed.travel).toEqual(afterTravel.travel);
  expect(completed.travelBudget).toBe(afterTravel.travelBudget);
  expect(completed.ap).toBe(afterTravel.ap);
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
});
