import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_duomo_B1.json" with { type: "json" };
import { playBattle } from "./battle-helpers";
import { loadCurrentScene } from "./current-scenarios";
import { choose, expectNoOverflow, finishEvent, loadCurrentGalleriaFreeTime, saved, setDialogueSpeed, startGuideBattle, startNewGame } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("map and five destinations fit in the initial phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  for (const size of [{ width: 320, height: 740 }, { width: 360, height: 780 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(size);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator(".journey-bar").getByText("待機", { exact: true })).toBeVisible();
    await expect(page.locator(".journey-bar").getByRole("button", { name: "滞在先で休む" })).toBeVisible();
    await expect(page.locator(".journey-bar").getByTestId("city-progress")).toContainText("観光 0 / 4");
    const destinations = page.getByTestId("travel-menu").locator(":scope > .travel-list > .travel-destination");
    await expect(destinations).toHaveCount(5);
    const map = await page.getByTestId("travel-map-canvas").boundingBox();
    const more = await page.getByText("ほかの行き先を見る", { exact: true }).boundingBox();
    expect(map).not.toBeNull();
    expect(more).not.toBeNull();
    expect(map!.y).toBeGreaterThanOrEqual(0);
    expect(more!.y + more!.height).toBeLessThanOrEqual(size.height);
    await expectNoOverflow(page);
  }
});

test("a phone journey saves transport, completes a battle, starts a date and rests", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.getByRole("heading", { name: "ふたりの自由時間" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "どこへ行く？" })).toHaveCount(0);
  await expect(page.getByTestId("city-progress")).toContainText("観光 0 / 4");
  const records = page.getByRole("button", { name: "観光地・発見・戦績を見る" });
  await expect(page.locator(".journey-bar")).toContainText("観光 0 / 4");
  await records.click();
  await expect(page.getByTestId("city-stop-milano_duomo_episode")).toBeVisible();
  await page.getByRole("dialog", { name: "旅の記録" }).getByRole("button", { name: "閉じる", exact: true }).click();
  expect((await saved(page)).travel).toMatchObject({ currentPlaceId: "p_hotel", day: 1, minute: 540 });
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await expect(page.getByTestId("travel-menu").locator(":scope > .travel-list > .travel-destination")).toHaveCount(5);
  await expect(page.getByTestId("travel-menu")).not.toContainText("そこ、映っています");
  await expect(page.getByTestId("travel-menu")).not.toContainText("二人の後ろで、見知らぬ人が同じ動きを繰り返している。");
  await page.locator(".travel-map-places > summary").click();
  await page.getByRole("combobox", { name: "地点", exact: true }).selectOption("p_duomo");
  await expect(page.getByTestId("travel-map")).toContainText("ドゥオモ");
  await expectNoOverflow(page);
  await page.getByTestId("travel-destination-milano_duomo_episode").getByRole("button").click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  const arrived = await saved(page);
  expect(arrived.travel).toMatchObject({ currentPlaceId: "p_duomo", day: 1, minute: 547 });
  await page.reload();
  expect((await saved(page)).travel).toEqual(arrived.travel);
  await startGuideBattle(page);
  await setDialogueSpeed(page, "0");
  await playBattle(page, quiz.questions, [true, true, true]);
  const completed = await saved(page);
  expect(completed.completedEpisodeIds).toContain("milano_duomo_episode");
  expect(completed.travel.minute).toBe(622);
  expect(completed.ap).toBeGreaterThan(0);
  await page.getByRole("button", { name: "自由時間へ進む" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();

  // This destination has both walking and rail. Its transport choices must
  // appear in the viewport immediately, without changing the saved game.
  const supper = page.getByTestId("travel-destination-milano_last_supper_episode");
  if (!(await supper.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
  await supper.scrollIntoViewIfNeeded();
  const beforeChoice = await saved(page);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await supper.getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /へ$/ });
  await expect(dialog).toBeVisible();
  const walkOption = dialog.getByRole("button", { name: /^徒歩 / });
  const railOption = dialog.getByRole("button", { name: /^鉄道・地下鉄 / });
  await expect(walkOption).toBeVisible();
  await expect(railOption).toBeVisible();
  for (const option of [walkOption, railOption]) {
    const bounds = await option.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(780);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  await dialog.getByRole("button", { name: "閉じる" }).click();
  expect(await saved(page)).toEqual(beforeChoice);

  await page.getByTestId("travel-destination-milano_walk_01").getByRole("button").click();
  const during = await saved(page);
  expect(during.activeDate?.dateId).toBe("milano_walk_01");
  expect(during.ap).toBe(beforeChoice.ap - 3);
  expect(during.travel.minute).toBe(beforeChoice.travel.minute);
  await page.reload();
  expect((await saved(page)).travel).toEqual(during.travel);
  await choose(page, 0);
  await choose(page, 1);
  await finishEvent(page, 2);
  const afterDate = await saved(page);
  expect(afterDate.travel.minute).toBe(682);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 7分 · €0/ }).click();
  const afterSleep = await saved(page);
  expect(afterSleep.travel).toMatchObject({ currentPlaceId: "p_hotel", day: 2, minute: 540 });
  expect(afterSleep.ap).toBe(afterDate.ap);
  await expectNoOverflow(page);
});

