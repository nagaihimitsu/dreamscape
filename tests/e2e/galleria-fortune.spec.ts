import { expect, test } from "@playwright/test";
import { cityEpisodes, playCityBattle } from "./city-helpers";
import { expectNoOverflow, openRevisits, saved, setDialogueSpeed, startNewGame } from "./helpers";
import { skipTourismGuide } from "./tourism-helpers";

test.use({ reducedMotion: "reduce", viewport: { width: 360, height: 780 } });

test("the optional Galleria conversation returns to sightseeing and its normal battle", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    crypto.getRandomValues = ((array: Uint32Array) => { array.fill(0); return array; }) as typeof crypto.getRandomValues;
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await startNewGame(page);
  await page.getByTestId("episode-start").click();
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  await playCityBattle(page, cityEpisodes[0], 0);
  await page.getByTestId("next-tourism").click();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("galleria_vittorio_emanuele_ii");
  await skipTourismGuide(page);
  const before = await saved(page);
  const talk = page.getByRole("button", { name: "床の雄牛を見ている親子に話しかける", exact: true });
  await expect(talk).toBeVisible();
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 780 });
    await expectNoOverflow(page);
    await expect(talk).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`galleria-encounter-${width}.png`) });
  }
  await talk.click();
  let state = await saved(page);
  expect(state.activeTourism).toBeNull();
  expect(state.activeEncounter?.encounterId).toBe("galleria_fortune");
  await setDialogueSpeed(page, "0");
  await page.reload();
  await setDialogueSpeed(page, "0");
  expect((await saved(page)).activeEncounter?.encounterId).toBe("galleria_fortune");
  for (let i = 0; i < 40; i++) {
    state = await saved(page);
    if (state.activeEncounter?.frame.choices.length) break;
    const revision = state.revision;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(revision);
  }
  state = await saved(page);
  expect(state.activeEncounter?.frame.choices.map((choice) => choice.text)).toEqual([
    "I'll keep count for you.", "I'd rather make my own luck.", "I'll leave the bull in peace.",
  ]);
  await page.getByRole("button", { name: "Aを選ぶ", exact: true }).click();
  await page.reload();
  await setDialogueSpeed(page, "0");
  for (let i = 0; i < 50; i++) {
    state = await saved(page);
    if (!state.activeEncounter) break;
    expect(state.activeTourism).toBeNull();
    expect(state.activeEncounter.phase).toBe("story");
    const revision = state.revision;
    if (state.activeEncounter.frame.ended)
      await page.getByRole("button", { name: "観光に戻る", exact: true }).click();
    else await page.getByRole("button", { name: "続きを読む", exact: true }).click();
    await expect.poll(async () => (await saved(page)).revision).toBeGreaterThan(revision);
  }
  state = await saved(page);
  expect(state.activeEncounter).toBeNull();
  expect(state.activeTourism?.landmarkId).toBe(before.activeTourism?.landmarkId);
  expect(state.activeTourism?.phase).toBe("exploring");
  expect(state.inventory).toEqual(before.inventory);
  expect(state.ap).toBe(before.ap + 1);
  expect(state.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  expect(state.encounterRewards.galleria_fortune).toBeUndefined();
  await expect(talk).toBeVisible();
  await page.reload();
  expect((await saved(page)).activeTourism?.landmarkId).toBe("galleria_vittorio_emanuele_ii");
  await page.getByRole("button", { name: "バトルを始める", exact: true }).click();
  const result = await playCityBattle(page, cityEpisodes[1], 0);
  expect(result.state.activeBattle?.battleId).toBe("milano_galleria_01");
  expect(result.state.activeBattle?.answers).toHaveLength(3);
  await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
  await openRevisits(page);
  const placeToggle = page.getByTestId("revisit-place-galleria_vittorio_emanuele_ii");
  if (await placeToggle.getAttribute("aria-expanded") !== "true") await placeToggle.click();
  const place = page.getByRole("region", { name: /ガッレリアで過ごす$/ });
  await place.getByRole("button", { name: /行く\s*：回らない願掛け/ }).click();
  await setDialogueSpeed(page, "0");
  for (let i = 0; i < 40; i++) {
    state = await saved(page);
    if (state.activeEncounter?.frame.choices.length) break;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  }
  await page.getByRole("button", { name: "Aを選ぶ", exact: true }).click();
  for (let i = 0; i < 40; i++) {
    state = await saved(page);
    if (state.activeEncounter?.phase === "quiz") break;
    await page.getByRole("button", { name: "続きを読む", exact: true }).click();
  }
  expect((await saved(page)).activeEncounter?.phase).toBe("quiz");
  await page.reload();
  await page.getByRole("button", { name: "Bを選ぶ", exact: true }).click();
  const awarded = await saved(page);
  expect(awarded.encounterRewards.galleria_fortune.won).toBe(true);
  expect(awarded.inventory.galleria_ticket).toBe("held");
  expect(awarded.claimedRewardIds.filter((id) => id === "victory_galleria_first")).toHaveLength(1);
  await page.reload();
  expect(await saved(page)).toEqual(awarded);
  expect(errors).toEqual([]);
});
