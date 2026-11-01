import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import characterData from "../../content/presentation/characters.json" with { type: "json" };
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import {
  advanceToChoiceOrEnd,
  choose,
  expectNoOverflow,
  finishCafe,
  loadLegacyFreeTime,
  loadSnapshot,
  saved,
  startCafe,
  startNewGame,
  setDialogueSpeed,
} from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test("a response is saved before its presentation and cannot be scored again after reload", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, phase6.battleQuestion);
  const initial = await saved(page);
  await page.locator(".question-en").getByRole("button", { name: "shapeの意味" }).tap();
  await page.getByRole("button", { name: "問題文の訳を見る" }).tap();
  expect(await saved(page)).toEqual(initial);
  await page.getByTestId("answer-B").tap();
  const answer = await saved(page);
  expect(answer.activeBattle?.answers).toHaveLength(1);
  await expect(page.getByTestId("battle-feedback").getByRole("status")).toHaveText("正解");
  await page.reload();
  expect(await saved(page)).toEqual(answer);
  await expect(page.getByTestId("answer-B")).toBeDisabled();
  await page.getByRole("button", { name: "英文を確認する" }).tap();
  expect(await saved(page)).toEqual(answer);
  await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).tap();
  expect(await saved(page)).toEqual(answer);
  await expectNoOverflow(page);
});

