import { expect, test, type Locator, type Page } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved, setDialogueSpeed } from "./helpers";

test.use({ reducedMotion: "reduce" });

async function expectDocumentFits(page: Page) {
  const size = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
    scrollY,
  }));
  expect(size.width).toBeLessThanOrEqual(size.viewportWidth);
  expect(size.height).toBeLessThanOrEqual(size.viewportHeight);
  expect(size.scrollY).toBe(0);
}

async function expectFullyInViewport(page: Page, element: Locator) {
  await expect(element).toBeVisible();
  const rect = await element.evaluate((node) => {
    const box = node.getBoundingClientRect();
    let clipped = false;
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) &&
          (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) clipped = true;
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX) &&
          (box.left < bounds.left - 1 || box.right > bounds.right + 1)) clipped = true;
    }
    return { top: box.top, left: box.left, right: box.right, bottom: box.bottom, clipped };
  });
  const viewport = page.viewportSize()!;
  expect(rect.top).toBeGreaterThanOrEqual(0);
  expect(rect.left).toBeGreaterThanOrEqual(0);
  expect(rect.right).toBeLessThanOrEqual(viewport.width);
  expect(rect.bottom).toBeLessThanOrEqual(viewport.height);
  expect(rect.clipped).toBe(false);
}

for (const height of [640, 780]) {
  test(`a real saved date fits a 360 × ${height} phone without page scrolling`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height });
    await loadSnapshot(page, phase1.beforeChoice);
    await setDialogueSpeed(page, "0");
    await expect(page.locator(".choice").first()).toBeEnabled();
    await expectDocumentFits(page);
    await expectFullyInViewport(page, page.locator(".dialogue-text"));
    for (let index = 0; index < 3; index++)
      await expectFullyInViewport(page, page.locator(".choice").nth(index));
    await expectFullyInViewport(page, page.getByRole("button", { name: "設定", exact: true }));
    const before = await saved(page);
    await page.getByRole("button", { name: "会話ログ", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    expect(await saved(page)).toEqual(before);
    await expectDocumentFits(page);
    await page.getByRole("button", { name: "設定", exact: true }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "設定", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    await expectDocumentFits(page);
    await page.screenshot({ path: `artifacts/mobile-layout/date-360x${height}.png` });
  });
}

test("advancing real dialogue keeps the phone page still", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase1.started);
  await setDialogueSpeed(page, "0");
  for (let index = 0; index < 3; index++) {
    await expectDocumentFits(page);
    const revision = (await saved(page)).revision;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(revision);
  }
  await expectDocumentFits(page);
});

test("short battle question and all three answer controls fit on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase6.battleQuestion);
  await expectDocumentFits(page);
  await expectFullyInViewport(page, page.locator(".question-en"));
  for (const id of ["A", "B", "C"])
    await expectFullyInViewport(page, page.getByTestId(`answer-${id}`));
  await expectFullyInViewport(page, page.getByRole("button", { name: "手がかり帳", exact: true }));
  await page.screenshot({ path: "artifacts/mobile-layout/question-360x780.png" });
});

test("enlarged date text remains reachable in the scene's reading area", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  await page.addStyleTag({ content: ".vn-dialogue .dialogue-text, .vn-dialogue .choice { font-size: 25px !important; }" });
  await expect(page.locator(".choice").first()).toBeEnabled();
  const lastChoice = page.locator(".choice").last();
  await lastChoice.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
  await expectFullyInViewport(page, lastChoice);
  await expectDocumentFits(page);
  await lastChoice.click();
  await expect(page.getByRole("dialog")).toContainText("この言葉を伝えますか？");
});

test("translations can be read and closed without moving the document or answering", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.battleQuestion);
  const before = await saved(page);
  await page.getByRole("button", { name: "すべての訳を見る" }).click();
  await expect(page.getByRole("button", { name: "すべての訳を閉じる" })).toBeVisible();
  expect(await saved(page)).toEqual(before);
  await expectDocumentFits(page);
  const lastTranslation = page.getByTestId("option-text-C").locator('.translation p[lang="ja"]');
  await expect(lastTranslation).toBeVisible();
  // The last translation must remain reachable inside the reading area without
  // forcing the page or the whole game screen to move.
  await lastTranslation.evaluate((node) => node.scrollIntoView({ block: "nearest" }));
  await expectFullyInViewport(page, lastTranslation);
  await expectDocumentFits(page);
  expect(await saved(page)).toEqual(before);
});

test("tourism guide navigation and the direct battle entry fit on a small phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.guide);
  await setDialogueSpeed(page, "0");
  const advance = page.getByTestId("tourism-advance");
  const skip = page.getByTestId("tourism-skip");
  const battle = page.getByRole("button", { name: "バトルを始める" });
  await expect(advance).toBeEnabled();
  await expectDocumentFits(page);
  for (const action of [advance, skip, battle]) await expectFullyInViewport(page, action);
  await page.screenshot({ path: "artifacts/mobile-layout/guide-360x640.png" });
  const before = await saved(page);
  await advance.click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  await expectDocumentFits(page);
  await skip.click();
  await expect.poll(async () => (await saved(page)).activeTourism?.phase).toBe("exploring");
  await loadSnapshot(page, phase6.guide);
  await page.getByRole("button", { name: "バトルを始める" }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.phase).toBe("dialogue");
});

for (const scenario of [
  {
    name: "tourism guide",
    snapshot: phase6.guide,
    area: ".tourism-guide",
    next: "tourism-advance",
  },
  {
    name: "battle conversation",
    snapshot: phase6.battleDialogue,
    area: ".battle-paper",
    next: "battle-advance",
  },
]) {
  test(`${scenario.name} returns to the top on the next line but not when closing the log`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await loadSnapshot(page, scenario.snapshot);
    await setDialogueSpeed(page, "0");
    // Exercise the overflow path with real saved dialogue and enlarged text.
    await page.addStyleTag({ content: `${scenario.area} .dialogue-text { font-size: 44px !important; line-height: 1.8 !important; }` });
    const reading = page.locator(scenario.area);
    await expect.poll(() => reading.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    const log = page.getByRole("button", { name: "会話ログ", exact: true });
    await log.scrollIntoViewIfNeeded();
    const beforeLog = await reading.evaluate((element) => element.scrollTop);
    expect(beforeLog).toBeGreaterThan(0);
    const beforeSave = await saved(page);
    await log.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "会話ログ", exact: true })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    expect(await reading.evaluate((element) => element.scrollTop)).toBe(beforeLog);
    expect(await saved(page)).toEqual(beforeSave);
    await expectDocumentFits(page);
    const next = page.getByTestId(scenario.next);
    await next.scrollIntoViewIfNeeded();
    expect(await reading.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await next.click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(beforeSave.revision);
    await expect.poll(() => reading.evaluate((element) => element.scrollTop)).toBe(0);
    await expectDocumentFits(page);
  });
}

test("the observation viewport remains available and zoomable", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.exploring);
  const viewport = page.getByTestId("observation-viewport");
  await expect(viewport).toBeVisible();
  await page.getByTestId("zoom-in").click();
  await expect.poll(async () => Number(await viewport.getAttribute("data-scale"))).toBeGreaterThan(1);
  await page.getByTestId("zoom-reset").click();
  await expect(viewport).toHaveAttribute("data-scale", "1");
  const marker = page.getByTestId("hotspot-last_supper_perspective");
  await marker.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => scrollY);
  await marker.tap();
  await expect.poll(async () => (await saved(page)).discoveredClueIds)
    .toContain("last_supper_perspective");
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
});
