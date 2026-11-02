import { expect, test } from "@playwright/test";
import { advanceDialogue, expectNoOverflow, loadCurrentGalleriaFreeTime, saved, selectTravelEvent, setDialogueSpeed, startNewGame } from "./helpers";

test("an eligible Duomo encounter starts inside the revisited place and survives a reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 780 });
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  await selectTravelEvent(page, "milano_duomo_episode");
  const transport = page.getByRole("dialog", { name: /へ$/ });
  if (await transport.isVisible()) await transport.getByRole("button", { name: /^徒歩 / }).click();
  await expect.poll(async () => (await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  await expect(page.getByText("切れた三本目", { exact: true })).toHaveCount(0);
  await expectNoOverflow(page);
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeEncounter?.encounterId).toBe("duomo_string");
  await setDialogueSpeed(page, "0");
  await page.reload();
  expect((await saved(page)).activeEncounter?.encounterId).toBe("duomo_string");
  for (let turn = 0; turn < 80; turn++) {
    const state = await saved(page);
    const encounter = state.activeEncounter;
    if (!encounter) break;
    if (encounter.frame.choices.length) await page.getByRole("button", { name: "Cを選ぶ", exact: true }).click();
    else if (encounter.frame.ended) await page.getByRole("button", { name: /観光に戻る/ }).click();
    else await advanceDialogue(page);
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  expect((await saved(page)).activeTourism?.landmarkId).toBe("duomo_milano");
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).activeBattle?.battleId).toBe("milano_duomo_01");
});
