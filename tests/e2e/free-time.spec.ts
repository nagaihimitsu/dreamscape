import { devModules, expect, ops, readSave, test, tier, type Locator, type Page } from "./helpers";

// Free time's row of photo cards and its expanded map (B案, docs/02 「街歩きの画面」), after the phone UI audit of
// 2026-11-14: a new day starts at the first place (a habitual swipe up must never wait or rest again by yesterday's
// choice), 「待機」's waits and 「ホテルに戻る」's ways home are chips that only choose (one is a line), and the expanded
// map opens on the selection with its 「行く」 pinned at its foot and the shared 「× 閉じる」 at its top.

/** The row's first place card (photo-cards.ts defaultCardIndex: the card after 「待機」). */
const firstPlace = (menu: Locator) => menu.locator('li[data-testid^="travel-place-"]').first();

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("not shown");
  return found;
}

/** The centre of `inner` lies inside `outer`. */
async function centreInside(inner: Locator, outer: Locator) {
  const [a, b] = [await box(inner), await box(outer)];
  const x = a.x + a.width / 2;
  const y = a.y + a.height / 2;
  return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
}

async function openMap(page: Page): Promise<Locator> {
  await page.getByRole("button", { name: "地図を大きく見る" }).click();
  const dialog = page.getByRole("dialog", { name: /の地図$/u });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("the morning after a rest starts at the first place, with the first wait and the fastest way home", { tag: tier.gate }, async ({ page }) => {
  test.setTimeout(90_000);
  await ops.startJourney(page);
  const menu = page.getByTestId("travel-menu");
  const first = firstPlace(menu);
  await expect(first).toHaveAttribute("data-selected", "true");
  const firstId = (await first.getAttribute("data-testid"))!.slice("travel-place-".length);

  // 「待機」: its two waits are chips, 「30分待つ」 chosen (✓) first; a press chooses the other. Pressed again, the chosen one
  // nudges the photo card's swipe cue (the swipe up is what waits: the chip only chooses).
  await menu.getByTestId("travel-wait").getByRole("button").first().click();
  const wait = menu.getByTestId("wait-card");
  const waits = wait.getByRole("group", { name: "待ち方" }).getByRole("button");
  await expect(waits).toHaveCount(2);
  await expect(waits.first()).toHaveAttribute("aria-pressed", "true");
  await expect(waits.first()).toContainText("✓30分待つ");
  await waits.last().click();
  await expect(waits.last()).toHaveAttribute("aria-pressed", "true");
  await expect(waits.first()).not.toContainText("✓");
  await waits.last().click();
  await expect(menu.getByTestId("travel-wait").locator(".photo-card")).toHaveAttribute("data-nudge", "");
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  expect((await readSave(page)).travel.minute, "a press on a chip never waits").toBe(540);

  // 「ホテルに戻る」 at the hotel: its one way home is a line, not a button.
  await menu.getByTestId("travel-stay").getByRole("button").first().click();
  const stay = menu.getByTestId("stay-card");
  await expect(stay.getByTestId("travel-sleep-route-walk")).toHaveText("ホテルに戻って休む");
  expect(await stay.getByTestId("travel-sleep-route-walk").evaluate((element) => element.tagName)).toBe("P");

  // Rest; the next morning the row is back on the first place (not on 「ホテルに戻る」, whose swipe would rest again), and
  // 「待機」 offers 「30分待つ」 first again.
  const before = await readSave(page);
  await ops.sleep(page);
  await expect(page.getByTestId("time-passage")).toHaveCount(0, { timeout: 15_000 });
  await expect.poll(async () => (await readSave(page)).travel).toMatchObject({ day: before.travel.day + 1, minute: 540 });
  await expect(first).toHaveAttribute("data-selected", "true");
  await expect(menu.getByTestId("travel-stay")).not.toHaveAttribute("data-selected");
  await expect(menu.getByTestId("place-card")).toHaveAttribute("data-place-id", firstId);
  await expect(menu.getByTestId("stay-card")).toHaveCount(0);
  await menu.getByTestId("travel-wait").getByRole("button").first().click();
  await expect(waits.first()).toHaveAttribute("aria-pressed", "true");
});

test("at 320×568 the expanded map opens on the selected place, keeps 「行く」 in view and closes from its title band", { tag: tier.gate }, async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await ops.startJourney(page);
  const menu = page.getByTestId("travel-menu");
  const firstId = (await firstPlace(menu).getAttribute("data-testid"))!.slice("travel-place-".length);
  const dialog = await openMap(page);
  const frame = dialog.getByTestId("travel-map-expanded-canvas");
  // The selected place (the row's chosen card) and the current place are on the map as it opens.
  const selected = dialog.getByTestId(`map-marker-${firstId}`);
  await expect(selected).toHaveAttribute("data-selected", "true");
  await expect.poll(() => centreInside(selected, frame)).toBe(true);
  await expect.poll(() => centreInside(dialog.getByTestId("map-marker-p_hotel"), frame)).toBe(true);
  // The bar at the dialog's foot names it and its way, with 「行く」 in view.
  const bar = dialog.getByTestId("map-selection");
  await expect(bar).toContainText(/徒歩 約\d+分/u);
  await expect(bar.getByRole("button", { name: "行く" })).toBeInViewport();
  // Another place chosen by name: the bar follows; the header's 「閉じる」 closes the map and the row turns to that place.
  await dialog.getByLabel("地点を名前で探す").selectOption("p_castello");
  await expect(bar).toContainText("スフォルツェスコ城");
  await expect(bar.getByRole("button", { name: "行く" })).toBeInViewport();
  await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(menu.getByTestId("travel-place-p_castello")).toHaveAttribute("data-selected", "true");

  // The bar's 「行く」 goes, as the photo card's swipe does: the map closes and the Duomo's guide opens.
  await ops.goToFromMap(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

// The night screen's 「ホテルで休む」 (docs/02 「一日の終わり」, 2026-11-15): 「ホテルで休みました。」 waits for a tap, and the header keeps
// the night's clock (its day and moon) until then; the tap brings the morning's.
test("after the night screen's rest the header keeps the night's clock until the tap", { tag: tier.gate }, async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  // Agra at 21:00 at the inn with its day tour booked: a night action is open, so the night screen shows.
  const placed = await page.evaluate(async ({ modules }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const booked = builders.bookTour(builders.cityStart("agra", ["航", "澪"]), "gt_agra_tour_fatehpur_sikri");
    const night = { ...booked, travel: { ...booked.travel, currentPlaceId: booked.travel.hotelPlaceId, minute: 21 * 60 } };
    return saveGame(journeyStorage(localStorage, "golden_triangle"), night);
  }, { modules: devModules });
  expect(placed).toEqual({ ok: true });
  await page.reload();
  await ops.chooseJourney(page, "golden_triangle");
  await expect(page.getByTestId("night-screen")).toBeVisible();
  const clock = page.getByTestId("journey-context");
  await expect(clock).toContainText(/1日目.*21:00/u);
  await expect(page.locator("html[data-tap-hold]")).toHaveCount(0);
  await page.getByTestId("night-action-rest").click();
  const leaving = page.getByTestId("night-leaving");
  await expect(leaving).toBeVisible();
  // The save already holds the morning; the header still shows the night.
  await expect.poll(async () => (await readSave(page, "golden_triangle")).travel.day).toBe(2);
  await expect(clock).toContainText(/1日目.*21:00/u);
  await expect(clock).not.toContainText("09:00");
  await expect(page.locator("html[data-tap-hold]")).toHaveCount(0);
  await leaving.click();
  await expect(leaving).toHaveCount(0);
  await expect(clock).toContainText("2日目");
});
