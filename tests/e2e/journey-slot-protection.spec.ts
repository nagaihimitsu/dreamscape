import { expect, test } from "@playwright/test";

test("protects an India save accidentally placed in the Milan slot", async ({ page }) => {
  await page.goto("/");
  const raw = await page.evaluate(async () => {
    const gamePath = "/src/domain/game.ts";
    const contentPath = "/src/content/index.ts";
    const { createGame } = await import(/* @vite-ignore */ gamePath);
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const state = createGame();
    const hotel = getCityContent("delhi").travelSettings.hotelPlaceId;
    const data = JSON.stringify({ ...state, currentCityId: "delhi", travelBudget: 30_000,
      travel: { ...state.travel, currentPlaceId: hotel, hotelPlaceId: hotel } });
    localStorage.setItem("dreamscape.journey.milano.save.v1", data);
    return data;
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("旅行編が一致しない");
  await expect(page.getByRole("button", { name: "保存データを消去する" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /新しく始める/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.milano.save.v1"))).toBe(raw);
});

test("protects a Milan save accidentally placed in the India slot after release", async ({ page }) => {
  await page.goto("/");
  const raw = await page.evaluate(async () => {
    const gamePath = "/src/domain/game.ts";
    const { createGame } = await import(/* @vite-ignore */ gamePath);
    const data = JSON.stringify(createGame());
    localStorage.setItem("dreamscape.journey.golden_triangle.save.v1", data);
    return data;
  });
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByRole("alert")).toContainText("旅行編が一致しない");
  await expect(page.getByRole("button", { name: "保存データを消去する" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /新しく始める/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.golden_triangle.save.v1"))).toBe(raw);
});

test("other preparing journeys display their own read-only page without touching saves", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const saves = await page.evaluate(async () => {
    const journeyPath = "/src/content/journeys.ts";
    const { journeys } = await import(/* @vite-ignore */ journeyPath);
    const india = journeys.find((item: { id: string }) => item.id === "golden_triangle");
    if (!india) throw new Error("Missing India journey fixture");
    // Only journeys with an initial state support preparation saves. This
    // unconfigured future journey must remain a read-only announcement.
    journeys.push({ ...india, status: "preparing", initialState: undefined, id: "test_preparing", nameJa: "試作の旅",
      cities: [{ id: "test_city", nameJa: "試作都市" }] });
    const indiaSave = "unchanged-india-save";
    const otherSave = "unchanged-other-save";
    localStorage.setItem("dreamscape.journey.golden_triangle.save.v1", indiaSave);
    localStorage.setItem("dreamscape.journey.test_preparing.save.v1", otherSave);
    return { indiaSave, otherSave };
  });
  // Switching the now-playable India journey rerenders the selector. Its
  // deliberately unreadable save is protected before the read-only fixture opens.
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("旅行編").locator('option[value="test_preparing"]')).toHaveCount(1);
  // The read-only screen must remain accessible even without Web Locks.
  await page.evaluate(() => Object.defineProperty(navigator, "locks", { value: undefined, configurable: true }));
  await page.getByLabel("旅行編").selectOption("test_preparing");
  await expect(page.getByRole("heading", { name: "試作の旅" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("この旅行編は制作中です");
  await expect(page.getByText("試作都市")).toBeVisible();
  await expect(page.getByText("デリー", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "旅の準備を保存する" })).toHaveCount(0);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByLabel("旅行編")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`preparing-${width}.png`), fullPage: true });
  }
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.golden_triangle.save.v1"))).toBe(saves.indiaSave);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.test_preparing.save.v1"))).toBe(saves.otherSave);
  await page.getByLabel("旅行編").selectOption("milano");
  await expect(page.getByLabel("旅行編")).toHaveValue("milano");
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.golden_triangle.save.v1"))).toBe(saves.indiaSave);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.journey.test_preparing.save.v1"))).toBe(saves.otherSave);
});
