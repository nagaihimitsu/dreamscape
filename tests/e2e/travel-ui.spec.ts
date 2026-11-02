import { expect, test } from "@playwright/test";
import quiz from "../../content/quizzes/sound_duomo_B1.json" with { type: "json" };
import { playBattle } from "./battle-helpers";
import { loadCurrentScene } from "./current-scenarios";
import { choose, expectNoOverflow, finishEvent, saved, setDialogueSpeed, startNewGame } from "./helpers";

test.use({ reducedMotion: "reduce" });

test("a phone journey saves transport, completes a battle, starts a date and rests", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect((await saved(page)).travel).toMatchObject({ currentPlaceId: "p_hotel", day: 1, minute: 540 });
  await expect(page.getByTestId("travel-destination-milano_brera_c01")).toContainText("終了 19:15まで");
  await expect(page.getByTestId("travel-destination-milano_brera_c01")).not.toContainText("終了 00:00");
  await page.getByText("ミラノの地図を見る").click();
  await page.getByLabel("地点を選ぶ").selectOption("p_roastery");
  await expect(page.getByTestId("travel-map")).toContainText("ロースタリー");
  await expectNoOverflow(page);
  await page.getByTestId("travel-destination-milano_duomo_episode").getByRole("button").click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  const arrived = await saved(page);
  expect(arrived.travel).toMatchObject({ currentPlaceId: "p_duomo", day: 1, minute: 547 });
  await page.reload();
  expect((await saved(page)).travel).toEqual(arrived.travel);
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
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
  await page.getByText("ミラノの地図を見る").click();
  await page.getByLabel("地点を選ぶ").selectOption("p_roastery");
  await expect(page.getByTestId("travel-map")).toContainText("ロースタリー");
  await expect(page.getByRole("button", { name: "地図を大きくする" })).toHaveCount(0);
  await expectNoOverflow(page);
  await expect(page.getByRole("button", { name: "30分待つ" })).toBeHidden();
  await page.getByText("時間を進める", { exact: true }).click();
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
  await startNewGame(page);
  await page.getByText("ほかの行き先を見る", { exact: true }).click();
  const destination = page.getByTestId("travel-destination-milano_fondazione_prada_date_01");
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
