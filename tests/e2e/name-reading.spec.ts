import type { BrowserContext, CDPSession } from "@playwright/test";
import { devModules, expect, ops, readSave, test, tier, type Locator, type Page } from "./helpers";

// The reading of the player's name (2026-11-17, the user's decision: 「入力欄は隠す」「jquery.autoKana.jsで取得する」):
// the title's and the settings' player-name fields capture the kana the IME composes while the name is typed
// (vanilla-autokana; the Jaipur mehndi draws a kanji name in Latin letters from it), with nothing on the screen that asks
// for it or shows it. The IME is driven through Chromium's DevTools protocol: the composition grows kana by kana, as a
// phone's or a PC's IME shows it, then the kanji are committed in its place. The field's edits are followed
// (nameFieldEdit in src/domain/name-romaji.ts): a kanji deleted and typed again keeps no reading (none rather than a wrong
// one), a name selected and typed over, or a field emptied, reads from the kana typed from then on.

const journeyId = "golden_triangle";

/** Lets the page's timers run past the library's check of the field (every 30 ms while it has the focus). */
const afterCheck = (page: Page) => page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 120)));

/** Composes `kana` in the focused field (the composition growing kana by kana, as an IME shows it), then commits `committed`. */
async function compose(page: Page, ime: CDPSession, field: Locator, kana: string, committed: string) {
  const before = await field.inputValue();
  const caret = await field.evaluate((input: HTMLInputElement) => [input.selectionStart ?? 0, input.selectionEnd ?? 0]);
  const around = (text: string) => before.slice(0, caret[0]) + text + before.slice(caret[1]);
  for (let length = 1; length <= kana.length; length += 1) {
    const text = kana.slice(0, length);
    await ime.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
    await expect(field).toHaveValue(around(text));
    await afterCheck(page);
  }
  await ime.send("Input.insertText", { text: committed });
  await expect(field).toHaveValue(around(committed));
  await afterCheck(page);
}

/** Presses a key in the focused field and lets the library check it. */
async function press(page: Page, key: string) {
  await page.keyboard.press(key);
  await afterCheck(page);
}

/** The title with the journey chosen: its player-name field focused, and the IME. */
async function titleField(page: Page, context: BrowserContext) {
  await page.goto("/");
  await ops.chooseJourney(page, journeyId);
  const field = page.getByLabel("主人公の名前");
  await field.focus();
  return { field, ime: await context.newCDPSession(page) };
}

/** Starts the journey from the title (its opening movie skipped, as a player may) and returns the save once it has the name. */
async function startFromTitle(page: Page, playerName: string) {
  await page.getByLabel("ヒロインの名前").fill("澪");
  const start = ops.startButton(page);
  await expect(start).toHaveAccessibleName(ops.startLabel);
  await start.click();
  // A browser that cannot play the movie ends it by itself.
  if (await page.getByTestId("opening-movie").isVisible().catch(() => false))
    await page.getByTestId("opening-movie-skip").click().catch(() => undefined);
  await expect.poll(async () => (await readSave(page, journeyId))?.playerName ?? null).toBe(playerName);
  return readSave(page, journeyId);
}

/**
 * A new journey in free time (its arrival read) with these names and the reading saved with them, or with the default
 * names (lane 2: the page's scenario builders, the game's setNames and saveGame), opened from the title.
 */
async function placeNamedGame(page: Page, names?: [string, string], reading?: string) {
  await page.goto("/");
  const result = await page.evaluate(async ({ journeyId, names, reading, modules }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { setNames } = await import(/* @vite-ignore */ modules.game);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const game = builders.newJourney(journeyId, names);
    return saveGame(journeyStorage(localStorage, journeyId), names ? setNames(game, names[0], names[1], reading) : game);
  }, { journeyId, names, reading, modules: devModules });
  expect(result).toEqual({ ok: true });
  await ops.chooseJourney(page, journeyId);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
}

