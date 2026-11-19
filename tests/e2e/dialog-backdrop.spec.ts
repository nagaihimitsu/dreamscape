import { expect, ops, test, tier, type Page } from "./helpers";

// A dialog for viewing closes when the dimmed page around it is tapped (2026-11-14 user decision), as the finger lifts:
// iPhone Safari does not always send a click for such a tap (2026-11-15), so Modal closes on the pointer's release.
// Tagged @smoke too, so the WebKit run (playwright.webkit.config.ts, an iPhone's touch) checks it.

/** A point on the dimmed page: above the dialog if there is room there, else below it. */
async function besideDialog(page: Page) {
  const box = (await page.locator("dialog[open]").last().boundingBox())!;
  const viewport = page.viewportSize()!;
  const y = box.y > 8 ? box.y / 2 : (box.y + box.height + viewport.height) / 2;
  return { x: viewport.width / 2, y };
}

async function tapsAreFree(page: Page) {
  await expect(page.locator("html[data-tap-hold]")).toHaveCount(0);
}

test("a tap on the dimmed page closes 旅の記録 and the map, never the settings", { tag: [tier.gate, tier.smoke] }, async ({ page }) => {
  await ops.startJourney(page, "milano");
  const dialog = page.locator("dialog[open]");

  await ops.menuItem(page, "旅の記録");
  await expect(dialog).toHaveCount(1);
  // 旅の記録 opens under the finger and waits a moment before it takes presses (Modal's settlePresses).
  await expect(page.locator("dialog[open][data-settling]")).toHaveCount(0);
  const outsideAlbum = await besideDialog(page);
  await page.touchscreen.tap(outsideAlbum.x, outsideAlbum.y);
  await expect(dialog, "旅の記録 closes").toHaveCount(0);
  await tapsAreFree(page);

  await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: /^地図/u }).click();
  await expect(dialog).toHaveCount(1);
  const outsideMap = await besideDialog(page);
  await page.touchscreen.tap(outsideMap.x, outsideMap.y);
  await expect(dialog, "the map closes").toHaveCount(0);
  await tapsAreFree(page);

  // ゲームの設定 has the name fields: a tap beside it keeps it open, as a confirmation's does.
  const settings = await ops.openSettings(page);
  const outsideSettings = await besideDialog(page);
  await page.touchscreen.tap(outsideSettings.x, outsideSettings.y);
  await expect(settings, "the settings stay open").toBeVisible();
});
