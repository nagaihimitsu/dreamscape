import { DOUBLE_TAP_WINDOW_MS } from "../../src/features/battle/double-tap";
import { allStorage, expect, expectNoActiveScene, generated, journeyCatalog, learningKey, ops, playUntil, readSave, savedGame, test, tier } from "./helpers";

// Lane 1 (docs/10): the real flow from the title screen, no Debug, no state shortcut.
// docs/07 acceptance 1–4 (names, AP from the first battle, a date spending AP once and finishing).
test("a new Milan journey walks to the Duomo, plays its guide, quiz battle and a date, and returns to free time", { tag: [tier.gate, tier.prod, tier.smoke] }, async ({ page }) => {
  test.setTimeout(120_000);
  // Time runs normally; it is paused only for the typewriter check below.
  await page.clock.install();
  // A name that looks like markup is shown as plain text (AGENTS.md: player input is text, never HTML).
  await ops.startJourney(page, "milano", ["<b>航</b>", "澪"]);
  const menu = page.getByTestId("travel-menu");
  await expect(page.getByTestId("travelers")).toContainText("<b>航</b>");
  await expect(page.getByTestId("travelers").locator("b")).toHaveCount(0);
  await expect(page.getByLabel("残り0AP")).toBeVisible();

  // Walking to the Duomo opens its sightseeing guide on arrival.
  // The default typewriter (文字送り「ふつう」, motion not reduced), which every
  // player starts with (AGENTS.md: 文字送り速度・スキップ, 誤タップ防止): the first
  // tap on a line still being written completes it without changing the save,
  // the second tap goes on to the next line.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  const line = page.getByTestId("dialogue-text");
  await expect(line).toHaveAttribute("data-ready", "true");
  // Freeze the page's clock so the next line cannot finish writing by itself.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  const first = await readSave(page);
  await line.click();
  await expect.poll(async () => (await readSave(page)).revision).toBe(first.revision + 1);
  await expect(line).toHaveAttribute("data-ready", "false");
  await line.click();
  await expect(line).toHaveAttribute("data-ready", "true");
  expect((await readSave(page)).revision).toBe(first.revision + 1);
  await line.click();
  await expect.poll(async () => (await readSave(page)).revision).toBe(first.revision + 2);
  await page.clock.resume();
  // The line now being written finishes by itself; later lines appear whole.
  await expect(line).toHaveAttribute("data-ready", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await playUntil(page, (state) => state.activeTourism?.phase === "exploring");
  await expect(page.getByTestId("observation-viewport")).toBeVisible();

  // The guide leads into the quiz battle; every answer and line is saved before the next.
  await page.getByRole("button", { name: "進む", exact: true }).click();
  // A quick double tap on an answer (誤タップ防止, user decision: the second tap is
  // ignored) records one answer and stays on that question's feedback. After the
  // first tap the verdict and feedback appear and the screen shifts, so the second
  // tap can land on another control (on this phone and question 「敵の反応を見る」,
  // which would skip the feedback; elsewhere 「英文を確認する」 or 「訳を見る」): it must
  // not act. The page's clock is held, so the two taps count as one double tap
  // however slow the machine.
  const question = await playUntil(page, (state) => state.activeBattle?.phase === "question" && state.activeBattle.roundIndex === 2);
  const answer = page.getByTestId("answer-C");
  await answer.scrollIntoViewIfNeeded();
  const box = (await answer.boundingBox())!;
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId("battle-feedback")).toBeVisible();
  const answered = await readSave(page);
  expect(answered.revision).toBe(question.revision + 1);
  expect(answered.activeBattle).toMatchObject({ phase: "feedback", roundIndex: question.activeBattle!.roundIndex });
  expect(answered.activeBattle!.answers).toHaveLength(question.activeBattle!.answers.length + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("[aria-expanded=true], details[open]")).toHaveCount(0);
  expect(JSON.parse((await allStorage(page))[learningKey()] ?? "{}").revealed ?? {}).toEqual({});
  // Taps after the double-tap window act again.
  await page.clock.fastForward(DOUBLE_TAP_WINDOW_MS);
  await page.clock.resume();
  const result = await playUntil(page, (state) => state.activeBattle?.phase === "result");
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  expect(result.activeBattle!.answers.length).toBeGreaterThan(0);
  expect(result.completedEpisodeIds).toEqual(["milano_duomo_episode"]);
  expect(result.ap).toBeGreaterThan(0);

  await ops.toFreeTime(page);
  await expect(page.getByLabel(`残り${result.ap}AP`)).toBeVisible();
  await expect(page.getByTestId("city-progress")).toContainText("観光 1 / 4");

  // A date costs AP when it starts and returns to the travel menu when it ends (docs/07 acceptance 3, 4).
  await ops.goTo(page, "p_novecento");
  await expect.poll(async () => (await readSave(page)).activeDate?.dateId).toBe("milano_novecento_date_01");
  const started = await readSave(page);
  expect(started.ap).toBeLessThan(result.ap);
  const finished = await playUntil(page, (state) => !state.activeDate);
  await expect(menu).toBeVisible();
  expect(finished.playedDateIds).toEqual(["milano_novecento_date_01"]);
  expect(finished.memories.length).toBeGreaterThan(0);
  expect(finished.ap).toBe(started.ap);
  expectNoActiveScene(finished);
  await expect(page.getByText("現在地：ノヴェチェント美術館")).toBeVisible();
  await expect(page.getByLabel(`残り${finished.ap}AP`)).toBeVisible();
});

