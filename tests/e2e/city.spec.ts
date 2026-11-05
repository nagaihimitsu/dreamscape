import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import tourism from "../../content/tourism/catalog.json" with { type: "json" };
import journey from "../../content/progression/journey.json" with { type: "json" };
import {
  availableAp,
  expectNoOverflow,
  openRevisits,
  playEvent,
  returnToMenu,
  saved,
  startGuideBattle,
  startNewGame,
} from "./helpers";
import { finishAutomaticEncounters, reloadUnchanged } from "./battle-helpers";
import {
  cityEpisodes,
  cityFinale,
  finishCityEpilogue,
  openCityRecords,
  playCityBattle,
} from "./city-helpers";
import {
  finishTourismGuide,
  expectImageWithinPanBounds,
  openObservationList,
  skipTourismGuide,
} from "./tourism-helpers";
import { enterFreeTime } from "./journey-helpers";
import { nonBattleProgress, playStoryBattle as playSpecialBattle, storyBattle as specialBattle } from "./reasoning-helpers";

/** Continue the ordinary story through a special battle when one is due. */
async function continueJourney(page: import("@playwright/test").Page, format?: "B" | "C") {
  if (format) {
    const { battle } = specialBattle(format);
    const before = await saved(page);
    const prior = nonBattleProgress(before);
    await page.getByTestId(`next-story-battle-${battle.id}`).click();
    expect((await saved(page)).activeBattle?.battleId).toBe(battle.id);
    await reloadUnchanged(page);
    const played = await playSpecialBattle(page, format, [false, false, false]);
    expect(played.state.activeBattle?.score).toBe(0);
    expect(nonBattleProgress(played.state)).toEqual(prior);
    expect(played.state.battleRecords.find((record) => record.battleId === battle.id)?.attempts).toBe(1);
    await reloadUnchanged(page);
  }
  await page.getByTestId("next-tourism").click();
}

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 740 } });

async function proceedToCityBattle(page: import("@playwright/test").Page) {
  await startGuideBattle(page);
  await finishAutomaticEncounters(page);
}

test("a new zero-score Milan journey reaches the city epilogue and romance ending with finite earned AP", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startNewGame(page, ["航", "澪"]);
  await expect(page.getByTestId("episode-screen")).toContainText(
    "無人の広場、一名追加",
  );
  await page.getByTestId("episode-start").click();
  for (const [index, episode] of cityEpisodes.entries()) {
    const before = await saved(page);
    expect(before.activeTourism?.landmarkId).toBe(episode.landmarkId);
    if (index === 0) await reloadUnchanged(page);
    // Neither guide completion nor a discovery is required for progression.
    await proceedToCityBattle(page);
    const result = await playCityBattle(page, episode, 0);
    expect(result.state.completedEpisodeIds).toEqual(
      cityEpisodes.slice(0, index + 1).map((item) => item.id),
    );
    expect(result.state.completedCityIds).toEqual([]);
    expect(result.state.affection).toBe(0);
    expect(result.state.discoveredClueIds).toEqual([]);
    expect(result.state.completedGuideIds).toEqual([]);
    await expect(page.getByTestId("episode-clear")).toBeVisible();
    await reloadUnchanged(page);
    if (index === 0) {
      await enterFreeTime(page);
      await expect(page.getByTestId("event-milano_cafe_01")).toBeVisible();
      await openCityRecords(page);
      await expect(page.getByTestId(`city-stop-${cityFinale().id}`)).toContainText("この先");
      await page.getByTestId(`next-episode-${cityEpisodes[1].id}`).click();
    } else await continueJourney(page, episode.landmarkId === "last_supper" ? "B" : episode.landmarkId === "castello_sforzesco" ? "C" : undefined);
  }
  expect((await saved(page)).activeTourism).toBeNull();
  expect((await saved(page)).activeBattle?.battleId).toBe(
    cityFinale().battleId,
  );
  const boss = await playCityBattle(page, cityFinale(), 0, true);
  expect(boss.state.completedCityIds).toEqual(["milano"]);
  expect(boss.state.completedEpisodeIds).toEqual([
    ...cityEpisodes.map((item) => item.id),
    cityFinale().id,
  ]);
  expect(availableAp(boss.state)).toBe(15);
  expect(boss.state.ap).toBe(12);
  expect(
    boss.state.pendingApRewards.reduce(
      (sum, item) => sum + item.remainingAp,
      0,
    ),
  ).toBe(3);
  expect(boss.state.endingReached).toBe(false);
  expect(boss.state.battleRecords).toHaveLength(7);
  expect(
    boss.state.battleRecords.every(
      (record) => record.firstScore === 0 && record.attempts === 1,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 360, height: 640 });
  const bossContinue = page.getByTestId("city-epilogue-start");
  const buttonBounds = await bossContinue.boundingBox();
  expect(buttonBounds).not.toBeNull();
  expect(buttonBounds!.y).toBeGreaterThanOrEqual(0);
  expect(buttonBounds!.y + buttonBounds!.height).toBeLessThanOrEqual(640);
  await expect(page.locator(".battle-score")).toContainText("/ 5 問正解");
  await page.screenshot({
    path: "artifacts/phase7-mobile-city-result.png",
    fullPage: true,
  });
  await page.getByTestId("city-epilogue-start").click();
  const initialEpilogue = await finishCityEpilogue(page, true);
  expect(initialEpilogue).toContain("ダルセナ");
  expect((await saved(page)).viewedEpilogueCityIds).toEqual(["milano"]);
  expect((await saved(page)).endingReached).toBe(false);
  await expect(page.getByTestId("city-progress")).toContainText("都市クリア");
  await page.screenshot({
    path: "artifacts/phase7-mobile-city-records.png",
    fullPage: true,
  });

  // Three freely chosen real places suffice; the old cafe/walk/invitation
  // chain is not a prerequisite for the relationship.
  await playEvent(page, "milano_la_scala_date_01", 2, [0, 0]);
  expect((await saved(page)).romanceStage).toBe(2);
  await reloadUnchanged(page);
  await playEvent(page, "milano_brera_date_01", 2, [0, 0]);
  expect((await saved(page)).romanceStage).toBe(3);
  await playEvent(page, "milano_navigli_date_01", 1, [1, 0]);
  expect((await saved(page)).romanceStage).toBe(4);
  await playEvent(page, "milano_confession_01", 0, [0]);
  expect((await saved(page)).endingReached).toBe(true);
  await reloadUnchanged(page);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();

  await playEvent(page, "milano_city_date_01", 2, [1, 2]);
  const finished = await saved(page);
  expect(finished.endingReached).toBe(true);
  expect(finished.confessionStatus).toBe("accepted");
  expect(finished.playedDateIds).toContain("milano_city_date_01");
  expect(
    finished.memories.filter((id) => id === "sound_memory_city_date_01"),
  ).toHaveLength(1);
  expect(availableAp(finished)).toBe(8);
  expect(finished.pendingApRewards).toEqual([]);
  expect(finished.claimedRewardIds).toEqual(boss.state.claimedRewardIds);
  await returnToMenu(page);
  await expect(page.getByTestId("event-milano_city_date_01")).toHaveCount(0);
  await expect(page.getByTestId("city-epilogue")).toHaveCount(0);
  expect((await saved(page)).viewedEpilogueCityIds).toEqual(["milano"]);
  await reloadUnchanged(page);
  await expectNoOverflow(page);
  expect(errors).toEqual([]);
});

