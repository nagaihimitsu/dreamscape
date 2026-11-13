import { debugGame, expect, ops, test, tier } from "./helpers";

// 旅の図鑑 (2026-11-13 user decision) on the sample journey's fictional 三時パン: Debug opens the market's guide (lane 3,
// docs/10「Debugを場面の起動台にする」), whose second line names the term (# term:). Its card shows over the scene the
// first time; a tap anywhere closes it without reading on, and the focus comes back; 旅の図鑑 in ⚙設定 then has the term,
// with the dots that say it is new and its 「NEW」. The sample is built only into the sample tier's server
// (playwright.sample.config.ts), so this runs there, through Debug as the @debug tier does. The recording rule (once a
// save, not opened during 高速送り, the save's round trip) is src/domain/glossary.test.ts's.

const TERM = "smp_term_mihon_sanji_pan";

test("旅の図鑑: a term's card over its first line closes without reading on, and the term waits in 旅の図鑑 with its NEW marks", { tag: tier.sample }, async ({ page }) => {
  await ops.openDebugScene(page, { cityId: "mihon", scene: "tourism", id: "mihon_market", progress: "initial", ap: 12, affection: 0, trust: 0, spark: 0, roll: "positive" });
  const line = page.getByTestId("dialogue-text");
  const card = page.getByTestId("glossary-term-window");
  await expect(line).toHaveAttribute("data-ready", "true");
  // The guide's first line names no term: no card, and the gear has no dot.
  await expect(card).toHaveCount(0);
  await expect(ops.settingsButton(page)).toHaveAccessibleName("設定");

  // The second line names 三時パン (read on from the keyboard, so the focus is on the line): its card shows over the
  // scene, a dialog that says the name and the line, with the focus on 「とじる」.
  await ops.settled(page);
  await line.focus();
  await page.keyboard.press("Enter");
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute("aria-modal", "true");
  await expect(page.getByRole("dialog", { name: "三時パン" })).toHaveAccessibleDescription(/見本の街の朝市で焼く架空の丸パン。.*旅の図鑑に追加/u);
  await expect(card).toContainText("さんじパン");
  await expect(card.getByRole("img")).toHaveAttribute("alt", /三時パン/u);
  await expect(page.getByTestId("glossary-term-close")).toBeFocused();
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

  // ⚙設定 and its 「旅の図鑑」 carry the dot of something new; 旅の図鑑 shows the term with 「NEW」 and 1 / 1.
  await expect(ops.settingsButton(page)).toHaveAccessibleName(/旅の図鑑に新しい項目あり/u);
  const panel = await ops.openMenu(page);
  await expect(panel.getByRole("button", { name: /^旅の図鑑\s*、新しい言葉あり$/u })).toBeVisible();
  await ops.menuItem(page, "旅の図鑑");
  const book = page.getByRole("dialog", { name: "旅の図鑑" });
  await expect(book).toBeVisible();
  await expect(book.getByTestId("glossary-progress")).toContainText("1 / 1");
  const entry = book.getByTestId(`glossary-card-${TERM}`);
  await expect(entry).toContainText("三時パン");
  await expect(entry).toContainText("NEW");
  await expect(entry).toHaveAccessibleName(/三時パン\s*、新しい言葉/u);
  // Larger, with the photo's credit (the click waits for the dialog to take presses: Modal's settlePresses).
  await entry.click();
  const larger = page.getByRole("dialog", { name: "三時パン", exact: true });
  await expect(larger.getByTestId("glossary-entry-photo")).toBeVisible();
  await expect(larger).toContainText("見本の街の朝市で焼く架空の丸パン。");
  await expect(larger).toContainText("Dreamscape 見本の旅のための自作画像（架空の街）");
  await larger.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByTestId("glossary-close").click();
  await expect(book).toHaveCount(0);
  // Seen: the dots are gone, and the card does not come back for the term.
  await expect(ops.settingsButton(page)).toHaveAccessibleName("設定");
  await expect(card).toHaveCount(0);
});
