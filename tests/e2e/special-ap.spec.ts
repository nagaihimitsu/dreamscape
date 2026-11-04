import { expect, test } from "@playwright/test";
import { availableAp, saved, selectTravelEvent, setDialogueSpeed, startGuideBattle, startNewGame } from "./helpers";
import { finishAutomaticEncounters } from "./battle-helpers";
import { finishTourismGuide } from "./tourism-helpers";
import { playStoryBattle, storyBattle } from "./reasoning-helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 780 } });

for (const format of ["B", "C"] as const) {
  for (const readGuide of [true, false]) {
    test(`${format}: ${readGuide ? "read guide and two correct answers earn four AP" : "skip guide and low score earn two AP"}`, async ({ page }) => {
      test.setTimeout(120_000);
      const { battle } = storyBattle(format);
      await startNewGame(page);
      await setDialogueSpeed(page, "0");
      await selectTravelEvent(page, battle.id);
      const routeDialog = page.getByRole("dialog", { name: /へ$/ });
      if (await routeDialog.isVisible()) await routeDialog.getByRole("button", { name: /^徒歩 / }).click();
      await expect(page.getByTestId("tourism-guide")).toBeVisible();
      expect((await saved(page)).activeTourism?.landmarkId).toBe(battle.landmarkId);
      if (readGuide) {
        await finishTourismGuide(page);
        expect(availableAp(await saved(page))).toBe(1);
        await page.reload();
        expect(availableAp(await saved(page))).toBe(1);
      }
      await startGuideBattle(page);
      await finishAutomaticEncounters(page);
      const { state } = await playStoryBattle(page, format, readGuide ? [true, true, false] : [true, false, false]);
      expect(availableAp(state)).toBe(readGuide ? 4 : 2);
      expect(state.battleRewardReceipt?.entries.map((entry) => entry.earnedAp)).toEqual(readGuide ? [1, 1, 1] : [1, 1]);
      expect(state.completedGuideIds.includes(battle.landmarkId!)).toBe(readGuide);
      await page.reload();
      const restored = await saved(page);
      expect(restored.claimedRewardIds).toEqual(state.claimedRewardIds);
      expect(restored.battleRewardReceipt).toEqual(state.battleRewardReceipt);
      expect(availableAp(restored)).toBe(availableAp(state));
      await page.getByRole("button", { name: "自由時間へ戻る", exact: true }).click();
      await expect(page.getByTestId(`travel-event-${battle.id}`)).toHaveCount(0);
      expect(availableAp(await saved(page))).toBe(availableAp(state));
    });
  }
}
