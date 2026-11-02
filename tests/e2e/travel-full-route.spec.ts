import { expect, test, type Page } from "@playwright/test";
import { cityEpisodes, cityFinale, playCityBattle } from "./city-helpers";
import { choose, finishEvent, saved, selectTravelEvent, setDialogueSpeed, startGuideBattle, startNewGame } from "./helpers";
import { playStoryBattle } from "./reasoning-helpers";

test.use({ reducedMotion: "reduce" });

async function selectDestination(page: Page, id: string) {
  await selectTravelEvent(page, id);
  const travel = page.getByRole("dialog", { name: /へ$/ });
  if (await travel.isVisible()) {
    const walk = travel.getByRole("button", { name: /^徒歩 / });
    await expect(walk).toBeEnabled();
    await walk.click();
  }
}

async function visitEpisode(page: Page, id: string) {
  const episode = cityEpisodes.find((item) => item.id === id)!;
  await selectDestination(page, id);
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe(episode.landmarkId);
  await startGuideBattle(page);
  if (id === "milano_duomo_episode") await setDialogueSpeed(page, "0");
  await playCityBattle(page, episode, 3);
  await page.getByRole("button", { name: "自由時間へ進む" }).click();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
}

test("travel from a new game through lodging, both special battles and the city finale", async ({ page }) => {
  test.setTimeout(300_000);
  page.setDefaultTimeout(10_000);
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);

  await visitEpisode(page, "milano_duomo_episode");
  await selectDestination(page, "milano_walk_01");
  await choose(page, 0);
  await choose(page, 1);
  await finishEvent(page, 2);
  expect((await saved(page)).playedDateIds).toContain("milano_walk_01");

  await visitEpisode(page, "milano_galleria_episode");
  const beforeSleep = await saved(page);
  await page.getByRole("button", { name: "滞在先で休む" }).click();
  await page.getByRole("button", { name: /^徒歩 .*€0/ }).click();
  const rested = await saved(page);
  expect(rested.travel).toMatchObject({ currentPlaceId: "p_hotel", day: beforeSleep.travel.day + 1, minute: 540 });
  expect(rested.ap).toBe(beforeSleep.ap);
  await page.reload();
  expect((await saved(page)).travel).toEqual(rested.travel);

  await visitEpisode(page, "milano_last_supper_episode");
  await visitEpisode(page, "milano_castello_episode");
  for (const [format, id] of [["B", "milano_la_scala_b01"], ["C", "milano_brera_c01"]] as const) {
    await selectDestination(page, id);
    expect((await saved(page)).activeBattle?.battleId).toBe(id);
    await playStoryBattle(page, format, [true, true, true]);
    await page.getByRole("button", { name: "自由時間へ戻る" }).click();
    expect((await saved(page)).battleRecords.some((record) => record.battleId === id && record.attempts > 0)).toBe(true);
  }
  const finale = cityFinale();
  await selectDestination(page, finale.id);
  expect((await saved(page)).activeBattle?.battleId).toBe(finale.battleId);
  await playCityBattle(page, finale, 5);
  expect((await saved(page)).completedCityIds).toContain("milano");
});
