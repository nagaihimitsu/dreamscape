import { expect, test } from "@playwright/test";
import { finishCityArrival } from "./city-arrival-helpers";
import { expectNoOverflow, setDialogueSpeed } from "./helpers";

test("long destination names and route details remain readable on a phone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await setDialogueSpeed(page, "0");
  await finishCityArrival(page);
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 780 });
    const destinations = page.locator(".travel-destination-button");
    await expect(destinations.first()).toBeVisible();
    for (const button of await destinations.all()) {
      const title = button.locator(".travel-destination-title");
      const meta = button.locator(".travel-destination-meta");
      const titleBox = await title.boundingBox();
      const metaBox = await meta.boundingBox();
      expect(titleBox!.width).toBeGreaterThan(120);
      expect(titleBox!.height).toBeLessThan(65);
      expect(metaBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height - 1);
    }
    await expectNoOverflow(page);
    await page.screenshot({ path: `artifacts/travel-destinations-${width}.png`, fullPage: true });
  }
  await page.locator(".travel-destination-button").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