/** ゲームの設定's player-name field, focused with the caret at its end. */
async function settingsField(page: Page) {
  const settings = await ops.openSettings(page);
  const field = settings.getByLabel("主人公の名前");
  await field.focus();
  await press(page, "End");
  return { settings, field };
}

/** Saves the names in ゲームの設定 and returns the save once it has the player's name. */
async function saveNames(page: Page, settings: Locator, playerName: string) {
  await settings.getByRole("button", { name: "名前を保存" }).click();
  await expect(settings).toBeHidden();
  await expect.poll(async () => (await readSave(page, journeyId)).playerName).toBe(playerName);
  return readSave(page, journeyId);
}

test("saves the reading of a kanji name typed through the IME on the title screen, with no field for it", { tag: tier.gate }, async ({ page, context }) => {
  const { field, ime } = await titleField(page, context);
  const form = page.locator("form.name-form");
  // The form has the two names and their defaults' line, as before the reading: nothing about it.
  await expect(form.getByRole("textbox")).toHaveCount(2);
  await expect(form).not.toContainText(/ローマ字|つづり|読み|ふりがな|フリガナ/u);
  await compose(page, ime, field, "たいち", "太一");
  expect(await startFromTitle(page, "太一")).toMatchObject({ playerName: "太一", heroineName: "澪", playerNameReading: "たいち" });
});

test("keeps no reading for a name whose kanji was deleted and typed again (none rather than a wrong one)", { tag: tier.gate }, async ({ page, context }) => {
  const { field, ime } = await titleField(page, context);
  await compose(page, ime, field, "たいち", "太一");
  // 一 deleted and typed again as いち: the kana of the 一 deleted cannot be told from 太's (たいち, then いち).
  await press(page, "Backspace");
  await expect(field).toHaveValue("太");
  await compose(page, ime, field, "いち", "一");
  const save = await startFromTitle(page, "太一");
  expect(save).toMatchObject({ playerName: "太一", heroineName: "澪" });
  expect(save).not.toHaveProperty("playerNameReading");
});

test("reads a name selected and typed over from its new kana only", { tag: tier.gate }, async ({ page, context }) => {
  const { field, ime } = await titleField(page, context);
  await compose(page, ime, field, "たいち", "太一");
  await press(page, "ControlOrMeta+A");
  await compose(page, ime, field, "じろう", "次郎");
  expect(await startFromTitle(page, "次郎")).toMatchObject({ playerName: "次郎", playerNameReading: "じろう" });
});

test("reads on from the saved reading in ゲームの設定, and a name selected there and typed over from its new kana", { tag: tier.gate }, async ({ page, context }) => {
  await placeNamedGame(page, ["太一", "澪"], "たいち");
  const ime = await context.newCDPSession(page);
  // 郎 added to the end: the saved reading, then its kana.
  let { settings, field } = await settingsField(page);
  await expect(field).toHaveValue("太一");
  await compose(page, ime, field, "ろう", "郎");
  expect(await saveNames(page, settings, "太一郎")).toMatchObject({ playerName: "太一郎", playerNameReading: "たいちろう" });
  // Selected all and typed over: only the new kana.
  ({ settings, field } = await settingsField(page));
  await expect(field).toHaveValue("太一郎");
  await press(page, "ControlOrMeta+A");
  await compose(page, ime, field, "じろう", "次郎");
  expect(await saveNames(page, settings, "次郎")).toMatchObject({ playerName: "次郎", playerNameReading: "じろう" });
});

test("reads a kanji name typed over the default kana name in ゲームの設定, though its kana begin the same", { tag: tier.gate }, async ({ page, context }) => {
  await placeNamedGame(page);
  const ime = await context.newCDPSession(page);
  const { settings, field } = await settingsField(page);
  await expect(field).toHaveValue("たいち");
  await press(page, "ControlOrMeta+A");
  await compose(page, ime, field, "たいち", "太一");
  expect(await saveNames(page, settings, "太一")).toMatchObject({ playerName: "太一", playerNameReading: "たいち" });
});
