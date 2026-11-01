import { expect, test } from "@playwright/test";
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import castleCleared from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import { advanceToChoiceOrEnd, choose, expectNoOverflow, finishEvent, loadLegacyFreeTime, loadSnapshot, saved, setDialogueSpeed, startCafe, startEvent, startNewGame } from "./helpers";

test("a date background fills the scene and its credit can be read without advancing", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const scene = page.getByTestId("romance-scene");
  const image = scene.locator(".vn-background img");
  await expect(image).toHaveAttribute("src", /assets\/tourism\/dates\/navigli\.webp$/);
  await expect.poll(() => image.evaluate((item: HTMLImageElement) => item.naturalWidth)).toBe(1600);
  await expect(image).toHaveCSS("object-fit", "cover");
  await expect(image).toHaveCSS("object-position", "50% 50%");
  await page.screenshot({ path: testInfo.outputPath("date-mobile.png") });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: testInfo.outputPath("date-desktop.png") });
  await page.setViewportSize({ width: 360, height: 640 });
  await page.clock.install();
  await page.getByRole("button", { name: "自動送り", exact: true }).click();
  const before = await saved(page);
  await page.getByText("会話の操作", { exact: true }).click();
  const trigger = page.getByRole("button", { name: "背景画像を見る", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "背景画像" });
  await dialog.getByText("画像の説明・出典と利用条件", { exact: true }).click();
  await expect(dialog).toContainText("Marco Montagna");
  await expect(dialog.getByRole("link", { name: /CC BY-SA 3.0/ })).toHaveAttribute("href", /creativecommons\.org/);
  await page.clock.fastForward(8000);
  expect(await saved(page)).toEqual(before);
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await saved(page)).toEqual(before);
});

test("a broken date background falls back without blocking dialogue", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await page.route("**/assets/tourism/dates/navigli.webp", (route) => route.abort());
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const scene = page.getByTestId("romance-scene");
  await expect(scene.locator(".vn-background img")).toHaveCount(0);
  const before = await saved(page);
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
});


test("Brera artwork is legible in a mobile date scene", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase7.cityClearViewed);
  await startEvent(page, "milano_brera_date_01", 2);
  await setDialogueSpeed(page, "0");
  await expect(page.locator(".vn-background img")).toHaveAttribute("src", /brera\.webp$/);
  await page.screenshot({ path: testInfo.outputPath("brera-mobile.png") });
  await page.getByText("会話の操作", { exact: true }).click();
  await page.getByRole("button", { name: "背景画像を見る", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "背景画像" });
  await expect(dialog.locator("img")).toHaveCSS("object-fit", "contain");
  const dialogBox = await dialog.boundingBox();
  const closeBox = await dialog.getByRole("button", { name: "閉じる" }).boundingBox();
  expect(dialogBox!.height).toBeLessThanOrEqual(640);
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(640);
  await page.screenshot({ path: testInfo.outputPath("brera-viewer-mobile.png") });
});

test("L.O.V.E. identifies the background and links to the official artwork without interrupting the date", async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, castleCleared);
  await startEvent(page, "milano_love_date_01", 1);
  await setDialogueSpeed(page, "0");
  const scene = page.getByTestId("romance-scene");
  const note = scene.getByTestId("destination-reference-note");
  const link = scene.getByTestId("destination-reference-link");
  await expect(scene.getByTestId("date-destination")).toContainText("L.O.V.E.");
  await expect(note).toBeVisible();
  await expect(note).toContainText(/彫刻.*写っていません/);
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "https://artsandculture.google.com/asset/l-o-v-e-0098/aQFJRsqTBD1p2Q");
  await expect(link).toHaveAttribute("target", "_blank");
  for (const size of [{ width: 320, height: 640 }, { width: 360, height: 640 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(size.height + 1);
    for (const item of [note, link]) {
      const box = await item.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    }
    await page.screenshot({ path: testInfo.outputPath(`love-date-${size.width}.png`) });
  }
  await page.setViewportSize({ width: 360, height: 640 });
  const before = await saved(page);
  // Do not rely on the external site's availability in CI; verify opening the
  // actual link in a new tab without allowing it to leave the current scene.
  await context.route("https://artsandculture.google.com/asset/l-o-v-e-0098/aQFJRsqTBD1p2Q", (route) => route.fulfill({ status: 200, body: "official reference" }));
  const popupPromise = page.waitForEvent("popup");
  await link.click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  expect(popup.url()).toBe("https://artsandculture.google.com/asset/l-o-v-e-0098/aQFJRsqTBD1p2Q");
  await popup.close();
  expect(await saved(page)).toEqual(before);
  await expect(scene).toBeVisible();
  await advanceToChoiceOrEnd(page);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 640 });
    await expectNoOverflow(page);
    await expect(scene.locator(".choice")).toHaveCount(3);
    const noteBox = await note.boundingBox();
    const choiceBox = await scene.locator(".choice").first().boundingBox();
    expect(noteBox!.y + noteBox!.height).toBeLessThan(choiceBox!.y);
    await page.screenshot({ path: testInfo.outputPath(`love-choice-${width}.png`) });
  }
  await choose(page, 0);
  await choose(page, 1);
  await finishEvent(page, 2);
  expect((await saved(page)).playedDateIds).toContain("milano_love_date_01");
});
