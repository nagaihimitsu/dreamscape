import { expect, test } from "@playwright/test";
import { startNewGame } from "./helpers";

test("debug selects a test city and opens its own scenes without touching the player save", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  const original = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.goto("/?debug");
  await page.evaluate(async () => {
    const path = "/src/domain/multi-city-test-fixture.ts";
    const { installTestCity } = await import(/* @vite-ignore */ path);
    installTestCity();
    const contentPath = "/src/content/index.ts";
    const encounterPath = "/src/content/encounters.ts";
    const { dates } = await import(/* @vite-ignore */ contentPath);
    const { encounters } = await import(/* @vite-ignore */ encounterPath);
    const date = dates.find((item: { id: string }) => item.id === "test_date")!;
    date.requiredCompletedCityIds = ["milano"];
    date.requiredCompletedEpisodeIds = ["milano_galleria_episode"];
    encounters.encounters.find((item: { id: string }) => item.id === "test_encounter")!.availability = "tourism";
  });
  // Trigger a form render after the test-only registry has been populated.
  await page.getByTestId("debug-scene").selectOption("battle");
  await page.getByTestId("debug-city").selectOption("test_city");
  for (const [scene, target, screen] of [
    ["tourism", "test_landmark", "tourism-guide"],
    ["battle", "test_battle", "battle-location"],
    ["encounter", "test_encounter", "encounter-screen"],
    ["date", "test_date", "romance-scene"],
  ] as const) {
    await page.getByTestId("debug-scene").selectOption(scene);
    await page.getByTestId("debug-target").selectOption(target);
    await page.getByRole("button", { name: "この場面を開く" }).click();
    await expect(page.getByTestId(screen)).toBeVisible();
    await expect(page.getByTestId("journey-context")).toContainText("現在地：ドゥオモ広場");
    if (scene === "date") await page.screenshot({ path: testInfo.outputPath("second-city-date.png") });
    await page.getByRole("button", { name: "設定へ戻る" }).click();
  }
  expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(original);
});
