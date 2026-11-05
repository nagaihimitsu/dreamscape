import { expect, test } from "@playwright/test";
import { expectNoOverflow, startNewGame } from "./helpers";

test("Luang Prabang is a separate unfinished journey and preserves Milan's save", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page, ["ミラノの旅人", "相手"]);
  const original = await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"));
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("luang_prabang");
  await expect(page.getByText("この旅行編は制作中です。観光やイベントはまだ遊べません。")).toBeVisible();
  await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
  await page.getByLabel("主人公の名前").fill("ルアンの旅人");
  await page.getByRole("button", { name: "旅の準備を保存する" }).click();
  await expect(page.getByText("ルアンの旅人 と あゆみ")).toBeVisible();
  await expectNoOverflow(page);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"))).toBe(original);
  await page.reload();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("dialog", { name: "設定" }).getByLabel("旅行編").selectOption("luang_prabang");
  await expect(page.getByText("ルアンの旅人 と あゆみ")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"))).toBe(original);
});

test("debug previews city walking, taxi and isolated save and rest", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await page.getByTestId("debug-city").selectOption("luang_prabang");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  const preview = page.getByTestId("debug-prototype-preview");
  await expect(preview).toContainText("ルアンパパーン · 都市データの確認");
  await expect(preview.getByTestId("debug-prototype-status")).toContainText("₭2000000");
  await expect(preview.getByTestId("travel-map-canvas")).toBeVisible();
  await expect(preview.getByTestId("debug-prototype-destination").locator('option[value*="kuang"]')).toHaveCount(0);
  await preview.getByTestId("debug-prototype-destination").selectOption("luang_prabang_xieng_thong");
  await expect(preview.getByRole("button", { name: /^タクシー/ })).toBeVisible();
  await preview.getByRole("button", { name: /^徒歩/ }).click();
  await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
  const moved = await preview.getByTestId("debug-prototype-status").textContent();
  await preview.getByRole("button", { name: "一時データを読み直す" }).click();
  await expect(preview.getByTestId("debug-prototype-status")).toHaveText(moved!);
  await preview.getByRole("button", { name: /^滞在先で休む（徒歩/ }).first().click();
  await expect(preview.getByTestId("debug-prototype-status")).toContainText("2日目（火） 09:00");
  await expectNoOverflow(page);
  await preview.getByRole("button", { name: "設定へ戻る" }).click();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
