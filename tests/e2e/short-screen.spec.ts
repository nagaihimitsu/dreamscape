import { devModules, expect, longExplanationBattle, ops, playUntil, savedGame, test, tier } from "./helpers";

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
// answer are chosen as in debug-scenes.spec.ts's long explanation (the ordinary battle whose first
// question's explanation is the longest, a wrong first answer: helpers.ts longExplanationBattle).
test.use({ viewport: { width: 320, height: 480 } });

// Long flow (docs/10「不安定さと時間の決まり」), with the same budget as debug-scenes.spec.ts in this
// tier: the app loads twice on the development server, then a battle is played and loaded again
// (ops.loadSaved). About 7 s locally, but 15–21 s under a 6x CPU throttle; the runner about four times
// slower than usual on 2026-11-08 ran that file's long flows out of the default 30 s.
test.describe.configure({ timeout: 120_000 });

/** In the page: what shows at the top of the screen, and where the explanation's first line starts. */
function feedbackStart() {
  const area = document.querySelector('[aria-label="クイズ"]')!;
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
  const target = await longExplanationBattle(page);
  // The layout under test needs an explanation taller than this screen, and the content's quizzes (the longest is chosen)
  // may all fit 320×480 as they are written: the dev server's journey part this page loads has that one four times as long,
  // from here on (every load of the test; the save is placed with it, so its quiz fingerprint matches).
  await page.route(/\/src\/content\/generated\/journey-parts\/[a-z_]+\.json/u, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).split(target.explanation).join(target.explanation.repeat(4));
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  const placed = await page.evaluate(async ({ modules, target }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const { getJourneyForCity } = await import(/* @vite-ignore */ modules.journeys);
    const journeyId: string = getJourneyForCity(target.cityId).id;
    const state = builders.openBattleScene(builders.completedCity(target.cityId, { names: ["航", "澪"] }), target.id);
    return { journeyId, saved: saveGame(journeyStorage(localStorage, journeyId), state), wrong: target.wrong };
  }, { modules: devModules, target });
  expect(placed.saved, "the battle placed as a normal save").toEqual({ ok: true });
  // Its journey chosen on the title (the title opens the default journey when none was opened before), the
  // saved battle comes back at once.
  await page.goto("/");
  await ops.chooseJourney(page, placed.journeyId);
  const battle = page.getByRole("region", { name: "クイズ", exact: true });
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

  // Scrolled back to the top of the page, the header's controls show again, and ≡メニュー →
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

  // 「相手の反応を見る」 at the explanation's end is reached by scrolling and reads on.
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight }));
  const reaction = battle.getByRole("button", { name: "相手の反応を見る" });
  expect(await reaction.evaluate((button) => {
    const box = button.getBoundingClientRect();
    const at = (y: number) => button.contains(document.elementFromPoint(box.left + box.width / 2, y));
    return at(box.top + 1) && at(box.bottom - 1);
  }), "「相手の反応を見る」 shows whole at the end of the page").toBe(true);
  await ops.tapAt(page, await ops.centerOf(reaction));
  await expect.poll(async () => (await source(page))!.activeBattle?.phase).toBe("dialogue");
});

// 「オフラインで遊ぶ」 on the title (2026-11-17, docs/02 「オフラインで遊ぶ」): a small way in beside the caption 「旅行編」, on the
// smallest phone the game supports. It must cost the screen nothing: the caption's row keeps its height (the button's
// 44 px reach up into the space above, over no other control), so 「旅をはじめる」 is where it is without the entry. Where
// that is depends on the fonts of the machine (the lead wraps to two lines or three), so the start button's place is
// compared with the entry hidden, and reported, not held to the screen's height. On the development server the dialog
// only says that it keeps nothing there (no service worker); what it does is offline.spec.ts's, in the production tier.
test.describe("the title on a 320×568 screen", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("the title's 「オフラインで遊ぶ」 sits beside 「旅行編」 over no other control, costs 「旅をはじめる」 no height, and says what the development server cannot do", { tag: tier.gate }, async ({ page }) => {
    await page.goto("/");
    const entry = page.getByTestId("offline-entry");
    const start = ops.startButton(page);
    await expect(start).toBeVisible();
    await expect(entry).toHaveAccessibleName("オフラインで遊ぶ");
    const layout = await entry.evaluate((button) => {
      const box = (element: Element) => { const { left, top, right, bottom } = element.getBoundingClientRect(); return { left, top, right, bottom }; };
      const own = box(button);
      const select = document.querySelector<HTMLSelectElement>('select[aria-label="旅行編"]')!;
      const caption = document.querySelector(`label[for="${select.id}"]`)!;
      const controls = [...document.querySelectorAll("a, button, input, select, textarea, summary")].filter((control) => control !== button && control.getClientRects().length > 0);
      return {
        own, caption: box(caption), select: box(select), page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        // The controls whose boxes meet the entry's, by what they say.
        under: controls.filter((control) => { const other = box(control); return other.left < own.right && own.left < other.right && other.top < own.bottom && own.top < other.bottom; })
          .map((control) => control.textContent?.trim() || control.getAttribute("aria-label") || control.tagName),
      };
    });
    expect(layout.own.bottom - layout.own.top, "a finger's target").toBeGreaterThanOrEqual(44);
    expect(layout.own.left, "to the right of the caption").toBeGreaterThanOrEqual(layout.caption.right);
    expect(layout.own.right, "inside the screen").toBeLessThanOrEqual(320);
    expect(layout.page, "the page does not scroll sideways").toBe(0);
    expect([layout.caption.top >= layout.own.top, layout.caption.bottom <= layout.own.bottom], "on the caption's row").toEqual([true, true]);
    expect(layout.own.bottom, "above the journey's select").toBeLessThanOrEqual(layout.select.top);
    expect(layout.under, "over no other control").toEqual([]);

    // The same title without the entry: the start button is where it was.
    const bottom = async () => { const box = (await start.boundingBox())!; return Math.round(box.y + box.height); };
    const withEntry = await bottom();
    const hidden = await page.addStyleTag({ content: '[data-testid="offline-entry"] { display: none !important; }' });
    const withoutEntry = await bottom();
    await hidden.evaluate((style) => (style as HTMLStyleElement).remove());
    expect(withEntry, "the entry costs the screen no height").toBe(withoutEntry);
    test.info().annotations.push({ type: "「旅をはじめる」の下端（320×568）", description: `${withEntry} px（「オフラインで遊ぶ」なしでも ${withoutEntry} px）` });

    // The dialog opens with the keyboard, says that the development server keeps nothing and offers nothing to press,
    // and gives the focus back.
    await entry.focus();
    await page.keyboard.press("Enter");
    const dialog = ops.offlinePlay(page);
    await expect(dialog.getByRole("heading", { name: "オフラインで遊ぶ", exact: true })).toBeFocused();
    await expect(dialog.getByRole("status")).toHaveText("開発用のサーバーでは使えません。公開版（本番ビルド）で使えます。");
    await expect(dialog.locator("[data-action]")).toHaveCount(0);
    await expect(dialog).not.toHaveAttribute("data-settling");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(entry).toBeFocused();
    expect(await page.evaluate(() => caches.has("dreamscape.offline")), "nothing is kept on the development server").toBe(false);
  });
});
