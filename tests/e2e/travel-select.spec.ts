import type { GameState } from "../../src/domain/game";
import { devModules, expect, generated, ops, playUntil, readSave, savedGame, test, tier, type Locator, type Page } from "./helpers";

// The two-step destination selection (UI redesign §3.5, step 1.6): the first press on a
// destination's name (or its marker, or 休む) shows it on the map and selects it; the second
// press on the same name goes when there is one way; otherwise the choices show inside the
// row (or the band) and one of them goes. Nothing opens a window: every test but the expanded
// map's checks that no dialog is on the page after each step. The map's focus is instant
// with reduced motion (the phone project's default).

type Route = { fromPlaceId: string; toPlaceId: string; mode: string };
type Travel = { events: { id: string; placeId: string }[]; routes: Route[] };

const noWindow = (page: Page) => expect(page.getByRole("dialog")).toHaveCount(0);
const nameButton = (row: Locator) => row.getByRole("button").first();
async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not shown");
  return box;
}
const centre = (box: { x: number; y: number; width: number; height: number }) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });

/** A listed place (in the nearby list only, or also in the longer one) with one event and at least `modes` routes from the current place. */
async function listedPlace(page: Page, state: GameState, modes: number, nearbyOnly = false): Promise<string | undefined> {
  const travel = generated<Travel>(`travel/${state.currentCityId}.json`);
  const from = state.travel.currentPlaceId;
  const rows = page.getByTestId("travel-menu").locator('[data-testid^="travel-place-"]');
  const ids = await rows.evaluateAll((items, nearby) => items.filter((item) => !nearby || !item.closest("details"))
    .map((item) => item.getAttribute("data-testid")!.slice("travel-place-".length)), nearbyOnly);
  return ids.find((to) => travel.events.filter((event) => event.placeId === to).length === 1 &&
    travel.routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === to).length >= modes);
}

/** A new Golden Triangle journey, through its arrival, in free time. */
async function startGoldenTriangle(page: Page) {
  await page.goto("/");
  await ops.beginJourney(page, "golden_triangle");
  await playUntil(page, (state) => state.activeEpilogue === null, { source: savedGame("golden_triangle") });
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  return readSave(page, "golden_triangle");
}

test("one way: the first press shows the place on the map, the second goes", { tag: tier.gate }, async ({ page }) => {
  const travel = generated<Travel>("travel/milano.json");
  const fromHotel = travel.routes.filter((route) => route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo");
  expect(fromHotel.map((route) => route.mode), "p_duomo must stay one walking route from the hotel for this test (choose another place)").toEqual(["walk"]);
  await ops.startJourney(page);
  const before = await readSave(page);
  const row = await ops.selectDestination(page, "p_duomo");
  await noWindow(page);
  const marker = page.getByTestId("map-marker-p_duomo");
  await expect(marker).toHaveAttribute("data-selected", "true");
  await expect(marker).toHaveAccessibleName(/、選択中$/u);
  const markerAt = centre(await boxOf(marker));
  const frameAt = centre(await boxOf(page.getByTestId("travel-map-canvas")));
  expect(Math.abs(markerAt.x - frameAt.x)).toBeLessThanOrEqual(8);
  expect(Math.abs(markerAt.y - frameAt.y)).toBeLessThanOrEqual(8);
  await expect(row).toContainText("もう一度押すと出発");
  await expect(page.getByTestId("travel-announce")).toContainText("もう一度押すと出発します");
  // The row's button keeps its name; the selection is its description.
  await expect(nameButton(row)).toHaveAccessibleDescription(/選択中。.*もう一度押すと出発/u);
  const selected = await readSave(page);
  expect(selected.revision).toBe(before.revision);
  expect(selected.travel.currentPlaceId).toBe(before.travel.currentPlaceId);
  await expect(row).toHaveAttribute("data-armed", "true");
  await nameButton(row).click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
});

test("a double tap on a one-way row only selects it", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  const before = await readSave(page);
  await (await ops.destination(page, "p_duomo")).dblclick();
  await expect(page.getByTestId("travel-place-p_duomo")).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await noWindow(page);
  expect((await readSave(page)).revision).toBe(before.revision);
});

