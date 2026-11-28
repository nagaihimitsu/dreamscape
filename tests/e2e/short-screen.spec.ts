import { devModules, expect, lengthenExplanation, longExplanationBattle, ops, playUntil, savedGame, test, tier } from "./helpers";

// Below 500 px of portrait height the page scrolls instead of the battle's window (battle.css). After an answer the
// options stay above the window with their marks and the explanation comes in the window in the question's place
// (2026-11-28 user decision): its start must show, not under the journey bar or the options, and 「→」 (相手の反応を見る)
// at its end must be reached by scrolling and show whole (UI_REVIEW_CHECKLIST: 「長文・対訳・文字拡大時に内容が切れず、
// 主な操作へ到達できる」「スクロールして重なった部品の下に隠れない」). Debug cannot catch this: its session caps the game's height
// (debug-mode.css). And Debug must leave the normal storage as it was, so this is played from a normal save. State
// shortcut (lane 2 in docs/10): reaching a city's battles takes minutes of play, so the page's own scene builders open
// the battle on a cleared city and the game's own saveGame stores it as a normal save; the answer and the reading are
// played in the UI. The battle and the answer are chosen as in debug-scenes.spec.ts's long explanation (the ordinary
// battle whose first question's explanation is the longest, a wrong first answer: helpers.ts longExplanationBattle).
test.use({ viewport: { width: 320, height: 480 } });

// Long flow (docs/10「不安定さと時間の決まり」), with the same budget as debug-scenes.spec.ts in this
// tier: the app loads twice on the development server, then a battle is played.
test.describe.configure({ timeout: 120_000 });

/** In the page: where the explanation's first line starts, and whether it and the marked options show. */
function feedbackStart() {
  const area = document.querySelector('[aria-label="クイズ"]')!;
  const journeyBar = document.querySelector('[data-testid="journey-bar"]')!.getBoundingClientRect();
  const first = document.querySelector('[data-testid="battle-feedback"] .quiz-explanation')!;
  const line = first.getBoundingClientRect();
  const shown = document.elementFromPoint(line.left + 4, line.top + 4);
  const marked = [...document.querySelectorAll<HTMLElement>("[data-mark]")].filter((row) => row.matches(".quiz-choice-row"));
  return {
    pageScrolls: getComputedStyle(area).overflowY === "visible" || document.documentElement.scrollHeight > innerHeight,
    lineTop: line.top, inScreen: line.top >= 0 && line.top + 8 <= innerHeight, belowJourneyBar: line.top - journeyBar.bottom,
    shown: !!shown && first.contains(shown), marks: marked.map((row) => row.dataset.mark).sort(),
  };
}

test("battle on a 320×480 screen: after a wrong answer the explanation's start shows, and 「→」 is reached by scrolling", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/");
  const target = await longExplanationBattle(page);
  // The layout under test needs an explanation taller than this screen (helpers.ts lengthenExplanation).
  await lengthenExplanation(page, target.explanation);
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
  expect(start.pageScrolls, "on this screen the page scrolls").toBe(true);
  expect(start.marks, "the chosen option and the right one keep their marks").toEqual(["answer", "missed"]);
  expect(start.inScreen, "the explanation's first line is on the screen").toBe(true);
  expect(start.shown, "the first line of the explanation shows, not the journey bar or an option over it").toBe(true);
  expect(start.belowJourneyBar, "the first line starts below the journey bar").toBeGreaterThanOrEqual(0);

  // Scrolled back to the top of the page, the header's controls show again, and ≡メニュー →
  // ゲームの設定 opens.
  await page.evaluate(() => scrollTo({ top: 0 }));
  await expect(ops.settingsButton(page)).toBeInViewport();
  await ops.closeDialog(await ops.openSettings(page));

  // 「相手の反応を見る」 at the explanation's end is reached by scrolling and reads on (once the page takes taps again
  // after the dialog).
  await ops.settled(page);
  await page.evaluate(() => {
    const area = document.getElementById("battle-content")!;
    area.scrollTo({ top: area.scrollHeight });
    scrollTo({ top: document.documentElement.scrollHeight });
  });
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
