import { expect, test } from "@playwright/test";
import { finishCityArrival, readIndiaState } from "./city-arrival-helpers";
import { expectNoOverflow, setDialogueSpeed } from "./helpers";

test("Delhi opens with its logo, then a saved welcome without changing game values", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await page.getByRole("button", { name: "旅をはじめる" }).click();
  await expect(page.getByTestId("arrival-logo")).toBeVisible();
  await expect(page.getByTestId("arrival-logo")).toContainText("デリー");
  await expectNoOverflow(page);
  await page.screenshot({ path: "artifacts/golden-triangle-review/delhi-logo.png" });
  await expect.poll(async () => (await readIndiaState(page)).activeEpilogue?.logoComplete).toBe(true);
  await setDialogueSpeed(page, "0");
  await finishCityArrival(page);
  const saved = await readIndiaState(page);
  await page.reload();
  await page.getByLabel("旅行編").selectOption("golden_triangle");
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expect(page.getByTestId("arrival-logo")).toHaveCount(0);
  expect(await readIndiaState(page)).toEqual(saved);
});
