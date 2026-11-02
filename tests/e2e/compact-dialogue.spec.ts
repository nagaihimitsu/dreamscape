import { expect, test } from "@playwright/test";
import { loadCurrentScene } from "./current-scenarios";
import { expectNoOverflow, saved, setDialogueSpeed, startNewGame } from "./helpers";

test("the guide's compact controls lead to observation and the battle", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  const guide = page.getByTestId("tourism-guide");
  await expect(guide).toBeVisible();
  const controls = guide.getByLabel("会話の操作");
  await expect(controls.getByTestId("tourism-skip")).toBeVisible();
  await expect(controls.getByRole("button", { name: "会話ログ", exact: true })).toHaveText("ログ");
  await expect(controls.getByRole("button", { name: "高速送り", exact: true })).toBeVisible();
  await expect(guide.getByText("自動送り", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "進む", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "自由時間へ戻る", exact: true })).toHaveCount(0);
  await expectNoOverflow(page);
  await controls.getByTestId("tourism-skip").click();
  await expect(page.getByRole("button", { name: "進む", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.battleId).toBe("milano_duomo_01");
});

test("fast-forward advances dialogue and stops for choices", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadCurrentScene(page, "date");
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "高速送り", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision, { timeout: 10_000 }).toBeGreaterThan(before.revision);
  await expect.poll(async () => (await saved(page)).activeDate?.frame.choices.length, { timeout: 30_000 }).toBeGreaterThan(0);
  const atChoice = await saved(page);
  await expect(page.getByRole("button", { name: "高速送り", exact: true })).toBeDisabled();
  await page.waitForTimeout(1000);
  expect(await saved(page)).toEqual(atChoice);
  await expectNoOverflow(page);
});

test("a dialogue log pauses fast-forward without changing the scene", async ({ page }) => {
  await loadCurrentScene(page, "date");
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  await page.getByRole("button", { name: "高速送り", exact: true }).click();
  await page.getByRole("button", { name: "会話ログ", exact: true }).click();
  const log = page.getByRole("dialog", { name: "会話ログ" });
  await expect(log).toBeVisible();
  await page.waitForTimeout(800);
  expect(await saved(page)).toEqual(before);
  await log.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(page.getByRole("button", { name: "高速送り", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("dialogue can be revealed and advanced with the keyboard", async ({ page }) => {
  await loadCurrentScene(page, "date");
  await setDialogueSpeed(page, "45");
  const line = page.locator('.dialogue-text[role="button"]').first();
  await expect(line).toHaveAttribute("data-ready", "false");
  const before = await saved(page);
  await line.focus();
  await line.press("Enter");
  await expect(line).toHaveAttribute("data-ready", "true");
  expect(await saved(page)).toEqual(before);
  await line.press("Enter");
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
});
