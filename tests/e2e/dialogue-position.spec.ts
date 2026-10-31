import { expect, test, type Locator, type Page } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase2 from "../fixtures/phase2-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { loadSnapshot, saved, setDialogueSpeed } from "./helpers";

// Capture the first painted character, not merely the dialogue window: a
// bottom-anchored window can shrink while its contents all move on screen.
async function textGeometry(text: Locator) {
  return text.evaluate((paragraph) => {
    const visible = paragraph.querySelector<HTMLElement>('span[aria-hidden="true"]');
    const first = visible?.firstChild;
    if (!first || first.nodeType !== Node.TEXT_NODE || !first.textContent?.length) {
      throw new Error("The first dialogue character has not appeared yet");
    }
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(first, 1);
    const glyph = range.getBoundingClientRect();
    const paragraphBox = paragraph.getBoundingClientRect();
    return { x: glyph.x, y: glyph.y, height: paragraphBox.height };
  });
}

function expectSameGeometry(before: Awaited<ReturnType<typeof textGeometry>>, after: Awaited<ReturnType<typeof textGeometry>>) {
  expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(0.5);
  // The completion indicator must not create an extra wrapped line.
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(0.5);
}

test.use({ reducedMotion: "no-preference" });

// Freezing is necessary here: a screenshot or a busy CI worker can otherwise
// let a short line finish between the geometry sample and the reveal click.
async function freezeClock(page: Page) {
  const time = new Date("2026-01-01T00:00:00.000Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
}

for (const size of [{ width: 320, height: 640 }, { width: 360, height: 640 }, { width: 390, height: 844 }]) {
  test(`revealing a date line does not move its first character at ${size.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(size);
    await freezeClock(page);
    await loadSnapshot(page, phase2.activeDate);
    await page.evaluate(() => document.fonts.ready);
    const state = await saved(page);
    const text = page.locator(".romance-scene .dialogue-text");
    await expect(text).toHaveAttribute("data-ready", "false");
    await page.clock.runFor(100);
    const before = await textGeometry(text);
    await page.screenshot({ path: testInfo.outputPath("typing.png") });
    await page.getByRole("button", { name: "全文を表示", exact: true }).click();
    await expect(text).toHaveAttribute("data-ready", "true");
    const after = await textGeometry(text);
    expectSameGeometry(before, after);
    expect(await saved(page)).toEqual(state);
    await expect(page.getByRole("button", { name: "全文を表示", exact: true })).toHaveCount(0);
    const hiddenReveal = page.locator(".reveal");
    if (await hiddenReveal.count()) {
      await expect(hiddenReveal).toBeHidden();
      await expect(hiddenReveal).toBeDisabled();
    }
    await page.screenshot({ path: testInfo.outputPath("complete.png") });

    // Revealing is one operation; the next tap, not the first, advances Ink.
    await text.click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  });
}

for (const [name, snapshot, selector] of [
  ["date", phase1.started, ".romance-scene .dialogue-text"],
  ["guide", phase6.guide, ".tourism-guide .dialogue-text"],
  ["battle", phase6.battleDialogue, ".battle-dialogue .dialogue-text"],
] as const) {
  test(`${name} dialogue stays in place as typing finishes naturally`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await freezeClock(page);
    await loadSnapshot(page, snapshot);
    await page.evaluate(() => document.fonts.ready);
    const text = page.locator(selector);
    await expect(text).toHaveAttribute("data-ready", "false");
    await page.clock.runFor(100);
    const before = await textGeometry(text);
    await page.clock.runFor(10000);
    await expect(text).toHaveAttribute("data-ready", "true");
    expectSameGeometry(before, await textGeometry(text));
  });
}

test("opening the dialogue log does not reveal, advance, or move a line", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await freezeClock(page);
  await loadSnapshot(page, phase6.guide);
  await page.evaluate(() => document.fonts.ready);
  await page.clock.runFor(100);
  const text = page.locator(".tourism-guide .dialogue-text");
  const position = await textGeometry(text);
  const before = await saved(page);
  await page.getByRole("button", { name: "会話ログ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const remaining = await text.locator(".unrevealed").textContent();
  expect(remaining?.length).toBeGreaterThan(0);
  await page.clock.runFor(5000);
  expect(await text.locator(".unrevealed").textContent()).toBe(remaining);
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press("Escape");
  expect(await saved(page)).toEqual(before);
  await expect(text).toHaveAttribute("data-ready", "false");
  expectSameGeometry(position, await textGeometry(text));
});

test("enlarged multiline date text stays in place and the next action is reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await freezeClock(page);
  await loadSnapshot(page, phase2.activeDate);
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".romance-scene .dialogue-text { font-size: 32px !important; }" });
  const text = page.locator(".romance-scene .dialogue-text");
  await expect(text).toHaveAttribute("data-ready", "false");
  await page.clock.runFor(100);
  const before = await textGeometry(text);
  await page.clock.runFor(10000);
  await expect(text).toHaveAttribute("data-ready", "true");
  expectSameGeometry(before, await textGeometry(text));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  const next = page.getByRole("button", { name: "続きを読む", exact: true });
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeVisible();
  await expect(next).toBeEnabled();
});

test("keyboard reveal keeps focus on the line and only a later Enter advances", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await freezeClock(page);
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  const reveal = page.getByRole("button", { name: "全文を表示", exact: true });
  const text = page.locator(".romance-scene .dialogue-text");
  await reveal.focus();
  await expect(reveal).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(text).toHaveAttribute("data-ready", "true");
  await expect(text).toBeFocused();
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
});

test("natural completion returns focus from the reveal control without advancing", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await freezeClock(page);
  await loadSnapshot(page, phase1.started);
  const before = await saved(page);
  const reveal = page.getByRole("button", { name: "全文を表示", exact: true });
  const text = page.locator(".romance-scene .dialogue-text");
  await reveal.focus();
  await expect(reveal).toBeFocused();
  await page.clock.runFor(10000);
  await expect(text).toHaveAttribute("data-ready", "true");
  await expect(text).toBeFocused();
  expect(await saved(page)).toEqual(before);
});

test("closing the log restores an offscreen trigger without moving the battle reading position", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  await page.addStyleTag({ content: ".battle-paper .dialogue-text { font-size: 44px !important; line-height: 1.8 !important; }" });
  const reading = page.locator(".battle-paper");
  await expect.poll(() => reading.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await reading.evaluate((element) => { element.scrollTop = 0; });
  const log = page.getByRole("button", { name: "会話ログ", exact: true });
  const geometry = await log.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const area = button.closest(".battle-paper")!.getBoundingClientRect();
    return { top: box.top, bottom: area.bottom };
  });
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.bottom);
  const beforeScroll = await reading.evaluate((element) => element.scrollTop);
  const beforeSave = await saved(page);
  await log.evaluate((button: HTMLElement) => button.focus({ preventScroll: true }));
  await expect(log).toBeFocused();
  expect(await reading.evaluate((element) => element.scrollTop)).toBe(beforeScroll);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(log).toBeFocused();
  expect(await reading.evaluate((element) => element.scrollTop)).toBe(beforeScroll);
  expect(await saved(page)).toEqual(beforeSave);
});
