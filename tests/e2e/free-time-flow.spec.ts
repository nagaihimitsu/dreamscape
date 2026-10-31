import { expect, test, type Locator, type Page } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase2 from "../fixtures/phase2-saves.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import { choose, finishCafe, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";

test.use({ reducedMotion: "reduce" });

// The Phase 7 snapshots were produced from phase6.ending using the real
// chapter, battle and epilogue domain transitions, then validated before use.

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

test("finishing an old in-progress date returns directly to free time while keeping memories", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  await choose(page, 1);
  const before = await saved(page);
  expect(before.memories).toHaveLength(2);
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

test("the confession ending is shown once and old completed endings load into free time", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase2.confessionPending);
  const before = await saved(page);
  await page.getByRole("button", { name: /^(デートを終える|この時間を終える)$/ }).click();
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  const finished = await saved(page);
  expect(finished.endingReached).toBe(true);
  expect(finished.confessionStatus).toBe("accepted");
  expect(finished.memories).toEqual(expect.arrayContaining(before.memories));
  await page.getByRole("button", { name: "自由時間へ", exact: true }).click();
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("romance-ending")).toHaveCount(0);
  await page.reload();
  expect(await saved(page)).toEqual(finished);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("romance-ending")).toHaveCount(0);

  await loadSnapshot(page, phase2.ending);
  const migrated = await saved(page);
  expect(migrated.endingReached).toBe(true);
  expect(migrated.memories).toEqual(phase2.ending.memories);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("romance-ending")).toHaveCount(0);
});

test("an unread city epilogue is still available once and cannot be reread after completion", async ({ page }) => {
  test.setTimeout(90_000);
  const before = phase7.cityClearUnread;
  expect(before.viewedEpilogueCityIds).toEqual([]);
  await page.setViewportSize({ width: 320, height: 640 });
  await loadSnapshot(page, before);
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
  expect(after.endingReached).toBe(true);
  expect(after.memories).toEqual(before.memories);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
  await expect(page.getByText(/読み返す|読みかえす/)).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).viewedEpilogueCityIds).toEqual(["milano"]);
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
  await noHorizontalOverflow(page);
});

test("the compact hub keeps capped AP and automatically credits it when a date starts", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase7.cityClearViewed);
  const before = await saved(page);
  const heldBefore = before.pendingApRewards.reduce((sum: number, item: { remainingAp: number }) => sum + item.remainingAp, 0);
  expect(before.ap).toBe(12);
  expect(heldBefore).toBe(3);
  const held = page.getByTestId("pending-rewards");
  await expect(held).toContainText("3AP");
  await expect(held.getByTestId("pending-claim")).toBeDisabled();
  await held.getByText("内訳を見る", { exact: true }).click();
  await expect(held.locator("li")).not.toHaveCount(0);
  await startEvent(page, "milano_city_date_01", 2);
  const after = await saved(page);
  expect(after.ap).toBe(12);
  expect(after.pendingApRewards.reduce((sum: number, item: { remainingAp: number }) => sum + item.remainingAp, 0)).toBe(1);
  expect(after.claimedRewardIds).toEqual(before.claimedRewardIds);
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

for (const width of [320, 360]) {
  test(`city and romance actions stay in one usable hub at ${width}px`, async ({ page }, testInfo) => {
    const state = phase7.cityClearViewed;
    await page.setViewportSize({ width, height: 640 });
    await loadSnapshot(page, state);
    await expect(page.getByTestId("free-time-hub")).toBeVisible();
    await expect(page.getByTestId("romance-ending")).toHaveCount(0);
    await expect(page.getByText(/旅のしおり|読み返す|読みかえす/)).toHaveCount(0);
    await expectInViewport(page, page.getByRole("button", { name: "英語ノートを開く", exact: true }));
    await expectInViewport(page, page.getByText("旅先を再訪する", { exact: true }));
    await expectInViewport(page, page.getByTestId("event-milano_city_date_01").getByRole("button"));
    await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
    await noHorizontalOverflow(page);
    await page.screenshot({ path: testInfo.outputPath("free-time.png"), fullPage: true });
    const after = await saved(page);
    expect(after.endingReached).toBe(true);
    expect(after.completedCityIds).toEqual(["milano"]);
    expect(after.memories).toEqual(state.memories);
  });
}
