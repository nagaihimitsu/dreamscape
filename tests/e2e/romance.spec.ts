import { installRomanceRolls } from "./romance-rolls";
import { expect, test } from "@playwright/test";
import {
  SAVE_KEY,
  saved,
  expectNoOverflow,
  startNewGame,
  loadLegacyFreeTime,
  startCafe,
  advanceToChoiceOrEnd,
  choose,
  finishCafe,
  revealDialogueControl,
} from "./helpers";

test.beforeEach(async ({ page }) => { await installRomanceRolls(page); });

test.use({ reducedMotion: "reduce" });

test("default names and a legacy chapter save keep cafe choices and reload consistent without offering a replay", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByLabel("主人公の名前")).toHaveValue("たいち");
  await expect(page.getByLabel("ヒロインの名前")).toHaveValue("あゆみ");
  await startNewGame(page);
  expect(await saved(page)).toMatchObject({ playerName: "たいち", heroineName: "あゆみ" });
  await loadLegacyFreeTime(page);
  await page.reload();
  expect((await saved(page)).ap).toBe(4);
  await startCafe(page);
  const initialLine = (await saved(page)).activeDate!.frame.text;
  await page.reload();
  expect((await saved(page)).activeDate!.frame.text).toBe(initialLine);
  expect((await saved(page)).ap).toBe(2);

  const beforeChoice = await advanceToChoiceOrEnd(page);
  await page.reload();
  expect((await saved(page)).activeDate!.frame.choices).toEqual(
    beforeChoice.activeDate!.frame.choices,
  );
  await choose(page, 0);
  const firstReaction = await saved(page);
  expect(firstReaction.affection).toBeGreaterThan(0);
  expect(firstReaction.memories).toHaveLength(1);
  await page.reload();
  expect(await saved(page)).toEqual(firstReaction);
  await choose(page, 1);
  await finishCafe(page);
  const completed = await saved(page);
  expect(completed.ap).toBe(2);
  expect(completed.memories).toHaveLength(2);
  expect(completed.playedDateIds).toEqual(["milano_cafe_01"]);
  expect(completed.claimedRewardIds).toEqual(["chapter_milano_first_clear"]);
  await expect(page.getByText(/^好感度[：: ]*[0-9]/)).toHaveCount(0);
  await expectNoOverflow(page);
  await page.reload();
  expect(await saved(page)).toEqual(completed);

  await expect(page.getByTestId("event-milano_cafe_01")).toHaveCount(0);
  expect(await saved(page)).toEqual(completed);
  expect(errors).toEqual([]);
});

test("custom names remain plain text and fit a 360px screen throughout the date", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  const player = "<b>あいうえおかきくけこ</b>";
  const heroine = "あいうえおかきくけこさしすせそたちつてとなにぬね";
  await startNewGame(page, [player, heroine]);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  const observed: string[] = [];
  for (let step = 0; step < 40; step++) {
    const state = await saved(page);
    const frame = state.activeDate!.frame;
    observed.push(frame.text);
    await expectNoOverflow(page);
    if (frame.text.includes(player)) {
      // Check the actual frame containing markup-like input, not just the
      // unrelated final line of the date.
      await expect(page.locator(".dialogue-text")).toContainText(player);
      await expect(page.locator(".dialogue-text b")).toHaveCount(0);
    }
    if (frame.choices.length) {
      for (const choice of frame.choices) {
        const button = page.locator(".choice").nth(choice.index);
        const size = await button.boundingBox();
        expect(size!.height).toBeGreaterThanOrEqual(44);
      }
      // In the refreshed cafe, the third first choice is the route where
      // the heroine addresses the player by their configured name.
      await choose(page, state.activeDate!.choiceCount === 0 ? 2 : 1);
    } else if (frame.ended) {
      break;
    } else {
      await page
        .getByRole("button", { name: "続きを読む", exact: true })
        .click();
      await expect
        .poll(async () => (await saved(page)).revision)
        .toBeGreaterThan(state.revision);
    }
  }
  expect(observed.join("\n")).toContain(player);
  expect(observed.join("\n")).toContain(heroine);
  await expect(page.locator(".dialogue-text b")).toHaveCount(0);
  await finishCafe(page);
  await page.reload();
  expect((await saved(page)).playerName).toBe(player);
  expect((await saved(page)).heroineName).toBe(heroine);
  await expectNoOverflow(page);
});

test("corrupted save is preserved until explicit backup and fresh start", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate((key) => {
    localStorage.setItem(key, "{broken-save");
    localStorage.setItem("unrelated-app", "must-remain");
  }, SAVE_KEY);
  await page.reload();
  await expect(page.getByText(/セーブを読み込めませんでした/)).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe("{broken-save");
  await page
    .getByRole("button", { name: /元のデータを退避して新しく始める/ })
    .click();
  const entries = await page.evaluate(() => Object.entries(localStorage));
  expect(entries).toContainEqual(["unrelated-app", "must-remain"]);
  expect(
    entries.some(
      ([key, value]) =>
        key.startsWith(`${SAVE_KEY}.backup.`) && value === "{broken-save",
    ),
  ).toBe(true);
  expect((await saved(page)).schemaVersion).toBe(11);
  expect((await saved(page)).ap).toBe(0);
});

test("pause, manual save/load and keyboard choice preserve the current line", async ({
  page,
}) => {
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  await startCafe(page);
  const before = await saved(page);
  await expect(page.locator(".dialogue-text")).toMatchAriaSnapshot(
    `- button "${before.activeDate!.frame.text}"`,
  );
  const pause = page.getByRole("button", { name: "中断する", exact: true });
  await revealDialogueControl(page, pause);
  await pause.click();
  await page.getByRole("button", { name: "セーブ", exact: true }).click();
  await page.getByRole("button", { name: "ロード", exact: true }).click();
  expect(await saved(page)).toEqual(before);
  const choiceState = await advanceToChoiceOrEnd(page);
  const firstChoice = page.locator(".choice").first();
  await expect(firstChoice).toBeEnabled();
  await firstChoice.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(async () => (await saved(page)).activeDate?.choiceCount)
    .toBe(choiceState.activeDate!.choiceCount + 1);
});

test("an older tab cannot overwrite a date started in another tab", async ({
  page,
  context,
}) => {
  await startNewGame(page);
  await loadLegacyFreeTime(page);
  const older = await context.newPage();
  await older.goto("/");
  await expect(
    older.getByTestId("event-milano_cafe_01").getByRole("button"),
  ).toBeVisible();
  await startCafe(page);
  const current = await saved(page);
  await older.getByRole("button", { name: "セーブ", exact: true }).click();
  expect(await saved(page)).toEqual(current);
  await expect(older.locator(".notice[role=status]")).toContainText("ロード");
  await older.getByRole("button", { name: "ロード", exact: true }).click();
  await expect(older.locator(".dialogue-text")).toContainText(
    current.activeDate!.frame.text,
  );
  expect((await saved(older)).ap).toBe(2);
  await older.close();
});
