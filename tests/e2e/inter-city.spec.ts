import { expect, expectNoActiveScene, playUntil, readSave, saveKey, test, useInstantText } from "./helpers";

const journeyId = "golden_triangle";

test("finishing Delhi reads its ending and moves the journey to Agra's map", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  // State shortcut (lane 2 in docs/10): playing all of Delhi through the UI
  // takes minutes, so the page's own scene builders (src/dev/scenario-builders.ts,
  // the same ones the unit tests and Debug use) play Delhi's arrival, every
  // sightseeing battle and the finale with the real rules, and the finale's
  // result becomes a normal save. The move to Agra itself is then played through the UI.
  await page.evaluate(async (key) => {
    const builders = "/src/dev/scenario-builders.ts";
    const { cityFinaleResult } = await import(/* @vite-ignore */ builders);
    localStorage.setItem(key, JSON.stringify(cityFinaleResult("delhi", { names: ["旅人", "澪"] })));
  }, saveKey(journeyId));

  await page.getByLabel("旅行編").selectOption(journeyId);
  await expect(page.getByTestId("battle-result")).toBeVisible();
  const finale = await readSave(page, journeyId);
  expect(finale.completedCityIds).toEqual(["delhi"]);
  await useInstantText(page);
  await page.getByRole("button", { name: "エピローグへ進む", exact: true }).click();
  await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();

  // Delhi's ending is followed automatically by Agra's arrival and its own map.
  const arrived = await playUntil(page, (state) => state.currentCityId === "agra" && !state.activeEpilogue, journeyId);
  const menu = page.getByTestId("travel-menu");
  await expect(menu).toHaveAttribute("aria-label", "アーグラの行き先");
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await expect(page.getByTestId("travel-place-agra_taj_mahal")).toBeVisible();
  await expect(page.getByTestId("travel-place-delhi_red_fort")).toHaveCount(0);
  expectNoActiveScene(arrived);
  expect(arrived.viewedEpilogueCityIds).toEqual(["delhi"]);
  expect(arrived.travel.currentPlaceId).toBe(arrived.travel.hotelPlaceId);
  for (const field of ["playerName", "heroineName", "ap", "travelBudget", "completedCityIds", "completedEpisodeIds", "memories"] as const)
    expect(arrived[field], field).toEqual(finale[field]);

  await page.reload();
  await page.getByLabel("旅行編").selectOption(journeyId);
  await expect(menu).toHaveAttribute("aria-label", "アーグラの行き先");
  expect(await readSave(page, journeyId)).toEqual(arrived);
});
