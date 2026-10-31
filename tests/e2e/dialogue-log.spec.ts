import { expect, test } from "@playwright/test";
import { saved, startLegacyJourney } from "./helpers";
import { openTourismFromEntry } from "./tourism-helpers";

test.use({ reducedMotion: "reduce" });

test("guide log contains only displayed lines, leaves the save untouched, and resets for a replay", async ({ page }) => {
  await startLegacyJourney(page);
  await openTourismFromEntry(page);
  const guide = page.getByTestId("tourism-guide");
  const first = (await saved(page)).activeTourism!.frame!.text;
  const openLog = guide.getByRole("button", { name: "会話ログ" });
  const before = await saved(page);
  await openLog.click();
  const dialog = page.getByRole("dialog", { name: "会話ログ" });
  await expect(dialog).toContainText(first);
  expect(await saved(page)).toEqual(before);
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(openLog).toBeFocused();

  await page.getByTestId("tourism-advance").click();
  const second = (await saved(page)).activeTourism!.frame!.text;
  expect(second).not.toBe(first);
  await openLog.click();
  await expect(dialog).toContainText(first);
  await expect(dialog).toContainText(second);
  await page.keyboard.press("Escape");
  await page.getByTestId("tourism-skip").click();
  await page.getByTestId("guide-replay").click();
  await page.getByTestId("tourism-guide").getByRole("button", { name: "会話ログ" }).click();
  await expect(dialog).toContainText(first);
  await expect(dialog).not.toContainText(second);
});
