import { installRomanceRolls, setRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import {
  saved,
  expectNoOverflow,
  startCurrentSupperJourney,
  loadCurrentCompletedFreeTime,
  returnToMenu,
  startEvent,
  advanceToChoiceOrEnd,
  choose,
  finishEvent,
  playEvent,
} from "./helpers";

import { completeEpisode, enterFreeTime } from "./journey-helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page, [0, 0, 5000, 0]); });

test.use({ reducedMotion: "reduce" });

const CAFE = "milano_cafe_01";
const WALK = "milano_walk_01";
const INVITATION = "milano_invitation_01";
const NIGHT = "milano_night_01";
const BRERA = "milano_brera_date_01";
const CONFESSION = "milano_confession_01";
const REASSURANCE = "milano_reassurance_01";

test("a current journey can continue after rejection, deferral and eventual acceptance", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 360, height: 740 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startCurrentSupperJourney(page);
  expect((await saved(page)).romanceStage).toBe(1);
  const episode = await completeEpisode(page, [false, false, false]);
  expect(episode.ap).toBe(11);
  expect(episode.affection).toBe(0);
  expect(episode.discoveredClueIds).toEqual([]);
  await page.reload();
  expect(await saved(page)).toEqual(episode);
  await enterFreeTime(page);
  await expect(page.getByTestId(`event-${CONFESSION}`)).toHaveCount(0);
  await playEvent(page, CAFE, 2, [0, 2]);
  expect((await saved(page)).romanceStage).toBe(2);
  await playEvent(page, CONFESSION, 0, [0]);
  const rejected = await saved(page);
  expect(rejected.confessionStatus).toBe("rejected");
  expect(rejected.endingReached).toBe(false);
  await page.reload();
  expect(await saved(page)).toEqual(rejected);
  const confessionOption = page.getByTestId(`event-${CONFESSION}`).getByRole("button");
  await expect(confessionOption).toBeDisabled();
  await expect(page.getByTestId(`event-${CONFESSION}`)).toContainText("新しいひとときを");

  await playEvent(page, BRERA, 2, [0, 0]);
  expect((await saved(page)).romanceStage).toBe(3);
  const beforeSecond = (await saved(page)).ap;
  await startEvent(page, CONFESSION, 0);
  const beforeChoice = await advanceToChoiceOrEnd(page);
  await page.reload();
  expect(await saved(page)).toEqual(beforeChoice);
  await choose(page, 0);
  const afterChoice = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(afterChoice);
  await finishEvent(page, 1);
  expect((await saved(page)).confessionStatus).toBe("deferred");
  expect((await saved(page)).endingReached).toBe(false);
  expect((await saved(page)).ap).toBe(beforeSecond);
  const deferred = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(deferred);

  await setRomanceRolls(page, [0, 5000, 5000, 0]);
  await playEvent(page, WALK, 3, [0, 0]);
  expect((await saved(page)).romanceStage).toBe(4);
  const apBeforeConfession = (await saved(page)).ap;
  const confessionText = await playEvent(page, CONFESSION, 0, [0]);
  expect(confessionText).toContain("付き合いたい");
  const ending = await saved(page);
  expect(ending.memories).toContain("sound_memory_cafe_01");
  expect(ending.memories).not.toContain("milano_cafe_joke");
  expect(ending.endingReached).toBe(true);
  expect(ending.confessionStatus).toBe("accepted");
  expect(ending.ap).toBe(apBeforeConfession);
  expect(ending.playedDateIds).not.toContain(INVITATION);
  expect(ending.playedDateIds).not.toContain(NIGHT);
  expect(
    ending.memories.filter((id) => id === "milano_confession_promise"),
  ).toHaveLength(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "旅の続きに、きみと。",
  );
  await expect(page.getByText(/好感度[：:]?\s*\d|Stage\s*[1-4]/)).toHaveCount(
    0,
  );
  await expectNoOverflow(page);
  await page.screenshot({
    path: "artifacts/phase2-mobile-ending.png",
    fullPage: true,
  });
  await page.reload();
  expect(await saved(page)).toEqual(ending);
  await expect(page.getByTestId("free-time-hub")).toBeVisible();
  await expect(page.getByTestId("romance-ending")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("warm choices and renamed characters reach a successful first confession with a different remembered line", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await startCurrentSupperJourney(page, ["航", "澪"]);
  await loadCurrentCompletedFreeTime(page);
  await setRomanceRolls(page, [0, 5000, 5000, 9999]);
  await playEvent(page, CAFE, 2, [2, 0]);
  await returnToMenu(page);
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByLabel("主人公の名前").fill("悠");
  await page.getByLabel("ヒロインの名前").fill("紬");
  await page.getByRole("button", { name: "名前を保存", exact: true }).click();
  await setRomanceRolls(page, [0, 5000, 5000, 9999]);
  const walk = await playEvent(page, WALK, 3, [0, 0]);
  expect(walk).toContain("ドゥオモ");
  expect((await saved(page)).heroineName).toBe("紬");
  await setRomanceRolls(page, [0, 5000, 5000, 9999]);
  const night = await playEvent(page, NIGHT, 3, [0, 2]);
  expect(night).toContain("彼女");
  const confession = await playEvent(page, CONFESSION, 0, [0]);
  expect(confession).toContain("付き合いたい");
  const state = await saved(page);
  expect(state.memories).toContain("sound_memory_cafe_01");
  expect(state.memories).not.toContain("milano_cafe_first_joke_refresh");
  expect(state.endingReached).toBe(true);
  expect(state.confessionStatus).toBe("accepted");
  expect(state.playedDateIds).not.toContain(REASSURANCE);
  expect(state.playerName).toBe("悠");
  expect(state.heroineName).toBe("紬");
  await page.reload();
  expect(await saved(page)).toEqual(state);
});