// The journey's own transport modes (manifest transportModes): the route dialog names
// them with the line, the ride is paid and timed by its route, and the transition shows
// the mode's caption and art.
test("a new Milan journey rides tram 16 to the Last Supper, named in the route dialog and shown on the way", { tag: tier.gate }, async ({ page }) => {
  await page.clock.install();
  await ops.startJourney(page, "milano");
  const before = await readSave(page);
  await ops.goTo(page, "p_supper");
  await expect(page.getByRole("dialog", { name: "最後の晩餐へ" })).toBeVisible();
  await expect(ops.routeButton(page, "徒歩 19分")).toBeEnabled();
  const tram = ops.routeButton(page, "路面電車（16番） 18分 · €5");
  await expect(tram).toBeEnabled();
  // Hold the page's clock so the short transition (0.45 s with reduced motion) stays while it is checked.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await tram.click();
  const transition = page.getByTestId("travel-transition");
  await expect(transition).toHaveAttribute("data-mode", "tram");
  await expect(transition).toHaveAttribute("data-kind", "tram");
  await expect(transition.locator(".travel-transition-label")).toHaveText("路面電車で移動中");
  await expect(transition.locator(".is-tram svg")).toHaveCount(1);
  const arrived = await readSave(page);
  expect(arrived.revision).toBe(before.revision + 1);
  expect(arrived.travel).toMatchObject({ currentPlaceId: "p_supper", minute: before.travel.minute + 18 });
  expect(arrived.travelBudget).toBe(before.travelBudget - 5);
  await page.clock.resume();
  await expect(transition).toHaveCount(0);
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByText("現在地：最後の晩餐")).toBeVisible();
});

// Every available journey (from the generated catalog, Golden Triangle included with the
// modes it keeps while it waits for its switch): at the start, the first listed place that
// is reached on foot and by one of its vehicles (the city's travel data) and that the party
// can ride to now opens the route dialog with the vehicle named as its manifest declares it
// (nameJa), and the transition shows its caption (movingJa), ID and art kind.
test("in each available journey a new trip's first vehicle route is named and shown as its manifest declares", { tag: tier.gate }, async ({ page }) => {
  await page.clock.install();
  const journeys = journeyCatalog().journeys.filter((item) => item.status === "available" && item.transportModes.length);
  expect(journeys.map((journey) => journey.id)).toEqual(expect.arrayContaining(["milano", "golden_triangle"]));
  const pattern = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  await page.goto("/");
  for (const [index, journey] of journeys.entries()) {
    // The next journey from 設定 (a page load would resume the journey just played).
    if (index > 0) await (await ops.openSettings(page)).getByLabel("旅行編").selectOption(journey.id);
    await ops.beginJourney(page, journey.id);
    // Through the arrival, if the journey opens with one.
    await playUntil(page, (state) => state.activeEpilogue === null, { source: savedGame(journey.id) });
    await expect(page.getByTestId("travel-menu")).toBeVisible();
    const before = await readSave(page, journey.id);
    type Route = { fromPlaceId: string; toPlaceId: string; mode: string; minutes: number; cost: number };
    const travel = generated<{ events: { placeId: string }[]; routes: Route[] }>(`travel/${before.currentCityId}.json`);
    const modes = new Map(journey.transportModes.map((mode) => [mode.id, mode]));
    const from = before.travel.currentPlaceId;
    const routesTo = (to: string) => travel.routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === to);
    // One event at the place, so choosing it opens the route dialog (walk and a vehicle) at once.
    const targets = [...new Set(travel.events.map((event) => event.placeId))].filter((to) => to !== from &&
      travel.events.filter((event) => event.placeId === to).length === 1 &&
      routesTo(to).some((route) => route.mode === "walk") && routesTo(to).some((route) => modes.has(route.mode)));
    const more = page.getByText("ほかの行き先を見る", { exact: true });
    if (await more.isVisible()) await more.click();
    let ride: { route: Route; button: ReturnType<typeof ops.routeButton> } | undefined;
    for (const to of targets) {
      const place = page.getByTestId(`travel-place-${to}`);
      if (!(await place.count())) continue;
      await place.getByRole("button").click();
      await expect(page.getByRole("dialog")).toBeVisible();
      for (const route of routesTo(to).filter((item) => modes.has(item.mode))) {
        const button = ops.routeButton(page, pattern(modes.get(route.mode)!.nameJa));
        if (await button.isEnabled()) { ride = { route, button }; break; }
      }
      if (ride) break;
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
    }
    expect(ride, `${journey.id}: a listed place reached on foot and by a vehicle the party can take at the start`).toBeDefined();
    const { route, button } = ride!;
    const mode = modes.get(route.mode)!;
    test.info().annotations.push({ type: "ride", description: `${journey.id}: ${route.toPlaceId} by ${mode.id} (${mode.nameJa})` });
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
    await button.click();
    const transition = page.getByTestId("travel-transition");
    await expect(transition).toHaveAttribute("data-mode", mode.id);
    await expect(transition).toHaveAttribute("data-kind", mode.kind);
    await expect(transition.locator(".travel-transition-label")).toHaveText(mode.movingJa);
    // The ride took the route's time (the budget may also pay an admission at the place; the Milan test above pins a fare).
    const arrived = await readSave(page, journey.id);
    expect(arrived.travel).toMatchObject({ currentPlaceId: route.toPlaceId, minute: before.travel.minute + route.minutes });
    expect(arrived.travelBudget).toBeLessThanOrEqual(before.travelBudget - route.cost);
    await page.clock.resume();
    await expect(transition).toHaveCount(0);
  }
});
