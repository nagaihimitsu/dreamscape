import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";

test("the three unfinished cities can be inspected only in Debug without changing either save", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  // Give both journeys real, independently created saves before opening Debug.
  const result = await page.evaluate(async () => {
    const draftPath = "/src/persistence/journey-preparation.ts";
    const storagePath = "/src/persistence/journey-storage.ts";
    const { saveJourneyDraft } = await import(/* @vite-ignore */ draftPath);
    const { journeyStorage } = await import(/* @vite-ignore */ storagePath);
    return saveJourneyDraft(journeyStorage(localStorage, "golden_triangle"), "インドの主人公", "インドの相手");
  });
  expect(result.ok).toBe(true);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await expect(page.getByTestId("debug-panel")).toContainText("仮の場面");
  await page.getByTestId("debug-data-mode").selectOption("fixture");
  for (const [cityId, cityName] of [["delhi", "デリー"], ["agra", "アーグラ"], ["jaipur", "ジャイプール"]] as const) {
    const selector = page.getByTestId("debug-city");
    await expect(selector.locator(`option[value="${cityId}"]`)).toContainText(`${cityName}（仮データ）`);
    await selector.selectOption(cityId);
    await page.getByTestId("debug-scene").selectOption("tourism");
    await page.getByTestId("debug-target").selectOption(`${cityId}_landmark`);
    await page.getByRole("button", { name: "この場面を開く" }).click();
    await expect(page.getByTestId("debug-session")).toBeVisible();
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
    await page.getByRole("button", { name: "設定へ戻る" }).click();
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  }
  // Returning to real data must restore the actual registered cities, not
  // leave the fictional Milan-derived registry installed.
  await page.getByTestId("debug-data-mode").selectOption("real");
  await page.getByTestId("debug-city").selectOption("delhi");
  await page.getByRole("button", { name: "地図・交通を確認" }).click();
  await expect(page.getByTestId("debug-prototype-destination").locator('option[value="delhi_red_fort"]')).toHaveCount(1);
  await page.getByRole("button", { name: "設定へ戻る" }).click();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
  await page.reload();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});

test("prototype city maps and transport use actual data in an isolated debug session", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  const result = await page.evaluate(async () => {
    const draftPath = "/src/persistence/journey-preparation.ts";
    const storagePath = "/src/persistence/journey-storage.ts";
    const { saveJourneyDraft } = await import(/* @vite-ignore */ draftPath);
    const { journeyStorage } = await import(/* @vite-ignore */ storagePath);
    return saveJourneyDraft(journeyStorage(localStorage, "golden_triangle"), "インドの主人公", "インドの相手");
  });
  expect(result.ok).toBe(true);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
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
