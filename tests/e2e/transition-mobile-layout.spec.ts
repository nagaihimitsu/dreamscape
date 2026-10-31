import { expect, test, type Locator, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase2 from "../fixtures/phase2-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

// A Playwright click may silently scroll its target into view. Check the actual
// viewport and clipped ancestors first so the test catches mandatory scrolling.
async function expectOnScreen(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const inView = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    if (box.top < -1 || box.left < -1 || box.bottom > innerHeight + 1 || box.right > innerWidth + 1) return false;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const rect = parent.getBoundingClientRect();
      const css = getComputedStyle(parent);
      if (/(auto|scroll|hidden|clip)/.test(css.overflowY) && (box.top < rect.top - 1 || box.bottom > rect.bottom + 1)) return false;
      if (/(auto|scroll|hidden|clip)/.test(css.overflowX) && (box.left < rect.left - 1 || box.right > rect.right + 1)) return false;
    }
    return true;
  });
  expect(inView).toBe(true);
}

test.use({ reducedMotion: "reduce" });

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
  test(`battle results and main continuation fit at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await loadSnapshot(page, phase6.result);
    const result = page.getByTestId("battle-result");
    await expectOnScreen(page, result.getByRole("heading", { name: "PERFECT VICTORY" }));
    await expectOnScreen(page, result.locator(".battle-score"));
    await expectOnScreen(page, result.getByText("今回獲得したAP"));
    await expectOnScreen(page, result.getByText("現在の所持AP"));
    const next = page.getByRole("button", { name: "自由時間へ進む", exact: true });
    await expectOnScreen(page, next);
    await page.screenshot({ path: testInfo.outputPath("result.png") });
    const before = await saved(page);
    await next.click();
    expect((await saved(page)).activeBattle).toBeNull();
    expect((await saved(page)).ap).toBe(before.ap);
  });
}

test("stored AP and result details remain available without repeat awards", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.pendingResult);
  const before = await saved(page);
  await expectOnScreen(page, page.getByRole("button", { name: "自由時間へ進む", exact: true }));
  await page.locator(".result-pending > summary").click();
  await expect(page.getByTestId("pending-rewards")).toContainText("6AP");
  await page.getByTestId("pending-claim").click();
  const after = await saved(page);
  expect(after.ap).toBe(before.ap + 6);
  expect(after.pendingApRewards).toEqual([]);
  await page.reload();
  expect((await saved(page)).ap).toBe(after.ap);
  expect((await saved(page)).pendingApRewards).toEqual([]);
});

test("special battle result retains its score, review and return routes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.B_result);
  const result = page.getByTestId("battle-result");
  await expectOnScreen(page, result.getByRole("heading", { name: "PERFECT VICTORY" }));
  await expectOnScreen(page, page.getByRole("button", { name: "自由時間へ戻る", exact: true }));
  await result.locator(".battle-result-history > summary").click();
  await expect(result.locator(".answer-history li")).toHaveCount(3);
  await page.getByRole("button", { name: "自由時間へ戻る", exact: true }).click();
  expect((await saved(page)).activeBattle).toBeNull();
});

test("free time presents both the next journey and a date without scrolling", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.freeTime);
  const next = page.getByRole("button", { name: "次の観光地へ進む", exact: true });
  const date = page.getByTestId("event-milano_cafe_01").getByRole("button");
  await expectOnScreen(page, next);
  await expectOnScreen(page, date);
  await expectOnScreen(page, page.getByRole("button", { name: "英語ノートを開く", exact: true }));
  await expectOnScreen(page, page.getByText("旅先を再訪する", { exact: true }));
  await page.screenshot({ path: testInfo.outputPath("free-time.png") });
  const before = await saved(page);
  await date.click();
  expect((await saved(page)).ap).toBe(before.ap);
  await page.getByRole("button", { name: "APを使って始める", exact: true }).click();
  expect((await saved(page)).activeDate?.dateId).toBe("milano_cafe_01");
});

test("next destination remains available from free time", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.freeTime);
  const next = page.getByRole("button", { name: "次の観光地へ進む", exact: true });
  await expectOnScreen(page, next);
  await next.click();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
});

test("revisits remain accessible immediately after accepting the confession", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase2.confessionPending);
  await page.getByRole("button", { name: /^(デートを終える|この時間を終える)$/ }).click();
  expect((await saved(page)).endingReached).toBe(true);
  await expect(page.getByTestId("romance-ending")).toBeVisible();
  await page.getByText("旅先を再訪する", { exact: true }).click();
  await page.getByTestId("revisit-battle-milano_last_supper_01").click();
  const state = await saved(page);
  expect(state.endingReached).toBe(true);
  expect(state.activeBattle?.battleId).toBe("milano_last_supper_01");
});
