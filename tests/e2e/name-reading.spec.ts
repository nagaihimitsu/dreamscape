import { expect, ops, readSave, test, tier, type Page } from "./helpers";

// The reading of the player's name (2026-11-17, the user's decision: 「入力欄は隠す」「jquery.autoKana.jsで取得する」):
// the title's player-name field captures the kana the IME composes while the name is typed (vanilla-autokana; the Jaipur
// mehndi draws a kanji name in Latin letters from it), with nothing on the screen that asks for it or shows it. The IME is
// driven through Chromium's DevTools protocol: the composition grows kana by kana, as a phone's or a PC's IME shows it,
// then 太一 is committed in its place.

/** Lets the page's timers run past the library's check of the field (every 30 ms while it has the focus). */
const afterCheck = (page: Page) => page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 120)));

test("saves the reading of a kanji name typed through the IME on the title screen, with no field for it", { tag: tier.gate }, async ({ page, context }) => {
  await page.goto("/");
  await ops.chooseJourney(page, "golden_triangle");
  const form = page.locator("form.name-form");
  // The form has the two names and their defaults' line, as before the reading: nothing about it.
  await expect(form.getByRole("textbox")).toHaveCount(2);
  await expect(form).not.toContainText(/ローマ字|つづり|読み|ふりがな|フリガナ/u);
  const field = page.getByLabel("主人公の名前");
  await field.focus();
  const ime = await context.newCDPSession(page);
  for (const text of ["た", "たい", "たいち"]) {
    await ime.send("Input.imeSetComposition", { text, selectionStart: text.length, selectionEnd: text.length });
    await expect(field).toHaveValue(text);
    await afterCheck(page);
  }
  await ime.send("Input.insertText", { text: "太一" });
  await expect(field).toHaveValue("太一");
  await afterCheck(page);
  await page.getByLabel("ヒロインの名前").fill("澪");
  const start = ops.startButton(page);
  await expect(start).toHaveAccessibleName(ops.startLabel);
  await start.click();
  // The journey's opening movie, skipped as a player may (a browser that cannot play it ends it by itself).
  if (await page.getByTestId("opening-movie").isVisible().catch(() => false))
    await page.getByTestId("opening-movie-skip").click().catch(() => undefined);
  await expect.poll(async () => (await readSave(page, "golden_triangle"))?.playerName ?? null).toBe("太一");
  expect(await readSave(page, "golden_triangle")).toMatchObject({ playerName: "太一", heroineName: "澪", playerNameReading: "たいち" });
});
