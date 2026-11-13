import { MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { expect, test, tier, type Page } from "./helpers";

// Every registered mini-game through the shared host (docs/13 6.4), in Debug's 「ミニゲームの見本」 (no story, no save):
// the start, the focus in the play, 「中断する」 and Esc back to the start with nothing chosen, 「おまかせ」 to each outcome
// (a tap skips to it) with its label read out, and a timed game's pause while the page is hidden (on Playwright's clock,
// so no game's length is waited for). The fixture fails on any console error. The games are read from the room, so
// adding one adds nothing here. A game's own real-input test (when to press) is its builder's
// tests/e2e/minigame-<gameId>.spec.ts. Development server only.
test.describe.configure({ timeout: 120_000 });

async function openRoom(page: Page): Promise<string[]> {
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await expect(page.getByTestId("minigame-room")).toBeVisible();
  return page.locator("section[data-game]").evaluateAll((items) => items.map((item) => item.getAttribute("data-game")!));
}

/** Longer than any timed game's play (the longest, 手のひらの模様, is about 30 seconds). */
const LONGER_THAN_ANY_GAME_MS = 60_000;

/** Hides (true) or shows the page as a switch to another tab would, with its visibilitychange. */
function setHidden(page: Page, hidden: boolean): Promise<void> {
  return page.evaluate((value) => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (value ? "hidden" : "visible") });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

test("every mini-game starts into its play, stops with 中断する and Esc, and plays each outcome by おまかせ", { tag: tier.debug }, async ({ page }) => {
  const games = await openRoom(page);
  expect(games.length).toBeGreaterThan(0);
  for (const id of games) {
    await page.getByTestId(`minigame-room-open-${id}`).click();
    await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", id);
    const start = page.getByTestId("minigame-start");
    const play = page.getByTestId("minigame-play");
    const last = page.getByTestId("minigame-room-last");

    await start.click();
    await expect(play).toBeVisible();
    await expect(play).toHaveAttribute("role", "region");
    await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-testid="minigame-play"]')), `${id}: the focus in the play`).toBe(true);
    // A press just after the start is the start's second tap and is dropped (docs/13 2.6): 「中断する」 after that moment, as Esc below.
    await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 50);
    await page.getByTestId("minigame-quit").click();
    await expect(play).toHaveCount(0);
    await expect(start).toBeFocused();
    await start.click();
    await expect(play).toBeVisible();
    await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 50);
    await page.keyboard.press("Escape");
    await expect(play).toHaveCount(0);
    await expect(last, `${id}: 中断 chooses nothing`).toHaveText("まだ遊んでいません。");

    const outcomes = await page.locator('[data-testid^="minigame-room-auto-"]')
      .evaluateAll((items) => items.map((item) => item.getAttribute("data-testid")!.slice("minigame-room-auto-".length)));
    expect(outcomes.length).toBeGreaterThanOrEqual(2);
    for (const outcome of outcomes) {
      await page.getByTestId(`minigame-room-auto-${outcome}`).check();
      await start.click();
      await expect(play).toBeVisible();
      await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 50);
      await play.click();
      await expect(play, `${id}: おまかせ ${outcome}`).toHaveAttribute("data-outcome", outcome);
      await expect(page.getByTestId("minigame-announce")).not.toHaveText("");
      await expect(last).toContainText(`（${outcome}）`);
    }
    await page.getByTestId("minigame-room-back").click();
    await expect(page.getByTestId(`minigame-room-open-${id}`)).toBeFocused();
  }
});

test("a timed mini-game pauses while the page is hidden and goes on with 続ける", { tag: tier.debug }, async ({ page }) => {
  // The page's clock is Playwright's: a game's whole length (up to about 30 seconds) is jumped over, not waited for.
  await page.clock.install();
  const games = await openRoom(page);
  let timed = 0;
  for (const id of games) {
    await page.getByTestId(`minigame-room-open-${id}`).click();
    const stage = page.getByTestId("minigame-room-stage");
    await expect(stage).toHaveAttribute("data-game", id);
    if ((await stage.getAttribute("data-timed")) === null) {
      await page.getByTestId("minigame-room-back").click();
      continue;
    }
    timed++;
    const play = page.getByTestId("minigame-play");
    await page.getByTestId("minigame-start").click();
    await expect(play).toBeVisible();
    await setHidden(page, true);
    await setHidden(page, false);
    await expect(page.getByTestId("minigame-pause"), `${id}: 一時停止中`).toBeVisible();
    // Time does not go on while it waits: the play has no outcome yet, however long it waits (a jump past any game's
    // length, then 3 seconds for frames that would end it).
    await page.clock.fastForward(LONGER_THAN_ANY_GAME_MS);
    await page.waitForTimeout(3000);
    await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
    await page.getByTestId("minigame-resume").click();
    await expect(page.getByTestId("minigame-pause")).toHaveCount(0);
    // Left alone after 続ける, the play ends by itself (its length jumped over) and its outcome is taken.
    await page.clock.fastForward(LONGER_THAN_ANY_GAME_MS);
    await expect(play).toHaveAttribute("data-outcome", /.+/u);
    await expect(page.getByTestId("minigame-room-last")).not.toHaveText("まだ遊んでいません。");
    await page.getByTestId("minigame-room-back").click();
  }
  test.skip(timed === 0, "no timed game is registered");
});