test("the compact map and free return work on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await startNewGame(page);
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await page.locator(".travel-map-places > summary").click();
  await page.getByRole("combobox", { name: "地点", exact: true }).selectOption("p_duomo");
  await expect(page.getByTestId("travel-map")).toContainText("ドゥオモ");
  await expect(page.getByRole("button", { name: "地図を大きくする" })).toHaveCount(0);
  await expectNoOverflow(page);
  await expect(page.getByRole("button", { name: "30分待つ" })).toBeHidden();
  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
  expect((await saved(page)).travel.minute).toBe(570);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await expect(page.getByText(/宿泊費は€/)).toBeVisible();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  const rested = await saved(page);
  expect(rested.travel).toMatchObject({ currentPlaceId: "p_hotel", day: 2, minute: 540 });
  expect(rested.ap).toBe(0);
  await page.reload();
  expect((await saved(page)).travel).toEqual(rested.travel);
  await expectNoOverflow(page);
});

test("an unavailable destination explains why without spending resources", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadCurrentScene(page, "freeTimeEarly");
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.ap = 0;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await page.getByText("ほかの行き先を見る", { exact: true }).click();
  const destination = page.getByTestId("travel-destination-milano_walk_01");
  await destination.scrollIntoViewIfNeeded();
  const before = await saved(page);
  await destination.getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /へ$/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: /^徒歩 / })).toBeDisabled();
  await expect(dialog.locator(".fine-print")).not.toBeEmpty();
  await dialog.getByRole("button", { name: "閉じる" }).click();
  expect(await saved(page)).toEqual(before);
});

test("destinations appear only once their journey conditions are met", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  const scalaDate = page.getByTestId("travel-destination-milano_la_scala_date_01");
  const finale = page.getByTestId("travel-destination-milano_finale");
  const pradaDate = page.getByTestId("travel-destination-milano_fondazione_prada_date_01");
  await expect(scalaDate).toHaveCount(0);
  await expect(finale).toHaveCount(0);
  await expect(pradaDate).toHaveCount(0);
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await page.locator(".travel-map-places > summary").click();
  await expect(page.getByRole("combobox", { name: "地点", exact: true }).locator('option[value="p_prada"]')).toHaveCount(0);
  await page.getByRole("combobox", { name: "地点", exact: true }).selectOption("p_scala");
  await expect(page.getByTestId("travel-map")).toContainText("スカラ座前");
  await expect(page.getByTestId("travel-map")).not.toContainText("故意のアンコール");

  // La Scala is already a main destination, but its date only appears after Galleria.
  await loadCurrentGalleriaFreeTime(page);
  const other = page.getByText("ほかの行き先を見る", { exact: true });
  if (await other.isVisible()) await other.click();
  await expect(scalaDate).toBeVisible();
  await expect(finale).toHaveCount(0);
  await expect(pradaDate).toHaveCount(0);

  // The completed-journey fixture unlocks both the finale and the Prada date.
  await loadCurrentScene(page, "freeTime");
  const finalOther = page.getByText("ほかの行き先を見る", { exact: true });
  if (await finalOther.isVisible()) await finalOther.click();
  await expect(finale).toBeVisible();
  await expect(pradaDate).toBeVisible();
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await page.locator(".travel-map-places > summary").click();
  await expect(page.getByRole("combobox", { name: "地点", exact: true }).locator('option[value="p_prada"]')).toHaveCount(1);
});

