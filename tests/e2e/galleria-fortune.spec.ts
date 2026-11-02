import { expect, test } from "@playwright/test";
import { advanceDialogue, expectNoOverflow, saved, setDialogueSpeed, startNewGame } from "./helpers";
import { skipTourismGuide } from "./tourism-helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 780 }, actionTimeout: 10_000 });

test("Galleria encounter interrupts the route and returns to observation before battle", async ({ page }) => {
  test.setTimeout(120_000);
  await startNewGame(page);
  await page.getByTestId("travel-place-p_galleria").getByRole("button").click();
  await skipTourismGuide(page);
  await expect(page.getByText("床の雄牛を見ている親子に話しかける")).toHaveCount(0);
  const before = await saved(page);
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeEncounter?.encounterId).toBe("galleria_fortune");
  expect((await saved(page)).activeBattle).toBeNull();
  await setDialogueSpeed(page, "0");
  await page.reload();
  expect((await saved(page)).activeEncounter?.encounterId).toBe("galleria_fortune");

  for (let turn = 0; turn < 80; turn++) {
    const state = await saved(page);
    const encounter = state.activeEncounter;
    if (!encounter) break;
    if (encounter.frame.choices.length) {
      // The balance belongs in the persistent status bar, not over dialogue controls.
      await expect(page.getByLabel(`旅の予算 ${state.travelBudget}ユーロ`)).toHaveCount(1);
      await expect(page.getByTestId("encounter-screen").locator(".encounter-dialogue")).not.toContainText(`€${state.travelBudget}`);
      expect(encounter.frame.choices.map((choice) => choice.text)).toEqual([
        "I'll keep count for you.", "I'd rather make my own luck.", "I'll leave the bull in peace.",
      ]);
      await page.getByRole("button", { name: "Aを選ぶ", exact: true }).click();
    } else if (encounter.frame.ended) {
      await page.getByRole("button", { name: /観光に戻る/ }).click();
    } else {
      await advanceDialogue(page);
    }
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  const resumed = await saved(page);
  expect(resumed.activeEncounter).toBeNull();
  expect(resumed.activeTourism?.landmarkId).toBe(before.activeTourism?.landmarkId);
  expect(resumed.activeTourism?.phase).toBe("exploring");
  expect(resumed.inventory).toEqual(before.inventory);
  await page.reload();
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.battleId).toBe("milano_galleria_01");
});

test("deferring the repeatable conversation does not loop after reload", async ({ page }) => {
  test.setTimeout(120_000);
  await startNewGame(page);
  await page.getByTestId("travel-place-p_galleria").getByRole("button").click();
  await skipTourismGuide(page);
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await setDialogueSpeed(page, "0");
  for (let turn = 0; turn < 80; turn++) {
    const state = await saved(page);
    const encounter = state.activeEncounter;
    if (!encounter) break;
    if (encounter.frame.choices.length) await page.getByRole("button", { name: "Cを選ぶ", exact: true }).click();
    else if (encounter.frame.ended) await page.getByRole("button", { name: /観光に戻る/ }).click();
    else await advanceDialogue(page);
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  expect((await saved(page)).activeTourism?.phase).toBe("exploring");
  await page.reload();
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.battleId).toBe("milano_galleria_01");
});
