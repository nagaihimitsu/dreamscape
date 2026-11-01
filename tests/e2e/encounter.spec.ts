import { expect, test, type Page } from "@playwright/test";
import galleria from "../fixtures/galleria-stage2-pool.json" with { type: "json" };
import phase7 from "../fixtures/phase7-free-time.json" with { type: "json" };
import phase6 from "../fixtures/phase6-saves.json" with { type: "json" };
import { expectNoOverflow, loadSnapshot, saved, setDialogueSpeed } from "./helpers";

const menu = (page: Page, title: string) => page.getByText(title, { exact: true }).locator("..").locator("..").getByRole("button");

async function open(page: Page, title: string) {
  const before = await saved(page);
  const toggle = page.getByTestId("encounter-menu-toggle");
  if (await toggle.count() && !(await toggle.locator("..").evaluate((details: HTMLDetailsElement) => details.open))) await toggle.click();
  await menu(page, title).click();
  await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(before.revision);
  await expect(page.getByTestId("encounter-screen")).toBeVisible();
  await setDialogueSpeed(page, "0");
}

async function advanceToChoice(page: Page) {
  for (let i = 0; i < 40; i++) {
    const state = await saved(page);
    expect(state.activeEncounter).not.toBeNull();
    if (state.activeEncounter!.frame.choices.length && state.activeEncounter!.phase === "story") return;
    const advance = page.getByRole("button", { name: "続きを読む", exact: true });
    await advance.click();
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
    const button = state.activeEncounter.frame.ended && state.activeEncounter.phase !== "feedback" && state.activeEncounter.phase !== "quiz"
      ? page.getByRole("button", { name: "自由時間へ", exact: true })
      : page.getByRole("button", { name: /^続きを読む/ });
    await button.click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Encounter did not finish");
}

async function toQuiz(page: Page) {
  for (let i = 0; i < 50; i++) {
    const state = await saved(page);
    if (state.activeEncounter?.phase === "quiz") return;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(state.revision);
  }
  throw new Error("Cultural quiz was not reached");
}

test("cafe, free choice, cultural quiz, gift and ticket use persist across reloads", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(0); return array; }) as typeof original;
  });
  await page.setViewportSize({ width: 360, height: 780 });
  await loadSnapshot(page, galleria);
  await open(page, "カンパリーノでひと休み");
  await advanceToChoice(page);
  await expect(page.getByText("Two coffees, please.")).toBeVisible();
  await expect(page.getByText("€4", { exact: true })).toBeVisible();
  for (const size of [{ width: 360, height: 780 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(size);
    await expectNoOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`encounter-choices-${size.width}.png`), animations: "disabled" });
  }
  await page.reload();
  await choose(page, "A");
  expect((await saved(page)).travelBudget).toBe(16);
  await page.reload();
  expect((await saved(page)).travelBudget).toBe(16);
  await finish(page);
  expect((await saved(page)).travelBudget).toBe(18); // one-off thanks
  expect((await saved(page)).inventory.galleria_souvenir).toBe("held");

  await open(page, "しおりを贈る");
  await advanceToChoice(page);
  await choose(page, "A");
  expect((await saved(page)).inventory.galleria_souvenir).toBe("gifted");
  await finish(page);

  await open(page, "床の牛と小さな占い");
  await advanceToChoice(page);
  await choose(page, "C");
  await toQuiz(page);
  await expect(page.getByText(/Which city does the bull mosaic/)).toBeVisible();
  await page.reload();
  await choose(page, "B");
  expect((await saved(page)).inventory.galleria_ticket).toBe("held");
  await page.reload();
  expect((await saved(page)).inventory.galleria_ticket).toBe("held");
  await finish(page);
  const won = await saved(page);
  expect(won.completedEncounterIds).toContain("galleria_fortune");
  expect(won.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  expect(won.ap).toBe(galleria.ap + 1);

  await open(page, "紋章の小さな展示");
  await advanceToChoice(page);
  await choose(page, "A");
  expect((await saved(page)).inventory.galleria_ticket).toBe("used");
  await finish(page);
  await page.reload();
  const final = await saved(page);
  expect(final.inventory.galleria_ticket).toBe("used");
  expect(final.travelBudget).toBe(18);
  expect(final.ap).toBe(won.ap);
});

