import { readFileSync } from "node:fs";
import { expect, generated, journeyCatalog, ops, test, tier } from "./helpers";
import { journeyFilesShip } from "../../src/content/journey-catalog";

// 「出典・権利の一覧」 (WP20b, decisions D1–D7): the photos of every journey (in the production build, of the journeys
// whose photos it serves: 2026-11-16), the map, the fonts and, in the production build only, the libraries' licences
// from dist/third-party-licenses.json.
type CatalogAsset = { id: string; sourceUrl: string };
const duomo = () => {
  const asset = generated<{ assets: CatalogAsset[] }>("tourism/catalog.json").assets.find((item) => item.id === "duomo_milano_photo")!;
  const fileName = decodeURIComponent(new URL(asset.sourceUrl).pathname.replace("/wiki/File:", "")).replaceAll("_", " ");
  return { asset, fileName };
};

test("the title's 「出典・権利の一覧」 lists a photo with its source, the map and the production build's library licences", { tag: tier.prod }, async ({ page }) => {
  // Read here, not at load: the production tier's server builds dist/ before the tests run.
  const licences = JSON.parse(readFileSync("dist/third-party-licenses.json", "utf8")) as { name: string; version: string; identifier: string; text: string }[];
  const react = licences.find((licence) => licence.name === "react")!;
  await page.goto("/");
  const credits = await ops.openCredits(page, "title");
  await credits.getByTestId("credits-journey-milano").locator("summary").click();
  const { asset, fileName } = duomo();
  await expect(credits.getByRole("link", { name: `元の画像：${fileName}`, exact: true })).toHaveAttribute("href", asset.sourceUrl);
  await expect(credits.getByTestId("credits-map")).toContainText("地図データ © OpenStreetMap contributors");
  // The build serves no photo of a journey players cannot open yet, so it lists none of theirs (2026-11-16).
  for (const journey of journeyCatalog().journeys.filter((item) => !journeyFilesShip(item)))
    await expect(credits.getByTestId(`credits-journey-${journey.id}`)).toHaveCount(0);
  await expect(credits.locator("summary").filter({ hasText: "（準備中・" })).toHaveCount(0);
  const library = credits.getByTestId("credits-licences").getByRole("listitem")
    .filter({ has: page.getByText(`${react.name} ${react.version}（${react.identifier}）`, { exact: true }) });
  await library.locator("summary").click();
  await expect(library.locator("pre")).toContainText(react.text.split("\n")[0]);
  await page.keyboard.press("Escape");
  await expect(credits).toBeHidden();
  await expect(page.getByRole("main").getByRole("button", { name: "出典・権利の一覧", exact: true })).toBeFocused();
});

test("「出典・権利の一覧」 opens from the title and from 画面の出典 with the keyboard, says where the library list appears, and gives the focus back", { tag: tier.gate }, async ({ page }) => {
  await page.goto("/");
  const entry = page.getByRole("main").getByRole("button", { name: "出典・権利の一覧", exact: true });
  await entry.focus();
  await page.keyboard.press("Enter");
  const credits = page.getByRole("dialog", { name: "出典・権利の一覧" });
  await expect(credits.getByRole("button", { name: "閉じる", exact: true })).toBeFocused();
  await expect(credits.getByText("公開版（本番ビルド）では、ここに一覧が出ます。", { exact: false })).toBeVisible();
  await expect(credits.locator("summary").filter({ hasText: "（準備中・" }).first()).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(credits).toBeHidden();
  await expect(entry).toBeFocused();

  // In play, ≡メニュー's 「画面の出典」 has the way into it at its foot (ゲームの設定 until 2026-11-20): it opens over
  // 画面の出典 and closes back to it, the focus on its entry, by Esc or by a tap on the dimmed page around it.
  await ops.startJourney(page);
  await ops.menuItem(page, "画面の出典");
  const screen = page.getByRole("dialog", { name: "画面の出典" });
  const screenEntry = screen.getByRole("button", { name: "出典・権利の一覧", exact: true });
  await screenEntry.focus();
  await page.keyboard.press("Enter");
  const fromScreen = page.getByRole("dialog", { name: "出典・権利の一覧" });
  await expect(fromScreen.getByRole("button", { name: "閉じる", exact: true })).toBeFocused();
  await expect(screen).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fromScreen).toBeHidden();
  await expect(screen).toBeVisible();
  await expect(screenEntry).toBeFocused();
  await screenEntry.click();
  await expect(fromScreen).not.toHaveAttribute("data-settling");
  await ops.tapAt(page, { x: 4, y: (page.viewportSize()!.height) / 2 });
  await expect(fromScreen).toBeHidden();
  await expect(screen).toBeVisible();
  await ops.settled(page);
  await page.keyboard.press("Escape");
  await expect(screen).toBeHidden();
  await expect(ops.settingsButton(page)).toBeFocused();
});
