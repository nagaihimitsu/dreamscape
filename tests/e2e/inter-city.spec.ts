import { expect, expectNoActiveScene, generated, journeyCatalog, ops, placeSave, playUntil, readSave, savedGame, test, tier } from "./helpers";

type TravelFile = { events: { placeId: string; category: string }[] };
const mainPlaces = (cityId: string) =>
  generated<TravelFile>(`travel/${cityId}.json`).events.filter((event) => event.category === "main").map((event) => event.placeId);

// Chosen from the generated catalog (never a fixed journey): the first available
// journey with two cities that moves on by itself after a city's epilogue.
const journey = journeyCatalog().journeys.find((item) =>
  item.status === "available" && item.cities.length >= 2 && item.cityTransition === "after_epilogue");

// docs/07 「旅行の変更」 and AGENTS.md 「都市間の出発時…思い出・関係値・イベント履歴を維持する」.
test("finishing a journey's first city reads its ending and moves the journey to the next city's map", { tag: tier.gate }, async ({ page }) => {
  expect(journey, "an available journey with two cities that moves on after the epilogue").toBeDefined();
  const { id: journeyId, cities: [from, to] } = journey!;
  const source = savedGame(journeyId);
  test.setTimeout(120_000);
  await page.goto("/");
  // State shortcut (lane 2 in docs/10): playing a whole city through the UI takes
  // minutes, so the page's own scene builders (src/dev/scenario-builders.ts, the
  // same ones the unit tests and Debug use) play the first city's arrival, every
  // sightseeing battle and the finale with the real rules, and the game's own
  // saveGame stores the finale's result as a normal save. The move itself is played in the UI.
  await placeSave(page, journeyId, "cityFinaleResult", from.id, { names: ["旅人", "澪"] });

  await ops.chooseJourney(page, journeyId);
  await expect(page.getByTestId("battle-result")).toBeVisible();
  const finale = await readSave(page, journeyId);
  expect(finale.completedCityIds).toEqual([from.id]);
  await ops.toEpilogue(page);

  // The ending is followed automatically by the next city's arrival and its own map.
  const arrived = await playUntil(page, (state) => state.currentCityId === to.id && !state.activeEpilogue, { source });
  const menu = page.getByTestId("travel-menu");
  await expect(menu).toHaveAttribute("aria-label", `${to.nameJa}の行き先`);
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await expect(page.getByTestId(`travel-place-${mainPlaces(to.id)[0]}`)).toHaveCount(1);
  for (const placeId of mainPlaces(from.id)) await expect(page.getByTestId(`travel-place-${placeId}`)).toHaveCount(0);
  expectNoActiveScene(arrived);
  expect(arrived.viewedEpilogueCityIds).toEqual([from.id]);
  expect(arrived.travel.currentPlaceId).toBe(arrived.travel.hotelPlaceId);
  for (const field of ["playerName", "heroineName", "ap", "travelBudget", "completedCityIds", "completedEpisodeIds", "memories"] as const)
    expect(arrived[field], field).toEqual(finale[field]);

  await page.reload();
  await ops.chooseJourney(page, journeyId);
  await expect(menu).toHaveAttribute("aria-label", `${to.nameJa}の行き先`);
  expect(await readSave(page, journeyId)).toEqual(arrived);
});
