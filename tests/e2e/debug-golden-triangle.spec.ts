import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";
import { installIndiaTransportPreview, saveIndependentIndiaGame } from "./india-preview-helpers";

test("the three authored India cities open real stories in Debug without changing either save", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  // Give both journeys real, independently created saves before opening Debug.
  const result = await saveIndependentIndiaGame(page);
  expect(result.ok).toBe(true);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await expect(page.getByTestId("debug-panel")).toContainText("仮の場面");
  for (const [cityId, cityName, landmarkId] of [["delhi", "デリー", "delhi_red_fort"], ["agra", "アーグラ", "agra_taj_mahal"], ["jaipur", "ジャイプール", "jaipur_amber_fort"]] as const) {
    const selector = page.getByTestId("debug-city");
    await expect(selector.locator(`option[value="${cityId}"]`)).toHaveText(cityName);
    await selector.selectOption(cityId);
    await page.getByTestId("debug-scene").selectOption("tourism");
    await page.getByTestId("debug-target").selectOption(landmarkId);
    await page.getByRole("button", { name: "この場面を開く" }).click();
    await expect(page.getByTestId("debug-session")).toBeVisible();
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
    await page.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  }
  // Fixture mode only replaces unfinished journeys. India keeps its real
  // registry while the still-unfinished Uzbekistan journey is inspected.
  await page.getByTestId("debug-data-mode").selectOption("fixture");
  await page.getByTestId("debug-city").selectOption("delhi");
  await expect(page.getByTestId("debug-target").locator('option[value="delhi_red_fort"]')).toHaveCount(1);
  await expect(page.getByTestId("debug-target").locator('option[value="delhi_landmark"]')).toHaveCount(0);
  await page.getByTestId("debug-data-mode").selectOption("real");
  await expect(page.getByTestId("debug-target").locator('option[value="delhi_red_fort"]')).toHaveCount(1);
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  await page.reload();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});

test("test-only prototype city maps use actual India routes in an isolated debug session", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const result = await saveIndependentIndiaGame(page);
  expect(result.ok).toBe(true);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await installIndiaTransportPreview(page);
  for (const [cityId, cityName, placeId] of [
    ["delhi", "デリー", "delhi_red_fort"],
    ["agra", "アーグラ", "agra_taj_mahal"],
    ["jaipur", "ジャイプール", "jaipur_amber_fort"],
  ] as const) {
    await page.getByTestId("debug-city").selectOption(cityId);
    await page.getByRole("button", { name: "地図・交通を確認" }).click();
    const preview = page.getByTestId("debug-prototype-preview");
    await expect(preview).toContainText(`${cityName} · 都市データの確認`);
    await expect(preview).toContainText("物語は始まりません");
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("₹30000");
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("1日目（月） 09:00");
    await expect(preview.getByTestId("travel-map-canvas")).toBeVisible();
    await preview.getByRole("button", { name: "滞在先で休む（徒歩 0分 · ₹0）" }).click();
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("2日目（火） 09:00");
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("₹30000");
    await expect(preview.getByTestId("debug-prototype-status")).toContainText("0 AP");
    await preview.getByTestId("debug-prototype-destination").selectOption(placeId);
    await preview.getByRole("button", { name: /^タクシー / }).click();
    await expect(preview.getByRole("status")).toContainText("一時データで移動を確認しました");
    await expect(preview.getByTestId("debug-prototype-status")).not.toContainText("₹30000");
    await preview.getByRole("button", { name: "一時データを読み直す" }).click();
    await expect(preview.getByRole("status")).toContainText("一時データから再開しました");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    await preview.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  }
});
