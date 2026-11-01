import { expect, test } from "@playwright/test";
import castleCleared from "../fixtures/castle-clear-unplayed.json" with { type: "json" };
import { choose, expectNoOverflow, finishEvent, loadSnapshot, saved, setDialogueSpeed, startEvent } from "./helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 640 } });

test("a stranded player can complete a free recovery without losing a saved choice", async ({ page }) => {
  await loadSnapshot(page, {
    ...castleCleared, ap: 0, affection: -8,
    playedDateIds: ["milano_love_date_01"],
  });
  const before = await saved(page);
  const option = page.getByTestId("event-milano_recovery_01");
  await expect(option.getByRole("button")).toContainText("AP不要");
  await expect(option.getByRole("button")).toBeEnabled();
  await expectNoOverflow(page);
  await startEvent(page, "milano_recovery_01", 0);
  await setDialogueSpeed(page, "0");
  await choose(page, 0);
  const chosen = await saved(page);
  expect(chosen.activeDate?.resolvedChoices).toHaveLength(1);
  await page.reload();
  expect(await saved(page)).toEqual(chosen);
  await finishEvent(page, 1);
  const finished = await saved(page);
  expect(finished.ap).toBe(0);
  expect(finished.memories).toEqual(before.memories);
  expect(finished.claimedRewardIds).toEqual(before.claimedRewardIds);
  expect(finished.completedRecoveryCount).toBe(1);
  await expect(option.getByRole("button")).toBeEnabled();
  await expectNoOverflow(page);
});
