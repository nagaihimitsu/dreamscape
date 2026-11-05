import { expect, expectNoActiveScene, goTo, playUntil, readSave, startJourney, test, useInstantText } from "./helpers";

test("a new Milan journey walks to the Duomo, plays its guide, quiz battle and a date, and returns to free time", async ({ page }) => {
  test.setTimeout(120_000);
  // A name that looks like markup is shown as plain text.
  await startJourney(page, "milano", ["<b>航</b>", "澪"]);
  const menu = page.getByTestId("travel-menu");
  await expect(menu).toBeVisible();
  await expect(page.locator(".travelers")).toContainText("<b>航</b>");
  await expect(page.locator(".travelers b")).toHaveCount(0);
  await expect(page.getByLabel("残り0AP")).toBeVisible();
  await useInstantText(page);

  // Walking to the Duomo opens its sightseeing guide on arrival.
  await goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expect(page.getByText("現在地：ドゥオモ広場")).toBeVisible();
  await playUntil(page, (state) => state.activeTourism?.phase === "exploring");
  await expect(page.getByTestId("observation-viewport")).toBeVisible();

  // The guide leads into the quiz battle; every answer and line is saved before the next.
  await page.getByRole("button", { name: "進む", exact: true }).click();
  const result = await playUntil(page, (state) => state.activeBattle?.phase === "result");
  await expect(page.getByTestId("battle-result")).toBeVisible();
  await expect(page.getByTestId("battle-rewards")).toBeVisible();
  expect(result.activeBattle!.answers.length).toBeGreaterThan(0);
  expect(result.completedEpisodeIds).toEqual(["milano_duomo_episode"]);
  expect(result.ap).toBeGreaterThan(0);

  await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
  await expect(menu).toBeVisible();
  await expect(page.getByLabel(`残り${result.ap}AP`)).toBeVisible();
  await expect(page.getByTestId("city-progress")).toContainText("観光 1 / 4");

  // A date costs AP when it starts and returns to the travel menu when it ends.
  await goTo(page, "p_novecento");
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