test("taps right after travel land on the travel transition, not on the scene that opens", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  const row = await ops.selectDestination(page, "p_duomo");
  await expect(row).toHaveAttribute("data-armed", "true");
  // The first click goes; the second lands on the transition (the guide's first line stays).
  const before = await readSave(page);
  await nameButton(row).dblclick();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await ops.settled(page);
  // The travel was the only change: a read-on would have saved another revision.
  expect((await readSave(page)).revision).toBe(before.revision + 1);
});

test("several modes show inside the row; a second press keeps them, a mode goes", { tag: tier.gate }, async ({ page }) => {
  // The page's clock from the start (installing it later would move the arming's time base).
  await page.clock.install();
  const start = await startGoldenTriangle(page);
  const placeId = await listedPlace(page, start, 2);
  expect(placeId, "a listed Golden Triangle place reached by two modes from the start").toBeDefined();
  const row = await ops.selectDestination(page, placeId!);
  const choices = page.getByTestId(`travel-choices-${placeId}`);
  await expect(choices).toBeVisible();
  await noWindow(page);
  await expect(row).toHaveAttribute("data-armed", "true");
  await nameButton(row).click();
  await expect(choices).toBeVisible();
  await noWindow(page);
  expect((await readSave(page, "golden_triangle")).revision).toBe(start.revision);
  await expect(row).toHaveAttribute("data-armed", "true");
  const ride = choices.locator('[data-testid^="travel-route-"]:not([data-testid$="-walk"]):enabled').first();
  const mode = (await ride.getAttribute("data-testid"))!.split("-").at(-1)!;
  await ops.holdClock(page);
  await ride.click();
  await expect(page.getByTestId("travel-transition")).toHaveAttribute("data-mode", mode);
  expect((await readSave(page, "golden_triangle")).travel.currentPlaceId).toBe(placeId);
  await page.clock.resume();
});

test("several events show inside the row: an event with one route goes, one with several opens its modes", { tag: tier.gate }, async ({ page }) => {
  await page.goto("/");
  // Milan cleared with 12 AP (lane 2, docs/10): the roastery has two dates, Navigli a closed date beside a date
  // reached by walking or taxi (destination-choices.test.ts keeps this state true).
  const placed = await page.evaluate(async (modules) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    return saveGame(journeyStorage(localStorage, "milano"), builders.withAp(builders.completedCity("milano"), 12));
  }, devModules);
  expect(placed).toEqual({ ok: true });
  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  const navigli = await ops.selectDestination(page, "p_navigli");
  const navigliChoices = page.getByTestId("travel-choices-p_navigli");
  await expect(navigliChoices.locator('[data-testid^="travel-event-"]')).toHaveCount(2);
  await expect(navigliChoices.locator('[data-testid^="travel-event-"]:disabled')).toHaveCount(1);
  await expect(navigli).toHaveAttribute("data-armed", "true");
  const open = navigliChoices.locator('[data-testid^="travel-event-"][aria-expanded]:enabled');
  await open.click();
  await expect(open).toHaveAttribute("aria-expanded", "true");
  await expect(navigliChoices.locator('[data-testid^="travel-route-"]')).toHaveCount(2);
  await noWindow(page);
  // Another place moves the selection; its event with one route goes.
  const roastery = await ops.selectDestination(page, "p_roastery");
  await expect(page.getByTestId("travel-choices-p_navigli")).toHaveCount(0);
  const events = page.getByTestId("travel-choices-p_roastery").locator('[data-testid^="travel-event-"]');
  await expect(events).toHaveCount(2);
  await expect(roastery).toHaveAttribute("data-armed", "true");
  await events.first().click();
  await expect(page.getByTestId("travel-menu")).toHaveCount(0);
  expect((await readSave(page)).travel.currentPlaceId).toBe("p_roastery");
});

test("an unavailable place is selected but never goes, and repeats its reason", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  const before = await readSave(page);
  const row = await ops.selectDestination(page, "p_castello");
  await expect(row).toContainText("今は行けません");
  await expect(page.getByTestId("map-marker-p_castello")).toHaveAttribute("data-selected", "true");
  await expect(row).toHaveAttribute("data-armed", "true");
  await nameButton(row).click();
  await expect(page.getByTestId("travel-announce")).toContainText("今は行けません");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await noWindow(page);
  expect((await readSave(page)).revision).toBe(before.revision);
});

