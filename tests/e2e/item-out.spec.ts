import { expect, generated, test, tier } from "./helpers";

// A line's # item_out: (2026-11-15 user decision, 「品物を取り出す」) in Debug's 「音と演出の見本」 (the real card and the
// header's real way back into the bag, with plain values; no story, nothing saved): the first item of the generated
// catalog with at least two lines written on it, taken out at its city's start. Its card shows those lines as the held
// items' detail does (a conditional line waits), a line number highlights its line without the card coming in again,
// screen readers hear it once through the scene's status region, and the next line without the tag takes it away (the
// phone's reduced motion: at once, no copy on its way). The tag's form, its frames and the build's checks are unit tests
// (src/content/story-tags-atmosphere.test.ts, src/components/item-out.test.ts, scripts/scene-effect-tags.test.ts); the
// sample journey's scene with the tag is played in sample-journey.spec.ts. Development server only.

type CatalogItem = { id: string; cityId: string; nameJa: string; linesJa?: (string | { textJa: string })[] };
/** A line as screen readers hear it: a sentence of its own (src/components/item-out.ts). */
const sentence = (line: string) => (/[。．.！!？?…」』）)]$/u.test(line) ? line : `${line}。`);

test("# item_out: the card shows the item's lines, highlights the line read, and goes with the next line", { tag: tier.debug }, async ({ page }) => {
  const item = generated<{ items: CatalogItem[] }>("encounters/catalog.json").items
    .find((entry) => (entry.linesJa ?? []).filter((line) => typeof line === "string").length >= 2);
  expect(item, "an item with two lines or more written on it").toBeDefined();
  // At a city's start a conditional line does not show yet.
  const lines = item!.linesJa!.filter((line): line is string => typeof line === "string");

  await page.goto("/?debug");
  await page.getByTestId("debug-open-effects-room").click();
  await page.getByLabel("見本の都市").selectOption(item!.cityId);
  await page.getByTestId("effects-room-item-out-item").selectOption(item!.id);
  const card = page.getByTestId("item-out");
  const words = page.getByTestId("item-out-words");
  await expect(card).toHaveCount(0);
  await expect(words).toHaveText("");

  // Taken out: its picture's name and its lines, none highlighted; said once, the card itself never focused.
  await page.getByTestId("effects-room-item-out").click();
  await expect(card).toBeVisible();
  await expect(card).toContainText(item!.nameJa);
  await expect(card.locator("li")).toHaveText(lines);
  await expect(card.locator("li[data-highlighted]")).toHaveCount(0);
  await expect(words).toHaveText(`${item!.nameJa}を取り出した。${lines.map(sentence).join("")}`);
  expect(await card.evaluate((element) => !!element.closest("[aria-hidden='true']") && !element.querySelector("[tabindex], button, a"))).toBe(true);
  // Above the dialogue window, never over it.
  const box = (await card.boundingBox())!;
  const dialogueWindow = (await page.locator(".effects-room-window").boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(dialogueWindow.y);

  // The next line reads its second line: the highlight moves to it, on the same card (it does not come in again).
  await card.evaluate((element) => element.setAttribute("data-test-same", ""));
  await page.getByTestId("effects-room-item-out-line").selectOption("2");
  await page.getByTestId("effects-room-item-out").click();
  await expect(card.locator("li").nth(1)).toHaveAttribute("data-highlighted", "true");
  await expect(card.locator("li[data-highlighted]")).toHaveCount(1);
  await expect(card).toHaveAttribute("data-test-same", "");
  await expect(words).toHaveText(sentence(lines[1]));

  // A line without the tag: the card goes at once (reduced motion), and the status region is emptied for the next one.
  await page.getByTestId("effects-room-item-out-next").click();
  await expect(card).toHaveCount(0);
  await expect(page.locator(".item-out-leaving")).toHaveCount(0);
  await expect(words).toHaveText("");
});
