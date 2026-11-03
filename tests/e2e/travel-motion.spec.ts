import { expect, test, type Page } from "@playwright/test";
import { SAVE_KEY, saved, selectTravelEvent, startNewGame } from "./helpers";

test.use({ reducedMotion: "no-preference" });

// Milan does not have every transport type between the hotel and Duomo. Add
// routes only in the browser so the production travel flow can exercise them.
async function addTestRoutes(page: Page) {
  await page.evaluate(async () => {
    const contentPath = "/src/content/index.ts";
    const { getCityContent } = await import(/* @vite-ignore */ contentPath);
    const { routes } = getCityContent("milano").travel;
    const walk = routes.find((route: { fromPlaceId: string; toPlaceId: string; mode: string }) =>
      route.fromPlaceId === "p_hotel" && route.toPlaceId === "p_duomo" && route.mode === "walk");
    if (!walk) throw new Error("Missing walking route fixture");
    for (const mode of ["rail", "bus", "tram", "taxi"]) {
      routes.push({ ...walk, mode, minutes: 15, cost: 3 });
    }
  });
  // Trigger a render so destination options reflect the temporary routes.
  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
}

test("walking to a destination plays once and the saved arrival survives reload", async ({ page }) => {
  await startNewGame(page);
  await selectTravelEvent(page, "milano_duomo_episode");
  const transition = page.getByTestId("travel-transition");
  await expect(transition).toBeVisible();
  await expect(transition).toHaveAttribute("data-mode", "walk");
  const arrival = await saved(page);
  expect(arrival.travel).toMatchObject({ day: 1, minute: 547, currentPlaceId: "p_duomo" });
  expect(arrival.travelBudget).toBe(60);
  expect(arrival.activeTourism).toBeTruthy();
  await expect(transition).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).travel).toEqual(arrival.travel);
  expect((await saved(page)).travelBudget).toBe(arrival.travelBudget);
  await expect(transition).toHaveCount(0);
});

for (const [mode, label] of [["rail", "鉄道・地下鉄"], ["bus", "バス"], ["tram", "路面電車"], ["taxi", "タクシー"]] as const) {
  test(`${label} travel shows its own motion and charges once`, async ({ page }) => {
    await startNewGame(page);
    await addTestRoutes(page);
    await page.getByTestId("travel-place-p_duomo").getByRole("button").click();
    const route = page.getByRole("dialog", { name: /へ$/ }).getByRole("button", { name: `${label} 15分 · €3` });
    await expect(route).toBeEnabled();
    // Two immediate activations must not charge or advance time twice.
    await route.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    const transition = page.getByTestId("travel-transition");
    await expect(transition).toBeVisible();
    await expect(transition).toHaveAttribute("data-mode", mode);
    const arrival = await saved(page);
    expect(arrival.travel).toMatchObject({ day: 1, minute: 585, currentPlaceId: "p_duomo" });
    expect(arrival.travelBudget).toBe(57);
    expect(arrival.activeTourism).toBeTruthy();
    await expect(transition).toHaveCount(0);
    await page.reload();
    expect((await saved(page)).travel).toEqual(arrival.travel);
    expect((await saved(page)).travelBudget).toBe(57);
  });
}

test("waiting, cancelling, and resting at the hotel do not show travel motion", async ({ page }) => {
  await startNewGame(page);
  const transition = page.getByTestId("travel-transition");
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("dialog", { name: "滞在先で休む" }).getByRole("button", { name: "閉じる" }).click();
  await expect(transition).toHaveCount(0);
  await page.getByText("待機", { exact: true }).click();
  await page.getByRole("button", { name: "30分待つ" }).click();
  await expect(transition).toHaveCount(0);
  await expect(page.getByTestId("time-passage")).toHaveCount(0);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /徒歩 0分 · €0/ }).click();
  await expect(transition).toHaveCount(0);
  await expect(page.getByTestId("time-passage")).toBeVisible();
  expect((await saved(page)).travel).toMatchObject({ day: 2, minute: 540, currentPlaceId: "p_hotel" });
});

test("returning to the hotel plays travel before the next-day effect", async ({ page }) => {
  await startNewGame(page);
  await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.travel.currentPlaceId = "p_duomo";
    localStorage.setItem(key, JSON.stringify(state));
  }, SAVE_KEY);
  await page.reload();
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("dialog", { name: "滞在先で休む" }).getByRole("button", { name: /徒歩 7分 · €0/ }).click();
  const transition = page.getByTestId("travel-transition");
  const nextDay = page.getByTestId("time-passage");
  await expect(transition).toBeVisible();
  await expect(transition).toHaveAttribute("data-mode", "walk");
  await expect(nextDay).toHaveCount(0);
  const rested = await saved(page);
  expect(rested.travel).toMatchObject({ day: 2, minute: 540, currentPlaceId: "p_hotel" });
  expect(rested.travelBudget).toBe(50);
  await expect(transition).toHaveCount(0);
  await expect(nextDay).toBeVisible();
  await expect(nextDay).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).travel).toEqual(rested.travel);
  expect((await saved(page)).travelBudget).toBe(50);
  await expect(transition).toHaveCount(0);
  await expect(nextDay).toHaveCount(0);
});

test("a stale tab cannot play a movement for a rejected save", async ({ page, context }) => {
  await startNewGame(page);
  const other = await context.newPage();
  await other.goto("/");
  await other.getByText("待機", { exact: true }).click();
  await other.getByRole("button", { name: "30分待つ" }).click();
  await expect.poll(async () => (await saved(other)).travel.minute).toBe(570);
  await selectTravelEvent(page, "milano_duomo_episode");
  await expect(page.getByTestId("travel-transition")).toHaveCount(0);
  const state = await saved(page);
  expect(state.travel).toMatchObject({ day: 1, minute: 570, currentPlaceId: "p_hotel" });
  expect(state.travelBudget).toBe(60);
});

for (const setting of ["system", "game"] as const) {
  test(`${setting} reduced motion keeps the travel scene still and closes it`, async ({ page }) => {
    if (setting === "system") await page.emulateMedia({ reducedMotion: "reduce" });
    await startNewGame(page);
    if (setting === "game") {
      await page.getByRole("button", { name: "設定", exact: true }).click();
      await page.getByLabel("演出を短縮する").check();
      await page.getByRole("dialog", { name: "設定" }).getByRole("button", { name: "閉じる" }).click();
    }
    await selectTravelEvent(page, "milano_duomo_episode");
    const transition = page.getByTestId("travel-transition");
    await expect(transition).toBeVisible();
    await expect(transition).toHaveClass(/is-reduced/);
    await expect(transition.locator(".travel-transition-vehicle")).toHaveCSS("animation-name", "none");
    await expect(transition).toHaveCount(0);
    expect((await saved(page)).travel.currentPlaceId).toBe("p_duomo");
  });
}