test("a marker by keyboard selects the row and moves focus to it; Enter then goes, Space held never does", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  const before = await readSave(page);
  const row = page.getByTestId("travel-place-p_duomo");
  await page.getByTestId("map-marker-p_duomo").focus();
  await page.keyboard.down(" ");
  await page.waitForTimeout(500);
  await page.keyboard.up(" ");
  await expect(row).toHaveAttribute("data-selected", "true");
  await expect(nameButton(row)).toBeFocused();
  await page.waitForTimeout(400);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await readSave(page)).revision).toBe(before.revision);
  await noWindow(page);
  // Esc clears (focus on the row's name), then Enter on the marker selects again and Enter on the row goes.
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-selected]")).toHaveCount(0);
  await expect(page.getByTestId("travel-announce")).toContainText("選択を解除しました。");
  await expect(nameButton(row)).toBeFocused();
  await page.getByTestId("map-marker-p_duomo").focus();
  await page.keyboard.press("Enter");
  await expect(row).toHaveAttribute("data-selected", "true");
  await expect(nameButton(row)).toBeFocused();
  await expect(row).toHaveAttribute("data-armed", "true");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  // UI redesign §3.7 E: the new scene's visible heading takes the focus the row's name had,
  // with the two-tone ring after a key.
  await expect(ops.sceneLabel(page)).toBeFocused();
  await expect(ops.sceneLabel(page)).toHaveCSS("outline-style", "solid");
});

test.describe("at 320×568", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("a marker press never moves the map: unscrolled no page scroll, stuck the list scrolls to the row", { tag: tier.gate }, async ({ page }) => {
    await ops.startJourney(page);
    // Free time opens at the top of the page, not where the title's start button scrolled it (§3.7 E).
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const canvas = page.getByTestId("travel-map-canvas");
    const marker = page.getByTestId("map-marker-p_castello");
    const map = await boxOf(canvas);
    const scrolled = await page.evaluate(() => window.scrollY);
    // A tap at the marker's point (Playwright's own click would first scroll the marker out from
    // under the free-time scroll padding, which counts the stuck map: a finger does not).
    const tap = async () => { const at = centre(await boxOf(marker)); await page.mouse.click(at.x, at.y); };
    await tap();
    await expect(marker).toHaveAttribute("data-selected", "true");
    await expect(page.locator("details.travel-other")).toHaveAttribute("open", "");
    expect(await boxOf(canvas)).toEqual(map);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    await noWindow(page);
    // Clear, scroll until the map sticks, and press the marker again.
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.scrollTo(0, 120));
    const stuck = await boxOf(canvas);
    await tap();
    await expect(marker).toHaveAttribute("data-selected", "true");
    expect(await boxOf(canvas)).toEqual(stuck);
    const row = await boxOf(page.getByTestId("travel-place-p_castello"));
    const band = await boxOf(page.getByTestId("travel-actions"));
    expect(row.y).toBeGreaterThanOrEqual(stuck.y + stuck.height);
    expect(row.y + row.height).toBeLessThanOrEqual(band.y + 1);
  });

  test("no scroll under the finger: a row with modes stays put, its second press reveals them", { tag: tier.gate }, async ({ page }) => {
    const start = await startGoldenTriangle(page);
    const placeId = await listedPlace(page, start, 3, true);
    expect(placeId, "a Golden Triangle place in the nearby list with three modes").toBeDefined();
    const row = page.getByTestId(`travel-place-${placeId}`);
    // Its name button just above the band.
    const band = await boxOf(page.getByTestId("travel-actions"));
    const button = await boxOf(nameButton(row));
    await page.evaluate((by) => window.scrollBy(0, by), button.y + button.height - (band.y - 2));
    const pressed = await boxOf(nameButton(row));
    const point = { x: pressed.x + pressed.width / 2, y: pressed.y + pressed.height / 2 };
    const before = await readSave(page, "golden_triangle");
    await page.mouse.click(point.x, point.y);
    await expect(row).toHaveAttribute("data-selected", "true");
    // The button stays under the finger: its top, left and width do not move. It may grow
    // downwards (the selected badge can wrap a long name onto one more line with some fonts).
    const after = await boxOf(nameButton(row));
    expect({ x: after.x, y: after.y, width: after.width }).toEqual({ x: pressed.x, y: pressed.y, width: pressed.width });
    expect(after.y + after.height).toBeGreaterThan(point.y);
    await page.waitForTimeout(600);
    await page.mouse.click(point.x, point.y);
    await expect(page.getByTestId("travel-transition")).toHaveCount(0);
    expect((await readSave(page, "golden_triangle")).revision).toBe(before.revision);
    await expect(row).toHaveAttribute("data-selected", "true");
    await expect(page.getByTestId(`travel-choices-${placeId}`).locator('[data-testid^="travel-route-"]').first()).toBeInViewport();
    await noWindow(page);
  });
});

