import { debugGame, expect, ops, test, tier } from "./helpers";

// 旅の図鑑 (2026-11-13 user decision) on the sample journey's fictional 三時パン: Debug opens the market's guide (lane 3,
// docs/10「Debugを場面の起動台にする」), whose first line shows its photo above the window and whose second line names the
// term (# term:). Its card shows under the window with that line, the first time (2026-11-28 user decision: small, with
// the line, no turn of its own), and goes with it; 旅の図鑑 in ≡メニュー then has the term, with the dots that say it is
// new and its 「NEW」. Its photo's credit is not in 旅の図鑑 but in 出典・権利の一覧 (2026-11-15). The sample is built only into the sample tier's server
// (playwright.sample.config.ts), so this runs there, through Debug as the @debug tier does. The recording rule (once a
// save, not shown during 高速送り, the save's round trip) is src/domain/glossary.test.ts's.

const TERM = "smp_term_mihon_sanji_pan";
/** The credit of the term's photo (the sample's tourism/catalog.json). */
const CREDIT = "Dreamscape 見本の旅のための自作画像（架空の街）";

test("旅の図鑑: a term's card shows under the window with its first line and goes with it, and the term waits in 旅の図鑑 with its NEW marks", { tag: tier.sample }, async ({ page }) => {
  await ops.openDebugScene(page, { cityId: "mihon", scene: "tourism", id: "mihon_market", progress: "initial", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  const line = page.getByTestId("dialogue-text");
  const cards = page.getByTestId("line-card");
  const guide = page.getByTestId("tourism-guide");
  const photo = page.getByTestId("photo-show");
  // The first line's photo (# photo:) shows with the line, above the window (2026-11-28): the line is written at once.
  await expect(photo).toBeVisible();
  await expect(line).toHaveAttribute("data-ready", "true");
  const print = (await photo.locator("figure").boundingBox())!;
  const window = (await guide.boundingBox())!;
  expect(print.y + print.height).toBeLessThanOrEqual(window.y + 1);
  // The guide's first line names no term: no card, and the menu has no dot.
  await expect(cards).toHaveCount(0);
  await expect(ops.settingsButton(page)).toHaveAccessibleName("メニュー");

  // The second line names 三時パン: its card shows under the window with the line (the line itself as it is, at once),
  // its words said to readers (a status region), and nothing to press on it.
  await ops.settled(page);
  await line.focus();
  await page.keyboard.press("Enter");
  await expect(cards).toHaveCount(1);
  await expect(photo).toHaveCount(0);
  const card = cards.first();
  await expect(card).toContainText("三時パン");
  await expect(card).toContainText("さんじパン");
  await expect(card).toContainText("見本の街の朝市で焼く架空の丸パン。");
  await expect(card.getByRole("img")).toHaveAttribute("alt", /三時パン/u);
  await expect(page.getByRole("status").filter({ has: card })).toContainText("旅の図鑑：三時パン");
  expect(await card.evaluate((element) => element.tagName)).toBe("BUTTON");
  await expect(line).toHaveAttribute("data-ready", "true");
  const cardBox = (await card.boundingBox())!;
  const windowBox = (await guide.locator(".vn-window").boundingBox())!;
  expect(cardBox.y).toBeGreaterThanOrEqual(windowBox.y + windowBox.height);
  const shown = (await debugGame(page))!;
  expect(shown.glossary).toEqual([TERM]);
  expect(shown.activeTourism?.frame?.termIds).toEqual([TERM]);
  expect(await line.textContent()).toContain("三時パン");

  // Reading on: the card goes with its line. The next line names 三時パン again: a tab with its name only (2026-11-28).
  await ops.settled(page);
  await line.focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await debugGame(page))!.revision).toBeGreaterThan(shown.revision);
  await expect(cards).toHaveCount(0);
  const tab = page.getByTestId("line-mention");
  await expect(tab).toHaveCount(1);
  await expect(tab).toHaveAccessibleName("旅の図鑑：三時パン");
  await ops.settled(page);

  // ≡メニュー and its 「ノート」 carry the dot of something new; the note opens on 旅の図鑑 (the page with something new),
  // which shows the term with 「NEW」 and 1 / 1.
  await expect(ops.settingsButton(page)).toHaveAccessibleName(/旅の図鑑に新しい項目あり/u);
  const panel = await ops.openMenu(page);
  await expect(panel.getByRole("button", { name: /^ノート\s*、旅の図鑑に新しい項目あり$/u })).toBeVisible();
  await ops.menuItem(page, "ノート");
  const book = page.getByRole("dialog", { name: "ノート" });
  await expect(book).toBeVisible();
  await expect(book.getByTestId("note-tab-glossary")).toHaveAttribute("aria-pressed", "true");
  await expect(book.getByTestId("glossary-progress")).toContainText("1 / 1");
  const entry = book.getByTestId(`glossary-card-${TERM}`);
  await expect(entry).toContainText("三時パン");
  await expect(entry).toContainText("NEW");
  await expect(entry).toHaveAccessibleName(/三時パン\s*、新しい言葉/u);
  // Larger: the photo and the line, with no credit under them (2026-11-15 user decision; the click waits for the dialog to
  // take presses: Modal's settlePresses).
  await entry.click();
  const larger = page.getByRole("dialog", { name: "三時パン", exact: true });
  await expect(larger.getByTestId("glossary-entry-photo")).toBeVisible();
  await expect(larger).toContainText("見本の街の朝市で焼く架空の丸パン。");
  await expect(larger).not.toContainText(CREDIT);
  await expect(larger.locator("a")).toHaveCount(0);
  await larger.getByRole("button", { name: "閉じる", exact: true }).click();
  // The note's other page, 旅のことば (2026-11-20: the words of the country, 英語ノートの「その国の言葉」 until then).
  await book.getByTestId("note-tab-words").click();
  await expect(book.getByTestId("note-tab-words")).toHaveAttribute("aria-pressed", "true");
  await expect(book).toContainText("物語で覚えたその国の言葉です");
  await page.getByTestId("note-close").click();
  await expect(book).toHaveCount(0);
  // Seen: the dots are gone, and the card does not come back for the term.
  await expect(ops.settingsButton(page)).toHaveAccessibleName("メニュー");
  await expect(card).toHaveCount(0);

  // The tab opens the term larger over the line, which waits; closing it goes back to the same line.
  const lineText = await line.textContent();
  const revision = (await debugGame(page))!.revision;
  await tab.click();
  const opened = page.getByRole("dialog", { name: "三時パン", exact: true });
  await expect(opened).toContainText("見本の街の朝市で焼く架空の丸パン。");
  await page.getByTestId("glossary-entry-close").click();
  await expect(opened).toHaveCount(0);
  await expect(line).toHaveText(lineText!);
  expect((await debugGame(page))!.revision).toBe(revision);

  // The photo's credit: 画面の出典 → 出典・権利の一覧 lists it with the journey's photos, with its licence.
  const credits = await ops.openCredits(page, "menu");
  const journey = credits.getByTestId("credits-journey-sample_trip");
  await journey.locator("summary").click();
  const credit = journey.getByRole("listitem").filter({ hasText: "見本の街の架空のパン「三時パン」を描いた簡単な絵。" });
  await expect(credit).toContainText(CREDIT);
  await expect(credit.getByRole("link", { name: "CC0 1.0", exact: true })).toHaveAttribute("href", "https://creativecommons.org/publicdomain/zero/1.0/");
});

