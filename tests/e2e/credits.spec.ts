import { readFileSync } from "node:fs";
import { expect, generated, ops, test, tier } from "./helpers";

// 「出典・権利の一覧」 (WP20b, decisions D1–D7): the photos of every journey, the map, the fonts and,
// in the production build only, the libraries' licences from dist/third-party-licenses.json.
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
  const library = credits.getByTestId("credits-licences").getByRole("listitem")
    .filter({ has: page.getByText(`${react.name} ${react.version}（${react.identifier}）`, { exact: true }) });
  await library.locator("summary").click();
  await expect(library.locator("pre")).toContainText(react.text.split("\n")[0]);
  await page.keyboard.press("Escape");
  await expect(credits).toBeHidden();
  await expect(page.getByRole("main").getByRole("button", { name: "出典・権利の一覧", exact: true })).toBeFocused();
});

test("「出典・権利の一覧」 opens from the title and from ゲームの設定 with the keyboard, says where the library list appears, and gives the focus back", { tag: tier.gate }, async ({ page }) => {
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

  // From ゲームの設定 it opens over the settings and closes back to them where they were, the focus on its entry
  // (2026-11-14 user decision), by Esc or by a tap on the dimmed page around it.
  await ops.startJourney(page);
  const settings = await ops.openSettings(page);
  const settingsEntry = settings.getByRole("button", { name: "出典・権利の一覧", exact: true });
  await settingsEntry.focus();
  const scrolled = await settings.evaluate((dialog) => dialog.scrollTop);
  expect(scrolled, "the entry lies below the settings' first screen").toBeGreaterThan(0);
  await page.keyboard.press("Enter");
  const fromSettings = page.getByRole("dialog", { name: "出典・権利の一覧" });
  await expect(fromSettings.getByRole("button", { name: "閉じる", exact: true })).toBeFocused();
  await expect(settings).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fromSettings).toBeHidden();
  await expect(settings).toBeVisible();
  await expect(settingsEntry).toBeFocused();
  expect(await settings.evaluate((dialog) => dialog.scrollTop)).toBe(scrolled);
  await settingsEntry.click();
  await expect(fromSettings).not.toHaveAttribute("data-settling");
  await ops.tapAt(page, { x: 4, y: (page.viewportSize()!.height) / 2 });
  await expect(fromSettings).toBeHidden();
  await expect(settings).toBeVisible();
  await ops.settled(page);
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();
  await expect(ops.settingsButton(page)).toBeFocused();
});
