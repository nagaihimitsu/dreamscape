import { derivedImageFile } from "../../src/content/code-images";
import type { GameState } from "../../src/domain/game";
import { expect, expectNoActiveScene, generated, journeyCatalog, ops, playUntil, quizCatalog, readSave, savedGame, test, tier, type Page, type Pick } from "./helpers";

// Lane 1 (docs/10): the sample journey (authoring/templates/sample_trip, development
// and tests only) played like a player from the title screen to the end of the
// journey, with no Debug and no state shortcut; every action waits for its save. It
// runs on a development server of its own built with the sample
// (playwright.sample.config.ts). The route is the one tests/journeys/sample_trip/route.test.ts
// plays with the game functions; its IDs come from the generated content. It covers
// the screens a new journey needs (journey:new copies the sample) and the city
// finale, epilogue and end of a journey, which the Milan tests reach only through a
// state shortcut (inter-city.spec.ts).
const JOURNEY = "sample_trip";

type TravelEvent = { id: string; placeId: string; category: "main" | "date"; apCost: number };
type MapRoute = { fromPlaceId: string; toPlaceId: string; mode: string };
type Rental = { modeId: string; placeIds: string[]; cost: number };
type Progression = {
  episodes: { id: string; kind: "episode" | "city_finale"; cityId: string; landmarkId: string | null }[];
  storyBattles: { battleId: string }[];
};
type Battle = { id: string; quizId: string; reasoning: { correctClueIds: string[] } | null };
type Encounters = { items: { id: string; cityId: string }[]; encounters: { id: string; landmarkId: string }[] };

/** The sample's city, events, battles and encounters, from the generated content of this run. */
function sampleRoute() {
  const journey = journeyCatalog().journeys.find((item) => item.id === JOURNEY);
  const city = journey?.cities[0];
  expect(city, "the sample journey in the generated content (playwright.sample.config.ts builds it)").toBeDefined();
  const { events, routes } = generated<{ events: TravelEvent[]; routes: MapRoute[] }>(`travel/${city!.id}.json`);
  const rental = generated<{ rentals?: Rental[] }>(`travel/${city!.id}-settings.json`).rentals?.[0];
  const { episodes, storyBattles } = generated<Progression>("progression/journey.json");
  const episode = episodes.find((item) => item.cityId === city!.id && item.kind === "episode")!;
  const finale = episodes.find((item) => item.cityId === city!.id && item.kind === "city_finale")!;
  const { items, encounters } = generated<Encounters>("encounters/catalog.json");
  const battles = generated<{ battles: Battle[] }>("battles/catalog.json").battles;
  const event = (id: string) => events.find((item) => item.id === id)!;
  return {
    city: city!,
    episode: event(episode.id),
    finale: event(finale.id),
    date: events.find((item) => item.category === "date")!,
    // Optional parts of the sample: the encounters at the first stop with the item they
    // give, and the special battles B and C, started from the map like an episode.
    encounterIds: encounters.filter((item) => item.landmarkId === episode.landmarkId).map((item) => item.id),
    itemIds: items.filter((item) => item.cityId === city!.id).map((item) => item.id),
    specials: events.filter((item) => storyBattles.some((entry) => entry.battleId === item.id)),
    // Optional part: the rental bicycle, rented at the hotel and ridden until the party leaves the city.
    rental: rental && { offer: rental, mode: journey!.transportModes.find((mode) => mode.id === rental.modeId)! },
    routes,
    battle: (id: string) => battles.find((battle) => battle.id === id)!,
  };
}
type SampleRoute = ReturnType<typeof sampleRoute>;

/**
 * Go to a place like a player: by the rented mode when a route of it leads there
 * (the route dialog lists walking and the rental), else on the only route, walking.
 */
async function goToPlace(page: Page, route: SampleRoute, placeId: string) {
  const state = await readSave(page, JOURNEY);
  const mode = route.rental?.mode;
  const ride = mode && state.travel.rentedModeIds.includes(mode.id) &&
    route.routes.some((item) => item.fromPlaceId === state.travel.currentPlaceId && item.toPlaceId === placeId && item.mode === mode.id);
  await ops.goTo(page, placeId, ride ? mode.nameJa : undefined);
}

/** The correct answer of the open question, like a player who followed the story; "A" for other choices. */
function correctAnswers(route: SampleRoute): Pick {
  const quizzes = quizCatalog();
  return (state: GameState) => {
    const battle = state.activeBattle;
    if (battle?.phase !== "question") return "A";
    return quizzes[route.battle(battle.battleId).quizId].questions[battle.roundIndex].correctOptionId;
  };
}

