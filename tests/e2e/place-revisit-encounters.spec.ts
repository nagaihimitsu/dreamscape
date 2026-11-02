import { expect, test } from "@playwright/test";
import { loadCurrentGalleriaFreeTime, saved, startNewGame } from "./helpers";

test("a completed visit cannot be replayed even with an unplayed local encounter", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  const state = await saved(page);
  expect(state.completedEpisodeIds).toContain("milano_duomo_episode");
  expect(state.completedEncounterIds).not.toContain("duomo_string");
  const other = page.getByText("ほかの行き先を見る", { exact: true });
  if (await other.isVisible()) await other.click();
  const place = page.getByTestId("travel-place-p_duomo");
  if (await place.isVisible()) await expect(place).not.toContainText("観光");
  await expect(page.getByRole("button", { name: "ドゥオモ広場を観察する", exact: true })).toHaveCount(0);
});
