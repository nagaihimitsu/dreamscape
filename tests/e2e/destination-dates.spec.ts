import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import { availableAp, choose, expectNoOverflow, finishEvent, loadCurrentFreeTime, loadCurrentGalleriaFreeTime, loadCurrentCompletedFreeTime, saved, selectTravelEvent, setDialogueSpeed, startNewGame } from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test.use({ reducedMotion: "reduce" });

test("places appear only after their sightseeing episodes", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  // Locations with other events can remain on the map, but the locked dates
  // themselves must not be offered until their sightseeing prerequisites.
  for (const placeId of ["p_scala", "p_brera"])
    await expect(page.getByTestId(`travel-place-${placeId}`)).toContainText("観光");
  const unlocked = await page.evaluate(async (ids) => {
    const travelPath = "/src/domain/travel-game.ts";
    const { isTravelEventUnlocked } = await import(/* @vite-ignore */ travelPath);
    const state = JSON.parse(localStorage.getItem("dreamscape.save.v1")!);
    return ids.map((id) => isTravelEventUnlocked(state, id));
  }, ["milano_la_scala_date_01", "milano_brera_date_01", "milano_navigli_date_01"]);
  expect(unlocked).toEqual([false, false, false]);
  const current = await saved(page);
  expect(current.completedEpisodeIds).toEqual(["milano_duomo_episode"]);
  // After Galleria, use a valid low-AP state with an earlier date completed:
  // rain and recovery can coexist, while the city-clear date stays locked.
  await loadCurrentGalleriaFreeTime(page);
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.ap = 0;
    state.pendingApRewards = [];
    if (!state.playedDateIds.includes("milano_walk_01")) state.playedDateIds.push("milano_walk_01");
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await page.getByTestId("travel-place-p_galleria").getByRole("button").click();
  const events = page.getByRole("dialog", { name: "ガッレリアのイベント" });
  await expect(events).toBeVisible();
  await expect(events.getByTestId("travel-event-milano_rain_pause_01")).toBeVisible();
  await expect(events.getByTestId("travel-event-milano_city_date_01")).toHaveCount(0);
  await events.getByRole("button", { name: "閉じる", exact: true }).click();
  await expectNoOverflow(page);
});

test("three destination dates work from a completed current journey on a phone", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadCurrentCompletedFreeTime(page);
  const initial = await saved(page);
  const places = [
    { id: "milano_la_scala_date_01", name: "スカラ座", cost: 2, photo: "la_scala.webp", emotion: "smile" },
    { id: "milano_brera_date_01", name: "ブレラ絵画館", cost: 2, photo: "brera.webp", emotion: "neutral" },
    { id: "milano_navigli_date_01", name: "ナヴィリオ地区", cost: 1, photo: "navigli.webp", emotion: "neutral" },
  ];
  for (const place of places) {
    const before = await saved(page);
    await selectTravelEvent(page, place.id);
    const travel = page.getByRole("dialog", { name: /へ$/ });
    if (await travel.isVisible()) await travel.getByRole("button", { name: /^徒歩 / }).click();
    await expect.poll(async () => (await saved(page)).activeDate?.dateId).toBe(place.id);
    const active = await saved(page);
    expect(availableAp(active)).toBe(availableAp(before) - place.cost);
    const scene = page.getByTestId("romance-scene");
    await expect(scene.getByTestId("date-destination")).toHaveText(`ミラノ ／ ${place.name}`);
    // A licensed photo identifies the place; neutral remains the failure fallback.
    const background = scene.locator(".canal-scene");
    await expect(background).toHaveAttribute("data-fallback", "neutral");
    await expect(background.locator("svg")).toHaveCount(0);
    const photo = background.locator("img");
    await expect(photo).toHaveAttribute("src", new RegExp(`${place.photo.replace(".", "\\.")}$`));
    await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 640 });
      await expectNoOverflow(page);
      await expect(scene.getByTestId("date-destination")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${place.id}-${width}.png`) });
    }
    await page.reload();
    expect(await saved(page)).toEqual(active);
    await expect(scene.getByTestId("date-destination")).toHaveText(`ミラノ ／ ${place.name}`);
    await setDialogueSpeed(page, "0");
    await choose(page, 0);
    expect((await saved(page)).activeDate?.frame.emotion).toBe(place.emotion);
    const portrait = scene.locator(".vn-character > img");
    await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${place.emotion}\\.png$`));
    const selected = await saved(page);
    await page.reload();
    expect(await saved(page)).toEqual(selected);
    await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${place.emotion}\\.png$`));
    await choose(page, 1);
    await finishEvent(page, 2);
    const finished = await saved(page);
    expect(finished.playedDateIds).toContain(place.id);
    // Shared response memories are deduplicated across dates; each location
    // still contributes its own second-choice memory.
    expect(finished.memories.length).toBeGreaterThan(before.memories.length);
    for (const memory of before.memories) expect(finished.memories).toContain(memory);
    expect(finished.endingReached).toBe(initial.endingReached);
    const isHidden = await page.evaluate(async (id) => {
      const visibilityPath = "/src/features/journey/travel-visibility.ts";
      const contentPath = "/src/content/index.ts";
      const { showTravelEvent } = await import(/* @vite-ignore */ visibilityPath);
      const { getCityContent } = await import(/* @vite-ignore */ contentPath);
      const state = JSON.parse(localStorage.getItem("dreamscape.save.v1")!);
      const event = getCityContent("milano").travel.events.find((item: { id: string }) => item.id === id);
      return event && !showTravelEvent(state, event);
    }, place.id);
    expect(isHidden).toBe(true);
    await page.reload();
    expect(await saved(page)).toEqual(finished);
  }
  const final = await saved(page);
  expect(final.completedEpisodeIds).toEqual(initial.completedEpisodeIds);
  expect(final.completedCityIds).toEqual(initial.completedCityIds);
  expect(final.battleRecords).toEqual(initial.battleRecords);
  expect(final.confessionStatus).toBe(initial.confessionStatus);
  expect(availableAp(final)).toBe(availableAp(initial) - 5);
});
