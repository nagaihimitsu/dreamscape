import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import { choose, loadCurrentFreeTime, loadCurrentCompletedFreeTime, saved, setDialogueSpeed, startCafe, startCurrentSupperJourney, startNewGame } from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test("a new journey visibly changes expression during the Duomo guide and resumes on the same line", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page, ["航海者", "花子"]);
  await page.getByTestId("episode-start").click();
  await setDialogueSpeed(page, "0");
  const portrait = page.locator("#tourism-screen .vn-character > img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/neutral\.png$/);
  const target = "「はずれ。録音です。帰ってから十秒だけ、ここに戻れるように。」";
  for (let step = 0; step < 12 && (await saved(page)).activeTourism?.frame?.text !== target; step++) {
    const before = await saved(page);
    await page.getByTestId("tourism-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const current = await saved(page);
  expect(current.activeTourism?.frame?.text).toBe(target);
  expect(current.activeTourism?.frame?.emotion).toBe("teasing");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
});

test("a real cafe conversation shows explicit reactions and restores them after reload", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadCurrentFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const portrait = page.locator(".romance-scene .vn-character > img");
  const initial = await saved(page);
  expect(initial.activeDate?.frame.speaker).toBe("narrator");
  expect(initial.activeDate?.frame.reactions?.heroine?.expression).toBe("worried");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/worried\.png$/);
  const placement = await page.locator(".romance-scene .vn-character").getAttribute("style");
  await page.reload();
  expect(await saved(page)).toEqual(initial);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/worried\.png$/);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  const selected = await saved(page);
  expect(selected.activeDate?.frame.emotion).toBe("teasing");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
  expect(await page.locator(".romance-scene .vn-character").getAttribute("style")).toBe(placement);
  await page.reload();
  expect(await saved(page)).toEqual(selected);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
});

test("current battle shows a silent reaction and preserves it after reload", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startCurrentSupperJourney(page);
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  await setDialogueSpeed(page, "0");
  const portrait = page.locator(".battle-heroine .vn-character > img");
  for (let step = 0; step < 12; step++) {
    const current = await saved(page);
    if (current.activeBattle?.frame?.reactions?.heroine?.expression === "surprised") {
      expect(current.activeBattle.frame.speaker).toBe("enemy");
      await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/surprised\.png$/);
      await page.reload();
      expect(await saved(page)).toEqual(current);
      await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/surprised\.png$/);
      return;
    }
    await page.getByTestId("battle-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(current.revision);
  }
  throw new Error("Current battle did not show the silent surprise");
});

test("the current city epilogue preserves its scripted expression after reload", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadCurrentCompletedFreeTime(page);
  await page.evaluate(() => {
    const raw = localStorage.getItem("dreamscape.save.v1")!;
    const state = JSON.parse(raw);
    state.romanceStage = 3;
    localStorage.setItem("dreamscape.save.v1", JSON.stringify(state));
  });
  await page.reload();
  await page.getByTestId("city-epilogue").click();
  await setDialogueSpeed(page, "0");
  const target = "「今の話も録りたかった？　もう一回聞いてくれたら、違う答えを言うかも。」";
  for (let step = 0; step < 12 && (await saved(page)).activeEpilogue?.frame.text !== target; step++) {
    const before = await saved(page);
    await page.getByTestId("epilogue-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const current = await saved(page);
  expect(current.activeEpilogue?.frame.text).toBe(target);
  expect(current.activeEpilogue?.frame.emotion).toBe("teasing");
  const portrait = page.locator("#city-epilogue-screen .vn-character > img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/teasing\.png$/);
});
