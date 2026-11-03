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
  await expect(page.getByTestId("debug-panel")).toContainText("仮データ");
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
  await page.reload();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
