import { expect, test, type Page } from "@playwright/test";
import { advanceDialogue, expectNoOverflow, loadCurrentGalleriaFreeTime, saved, selectTravelEvent, setDialogueSpeed, startNewGame } from "./helpers";
import { cityEpisodes, playCityBattle } from "./city-helpers";

async function open(page: Page) {
  if ((await saved(page)).activeTourism) {
    await page.getByRole("button", { name: "進む", exact: true }).click();
    await playCityBattle(page, cityEpisodes[1], 0);
    await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
  }
  const before = await saved(page);
  await selectTravelEvent(page, "milano_galleria_episode");
  const transport = page.getByRole("dialog", { name: /へ$/ });
  if (await transport.isVisible()) await transport.getByRole("button", { name: /^徒歩 / }).click();
  await page.getByRole("button", { name: "進む", exact: true }).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  await setDialogueSpeed(page, "0");
}

async function advanceToChoice(page: Page) {
  for (let i = 0; i < 40; i++) {
    const state = await saved(page);
    expect(state.activeEncounter).not.toBeNull();
    if (state.activeEncounter!.frame.choices.length && state.activeEncounter!.phase === "story") return;
    await advanceDialogue(page);
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Encounter choice was not reached");
}

async function choose(page: Page, label: "A" | "B" | "C") {
  const before = await saved(page);
  const button = page.getByRole("button", { name: `${label}を選ぶ`, exact: true });
  await expect(button).toBeEnabled();
  await button.evaluate((element: HTMLButtonElement) => { element.click(); element.click(); });
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
}

async function finish(page: Page) {
  for (let i = 0; i < 50; i++) {
    const state = await saved(page);
    if (!state.activeEncounter) return;
    if (state.activeEncounter.frame.ended && state.activeEncounter.phase !== "feedback" && state.activeEncounter.phase !== "quiz")
      await page.getByRole("button", { name: /観光に戻る/ }).click();
    else if (state.activeEncounter.phase === "feedback") await page.getByRole("button", { name: /^続きを読む/ }).click();
    else await advanceDialogue(page);
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Encounter did not finish");
}

async function toQuiz(page: Page) {
  for (let i = 0; i < 50; i++) {
    const state = await saved(page);
    if (state.activeEncounter?.phase === "quiz") return;
    await advanceDialogue(page);
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Cultural quiz was not reached");
}

test("the Galleria encounter and its rewards survive reload without duplication", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(0); return array; }) as typeof original;
  });
  await page.setViewportSize({ width: 360, height: 780 });
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  const initial = await saved(page);
  await open(page);
  await advanceToChoice(page);
  await expectNoOverflow(page);
  await page.reload();
  await choose(page, "A");
  await toQuiz(page);
  await expect(page.getByText(/Which city does the bull mosaic/)).toBeVisible();
  await page.reload();
  await choose(page, "B");
  expect((await saved(page)).inventory.galleria_ticket).toBe("held");
  await finish(page);
  const won = await saved(page);
  expect(won.completedEncounterIds).toContain("galleria_fortune");
  expect(won.claimedRewardIds).toEqual(initial.claimedRewardIds);
  await page.reload();
  expect(await saved(page)).toEqual(won);
});

test("an incorrect answer can be retried; a saved lost draw cannot be rerolled", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(9999); return array; }) as typeof original;
  });
  await startNewGame(page);
  await loadCurrentGalleriaFreeTime(page);
  await open(page);
  await advanceToChoice(page);
  await choose(page, "B");
  await toQuiz(page);
  await choose(page, "A");
  await finish(page);
  const incorrect = await saved(page);
  expect(incorrect.encounterRewards.galleria_fortune).toBeUndefined();
  expect(incorrect.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  await open(page);
  await advanceToChoice(page);
  await choose(page, "A");
  await toQuiz(page);
  await choose(page, "B");
  expect((await saved(page)).encounterRewards.galleria_fortune.won).toBe(false);
  await page.reload();
  await finish(page);
  const missed = await saved(page);
  expect(missed.inventory.galleria_ticket).toBeUndefined();
  expect(missed.ap).toBe(incorrect.ap);
  await open(page);
  await advanceToChoice(page);
  await choose(page, "B");
  await toQuiz(page);
  await choose(page, "B");
  await finish(page);
  const retry = await saved(page);
  expect(retry.encounterRewards.galleria_fortune).toEqual(missed.encounterRewards.galleria_fortune);
  expect(retry.inventory.galleria_ticket).toBeUndefined();
  expect(retry.ap).toBe(missed.ap);
});