test("visited destinations remain on the map after their date is completed", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const debugUrl = "/src/dev/debug-state.ts";
    const gameUrl = "/src/domain/game.ts";
    const { createDebugState } = await import(debugUrl);
    const { advanceDate, chooseDate, finishDate } = await import(gameUrl);
    let state = createDebugState({ scene: "date", id: "milano_fondazione_prada_date_01", progress: "completed", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
    for (let step = 0; state.activeDate; step++) {
      if (step > 100) throw new Error("date did not finish");
      const frame = state.activeDate.frame;
      state = frame.ended ? finishDate(state, state.revision)
        : frame.choices.length ? chooseDate(state, 0, state.revision)
          : advanceDate(state, state.revision);
    }
    localStorage.setItem("dreamscape.save.v1", JSON.stringify(state));
  });
  await page.reload();
  await expect(page.getByTestId("travel-destination-milano_fondazione_prada_date_01")).toHaveCount(0);
  await expect(page.getByTestId("travel-map-canvas")).toBeVisible();
  await page.locator(".travel-map-places > summary").click();
  const places = page.getByRole("combobox", { name: "地点", exact: true });
  await expect(places.locator('option[value="p_prada"]')).toHaveCount(1);
  await places.selectOption("p_prada");
  await expect(page.getByTestId("travel-map")).toContainText("プラダ財団");
});

test("separate dates at the same place remain distinguishable without story titles", async ({ page }) => {
  await loadCurrentScene(page, "freeTime");
  const other = page.getByText("ほかの行き先を見る", { exact: true });
  if (await other.isVisible()) await other.click();
  const first = page.getByTestId("travel-destination-milano_cafe_01");
  const second = page.getByTestId("travel-destination-milano_starbucks_roastery_date_01");
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  await expect(first).toContainText("ロースタリー");
  await expect(second).toContainText("ロースタリー");
  await expect(first).toContainText("デート1");
  await expect(second).toContainText("デート2");
  await expect(first).not.toContainText("冷めてからが本番");
  await expect(second).not.toContainText("買わないおみやげ");
});

test("choosing rail in the transport dialog starts the trip once", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  // Put a valid idle test state at Duomo, where both rail and walking are
  // registered for the Last Supper. The trip itself uses the normal UI.
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.travel.currentPlaceId = "p_duomo";
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  const destination = page.getByTestId("travel-destination-milano_last_supper_episode");
  if (!(await destination.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
  await destination.getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /へ$/ });
  const rail = dialog.getByRole("button", { name: /^鉄道・地下鉄 / });
  await expect(rail).toBeVisible();
  await expect(rail).toBeEnabled();
  const before = await saved(page);
  await rail.click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("last_supper");
  const arrived = await saved(page);
  expect(arrived.travel.currentPlaceId).toBe("p_supper");
  expect(arrived.travel.minute).toBe(before.travel.minute + 20);
  expect(arrived.travelBudget).toBe(before.travelBudget - 5);
  await page.reload();
  expect((await saved(page)).travel).toEqual(arrived.travel);
  expect((await saved(page)).travelBudget).toBe(arrived.travelBudget);
});

test("all five transport choices fit on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await loadCurrentScene(page, "freeTime");
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.travel.currentPlaceId = "p_duomo";
    state.travel.minute = 600;
    state.travel.returnReserve = 0;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  const destination = page.getByTestId("travel-destination-milano_fondazione_prada_date_01");
  if (!(await destination.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
  await destination.getByRole("button").click();
  const dialog = page.getByRole("dialog", { name: /へ$/ });
  await expect(dialog).toBeVisible();
  for (const name of [/^徒歩 /, /^鉄道・地下鉄 /, /^路面電車 /, /^バス /, /^タクシー /]) {
    const option = dialog.getByRole("button", { name });
    await expect(option).toBeVisible();
    await expect(option).toBeEnabled();
    const bounds = await option.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(740);
  }
});