test("all four photographs and discoveries persist, and the five-question boss supports perfect, victory, defeat and replay without duplicate AP", async ({
  page,
}) => {
  test.setTimeout(360_000);
  await startNewGame(page);
  await page.getByTestId("episode-start").click();
  const discovered: string[] = [];
  for (const episode of cityEpisodes) {
    expect((await saved(page)).activeTourism!.landmarkId).toBe(
      episode.landmarkId,
    );
    await finishTourismGuide(page);
    const landmark = tourism.landmarks.find(
      (item) => item.id === episode.landmarkId,
    )!;
    const asset = tourism.assets.find(
      (item) => item.id === landmark.imageAssetId,
    )!;
    const image = page.getByTestId("observation-viewport").locator("img");
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth,
        ),
      )
      .toBe(asset.width);
    const clue = tourism.clues.find(
      (item) => item.landmarkId === landmark.id && item.kind === "hotspot",
    )!;
    const hotspot = page.getByTestId(`hotspot-${clue.id}`);
    const box = (await hotspot.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await hotspot.tap();
    await expect(page.getByTestId("discovery-detail")).toContainText(
      clue.descriptionJa,
    );
    discovered.push(clue.id);
    expect((await saved(page)).discoveredClueIds).toEqual(discovered);
    await expectImageWithinPanBounds(page);
    await reloadUnchanged(page);
    await page.getByTestId("zoom-reset").click();
    await page.getByTestId("observation-viewport").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `artifacts/phase7-mobile-${landmark.id}.png`,
    });
    await proceedToCityBattle(page);
    await playCityBattle(page, episode, 3);
    await expect(
      page.getByRole("heading", { name: "PERFECT VICTORY", exact: true }),
    ).toBeVisible();
    await continueJourney(page, episode.landmarkId === "last_supper" ? "B" : episode.landmarkId === "castello_sforzesco" ? "C" : undefined);
  }
  const perfect = await playCityBattle(page, cityFinale(), 5, true);
  await expect(
    page.getByRole("heading", { name: "PERFECT VICTORY", exact: true }),
  ).toBeVisible();
  expect(availableAp(perfect.state)).toBe(
    journey.rewards.reduce((sum, reward) => sum + reward.ap, 0) +
      journey.storyBattles.reduce((sum, battle) => sum + (battle.completionReward?.ap ?? 0), 0),
  );
  expect(perfect.state.ap).toBe(12);
  const rewards = perfect.state.claimedRewardIds;
  expect(new Set(rewards).size).toBe(rewards.length);
  await expect(page.getByRole("button", { name: "再戦する", exact: true })).toHaveCount(0);
  await reloadUnchanged(page);
  expect((await saved(page)).claimedRewardIds).toEqual(rewards);
  await page.getByTestId("city-epilogue-start").click();
  await finishCityEpilogue(page);
  await openRevisits(page);
  await page.getByTestId(`revisit-tourism-${cityEpisodes[0].landmarkId}`).click();
  expect((await saved(page)).activeTourism!.phase).toBe("exploring");
  await openObservationList(page);
  await page.getByTestId("guide-replay").click();
  await finishTourismGuide(page);
  expect(availableAp(await saved(page))).toBe(availableAp(perfect.state));
  expect((await saved(page)).discoveredClueIds).toEqual(discovered);
});
