import { MINI_GAME_RESULT_GUARD_MS, MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { expect, test, tier, type Page } from "./helpers";

// Every registered mini-game through the shared host (docs/13 6.4), in Debug's 「ミニゲームの見本」 (no story, no save):
// the instruction card's start, the focus in the play, 「中断する」 and Esc back to the start with nothing chosen, 「おまかせ」
// to each outcome (a tap skips to it) with its result card read out and its 「次へ」 taking it (the room's card always
// offers 「もう一回」, so it never goes on by itself), and a timed game's pause while the page is hidden (on Playwright's
// clock, so no game's length is waited for). One game with practice and the host's count walks the whole flow. The
// fixture fails on any console error. The games are read from the room, so adding one adds nothing here. A game's own
// real-input test (when to press) is its builder's tests/e2e/minigame-<gameId>.spec.ts. Development server only.
test.describe.configure({ timeout: 120_000 });

async function openRoom(page: Page): Promise<string[]> {
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await expect(page.getByTestId("minigame-room")).toBeVisible();
  return page.locator("section[data-game]").evaluateAll((items) => items.map((item) => item.getAttribute("data-game")!));
}

/** The time one game of the room may take in the walk through every game (about 13 s on CI with the result cards). */
const PER_GAME_MS = 22_000;

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

/** The result card's 「次へ」 (or another of its buttons), pressed once its first moment (which drops every press) is over. */
async function pressOnCard(page: Page, testId: string) {
  const button = page.getByTestId(testId);
  await expect(button).toBeVisible();
  await page.waitForTimeout(MINI_GAME_RESULT_GUARD_MS + 50);
  await button.click();
}

test("every mini-game starts into its play, stops with 中断する and Esc, and plays each outcome by おまかせ", { tag: tier.debug }, async ({ page }) => {
  const games = await openRoom(page);
  expect(games.length).toBeGreaterThan(0);
  // Each game takes about 13 s on CI (its starts, stops and every outcome with its card): the budget grows with the room.
  test.setTimeout(30_000 + games.length * PER_GAME_MS);
  for (const id of games) {
    await page.getByTestId(`minigame-room-open-${id}`).click();
    await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", id);
    const start = page.getByTestId("minigame-start");
    const play = page.getByTestId("minigame-play");
    const last = page.getByTestId("minigame-room-last");
    await expect(page.getByTestId("minigame-card")).toBeVisible();

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
      await expect(page.getByTestId("minigame-result")).toBeVisible();
      await expect(page.getByTestId("minigame-announce")).not.toHaveText("");
      await pressOnCard(page, "minigame-next");
      await expect(last).toContainText(`（${outcome}）`);
    }
    await page.getByTestId("minigame-room-back").click();
    await expect(page.getByTestId(`minigame-room-open-${id}`)).toBeFocused();
  }
});

test("a game with practice and the host's count: 練習 → もう一回 → 本番へ, a count the play ignores, then the result card's 次へ", { tag: tier.debug }, async ({ page }) => {
  // The page's clock is Playwright's: each play's length is jumped over, not waited for.
  await page.clock.install();
  const games = await openRoom(page);
  let walked = false;
  for (const id of games) {
    await page.getByTestId(`minigame-room-open-${id}`).click();
    await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", id);
    const practice = page.getByTestId("minigame-practice");
    await expect(page.getByTestId("minigame-start")).toBeEnabled();
    if (!(await practice.count())) {
      await page.getByTestId("minigame-room-back").click();
      continue;
    }
    walked = true;
    const play = page.getByTestId("minigame-play");
    const card = page.getByTestId("minigame-result");
    await practice.click();
    await expect(play).toHaveAttribute("data-practice", "true");
    await expect(page.getByTestId("minigame-practice-label")).toHaveText("練習");
    // A game with the host's count: 3・2・1, during which a press is not the play's (the play has no outcome from it).
    const counted = await page.getByTestId("minigame-count").count();
    if (counted) {
      await expect(page.getByTestId("minigame-count")).toHaveText("3");
      await page.getByTestId("minigame-action").click({ force: true }).catch(() => undefined);
      await page.clock.runFor(200);
      await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
    }
    // Left alone, the practice play ends by itself and its card offers もう一回 and 本番へ, never taking the outcome.
    await page.clock.runFor(LONGER_THAN_ANY_GAME_MS);
    await expect(card).toBeVisible();
    await expect(card).toContainText("練習");
    await expect(page.getByTestId("minigame-next")).toHaveCount(0);
    await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
    await page.getByTestId("minigame-again").click();
    await expect(card).toHaveCount(0);
    await expect(play).toHaveAttribute("data-practice", "true");
    await page.clock.runFor(LONGER_THAN_ANY_GAME_MS);
    await expect(card).toBeVisible();
    await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
    await page.getByTestId("minigame-to-real").click();
    await expect(play).not.toHaveAttribute("data-practice", /.+/u);
    await expect(page.getByTestId("minigame-room-last")).toHaveText("まだ遊んでいません。");
    // The real play: its card's 次へ takes the outcome (the room's card does not go on by itself: it offers もう一回).
    await page.clock.runFor(LONGER_THAN_ANY_GAME_MS);
    await expect(card).toBeVisible();
    await expect(page.getByTestId("minigame-again")).toBeVisible();
    await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
    await page.getByTestId("minigame-next").click();
    await expect(page.getByTestId("minigame-room-last")).not.toHaveText("まだ遊んでいません。");
    break;
  }
  test.skip(!walked, "no game offers practice");
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
    // Left alone after 続ける, the play ends by itself (its length jumped over) and its result card comes.
    await page.clock.fastForward(LONGER_THAN_ANY_GAME_MS);
    await expect(play).toHaveAttribute("data-outcome", /.+/u);
    await page.clock.fastForward(LONGER_THAN_ANY_GAME_MS);
    await expect(page.getByTestId("minigame-result")).toBeVisible();
    await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
    await page.getByTestId("minigame-next").click();
    await expect(page.getByTestId("minigame-room-last")).not.toHaveText("まだ遊んでいません。");
    await page.getByTestId("minigame-room-back").click();
  }
  test.skip(timed === 0, "no timed game is registered");
});
