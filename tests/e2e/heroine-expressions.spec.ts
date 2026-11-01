import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import expressionData from "../../content/presentation/dialogue-expressions.json" with { type: "json" };
import { choose, loadLegacyFreeTime, loadSnapshot, saved, setDialogueSpeed, startCafe, startNewGame } from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test("a new journey visibly changes expression during the Duomo guide and resumes on the same line", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page, ["航海者", "花子"]);
  await page.getByTestId("episode-start").click();
  await setDialogueSpeed(page, "0");
  const portrait = page.locator("#tourism-screen .vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/neutral\.png$/);
  const target = "「全部は、あとで。今は、上にいる小さな人たちを見たいです」";
  for (let step = 0; step < 12 && (await saved(page)).activeTourism?.frame?.text !== target; step++) {
    const before = await saved(page);
    await page.getByTestId("tourism-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const current = await saved(page);
  expect(current.activeTourism?.frame?.text).toBe(target);
  expect(current.activeTourism?.frame?.emotion).toBe("neutral");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
});

test("a real cafe conversation shows the selected heroine expression and restores it after reload", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");

  const portrait = page.locator(".romance-scene .vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/neutral\.png$/);
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024);
  const placement = await page.locator(".romance-scene .vn-character").getAttribute("style");

  // This line has no Ink emotion tag: its expression is provided by the
  // presentation catalog without changing the saved story or its fingerprint.
  const smileLine = "「でも今は……もう少しだけ、予定がないままでいたいな」";
  for (let step = 0; step < 12 && (await saved(page)).activeDate?.frame.text !== smileLine; step++) {
    const before = await saved(page);
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const smileFrame = await saved(page);
  expect(smileFrame.activeDate?.frame.text).toBe(smileLine);
  expect(smileFrame.activeDate?.frame.emotion).toBe("neutral");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(smileFrame);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);

  // An existing explicit Ink tag still takes priority.
  await choose(page, 1);
  const selected = await saved(page);
  expect(selected.activeDate?.frame.emotion).toBe("shy");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/shy\.png$/);
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024);
  expect(await page.locator(".romance-scene .vn-character").getAttribute("style")).toBe(placement);

  await page.reload();
  expect(await saved(page)).toEqual(selected);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/shy\.png$/);
  await expect.poll(() => portrait.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1024);
});

test("a mapped narration line keeps the heroine's smile without changing the saved frame", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  const before = await saved(page);
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  const current = await saved(page);
  expect(current.activeDate?.frame.speaker).toBe("narrator");
  expect(current.activeDate?.frame.text).toBe("彼女は笑いかけ、ガイドブックに視線を戻す。");
  expect(current.activeDate?.frame.emotion).toBe("neutral");
  const portrait = page.locator(".romance-scene .vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
});

test("an existing saved sightseeing guide shows the heroine's expression without changing the save format", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.guide);
  await setDialogueSpeed(page, "0");
  await page.getByTestId("tourism-advance").click();
  const current = await saved(page);
  expect(current.activeTourism?.frame?.text).toContain("スープをこぼしたら気まずそう");
  expect(current.activeTourism?.frame?.emotion).toBe("neutral");
  const portrait = page.locator("#tourism-screen .vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
});

test("battle dialogue changes the heroine's expression while enemy dialogue remains independent", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase6.battleDialogue);
  await setDialogueSpeed(page, "0");
  const portrait = page.locator(".battle-heroine .vn-character img");
  const target = "「……最後の一枚は、誰が守るんですか」";
  let sawEnemy = false;
  for (let step = 0; step < 12 && (await saved(page)).activeBattle?.frame?.text !== target; step++) {
    const before = await saved(page);
    if (before.activeBattle?.frame?.speaker === "enemy") {
      sawEnemy = true;
      await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/neutral\.png$/);
    }
    await page.getByTestId("battle-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  expect(sawEnemy).toBe(true);
  const current = await saved(page);
  expect(current.activeBattle?.frame?.text).toBe(target);
  expect(current.activeBattle?.frame?.emotion).toBe("neutral");
  const emotion = expressionData.entries.find((entry) => entry.storyId === "battles/milano_last_supper" && entry.text === target && entry.speaker === "heroine")?.emotion;
  expect(emotion).toBeTruthy();
  expect(emotion).not.toBe("neutral");
  await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${emotion}\\.png$`));
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", new RegExp(`/default_01/standing_01/${emotion}\\.png$`));
});

test("the city epilogue shows the annotated expression while preserving relationship and progress", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase7.cityClearUnread);
  await page.getByTestId("city-epilogue").click();
  await setDialogueSpeed(page, "0");
  const target = "「帰り道まで、あの指揮者に揃えられなくてよかった」";
  for (let step = 0; step < 12 && (await saved(page)).activeEpilogue?.frame.text !== target; step++) {
    const before = await saved(page);
    await page.getByTestId("epilogue-advance").click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  }
  const current = await saved(page);
  expect(current.activeEpilogue?.frame.text).toBe(target);
  expect(current.activeEpilogue?.frame.emotion).toBe("neutral");
  expect(current.endingReached).toBe(true);
  const portrait = page.locator("#city-epilogue-screen .vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(current);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
});
