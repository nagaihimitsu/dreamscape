import { expect, test, type Locator, type Page } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved } from "./helpers";

test.use({ reducedMotion: "reduce" });

/** A control must fit in the screen and in each clipped ancestor, without
 * Playwright scrolling it into view as a side effect of clicking it. */
async function expectFullyVisible(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const geometry = await target.evaluate((element) => {
    const box = element.getBoundingClientRect();
    let clipped = false;
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      const bounds = ancestor.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) &&
          (box.top < bounds.top - 1 || box.bottom > bounds.bottom + 1)) clipped = true;
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX) &&
          (box.left < bounds.left - 1 || box.right > bounds.right + 1)) clipped = true;
    }
    return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, clipped };
  });
  const viewport = page.viewportSize()!;
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(viewport.width);
  expect(geometry.clipped).toBe(false);
}

for (const height of [640, 780]) {
  test(`normal battle: the notebook entry and discovered clue fit at 360 × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height });
    await loadSnapshot(page, phase6.battleQuestion);
    const button = page.getByRole("button", { name: "手がかり帳", exact: true });
    await expectFullyVisible(page, button);
    const before = await saved(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    await button.tap();
    await expect(page.getByRole("dialog", { name: "手がかり帳" })).toBeVisible();
    const clue = page.getByTestId("notebook-last_supper_perspective");
    await expectFullyVisible(page, clue.locator("h3"));
    await expectFullyVisible(page, clue.locator(".clue-description"));
    await expectFullyVisible(page, page.getByTestId("cluebook-close"));
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
    expect(await saved(page)).toEqual(before);
    await page.getByTestId("cluebook-close").tap();
    expect(await saved(page)).toEqual(before);
    await expectFullyVisible(page, button);
  });
}

test("observation keeps the notebook reachable and preserves its place", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.discovered);
  const scrollY = await page.evaluate(() => window.scrollY);
  const open = page.getByRole("button", { name: "手がかり帳", exact: true });
  await expectFullyVisible(page, open);
  const before = await saved(page);
  await open.tap();
  await expect(page.getByRole("dialog", { name: "手がかり帳" })).toBeVisible();
  await page.getByTestId("cluebook-close").tap();
  expect(await saved(page)).toEqual(before);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

for (const scenario of [
  { name: "B", snapshot: phase6.B_reasoning, first: "last_supper_perspective", selected: "last_supper_doorway", count: 1 },
  { name: "C", snapshot: phase6.C_selected, first: "last_supper_apostle_groups", selected: "last_supper_perspective", count: 2 },
] as const) {
  test(`${scenario.name}: compare and select case evidence without scrolling, then restore it`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await loadSnapshot(page, scenario.snapshot);
    const open = page.getByRole("button", { name: "手がかり帳", exact: true });
    await expectFullyVisible(page, open);
    const before = await saved(page);
    await open.tap();
    const picker = page.getByTestId("clue-picker");
    await expectFullyVisible(page, picker);
    await expectFullyVisible(page, page.getByTestId("cluebook-close"));
    await expectFullyVisible(page, page.getByTestId("case-return"));
    const originalScroll = await page.getByTestId("cluebook").evaluate((node) => node.scrollTop);
    await picker.selectOption(scenario.selected);
    const card = page.getByTestId(`notebook-${scenario.selected}`);
    await expectFullyVisible(page, card.locator("h3"));
    await expectFullyVisible(page, card.locator(".clue-description"));
    const select = page.getByTestId(`select-evidence-${scenario.selected}`);
    await expectFullyVisible(page, select);
    await expect(select).toBeEnabled();
    const bodySize = await page.getByTestId("cluebook").evaluate((node) => ({
      content: node.scrollHeight,
      viewport: node.clientHeight,
    }));
    expect(bodySize.content).toBeLessThanOrEqual(bodySize.viewport + 1);
    expect(await page.getByTestId("cluebook").evaluate((node) => node.scrollTop)).toBe(originalScroll);
    expect(await saved(page)).toEqual(before);
    await select.tap();
    await expect(select).toHaveAttribute("aria-pressed", "true");
    const selected = await saved(page);
    expect(selected.activeBattle!.reasoning!.selectedClueIds).toHaveLength(scenario.count);
    expect(selected.activeBattle!.answers).toEqual(before.activeBattle!.answers);
    await page.getByTestId("case-return").tap();
    expect(await saved(page)).toEqual(selected);
    await page.reload();
    await page.getByRole("button", { name: "手がかり帳", exact: true }).tap();
    await page.getByTestId("clue-picker").selectOption(scenario.selected);
    await expect(page.getByTestId(`select-evidence-${scenario.selected}`)).toHaveAttribute("aria-pressed", "true");
    expect((await saved(page)).activeBattle!.reasoning!.selectedClueIds).toEqual(selected.activeBattle!.reasoning!.selectedClueIds);
  });
}

test("enlarged clue descriptions remain readable without moving the game page", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.B_reasoning);
  await page.getByRole("button", { name: "手がかり帳", exact: true }).tap();
  await page.getByTestId("clue-picker").selectOption("last_supper_doorway");
  await page.addStyleTag({ content: ".cluebook-body .clue-description { font-size: 32px !important; line-height: 1.8 !important; }" });
  const content = page.getByTestId("cluebook");
  const description = page.getByTestId("notebook-last_supper_doorway").locator(".clue-description");
  await expect.poll(() => content.evaluate((node) => node.scrollHeight > node.clientHeight)).toBe(true);
  const before = await saved(page);
  const scrollY = await page.evaluate(() => window.scrollY);
  await content.evaluate((node) => { node.scrollTop = node.scrollHeight; });
  await expect.poll(() => content.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  const lastCharacter = await description.evaluate((node) => {
    const text = node.lastChild;
    if (!text || text.nodeType !== Node.TEXT_NODE || !text.textContent?.length) return null;
    const range = document.createRange();
    range.setStart(text, text.textContent.length - 1);
    range.setEnd(text, text.textContent.length);
    const box = range.getBoundingClientRect();
    const clip = node.closest('[data-testid="cluebook"]')!.getBoundingClientRect();
    return { top: box.top, bottom: box.bottom, clipTop: clip.top, clipBottom: clip.bottom };
  });
  expect(lastCharacter).not.toBeNull();
  expect(lastCharacter!.top).toBeGreaterThanOrEqual(lastCharacter!.clipTop - 1);
  expect(lastCharacter!.bottom).toBeLessThanOrEqual(lastCharacter!.clipBottom + 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  expect(await saved(page)).toEqual(before);
  await expectFullyVisible(page, page.getByTestId("cluebook-close"));
  await expectFullyVisible(page, page.getByTestId("case-return"));
});

test("320px: case image, description and evidence action fit without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await loadSnapshot(page, phase6.B_reasoning);
  await page.getByRole("button", { name: "手がかり帳", exact: true }).tap();
  await page.getByTestId("clue-picker").selectOption("last_supper_doorway");
  const clue = page.getByTestId("notebook-last_supper_doorway");
  await expectFullyVisible(page, clue.getByTestId("clue-image-last_supper_doorway"));
  await expectFullyVisible(page, clue.locator(".clue-description"));
  await expectFullyVisible(page, page.getByTestId("select-evidence-last_supper_doorway"));
  const size = await page.getByTestId("cluebook").evaluate((node) => ({ content: node.scrollHeight, viewport: node.clientHeight }));
  expect(size.content).toBeLessThanOrEqual(size.viewport + 1);
});
