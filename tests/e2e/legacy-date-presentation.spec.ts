import { expect, test } from "@playwright/test";
import phase1 from "../fixtures/phase1-saves.json" with { type: "json" };
import catalog from "../../content/romance/date_catalog.json" with { type: "json" };
import { choose, loadSnapshot, saved, setDialogueSpeed } from "./helpers";

test("an older cafe save retains its actual script and expression without inventing a location", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const date = catalog.dates.find((item) => item.id === "milano_cafe_01")!;
  expect(date.storyId).not.toBe("milano/cafe_01");
  expect("legacyStoryIds" in date && date.legacyStoryIds).toContain("milano/cafe_01");
  expect("destinationId" in date && date.destinationId).toBeTruthy();

  await loadSnapshot(page, phase1.beforeChoice);
  await setDialogueSpeed(page, "0");
  const scene = page.getByTestId("romance-scene");
  await expect(scene).toBeVisible();
  await expect(scene.getByTestId("date-destination")).toHaveCount(0);
  const portrait = scene.locator(".vn-character img");
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  const ap = (await saved(page)).ap;
  await choose(page, 0);
  const chosen = await saved(page);
  expect(chosen.activeDate?.storyHash).toBe(phase1.beforeChoice.activeDate!.storyHash);
  expect(chosen.activeDate?.frame.text).toBe("「……迷子を予約する人、初めて見た」");
  expect(chosen.ap).toBe(ap);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
  await page.reload();
  expect(await saved(page)).toEqual(chosen);
  await expect(page.getByTestId("date-destination")).toHaveCount(0);
  await expect(portrait).toHaveAttribute("src", /\/default_01\/standing_01\/smile\.png$/);
});