/** Play the open battle to its result; AP rises by exactly what the result's receipt credits (docs/07 acceptance 2). */
async function playBattleToResult(page: Page, pick: Pick) {
  const before = await readSave(page, JOURNEY);
  const result = await playUntil(page, (state) => state.activeBattle?.phase === "result", { source: savedGame(JOURNEY), pick });
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  const receipt = result.battleRewardReceipt!.entries;
  expect(result.ap).toBe(before.ap + receipt.reduce((sum, entry) => sum + entry.creditedAp, 0));
  expect(result.claimedRewardIds).toEqual([...before.claimedRewardIds, ...receipt.map((entry) => entry.rewardId)]);
  return result;
}

test("the sample journey plays from a new journey through its city finale and epilogue to the end of the journey", { tag: tier.sample }, async ({ page }) => {
  // About 30 s (every scene of the sample, special battles included); slower runners need more.
  test.setTimeout(120_000);
  // Time runs normally; it is held only while the bicycle's transition is checked.
  await page.clock.install();
  const route = sampleRoute();
  const source = savedGame(JOURNEY);
  const pick = correctAnswers(route);
  const menu = page.getByTestId("travel-menu");

  // docs/07 acceptance 1: the names are entered and the journey starts on its city's map.
  await ops.startJourney(page, JOURNEY, ["ユウ", "ミオ"]);
  await expect(menu).toHaveAttribute("aria-label", `${route.city.nameJa}の行き先`);
  expect(await ops.readTravelers(page)).toContain("ユウ");
  expect(await readSave(page, JOURNEY)).toMatchObject({ currentCityId: route.city.id, ap: 0 });
  await expect(page.getByLabel("残り0AP")).toBeVisible();
  // The city's free-time backdrop (cities/<city>.json backdropAssetId): the reduced copy that content:build
  // derives from the photo loads on the free-time page. (From UI step 1.5 the screen shows it as its background.)
  const backdropId = generated<{ backdropAssetId?: string }>(`cities/${route.city.id}.json`).backdropAssetId;
  expect(backdropId, "the sample city's backdropAssetId").toBeDefined();
  const backdrop = await page.evaluate(async (src) => {
    const image = new Image();
    image.src = src;
    await image.decode();
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, derivedImageFile(JOURNEY, backdropId!, "backdrop"));
  // The sample's photo is 240×160 px; a backdrop copy is never enlarged.
  expect(backdrop).toEqual({ width: 240, height: 160 });

  // 0. (Optional part) The rental bicycle. Its route is listed but closed until the
  // bicycle is rented at the hotel; renting asks once more, pays once and takes no time.
  const rental = route.rental;
  if (rental) {
    const { offer, mode } = rental;
    await ops.goTo(page, route.episode.placeId);
    await expect(ops.routeButton(page, mode.nameJa)).toBeDisabled();
    await expect(page.getByRole("dialog")).toContainText(`${mode.nameJa}は滞在先で借りると乗れます。`);
    await expect(ops.routeButton(page, "徒歩")).toBeEnabled();
    await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const before = await readSave(page, JOURNEY);
    await page.getByTestId("travel-rentals").getByRole("button", { name: `${mode.nameJa}を借りる`, exact: true }).click();
    await expect(page.getByRole("dialog", { name: "乗り物を借りる" })).toBeVisible();
    await page.getByTestId(`travel-rent-${offer.modeId}`).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("travel-rentals")).toContainText(`${mode.nameJa}を借りています（${route.city.nameJa}にいるあいだ）`);
    const rented = await readSave(page, JOURNEY);
    expect(rented.revision).toBe(before.revision + 1);
    expect(rented.travelBudget).toBe(before.travelBudget - offer.cost);
    expect(rented.travel).toEqual({ ...before.travel, rentedModeIds: [offer.modeId] });
  }

  // 1. Sightseeing. The tower also holds the date and the finale; at each step of this
  // route a place offers one open event, so going there starts it at once (by the
  // rented bicycle when there is one: hold the page's clock so its short transition,
  // 0.45 s with reduced motion, stays while it is checked).
  if (rental) await ops.holdClock(page);
  await goToPlace(page, route, route.episode.placeId);
  if (rental) {
    const transition = page.getByTestId("travel-transition");
    await expect(transition).toHaveAttribute("data-mode", rental.mode.id);
    await expect(transition).toHaveAttribute("data-kind", "bicycle");
    await expect(transition.locator(".travel-transition-label")).toHaveText(rental.mode.movingJa);
    expect((await readSave(page, JOURNEY)).travel.currentPlaceId).toBe(route.episode.placeId);
    await page.clock.resume();
    await expect(transition).toHaveCount(0);
  }
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await playUntil(page, (state) => state.activeTourism?.phase === "exploring", { source, pick });
  await expect(page.getByTestId("observation-viewport")).toBeVisible();
  // (Optional part) Going on, the tower's encounters run first: the bookmark is received,
  // then given (AGENTS.md: an item is gained, given and used in its own city).
  await page.getByTestId("observation-proceed").click();
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  const met = await playUntil(page, (state) => !state.activeEncounter, { source, pick });
  expect(met.completedEncounterIds).toEqual(route.encounterIds);
  for (const itemId of route.itemIds) expect(met.inventory[itemId], itemId).toBe("gifted");
  expect(met.activeTourism?.phase).toBe("exploring");

  // 2. The normal battle and its rewards.
  await page.getByTestId("observation-proceed").click();
  const result = await playBattleToResult(page, pick);
  expect(result.completedEpisodeIds).toEqual([route.episode.id]);
  expect(result.ap).toBeGreaterThan(0);
  await ops.toFreeTime(page);
  await expect(page.getByLabel(`残り${result.ap}AP`)).toBeVisible();

  // 3. The date: its AP is spent once when it starts, and it ends on the map (docs/07 acceptance 3, 4).
  await goToPlace(page, route, route.date.placeId);
  await expect(page.getByTestId("romance-scene")).toBeVisible();
  const dating = await readSave(page, JOURNEY);
  expect(dating.activeDate?.dateId).toBe(route.date.id);
  expect(dating.ap).toBe(result.ap - route.date.apCost);
  const dated = await playUntil(page, (state) => !state.activeDate, { source, pick });
  await expect(menu).toBeVisible();
  expect(dated.playedDateIds).toEqual([route.date.id]);
  expect(dated.ap).toBe(dating.ap);
  expectNoActiveScene(dated);

  // 4. (Optional part) Special battles B and C: the place's guide, then the battle whose
  // evidence the player chooses in the clue book (AGENTS.md: 矛盾追及B・証拠連結C).
  for (const special of route.specials) {
    await goToPlace(page, route, special.placeId);
    await expect(page.getByTestId("tourism-guide")).toBeVisible();
    await playUntil(page, (state) => state.activeTourism?.phase === "exploring", { source, pick });
    await page.getByTestId("observation-proceed").click();
    await playUntil(page, (state) => state.activeBattle?.phase === "reasoning", { source, pick });
    await ops.passReasoningIntro(page);
    await ops.chooseEvidence(page, route.battle(special.id).reasoning!.correctClueIds);
    await page.getByTestId("reasoning-submit").click();
    const cleared = await playBattleToResult(page, pick);
    expect(cleared.battleRecords.find((record) => record.battleId === special.id)?.attempts).toBe(1);
    await page.getByRole("button", { name: "自由時間へ戻る", exact: true }).click();
    await expect(menu).toBeVisible();
  }

  // 5. The city finale clears the city (its clear reward is in the receipt, paid once).
  await goToPlace(page, route, route.finale.placeId);
  const finale = await playBattleToResult(page, pick);
  expect(finale.completedCityIds).toEqual([route.city.id]);
  await ops.toEpilogue(page);

  // 6. The epilogue, then the end of the journey: its only city is cleared and its
  // ending read, there is no next city to leave for, and the travellers stay in free time.
  const ended = await playUntil(page, (state) => state.viewedEpilogueCityIds.includes(route.city.id) && !state.activeEpilogue, { source, pick });
  await expect(menu).toBeVisible();
  expectNoActiveScene(ended);
  expect(ended).toMatchObject({ currentCityId: route.city.id, completedCityIds: [route.city.id], ap: finale.ap });
  await expect(page.getByTestId("city-progress")).toContainText("都市クリア");
  await expect(page.getByRole("button", { name: /へ出発/ })).toHaveCount(0);

  // The rental lasts while the party stays in the city.
  expect(ended.travel.rentedModeIds).toEqual(rental ? [rental.offer.modeId] : []);

  // A reload resumes the finished journey exactly as saved: the journey last opened on this device opens by itself.
  await page.reload();
  await expect(menu).toBeVisible();
  expect(await readSave(page, JOURNEY)).toEqual(ended);
  if (rental) await expect(page.getByTestId("travel-rentals")).toContainText(`${rental.mode.nameJa}を借りています`);
});
