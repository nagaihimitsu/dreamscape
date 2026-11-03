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
    localStorage.setItem("dreamscape.save.v1", data);
    return data;
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("旅行編が一致しない");
  await expect(page.getByRole("button", { name: "保存データを消去する" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /新しく始める/ })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("dreamscape.save.v1"))).toBe(raw);
});

test("protects a Milan save accidentally placed in the India slot after release", async ({ page }) => {
  await page.goto("/");
  const raw = await page.evaluate(async () => {
    const gamePath = "/src/domain/game.ts";
    const journeyPath = "/src/content/journeys.ts";
    const { createGame } = await import(/* @vite-ignore */ gamePath);
    const { getJourney } = await import(/* @vite-ignore */ journeyPath);
    // Exercise the future playable entry without changing published data.
    getJourney("golden_triangle").status = "available";
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
