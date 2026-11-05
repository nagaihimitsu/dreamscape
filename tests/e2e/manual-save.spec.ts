import { expect, test } from "@playwright/test";
import { saved, startNewGame, openStaleTab } from "./helpers";

test("manual saving preserves the chosen position and reload asks before discarding changes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  const initial = await saved(page);

  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("自動保存する").uncheck();
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  expect(await saved(page)).toEqual(initial);

  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  const manual = await saved(page);
  expect(manual.activeTourism?.landmarkId).toBe("duomo_milano");
  expect(manual.travel.currentPlaceId).toBe("p_duomo");

  await page.getByTestId("tourism-skip").click();
  await expect.poll(async () => (await saved(page)).revision).toBe(manual.revision);
  await page.getByRole("button", { name: "ロード", exact: true }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm).toContainText("保存");
  await confirm.getByRole("button", { name: "戻る", exact: true }).click();
  await expect(page.getByTestId("tourism-guide")).toHaveCount(0);
  expect(await saved(page)).toEqual(manual);

  page.once("dialog", (dialog) => dialog.accept());
  await page.reload();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "設定" }).getByLabel("自動保存する")).not.toBeChecked();
});

test("another tab cannot overwrite a manual-save branch", async ({ page, context }) => {
  await startNewGame(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("自動保存する").uncheck();
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
  const initial = await saved(page);

  const other = await openStaleTab(context);
  await other.goto("/");
  await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
  await other.getByRole("button", { name: "設定", exact: true }).click();
  const otherSettings = other.getByRole("dialog", { name: "設定" });
  await otherSettings.getByLabel("自動保存する").check();
  await otherSettings.getByRole("button", { name: "閉じる", exact: true }).click();
  await other.getByTestId("travel-place-p_galleria").getByRole("button").click();
  const winner = await saved(other);
  expect(winner.revision).toBeGreaterThan(initial.revision);
  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/別|更新|保存/);
  expect(await saved(other)).toEqual(winner);
  await other.close();
});

test("a damaged save is kept until an explicit manual save backs it up", async ({ page }) => {
  const original = "{damaged-save";
  await page.goto("/");
  await page.evaluate((raw) => {
    localStorage.setItem("dreamscape.journey.milano.save.v1", raw);
    localStorage.setItem("dreamscape.presentation.v1", JSON.stringify({
      schemaVersion: 1, confirmChoices: true, reduceMotion: false, autoSave: false,
    }));
  }, original);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("保存データを読み込めませんでした");
  await page.getByRole("button", { name: /新しく始める/ }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"))).toBe(original);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("dreamscape.journey.milano.save.v1.backup.")))).toHaveLength(0);
  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  expect((await saved(page)).schemaVersion).toBe(13);
  const backups = await page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("dreamscape.journey.milano.save.v1.backup."))
    .map((key) => localStorage.getItem(key)));
  expect(backups).toEqual([original]);
});
