import { expect, expectNoActiveScene, playUntil, readSave, saveKey, test, useInstantText } from "./helpers";

const journeyId = "golden_triangle";

test("finishing Delhi reads its ending and moves the journey to Agra's map", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  // State shortcut: playing all of Delhi through the UI takes minutes, so the
  // page's own game modules play Delhi's arrival, four sightseeing battles and
  // the finale with the real rules, and the result becomes a normal save. The
  // move to Agra itself is then played through the UI.
  await page.evaluate(async (key) => {
    const load = (path: string) => import(/* @vite-ignore */ path);
    const [{ createGame }, { episodes }, chapter, tourism, battle, epilogue] = await Promise.all([
      load("/src/domain/game.ts"), load("/src/content/index.ts"), load("/src/domain/chapter.ts"),
      load("/src/domain/tourism.ts"), load("/src/domain/battle.ts"), load("/src/domain/epilogue.ts")]);
    let state = createGame("旅人", "澪", { journeyId: "golden_triangle" });
    state = epilogue.startCityArrival(state, state.revision);
    state = epilogue.completeArrivalLogo(state, state.revision);
    while (state.activeEpilogue) state = epilogue.advanceCityEpilogue(state, state.revision);
    for (const episode of episodes.filter((item: { cityId: string }) => item.cityId === "delhi")) {
      state = chapter.startEpisode(state, episode.id);
      if (state.activeTourism) state = tourism.skipTourismGuide(state, state.revision);
      if (state.activeTourism) state = tourism.startTourismBattle(state, state.revision);
      for (let step = 0; state.activeBattle?.phase !== "result"; step++) {
        const active = state.activeBattle;
        if (!active || step > 300) throw new Error(`Could not finish ${episode.id}`);
        const { quiz } = battle.getActiveBattleContent(active);
        state = active.phase === "question"
          ? battle.answerBattle(state, quiz.questions[active.roundIndex].correctOptionId, state.revision)
          : battle.advanceBattle(state, state.revision);
      }
      if (episode.kind !== "city_finale") state = battle.leaveBattle(state, state.revision);
    }
    localStorage.setItem(key, JSON.stringify(state));
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
