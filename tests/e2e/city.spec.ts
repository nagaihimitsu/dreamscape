import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import tourism from "../../content/tourism/catalog.json" with { type: "json" };
import journey from "../../content/progression/journey.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import {
  availableAp,
  expectNoOverflow,
  loadSnapshot,
  openRevisits,
  playEvent,
  returnToMenu,
  saved,
  startNewGame,
} from "./helpers";
import { reloadUnchanged, romanceProgress } from "./battle-helpers";
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

test("an old completed city can play B and C from the story without losing its ending or rewards", async ({ page }) => {
  test.setTimeout(180_000);
  await loadSnapshot(page, phase7.cityClearViewed);
  const original = await saved(page);
  const progress = nonBattleProgress(original);
  for (const format of ["B", "C"] as const) {
    const { battle } = specialBattle(format);
    await expect(page.getByTestId(`next-story-battle-${battle.id}`)).toBeVisible();
    await page.getByTestId(`next-story-battle-${battle.id}`).click();
    await reloadUnchanged(page);
    const result = await playSpecialBattle(page, format, [false, false, false]);
    expect(result.state.activeBattle?.score).toBe(0);
    expect(nonBattleProgress(result.state)).toEqual(progress);
    expect(result.state.battleRecords.find((record) => record.battleId === battle.id)?.attempts).toBe(1);
    await reloadUnchanged(page);
    for (const width of [320, 360]) {
      await page.setViewportSize({ width, height: width === 320 ? 568 : 640 });
      await expectNoOverflow(page);
      await expect(page.getByRole("button", { name: "自由時間へ戻る", exact: true })).toBeVisible();
      if (format === "B")
        await expect(page.getByTestId(`next-story-battle-${specialBattle("C").battle.id}`)).toBeVisible();
      await page.screenshot({ path: `/tmp/dreamscape-story-${format.toLowerCase()}-${width}.png` });
    }
  }
  await page.getByRole("button", { name: "自由時間へ戻る", exact: true }).click();
  const final = await saved(page);
  expect(nonBattleProgress(final)).toEqual(progress);
  expect(final.completedCityIds).toEqual(["milano"]);
  expect(final.endingReached).toBe(true);
  await expect(page.getByTestId(`next-story-battle-${specialBattle("B").battle.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`next-story-battle-${specialBattle("C").battle.id}`)).toHaveCount(0);
  await openRevisits(page);
  for (const format of ["B", "C"] as const) {
    await expect(page.getByTestId(`revisit-battle-${specialBattle(format).battle.id}`)).toBeVisible();
  }
});

test("previously played special battles remain recorded without marking the new cases complete", async ({ page }) => {
  const completed = {
    ...phase7.cityClearViewed,
    battleRecords: [
      ...phase7.cityClearViewed.battleRecords,
      ...phase6.B_result.battleRecords,
      ...phase6.C_result.battleRecords,
    ],
  };
  await loadSnapshot(page, completed);
  expect(await saved(page)).toEqual(completed);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId(`next-story-battle-${specialBattle("B").battle.id}`)).toBeVisible();
  await expect(page.getByTestId(`next-story-battle-${specialBattle("C").battle.id}`)).toHaveCount(0);
  await openRevisits(page);
  for (const battleId of ["milano_last_supper_b01", "milano_last_supper_c01"])
    await expect(page.getByTestId(`revisit-battle-${battleId}`)).toBeVisible();
  expect((await saved(page)).endingReached).toBe(true);
});

test("a new zero-score Milan journey reaches the city epilogue and romance ending with finite earned AP", async ({
  page,
}) => {
  test.setTimeout(360_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startNewGame(page, ["航", "澪"]);
  expect((await saved(page)).legacyTrialAvailable).toBe(false);
  await expect(page.getByTestId("episode-screen")).toContainText(
    "ミラノ 第1話／ドゥオモ",
  );
  await page.getByTestId("episode-start").click();
  for (const [index, episode] of cityEpisodes.entries()) {
    const before = await saved(page);
    expect(before.activeTourism?.landmarkId).toBe(episode.landmarkId);
    if (index === 0) await reloadUnchanged(page);
    // Neither guide completion nor a discovery is required for progression.
    await page
      .getByRole("button", { name: "バトルを始める", exact: true })
      .click();
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
      await expect(page.getByTestId("milestone-trial_after_cafe")).toHaveCount(
        0,
      );
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
  expect(initialEpilogue).toMatch(/澪|航|地図|メモ|街/);
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
    finished.memories.filter((id) => id.startsWith("milano_city_date_")),
  ).toHaveLength(2);
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
    await page
      .getByRole("button", { name: "バトルを始める", exact: true })
      .click();
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
    journey.rewards.reduce((sum, reward) => sum + reward.ap, 0),
  );
  expect(perfect.state.ap).toBe(12);
  const rewards = perfect.state.claimedRewardIds;
  expect(new Set(rewards).size).toBe(rewards.length);
  for (const [score, title] of [
    [3, "VICTORY"],
    [2, "DEFEAT"],
  ] as const) {
    await page
      .getByRole("button", { name: "再戦する", exact: true })
      .evaluate((button: HTMLButtonElement) => {
        button.click();
        button.click();
      });
    const result = await playCityBattle(page, cityFinale(), score);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    expect(result.state.claimedRewardIds).toEqual(rewards);
    expect(availableAp(result.state)).toBe(availableAp(perfect.state));
    expect(result.state.completedCityIds).toEqual(["milano"]);
    expect(
      result.state.completedEpisodeIds.filter((id) => id === cityFinale().id),
    ).toHaveLength(1);
    expect(result.state.battleRewardReceipt!.entries).toEqual([]);
    await reloadUnchanged(page);
  }
  expect(
    (await saved(page)).battleRecords.find(
      (record) => record.battleId === cityFinale().battleId,
    ),
  ).toEqual({
    battleId: cityFinale().battleId,
    attempts: 3,
    firstScore: 5,
    bestScore: 5,
    lastScore: 2,
  });
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

test("a published Last Supper completion keeps its reward and resumes at unvisited Duomo, then skips the already completed episode", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await loadSnapshot(page, phase6.freeTime);
  expect(await saved(page)).toEqual(phase6.freeTime);
  await expect(page.getByTestId(`next-story-battle-${specialBattle("B").battle.id}`)).toHaveCount(0);
  await expect(page.getByTestId(`next-episode-${cityEpisodes[0].id}`)).toBeVisible();
  await page.getByTestId(`next-episode-${cityEpisodes[0].id}`).click();
  const oldRecord = phase6.freeTime.battleRecords;
  for (const episode of cityEpisodes.filter(
    (item) => item.landmarkId !== "last_supper",
  )) {
    expect((await saved(page)).activeTourism!.landmarkId).toBe(
      episode.landmarkId,
    );
    await skipTourismGuide(page);
    await page
      .getByRole("button", { name: "バトルを始める", exact: true })
      .click();
    const result = await playCityBattle(page, episode, 0);
    expect(
      result.state.battleRecords.filter(
        (item) => item.battleId === "milano_last_supper_01",
      ),
    ).toEqual(oldRecord);
    expect(
      result.state.claimedRewardIds.filter(
        (id) => id === "chapter_milano_first_clear",
      ),
    ).toHaveLength(1);
    expect(result.state.completedCityIds).toEqual([]);
    await continueJourney(page, episode.landmarkId === "galleria_vittorio_emanuele_ii" ? "B" : episode.landmarkId === "castello_sforzesco" ? "C" : undefined);
  }
  const result = await playCityBattle(page, cityFinale(), 0);
  expect(result.state.completedCityIds).toEqual(["milano"]);
  expect(romanceProgress(result.state)).toEqual(
    romanceProgress(phase6.freeTime as unknown as typeof result.state),
  );
  expect(result.state.completedEpisodeIds[0]).toBe(
    "milano_last_supper_episode",
  );
  expect(result.state.schemaVersion).toBe(11);
  await reloadUnchanged(page);
});
