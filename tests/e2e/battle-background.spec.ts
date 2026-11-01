import { expect, test } from "@playwright/test";
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, openRevisits, saved, setDialogueSpeed } from "./helpers";

test("battle background credits remain accessible without advancing the story", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await loadSnapshot(page, phase7.cityClearViewed);
  await openRevisits(page);
  await page.getByTestId("revisit-battle-milano_city_boss_01").click();
  await setDialogueSpeed(page, "0");
  const image = page.locator(".battle-backdrop .canal-scene img");
  await expect(image).toHaveAttribute("src", /darsena\.webp$/);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBe(1600);
  // An opaque stage can cover a successfully loaded image; check the actual
  // compositing surface as well as the image URL and dimensions.
  const stage = page.locator(".battle-stage.finale-stage");
  await expect(stage).toHaveCSS("background-image", "none");
  await expect(stage).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expectNoOverflow(page);
  await page.screenshot({ path: testInfo.outputPath("battle-darsena-mobile.png") });
  await page.getByRole("button", { name: "自動送り", exact: true }).click();
  await page.getByText("会話の操作", { exact: true }).click();
  const before = await saved(page);
  const trigger = page.getByRole("button", { name: "背景画像を見る", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "背景画像" });
  await dialog.getByText("画像の説明・出典と利用条件").click();
  await expect(dialog).toContainText("Jwslubbock");
  await expect(dialog.getByRole("link", { name: /CC BY-SA 3.0/ })).toHaveAttribute("href", /creativecommons\.org/);
  await expectNoOverflow(page);
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("button", { name: "自動送り", exact: true })).toHaveAttribute("aria-pressed", "false");
  expect(await saved(page)).toEqual(before);
});