test("date conversation log contains displayed lines and never advances the story", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  const before = await saved(page);
  const first = before.activeDate!.frame.text;
  await page.getByRole("button", { name: "会話ログ", exact: true }).click();
  const log = page.getByRole("dialog");
  await expect(log).toContainText(first);
  expect(await saved(page)).toEqual(before);
  await page.keyboard.press("Escape");
  expect(await saved(page)).toEqual(before);
  await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  const after = await saved(page);
  await page.getByRole("button", { name: "会話ログ", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(first);
  await expect(page.getByRole("dialog")).toContainText(after.activeDate!.frame.text);
  expect(await saved(page)).toEqual(after);
  await page.keyboard.press("Escape");
  await expectNoOverflow(page);
});

test("an old confirmation-on setting still makes choices direct and single-commit", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await page.evaluate(() => localStorage.setItem("dreamscape.presentation.v1", JSON.stringify({
    schemaVersion: 1, confirmChoices: true, reduceMotion: false,
  })));
  await page.reload();
  await setDialogueSpeed(page, "0");
  const before = await advanceToChoiceOrEnd(page);
  await expect(page.locator(".choice").first()).toBeEnabled();
  await page.locator(".choice").first().evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(async () => (await saved(page)).activeDate?.choiceCount)
    .toBe(before.activeDate!.choiceCount + 1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const after = await saved(page);
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test("date and battle stay readable on mobile, desktop and landscape", async ({ page }) => {
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "0");
  for (const size of [
    { width: 360, height: 780 },
    { width: 430, height: 932 },
    { width: 1280, height: 800 },
    { width: 780, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    await expect(page.locator(".dialogue-text")).toBeVisible();
    await page.screenshot({ path: `artifacts/vn-overhaul/date-${size.width}x${size.height}.png` });
  }
  await advanceToChoiceOrEnd(page);
  await expect(page.locator(".choice").first()).toBeEnabled();
  for (const size of [
    { width: 360, height: 780 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    await expect(page.locator(".choice").first()).toBeVisible();
    await page.screenshot({ path: `artifacts/vn-overhaul/choice-${size.width}x${size.height}.png` });
  }
  await loadSnapshot(page, phase6.battleQuestion);
  for (const size of [
    { width: 360, height: 780 },
    { width: 430, height: 932 },
    { width: 1280, height: 800 },
    { width: 780, height: 360 },
  ]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    await expect(page.getByTestId("battle-question")).toBeVisible();
    await expect(page.getByTestId("answer-A")).toBeVisible();
    await page.screenshot({ path: `artifacts/vn-overhaul/battle-${size.width}x${size.height}.png` });
  }
});

test("tapping a line reveals it before a second tap advances", async ({ page }) => {
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  await setDialogueSpeed(page, "45");
  const before = await saved(page);
  await page.locator(".dialogue-text").click();
  expect(await saved(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "全文を表示" })).toHaveCount(0);
  await page.locator(".dialogue-text").click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
});

test("a failed expression image falls back and the date remains playable", async ({ page }) => {
  const heroine = characterData.characters.find((item) => item.id === "heroine")!;
  const basic = heroine.costumes!.find((item) => item.id === "default_01")!;
  const { neutral, shy } = basic.poses.find((item) => item.id === "standing_01")!.expressions as Record<string, string>;
  expect(neutral).toBeTruthy();
  expect(shy).toBeTruthy();
  let blocked = 0;
  await page.route(`**/${shy}`, async (route) => {
    blocked += 1;
    await route.abort();
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  const before = await saved(page);
  await setDialogueSpeed(page, "0");
  await choose(page, 1);
  await expect.poll(() => blocked).toBeGreaterThan(0);
  expect((await saved(page)).activeDate!.frame.emotion).toBe("shy");
  const portrait = page.locator(".romance-scene .vn-character img");
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("src", new RegExp(`${neutral}$`));
  await choose(page, 0);
  await finishCafe(page);
  expect((await saved(page)).activeDate).toBeNull();
  expect((await saved(page)).ap).toBe(before.ap);
  expect(errors).toEqual([]);
});

for (const method of ["setting", "device"] as const) {
  test(`answer animation respects reduced motion from ${method}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: method === "device" ? "reduce" : "no-preference" });
    await loadSnapshot(page, phase6.battleQuestion);
    if (method === "setting") {
      await page.getByRole("button", { name: "設定", exact: true }).click();
      await page.getByLabel("演出を短縮する").check();
      await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
      await page.reload();
      await expect(page.locator(".battle-screen")).toHaveAttribute("data-reduce-motion", "true");
    }
    await page.getByTestId("answer-B").click();
    await expect(page.locator(".battle-screen")).toHaveClass(/answer-animating/);
    const animation = await page.locator(".selected-panel").evaluate((element) => getComputedStyle(element).animationName);
    expect(animation).toBe("none");
    const after = await saved(page);
    expect(after.activeBattle?.answers).toHaveLength(1);
    await page.reload();
    expect(await saved(page)).toEqual(after);
    await expect(page.getByTestId("answer-B")).toBeDisabled();
  });
}

test("backgrounding during an answer effect neither rescores nor blocks the next line", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await loadSnapshot(page, phase6.battleQuestion);
  await page.getByTestId("answer-B").click();
  const after = await saved(page);
  expect(after.activeBattle?.answers).toHaveLength(1);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    Reflect.deleteProperty(document, "hidden");
  });
  expect(await saved(page)).toEqual(after);
  await expect(page.getByTestId("answer-B")).toBeDisabled();
  await page.getByTestId("battle-advance").click();
  const next = await saved(page);
  expect(next.activeBattle?.phase).toBe("dialogue");
  expect(next.activeBattle?.answers).toHaveLength(1);
  expect(next.activeBattle?.score).toBe(after.activeBattle?.score);
});

test("the reveal input cannot select a new choice immediately", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await loadSnapshot(page, phase1.beforeChoice);
  await page.getByRole("button", { name: "全文を表示", exact: true }).click();
  const choice = page.locator(".choice").first();
  await expect(choice).toBeDisabled();
  const afterReveal = await saved(page);
  // A synthetic click during the disabled reveal guard must not commit a choice.
  await choice.evaluate((button: HTMLButtonElement) => button.click());
  expect(await saved(page)).toEqual(afterReveal);
  await page.clock.fastForward(500);
  await expect(choice).toBeEnabled();
});
