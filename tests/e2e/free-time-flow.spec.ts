import { expect, test, type Locator, type Page } from "@playwright/test";
import { choose, finishCafe, loadCurrentFreeTime, loadCurrentCompletedFreeTime, saved, setDialogueSpeed, startCafe, startNewGame } from "./helpers";

test.use({ reducedMotion: "reduce" });


async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => innerWidth),
  );
}

/** `toBeVisible` alone also succeeds on controls below the phone viewport. */
async function expectInViewport(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const bounds = await target.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual((await page.evaluate(() => innerWidth)) + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual((await page.evaluate(() => innerHeight)) + 1);
}

test("finishing a current date returns directly to free time while keeping memories", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await choose(page, 1);
  const before = await saved(page);
  expect(before.memories.length).toBeGreaterThan(0);
  const beforeAp = before.ap;
  await finishCafe(page);
  const after = await saved(page);
  expect(after.activeDate).toBeNull();
  expect(after.memories).toEqual(before.memories);
  expect(after.ap).toBe(beforeAp);
  expect(after.playedDateIds).toContain("milano_cafe_01");
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByText("今日が、思い出になる。", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/旅のしおり/)).toHaveCount(0);
  await noHorizontalOverflow(page);
  await page.reload();
  expect((await saved(page)).memories).toEqual(after.memories);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
});

test("an unread city epilogue is still available once and cannot be reread after completion", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await startNewGame(page);
  await loadCurrentCompletedFreeTime(page);
  const before = await saved(page);
  expect(before.viewedEpilogueCityIds).toEqual([]);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("city-epilogue")).toBeVisible();
  await page.getByTestId("city-epilogue").click();
  await expect.poll(async () => (await saved(page)).activeEpilogue).not.toBeNull();
  for (let count = 0; (await saved(page)).activeEpilogue && count < 40; count++) {
    const current = await saved(page);
    await page.getByTestId("epilogue-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(current.revision);
  }
  const after = await saved(page);
  expect(after.activeEpilogue).toBeNull();
  expect(after.viewedEpilogueCityIds).toEqual(["milano"]);
  expect(after.endingReached).toBe(before.endingReached);
  expect(after.memories).toEqual(before.memories);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
  await expect(page.getByText(/読み返す|読みかえす/)).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).viewedEpilogueCityIds).toEqual(["milano"]);
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
  await noHorizontalOverflow(page);
});

for (const width of [320, 360]) {
  test(`city and romance actions stay in one usable hub at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 640 });
    await startNewGame(page);
    await loadCurrentCompletedFreeTime(page);
    const state = await saved(page);
    await expect(page.getByTestId("free-time-hub")).toBeVisible();
    await expect(page.getByTestId("romance-ending")).toHaveCount(0);
    await expect(page.getByText(/旅のしおり|読み返す|読みかえす/)).toHaveCount(0);
    await expectInViewport(page, page.getByRole("button", { name: "英語ノートを開く", exact: true }));
    await expectInViewport(page, page.getByText("旅先を再訪する", { exact: true }));
    const cityDate = page.getByTestId("event-milano_city_date_01").getByRole("button");
    await cityDate.scrollIntoViewIfNeeded();
    await expectInViewport(page, cityDate);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("free-time.png"), fullPage: true });
    const after = await saved(page);
    expect(after.endingReached).toBe(state.endingReached);
    expect(after.completedCityIds).toEqual(["milano"]);
    expect(after.memories).toEqual(state.memories);
  });
}
