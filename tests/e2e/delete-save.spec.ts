import { test, expect } from "@playwright/test";
import { loadSnapshot, startNewGame, saved } from "./helpers";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };

test.use({ viewport: { width: 360, height: 780 } });

test("cancel preserves data and confirmed deletion returns to a fresh journey", async ({
  page,
}) => {
  await startNewGame(page, ["旅人", "小春"]);
  await page.evaluate(() => {
    localStorage.setItem("dreamscape.save.v1.backup.123", "backup");
    localStorage.setItem("unrelated-app", "keep");
  });
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByLabel("常に日本語訳を表示する").check();
  await page.getByRole("button", { name: "保存データの消去" }).click();
  let dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("英語ノートと対訳設定");
  await expect(dialog).toContainText("元には戻せません");
  await dialog.getByRole("button", { name: "消去せず戻る" }).click();
  expect((await saved(page)).playerName).toBe("旅人");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "保存データの消去" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "旅をはじめる", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => ({
      game: localStorage.getItem("dreamscape.save.v1"),
      learning: localStorage.getItem("dreamscape.learning.v1"),
      backup: localStorage.getItem("dreamscape.save.v1.backup.123"),
      other: localStorage.getItem("unrelated-app"),
    })),
  ).toEqual({ game: null, learning: null, backup: "backup", other: "keep" });
  await page.reload();
  await startNewGame(page);
  expect((await saved(page)).ap).toBe(0);
});

test("a stale tab cannot delete or recreate a newer save", async ({
  page,
  context,
}) => {
  await startNewGame(page);
  const older = await context.newPage();
  await older.goto("/");
  await page.getByTestId("episode-start").click();
  const current = await saved(page);
  await older.getByRole("button", { name: "設定", exact: true }).click();
  await older.getByRole("button", { name: "保存データの消去" }).click();
  await expect(older.getByRole("status")).toContainText("別の画面");
  expect(await saved(page)).toEqual(current);
  await older.close();
});

test("unreadable saves can be explicitly deleted", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem("dreamscape.save.v1", "{broken");
    localStorage.setItem("dreamscape.learning.v1", "{broken-notes");
  });
  await page.reload();
  await page
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "旅をはじめる", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.save.v1")),
  ).toBeNull();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBeNull();
});

test("another open tab cannot recreate data after deletion", async ({
  page,
  context,
}) => {
  await startNewGame(page);
  const older = await context.newPage();
  await older.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "保存データの消去" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "旅をはじめる", exact: true }),
  ).toBeVisible();
  await older.getByRole("button", { name: "セーブ", exact: true }).click();
  await expect(
    older.locator(".notice").filter({ hasText: "セーブ" }),
  ).toContainText("別の画面");
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.save.v1")),
  ).toBeNull();
  await older.getByRole("button", { name: "設定", exact: true }).click();
  await expect(older.getByLabel("常に日本語訳を表示する")).toBeDisabled();
  await expect(older.getByRole("dialog").getByRole("status")).toContainText(
    "別の画面",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBeNull();
  await older.close();
});

test("confirmation does not delete data changed in another tab", async ({
  page,
  context,
}) => {
  await startNewGame(page);
  const other = await context.newPage();
  await other.goto("/");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "保存データの消去" }).click();
  await other.getByRole("button", { name: "設定", exact: true }).click();
  await other.getByLabel("常に日本語訳を表示する").check();
  const latest = await other.evaluate(() =>
    localStorage.getItem("dreamscape.learning.v1"),
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await expect(
    page.locator(".notice").filter({ hasText: "保存データが更新" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.learning.v1")),
  ).toBe(latest);
  expect((await saved(page)).schemaVersion).toBe(8);
  await other.close();
});

test("a migrated in-progress save can be deleted from settings", async ({
  page,
}) => {
  await loadSnapshot(page, phase6.battleReaction);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: "保存データの消去" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "保存データを消去する", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "旅をはじめる", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("dreamscape.save.v1")),
  ).toBeNull();
});
