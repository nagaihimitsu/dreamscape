import { devModules, expect, ops, playUntil, savedGame, test, tier } from "./helpers";

// Below 500 px of portrait height the page scrolls instead of the battle's reading area
// (battle.css), and the battle holds its round bar (an answer's verdict) at the top of
// the screen. In normal play the journey bar above the battle then scrolls away with the
// page (styles.css); were it held at the top too, it would cover the round bar and the start
// of a long explanation (UI_REVIEW_CHECKLIST: 「スクロールして重なった部品の下に隠れない」).
// Debug cannot catch this: its session caps the game's height (debug-mode.css), so there the
// journey bar has scrolled away with the game's box by the time a long explanation shows. And
// Debug must leave the normal storage as it was, so this is played from a normal save. State
// shortcut (lane 2 in docs/10): reaching a city's battles takes minutes of play, so the page's
// own scene builders open the battle on a cleared city and the game's own saveGame stores it
// as a normal save; the answer and the reading are played in the UI. The battle and the
// answer are chosen as in debug-scenes.spec.ts's long explanation (the default Debug city's
// first ordinary battle, a wrong first answer).
test.use({ viewport: { width: 320, height: 480 } });

// Long flow (docs/10「不安定さと時間の決まり」), with the same budget as debug-scenes.spec.ts in this
// tier: the app loads twice on the development server, then a battle is played and loaded again
// (ops.loadSaved). About 7 s locally, but 15–21 s under a 6x CPU throttle; the runner about four times
// slower than usual on 2026-11-08 ran that file's long flows out of the default 30 s.
test.describe.configure({ timeout: 120_000 });

/** In the page: what shows at the top of the screen, and where the explanation's first line starts. */
function feedbackStart() {
  const area = document.querySelector('[aria-label="クイズバトル"]')!;
  const bar = document.querySelector('[data-testid="battle-roundbar"]')!.getBoundingClientRect();
  const journeyBar = document.querySelector('[data-testid="journey-bar"]')!.getBoundingClientRect();
  const feedback = document.querySelector('[data-testid="battle-feedback"]')!.getBoundingClientRect();
  const first = document.querySelector('[data-testid="battle-feedback"] [data-testid="correct-answer"]')!;
  const line = first.getBoundingClientRect();
  const shown = document.elementFromPoint(line.left + 4, line.top + 1);
  const barShown = document.elementFromPoint(bar.left + 4, bar.top + 4);
  return {
    pageScrolls: getComputedStyle(area).overflowY === "visible", scrolled: scrollY,
    room: innerHeight - bar.bottom, rest: feedback.bottom - line.top, lineTop: line.top,
    below: line.top - bar.bottom, belowJourneyBar: line.top - journeyBar.bottom,
    journeyBarHeld: journeyBar.top >= 0 && journeyBar.bottom > bar.bottom,
    shown: !!shown && first.contains(shown), barShown: !!barShown?.closest('[data-testid="battle-roundbar"]'),
  };
}

test("battle on a 320×480 screen: after a wrong answer the round bar and the explanation's first line are not under the journey bar", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/");
  const placed = await page.evaluate(async ({ modules }) => {
    const { battles, battleQuizzes } = await import(/* @vite-ignore */ modules.content);
    const { debugTargets, defaultDebugCityId } = await import(/* @vite-ignore */ modules.debugState);
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const { getJourneyForCity } = await import(/* @vite-ignore */ modules.journeys);
    const cityId: string = defaultDebugCityId;
    const battle = battles.find((item: { id: string; reasoning?: unknown }) => !item.reasoning &&
      debugTargets(cityId).battle.some((target: { id: string; unavailable?: string }) => target.id === item.id && !target.unavailable));
    const question = battleQuizzes[battle.quizId].questions[0];
    const journeyId: string = getJourneyForCity(cityId).id;
    const state = builders.openBattleScene(builders.completedCity(cityId, { names: ["航", "澪"] }), battle.id);
    return {
      journeyId, saved: saveGame(journeyStorage(localStorage, journeyId), state),
      wrong: question.options.find((option: { id: string }) => option.id !== question.correctOptionId).id as string,
    };
  }, { modules: devModules });
  expect(placed.saved, "the battle placed as a normal save").toEqual({ ok: true });
  // The default Debug city belongs to the default journey: opening the page again brings its
  // saved battle back at once, without the title.
  await page.goto("/");
  const battle = page.getByRole("region", { name: "クイズバトル" });
  await expect(battle).toBeVisible();
  await expect(page.getByTestId("debug-session")).toHaveCount(0);
  const source = savedGame(placed.journeyId);
  await playUntil(page, (state) => state.activeBattle?.phase === "feedback", { source, pick: () => placed.wrong });
  await expect(page.getByTestId("battle-feedback")).toBeFocused();

  const start = await page.evaluate(feedbackStart);
  expect(start.pageScrolls, "on this screen the page scrolls, not the reading area").toBe(true);
  expect(start.scrolled, "the page scrolled down to the explanation").toBeGreaterThan(0);
  expect(start.rest, "the explanation from its first line on is taller than the room below the round bar").toBeGreaterThan(start.room);
  expect(start.barShown, "the round bar shows at the top of the screen, not the journey bar over it").toBe(true);
  expect(start.shown, "the first line of the explanation shows, not the journey bar or the round bar over it").toBe(true);
  expect(start.below, "the first line starts just below the round bar").toBeLessThanOrEqual(12);

  // Scrolled back to the top of the page, the header's controls show again, and ⚙設定 →
  // ゲームの設定 opens.
  await page.evaluate(() => scrollTo({ top: 0 }));
  await expect(ops.settingsButton(page)).toBeInViewport();
  await ops.closeDialog(await ops.openSettings(page));

  // Were the header held at the top of the screen above the round bar (as it was where :has()
  // was missing, before UI step 1.2): a load brings the explanation back and focuses it at once,
  // while no tap reaches the page (tap-hold.ts), and its first line then starts just below the
  // held header.
  const stillHeld = await page.addStyleTag({ content: '[data-testid="journey-bar"] { position: sticky !important; }' });
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
  expect((await page.evaluate(feedbackStart)).lineTop, "at the end of the page the first line is above the screen").toBeLessThan(0);
  await ops.loadSaved(page);
  await expect(page.getByTestId("battle-feedback")).toBeFocused();
  await ops.settled(page);
  const held = await page.evaluate(feedbackStart);
  expect(held.journeyBarHeld, "the journey bar is held at the top of the screen, above the round bar").toBe(true);
  expect(held.shown, "the first line of the explanation shows, not the journey bar over it").toBe(true);
  expect(held.belowJourneyBar, "the first line starts below the held journey bar").toBeGreaterThanOrEqual(0);
  expect(held.belowJourneyBar, "the first line starts just below the held journey bar").toBeLessThanOrEqual(12);
  await stillHeld.evaluate((style) => (style as HTMLStyleElement).remove());

  // 「敵の反応を見る」 at the explanation's end is reached by scrolling and reads on.
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
  const reaction = battle.getByRole("button", { name: "敵の反応を見る" });
  expect(await reaction.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const at = (y: number) => button.contains(document.elementFromPoint(box.left + box.width / 2, y));
    return at(box.top + 1) && at(box.bottom - 1);
  }), "「敵の反応を見る」 shows whole at the end of the page").toBe(true);
  await ops.tapAt(page, await ops.centerOf(reaction));
  await expect.poll(async () => (await source(page))!.activeBattle?.phase).toBe("dialogue");
});
