import { devModules, expect, ops, readSave, test, tier, type Page } from "./helpers";

// The sample journey's optional part 「会話の手がかりと時点の推理クイズ」 (authoring/templates/sample_trip, fictional; 2026-11-18)
// in the UI, from normal saves placed with the page's own scenario builders (lane 2, docs/10): the clue heard at the clock
// tower's bell says so under the header for long enough to read, and the coach stop's quiz at the epilogue names its own
// place on the header's plate, not the hotel the map left the party at.
const JOURNEY = "sample_trip";
const BELL = "smp_obs_mihon_coach_bell";

/** Place `build`'s state (run in the page with the dev server's modules) as the sample's normal save. */
async function placeSampleSave(page: Page, build: "bell" | "coach") {
  const saved = await page.evaluate(async ({ build, bell, modules }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const actions = await import(/* @vite-ignore */ modules.playerAction);
    const occasion = await import(/* @vite-ignore */ modules.occasion);
    let state;
    if (build === "bell") {
      // The clock tower's visit, played with the real functions up to the bell's talk, then on to its choices.
      state = builders.startOccasionScene(builders.cityStart("mihon"), "mihon_clock_tower", "smp_mihon_clock_bell", [], 0);
      for (let step = 0; !state.activeEncounter?.frame?.choices?.length; step++) {
        if (step > 100) throw new Error("the bell's choices did not come");
        const next: unknown[] = actions.listPlayerActions(state).filter((item: { kind: string }) => item.kind === "encounter_next");
        state = actions.applyPlayerAction(state, actions.playerActionChange(next[0], () => 0), () => 0);
      }
    } else {
      // The city cleared with the bell's clue: its epilogue opens with the coach stop's quiz as its first turn.
      state = occasion.openEpilogue(builders.withClues(builders.completedCity("mihon"), [bell]), true, () => 0);
    }
    return saveGame(journeyStorage(localStorage, "sample_trip"), state);
  }, { build, bell: BELL, modules: { ...devModules, playerAction: "/src/domain/player-action.ts", occasion: "/src/domain/occasion.ts" } });
  expect(saved, `placing the ${build} state as the sample's save`).toEqual({ ok: true });
}

test("a clue heard at the bell says so under the header, and stays long enough to read", { tag: tier.sample }, async ({ page }) => {
  // Time runs normally; it is held once the word shows, to measure how long it stays.
  await page.clock.install();
  await page.goto("/");
  await placeSampleSave(page, "bell");
  await ops.chooseJourney(page, JOURNEY);
  const stay = page.locator('[data-choice="B"]');
  await expect(stay).toBeVisible();
  await ops.settled(page);
  await stay.click();
  await expect.poll(async () => (await readSave(page, JOURNEY)).discoveredClueIds).toContain(BELL);
  const word = page.getByTestId("clue-notice");
  await expect(word).toHaveText("手がかり帳に「夕方の鐘の合図」を記録しました。");
  // Not a moment's word (the session's 2.5 s): held from about 1 s after it showed, it is still there at about 3.5 s, and
  // gone after its 5 s.
  await ops.holdClock(page);
  await page.clock.runFor(2500);
  await expect(word).toHaveText("手がかり帳に「夕方の鐘の合図」を記録しました。");
  await page.clock.runFor(2000);
  await expect(word).toHaveText("");
});

test("the coach stop's quiz at the epilogue names its place on the header's plate", { tag: tier.sample }, async ({ page }) => {
  await page.goto("/");
  await placeSampleSave(page, "coach");
  await ops.chooseJourney(page, JOURNEY);
  await expect(page.getByRole("region", { name: "クイズ", exact: true })).toBeVisible();
  const state = await readSave(page, JOURNEY);
  expect(state.activeBattle?.battleId).toBe("smp_mihon_special_b_coach");
  expect(state.occasion).toMatchObject({ kind: "epilogue", at: "smp_mihon_special_b_coach" });
  // The map left the party at the hotel; the quiz is at the coach stop (its background names no place: the landmark's name).
  await expect(page.getByTestId("journey-context")).toContainText("見本の停留所");
  await expect(page.getByTestId("journey-context")).not.toContainText("滞在先のホテル");
});
