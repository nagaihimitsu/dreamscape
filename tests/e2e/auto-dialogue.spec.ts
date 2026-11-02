import { expect, test } from "@playwright/test";
import { saved, setDialogueSpeed } from "./helpers";
import { loadCurrentScene } from "./current-scenarios";

test("the settings option advances dialogue and stops at a choice", async ({ page }) => {
  test.setTimeout(60_000);
  await loadCurrentScene(page, "date");
  await setDialogueSpeed(page, "0");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("自動送りする").check();
  const before = await saved(page);
  await page.waitForTimeout(2300);
  expect(await saved(page)).toEqual(before);
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision, { timeout: 9000 }).toBeGreaterThan(before.revision);
  await expect.poll(async () => (await saved(page)).activeDate?.frame.choices.length, { timeout: 35_000 }).toBeGreaterThan(0);
  const choice = await saved(page);
  await page.waitForTimeout(2300);
  expect(await saved(page)).toEqual(choice);
});

test("hiding the window stops fast-forward without advancing the saved dialogue", async ({ page }) => {
  await loadCurrentScene(page, "date");
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "高速送り", exact: true }).click();
  await page.getByRole("button", { name: "会話ウィンドウを隠す", exact: true }).click();
  await page.waitForTimeout(800);
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: "会話ウィンドウを表示", exact: true }).click();
  await expect(page.getByRole("button", { name: "高速送り", exact: true })).toHaveAttribute("aria-pressed", "false");
  await page.waitForTimeout(800);
  expect(await saved(page)).toEqual(before);
});

test("typing pauses in the log and resumes at the same character", async ({ page }) => {
  await loadCurrentScene(page, "dateChoice");
  await setDialogueSpeed(page, "45");
  const remaining = page.locator(".dialogue-text .unrevealed");
  await expect(remaining).not.toHaveText("");
  await page.getByRole("button", { name: "会話ログ", exact: true }).click();
  const before = await remaining.textContent();
  expect(before?.length).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await remaining.textContent()).toBe(before);
  await page.getByRole("dialog", { name: "会話ログ" }).getByRole("button", { name: "閉じる", exact: true }).click();
  await expect.poll(async () => remaining.textContent()).not.toBe(before);
});
