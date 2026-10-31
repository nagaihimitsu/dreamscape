import { expect, test, type Locator, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

test.use({ reducedMotion: "reduce" });

// Playwright's click/tap can silently scroll controls into view. Check actual
// geometry first, including any clipped ancestor, so this covers the mobile UX.
async function expectOnScreen(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const visible = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    if (box.top < -1 || box.left < -1 || box.bottom > innerHeight + 1 || box.right > innerWidth + 1) return false;
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      const clip = ancestor.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) &&
          (box.top < clip.top - 1 || box.bottom > clip.bottom + 1)) return false;
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX) &&
          (box.left < clip.left - 1 || box.right > clip.right + 1)) return false;
    }
    return true;
  });
  expect(visible).toBe(true);
}

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
  test(`observation essentials are usable without page scrolling at ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await loadSnapshot(page, phase6.exploring);
    const initialScroll = await page.evaluate(() => window.scrollY);
    for (const target of [
      page.getByTestId("observation-viewport"),
      page.getByTestId("zoom-in"),
      page.getByRole("button", { name: "手がかり帳", exact: true }),
      page.getByRole("button", { name: "バトルを始める", exact: true }),
    ]) await expectOnScreen(page, target);
    await page.screenshot({ path: testInfo.outputPath("observation-initial.png") });

    await page.getByTestId("zoom-in").tap();
    await expect.poll(async () => Number(await page.getByTestId("observation-viewport").getAttribute("data-scale"))).toBeGreaterThan(1);
    await page.getByTestId("zoom-reset").tap();
    await page.getByTestId("hotspot-last_supper_perspective").tap();
    await expect.poll(async () => (await saved(page)).discoveredClueIds.includes("last_supper_perspective")).toBe(true);
    await expectOnScreen(page, page.getByTestId("discovery-detail").locator("h3"));
    await expectOnScreen(page, page.getByRole("button", { name: "説明を閉じる", exact: true }));
    expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
    await page.screenshot({ path: testInfo.outputPath("observation-detail.png") });
    await page.reload();
    expect((await saved(page)).discoveredClueIds).toContain("last_supper_perspective");
  });
}

test("observation documents are reachable and recorded on a small screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.exploring);
  const initialScroll = await page.evaluate(() => window.scrollY);
  const open = page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true });
  await expectOnScreen(page, open);
  await open.tap();
  const document = page.getByTestId("discovery-last_supper_technique_card");
  await expectOnScreen(page, document);
  await document.tap();
  await expectOnScreen(page, page.getByTestId("discovery-detail").locator("h3"));
  await expect.poll(async () => (await saved(page)).discoveredClueIds.includes("last_supper_technique_card")).toBe(true);
  await page.getByRole("button", { name: "説明を閉じる", exact: true }).tap();
  expect(await page.evaluate(() => window.scrollY)).toBe(initialScroll);
  await expectOnScreen(page, page.getByRole("button", { name: "バトルを始める", exact: true }));
});

test("large observation text leaves controls reachable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.exploring);
  // Simulate a reader overriding text size; scrolling is acceptable here, but
  // no control may be clipped or lost behind the viewport.
  await page.addStyleTag({ content: ".tourism-screen * { font-size: 32px !important; }" });
  for (const control of [
    page.getByRole("button", { name: "手がかり帳", exact: true }),
    page.getByRole("button", { name: "バトルを始める", exact: true }),
    page.getByTestId("zoom-in"),
    page.getByRole("button", { name: "発見ポイント・資料を見る", exact: true }),
  ]) {
    await control.scrollIntoViewIfNeeded();
    await expectOnScreen(page, control);
  }
});