for (const viewport of [{ width: 320, height: 568 }, { width: 320, height: 460 }]) {
  test.describe(`at ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test("休む selects the hotel: the band grows with the way home, never over the map or its attribution, and 休む again sleeps", { tag: tier.gate }, async ({ page }) => {
      await ops.startJourney(page);
      const before = await readSave(page);
      const band = page.getByTestId("travel-actions");
      await band.getByRole("button", { name: "滞在先で休む" }).click();
      await expect(band.getByTestId("travel-sleep-choices")).toBeVisible();
      await expect(page.getByTestId(`map-marker-${before.travel.hotelPlaceId}`)).toHaveAttribute("data-selected", "true");
      await noWindow(page);
      const frame = await boxOf(page.getByTestId("travel-map-canvas"));
      const panel = await boxOf(band.getByTestId("travel-sleep-choices").locator(".."));
      expect(panel.y).toBeGreaterThanOrEqual(frame.y + frame.height - 0.5);
      const attribution = page.locator(".leaflet-control-attribution").first();
      await expect(attribution).toBeVisible();
      const at = centre(await boxOf(attribution));
      expect(await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest(".leaflet-control-attribution"), at)).toBe(true);
      // One panel at a time: opening 待機 clears 休む; 休む again selects it and closes 待機.
      await band.getByLabel("時間を進める").click();
      await expect(band).not.toHaveAttribute("data-selected");
      await expect(band.getByTestId("travel-sleep-choices")).toHaveCount(0);
      await band.getByRole("button", { name: "滞在先で休む" }).click();
      await expect(band.locator("details.travel-wait")).not.toHaveAttribute("open");
      await expect(band).toHaveAttribute("data-armed", "true");
      await band.getByRole("button", { name: "滞在先で休む" }).click();
      await expect(page.getByTestId("time-passage")).toBeVisible();
      await expect.poll(async () => (await readSave(page)).travel).toMatchObject({ day: before.travel.day + 1, minute: 540 });
    });
  });
}

test("the expanded map chooses the same way: the slot's row goes and the dialog closes", { tag: tier.gate }, async ({ page }) => {
  await ops.startJourney(page);
  await ops.goToFromMap(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Once more (a new journey from the title), choosing the place by 「地点を名前で探す」.
  await page.evaluate(() => localStorage.clear());
  await ops.startJourney(page);
  await page.getByRole("button", { name: "地図を大きく見る" }).click();
  const dialog = page.getByRole("dialog", { name: "ミラノの地図" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("地点を名前で探す").selectOption("p_duomo");
  const slotRow = dialog.getByTestId("map-selection").getByTestId("map-selection-place-p_duomo");
  await expect(slotRow).toHaveAttribute("data-selected", "true");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(slotRow).toHaveAttribute("data-armed", "true");
  await nameButton(slotRow).click();
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("at 320×568 the expanded map shows the slot and the map's attribution", { tag: tier.gate }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await ops.startJourney(page);
  await ops.selectDestination(page, "p_duomo");
  await page.getByRole("button", { name: "地図を大きく見る" }).click();
  const dialog = page.getByRole("dialog", { name: "ミラノの地図" });
  await expect(dialog.getByTestId("map-selection-place-p_duomo")).toBeInViewport();
  const attribution = dialog.locator(".leaflet-control-attribution");
  await expect(attribution).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("expanded-320x568.png") });
});
