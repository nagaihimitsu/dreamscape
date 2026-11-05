import { allStorage, expect, readSave, startJourney, test } from "./helpers";

test("the title screen opens every registered journey without writing a save", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Dreamscape/);
  const selector = page.getByLabel("旅行編");
  const journeys = await selector.locator("option").evaluateAll((options) =>
    options.map((option) => ({ id: (option as HTMLOptionElement).value, name: option.textContent ?? "" })));
  expect(journeys.map((journey) => journey.id)).toEqual(expect.arrayContaining(["milano", "golden_triangle"]));
  for (const journey of journeys) {
    await selector.selectOption(journey.id);
    if (journey.name.includes("準備中")) {
      // An unfinished journey can only store names for later; it cannot be played yet.
      await expect(page.getByText("この旅行編は制作中です。", { exact: false })).toBeVisible();
      await expect(page.getByRole("button", { name: "旅の準備を保存する" })).toBeVisible();
      await expect(page.getByRole("button", { name: "旅をはじめる" })).toHaveCount(0);
    } else {
      await expect(page.getByRole("button", { name: "旅をはじめる", exact: true })).toBeVisible();
    }
  }
  expect(Object.keys(await allStorage(page)).filter((key) => key.includes(".save."))).toEqual([]);
});

test("Debug mode opens a scene without changing the player's saved data", async ({ page }) => {
  await startJourney(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await readSave(page)).ap).toBe(0);
  const before = await allStorage(page);
  await page.goto("/?debug");
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  await page.getByRole("button", { name: "この場面を開く" }).click();
  await expect(page.getByTestId("debug-session")).toBeVisible();
  await page.getByRole("button", { name: "設定へ戻る" }).click();
  await expect(page.getByTestId("debug-panel")).toBeVisible();
  expect(await allStorage(page)).toEqual(before);
});