test("an incorrect answer can be retried; a saved lost draw cannot be rerolled", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(9999); return array; }) as typeof original;
  });
  await loadSnapshot(page, galleria);
  await open(page, "床の牛と小さな占い");
  await advanceToChoice(page);
  await choose(page, "B");
  await toQuiz(page);
  await choose(page, "A");
  await finish(page);
  const incorrect = await saved(page);
  expect(incorrect.encounterRewards.galleria_fortune).toBeUndefined();
  expect(incorrect.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  await open(page, "床の牛と小さな占い");
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
  await open(page, "床の牛と小さな占い");
  await advanceToChoice(page);
  await choose(page, "C");
  await toQuiz(page);
  await choose(page, "B");
  await finish(page);
  const retry = await saved(page);
  expect(retry.encounterRewards.galleria_fortune).toEqual(missed.encounterRewards.galleria_fortune);
  expect(retry.inventory.galleria_ticket).toBeUndefined();
  expect(retry.ap).toBe(missed.ap);
});

test("not buying remains available when the travel budget is insufficient", async ({ page }) => {
  await loadSnapshot(page, galleria);
  await open(page, "カンパリーノでひと休み");
  await page.evaluate(() => {
    const key = "dreamscape.save.v1";
    const snapshot = JSON.parse(localStorage.getItem(key)!);
    snapshot.travelBudget = 1;
    localStorage.setItem(key, JSON.stringify(snapshot));
  });
  await page.reload();
  await advanceToChoice(page);
  await expect(page.getByRole("button", { name: "Aを選ぶ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Bを選ぶ" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Cを選ぶ" })).toBeEnabled();
  await choose(page, "C");
  expect((await saved(page)).travelBudget).toBe(1);
  await finish(page);
  expect((await saved(page)).travelBudget).toBe(3);
});

test("a cleared city keeps newly acquired Milan items usable exactly once after reload", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(0); return array; }) as typeof original;
  });
  const oldClearedCity = {
    ...phase7.cityClearViewed,
    battleRecords: [...phase7.cityClearViewed.battleRecords, ...phase6.B_result.battleRecords, ...phase6.C_result.battleRecords],
  };
  await loadSnapshot(page, oldClearedCity);
  await open(page, "カンパリーノでひと休み");
  await advanceToChoice(page);
  await choose(page, "C");
  await finish(page);
  expect((await saved(page)).inventory.galleria_souvenir).toBe("held");

  await open(page, "床の牛と小さな占い");
  await advanceToChoice(page);
  await choose(page, "C");
  await toQuiz(page);
  await choose(page, "B");
  await finish(page);
  const acquired = await saved(page);
  expect(acquired.completedCityIds).toContain("milano");
  expect(acquired.inventory.galleria_souvenir).toBe("held");
  expect(acquired.inventory.galleria_ticket).toBe("held");
  await page.reload();
  expect(await saved(page)).toEqual(acquired);

  await open(page, "しおりを贈る");
  await advanceToChoice(page);
  await choose(page, "A");
  expect((await saved(page)).inventory.galleria_souvenir).toBe("gifted");
  await page.reload();
  expect((await saved(page)).inventory.galleria_souvenir).toBe("gifted");
  await finish(page);
  await open(page, "紋章の小さな展示");
  await advanceToChoice(page);
  await choose(page, "A");
  expect((await saved(page)).inventory.galleria_ticket).toBe("used");
  await page.reload();
  expect((await saved(page)).inventory.galleria_ticket).toBe("used");
  await finish(page);
  const final = await saved(page);
  expect(final.ap).toBe(acquired.ap);
  expect(final.pendingApRewards).toEqual(acquired.pendingApRewards);
  expect(final.travelBudget).toBe(acquired.travelBudget);
  expect(final.claimedRewardIds).toEqual(acquired.claimedRewardIds);
  expect(final.completedCityIds).toEqual(acquired.completedCityIds);
  expect(final.completedEpisodeIds).toEqual(acquired.completedEpisodeIds);
  expect(final.battleRecords).toEqual(acquired.battleRecords);
  expect(final.completedEncounterIds).toEqual(expect.arrayContaining([...acquired.completedEncounterIds, "galleria_gift", "galleria_outing"]));
  await page.reload();
  expect(await saved(page)).toEqual(final);
  await page.getByTestId("encounter-menu-toggle").click();
  await expect(menu(page, "しおりを贈る")).toHaveCount(0);
  await expect(menu(page, "紋章の小さな展示")).toHaveCount(0);
});