// 旅のことば (2026-11-27 user decision: as 旅の図鑑's card; 2026-11-28: under the window, with the line): the clock tower's
// guide teaches the sample's fictional Trisól on its fifth line. Its card shows under the window with the line (written
// at once), with 旅のことば's mark for readers, the word, its reading and meaning; nothing is saved for it.
test("旅のことば: a word's card shows under the window with its line", { tag: tier.sample }, async ({ page }) => {
  await ops.openDebugScene(page, { cityId: "mihon", scene: "tourism", id: "mihon_clock_tower", progress: "initial", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  const line = page.getByTestId("dialogue-text");
  const cards = page.getByTestId("line-card");
  for (let read = 0; read < 8 && await cards.count() === 0; read++) {
    await ops.settled(page);
    await expect(line).toHaveAttribute("data-ready", "true");
    await line.focus();
    await page.keyboard.press("Enter");
  }
  await expect(cards).toHaveCount(1);
  const card = cards.first();
  await expect(card).toHaveAttribute("data-kind", "word");
  await expect(card).toContainText("Trisól");
  await expect(card).toContainText("トリソル");
  await expect(card).toContainText("三時に会おう");
  await expect(page.getByRole("status").filter({ has: card })).toContainText("旅のことば：Trisól");
  await expect(line).toHaveAttribute("data-ready", "true");
  await expect(line).toContainText("Trisól");

  // A press on the card opens the word larger (2026-11-28), and the line waits under it.
  const revision = (await debugGame(page))!.revision;
  await card.click();
  const entry = page.getByRole("dialog", { name: "Trisól" });
  await expect(entry).toContainText("トリソル");
  await expect(entry).toContainText("三時に会おう");
  await page.keyboard.press("Escape");
  await expect(entry).toHaveCount(0);
  expect((await debugGame(page))!.revision).toBe(revision);
});
