import { debugGame, expect, ops, test, tier } from "./helpers";

// 旅の図鑑 (2026-11-13 user decision) on the sample journey's fictional 三時パン: Debug opens the market's guide (lane 3,
// docs/10「Debugを場面の起動台にする」), whose second line names the term (# term:). Its card shows over the scene the
// first time; a tap anywhere closes it without reading on, and the focus comes back; 旅の図鑑 in ≡メニュー then has the term,
// with the dots that say it is new and its 「NEW」. Its photo's credit is not in 旅の図鑑 but in 出典・権利の一覧 (2026-11-15). The sample is built only into the sample tier's server
// (playwright.sample.config.ts), so this runs there, through Debug as the @debug tier does. The recording rule (once a
// save, not opened during 高速送り, the save's round trip) is src/domain/glossary.test.ts's.

const TERM = "smp_term_mihon_sanji_pan";
/** The credit of the term's photo (the sample's tourism/catalog.json). */
const CREDIT = "Dreamscape 見本の旅のための自作画像（架空の街）";

test("旅の図鑑: a term's card over its first line closes without reading on, and the term waits in 旅の図鑑 with its NEW marks", { tag: tier.sample }, async ({ page }) => {
  await ops.openDebugScene(page, { cityId: "mihon", scene: "tourism", id: "mihon_market", progress: "initial", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  const line = page.getByTestId("dialogue-text");
  const card = page.getByTestId("glossary-term-window");
  await expect(line).toHaveAttribute("data-ready", "true");
  // The guide's first line names no term: no card, and the menu has no dot.
  await expect(card).toHaveCount(0);
  await expect(ops.settingsButton(page)).toHaveAccessibleName("メニュー");

  // The second line names 三時パン (read on from the keyboard, so the focus is on the line): its card shows over the
  // scene, a dialog that says the name and the line, with the focus on it (it has no 「閉じる」 button).
  await ops.settled(page);
  await line.focus();
  await page.keyboard.press("Enter");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("aria-modal", "true");
  await expect(page.getByRole("dialog", { name: "三時パン" })).toHaveAccessibleDescription(/見本の街の朝市で焼く架空の丸パン。.*旅の図鑑に追加/u);
  await expect(card).toContainText("さんじパン");
  await expect(card.getByRole("img")).toHaveAttribute("alt", /三時パン/u);
  await expect(card).toBeFocused();
  await expect(card.getByRole("button")).toHaveCount(0);
  const shown = (await debugGame(page))!;
  expect(shown.glossary).toEqual([TERM]);
  expect(shown.activeTourism?.frame?.termIds).toEqual([TERM]);
  const text = await line.textContent();
  expect(text).toContain("三時パン");

  // A tap anywhere (here beside the card, over the scene) closes it; the line stays, nothing is saved, the focus is back.
  await ops.settled(page);
  const viewport = page.viewportSize()!;
  await page.mouse.click(12, Math.round(viewport.height / 2));
  await expect(card).toHaveCount(0);
  await ops.settled(page);
  expect((await debugGame(page))!.revision).toBe(shown.revision);
  await expect(line).toHaveText(text!);
  await expect(line).toBeFocused();

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

  // The photo's credit: 画面の出典 → 出典・権利の一覧 lists it with the journey's photos, with its licence.
  const credits = await ops.openCredits(page, "menu");
  const journey = credits.getByTestId("credits-journey-sample_trip");
  await journey.locator("summary").click();
  const photo = journey.getByRole("listitem").filter({ hasText: "見本の街の架空のパン「三時パン」を描いた簡単な絵。" });
  await expect(photo).toContainText(CREDIT);
  await expect(photo.getByRole("link", { name: "CC0 1.0", exact: true })).toHaveAttribute("href", "https://creativecommons.org/publicdomain/zero/1.0/");
});
