import { MINI_GAME_RESULT_GUARD_MS, MINI_GAME_START_GUARD_MS, MINI_GAME_TO_REAL_MS } from "../../src/minigames/host/timing";
import { expect, test, tier, type Page } from "./helpers";

// Every registered mini-game through the shared host (docs/13 6.4), in Debug's 「ミニゲームの見本」 (no story, no save):
// the instruction card's start, the focus in the play, 「中断する」 and Esc back to the start with nothing chosen, 「おまかせ」
// to each outcome (a tap skips to it) with its result card read out and its 「次へ」 taking it (the room's card always
// offers 「もう一回」, so it never goes on by itself), and a timed game's pause while the page is hidden (on Playwright's
// clock, so no game's length is waited for). One game with practice walks the whole flow (practice → 「次は本番！」 →
// the real play by itself → its card's 「次へ」). The
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
      // The card takes the place of the play's controls, which are hidden under it (2026-11-14: the dead ones still
      // looked pressable), and 「中断する」 does not show over it.
      await expect(play.locator("[data-minigame-controls]"), `${id}: its controls under the card`).toBeHidden();
      await expect(page.getByTestId("minigame-quit")).toHaveCount(0);
      await expect(page.getByTestId("minigame-announce")).not.toHaveText("");
      await pressOnCard(page, "minigame-next");
      await expect(last).toContainText(`（${outcome}）`);
    }
    await page.getByTestId("minigame-room-back").click();
    await expect(page.getByTestId(`minigame-room-open-${id}`)).toBeFocused();
  }
});

/** Starts a game's practice in the room and lets it run alone until its end's cut-in 「次は本番！」 shows (it is short). */
async function practiceToCutIn(page: Page) {
  const cutIn = page.getByTestId("minigame-cutin");
  await page.getByTestId("minigame-practice").click();
  await expect(page.getByTestId("minigame-play")).toHaveAttribute("data-practice", "true");
  for (let step = 0; step < 40 && !(await cutIn.count()); step++) await page.clock.runFor(500);
  await expect(cutIn).toContainText("次は本番！");
}

test("practice: one short play (a count the play ignores), its end's cut-in 「次は本番！」, the real play by itself, then the result card's 次へ; with and without the host's count", { tag: tier.debug }, async ({ page }) => {
  // The page's clock is Playwright's: each play's length is jumped over, not waited for.
  await page.clock.install();
  const games = await openRoom(page);
  // One game whose practice counts 3・2・1 (the host's count) and one that does not (its own count, or none).
  const walked = { host: false, own: false };
  for (const id of games) {
    if (walked.host && walked.own) break;
    await page.getByTestId(`minigame-room-open-${id}`).click();
    await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", id);
    const practice = page.getByTestId("minigame-practice");
    await expect(page.getByTestId("minigame-start")).toBeEnabled();
    const counts = (await page.getByTestId("minigame-room-stage").getAttribute("data-countdown")) === "host";
    if (!(await practice.count()) || (counts ? walked.host : walked.own)) {
      await page.getByTestId("minigame-room-back").click();
      continue;
    }
    walked[counts ? "host" : "own"] = true;
    const play = page.getByTestId("minigame-play");
    const card = page.getByTestId("minigame-result");
    const cutIn = page.getByTestId("minigame-cutin");
    await practice.click();
    await expect(play, id).toHaveAttribute("data-practice", "true");
    await expect(page.getByTestId("minigame-practice-label")).toHaveText("練習");
    if (counts) {
      // The host's count: 3・2・1, during which a press is not the play's (the play has no outcome from it).
      await expect(page.getByTestId("minigame-count"), id).toHaveText(/^[321]$/u);
      await page.getByTestId("minigame-action").click({ force: true }).catch(() => undefined);
      await page.clock.runFor(200);
      await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
    }
    // Left alone, the practice play ends by itself (it is short: 2026-11-16) with no finish word and no result card: the
    // cut-in 「練習おわり　次は本番！」 comes (read out), nothing is taken, and 「中断する」 may still leave.
    for (let step = 0; step < 40 && !(await cutIn.count()); step++) await page.clock.runFor(500);
    await expect(cutIn, id).toContainText("次は本番！");
    await expect(card).toHaveCount(0);
    await expect(page.getByTestId("minigame-finish")).toHaveCount(0);
    await expect(page.getByTestId("minigame-announce")).toHaveText("練習おわり。次は本番。");
    await expect(page.getByTestId("minigame-quit")).toBeVisible();
    await expect(page.getByTestId("minigame-room-last")).toHaveText("まだ遊んでいません。");
    // After the cut-in the real play starts by itself (its count first where the host counts).
    await page.clock.runFor(MINI_GAME_TO_REAL_MS + 50);
    await expect(cutIn).toHaveCount(0);
    await expect(play, id).not.toHaveAttribute("data-practice", /.+/u);
    await expect(page.getByTestId("minigame-practice-label")).toHaveCount(0);
    if (counts) await expect(page.getByTestId("minigame-count"), id).toHaveText(/^[321]$|^スタート！$/u);
    // The real play: its card's 次へ takes the outcome (the room's card does not go on by itself: it offers もう一回).
    await page.clock.runFor(LONGER_THAN_ANY_GAME_MS);
    await expect(card, id).toBeVisible();
    await expect(page.getByTestId("minigame-again")).toBeVisible();
    // The card's buttons at the bottom, where the play's controls were (hidden under it: 2026-11-14, the phone UI audit).
    await expect(play.locator("[data-minigame-controls]")).toBeHidden();
    const layer = (await play.boundingBox())!;
    const next = (await page.getByTestId("minigame-next").boundingBox())!;
    expect(layer.y + layer.height - (next.y + next.height), "the card's buttons at the bottom").toBeLessThan(64);
    await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
    await page.getByTestId("minigame-next").click();
    await expect(page.getByTestId("minigame-room-last")).not.toHaveText("まだ遊んでいません。");
    await page.getByTestId("minigame-room-back").click();
  }
  expect(walked, "a game with the host's count and one without, both with practice").toEqual({ host: true, own: true });
});

test("practice's cut-in: 「中断する」 leaves it (no real play follows), and a hidden page waits to start the real play", { tag: tier.debug }, async ({ page }) => {
  await page.clock.install();
  const games = await openRoom(page);
  let walked = false;
  for (const id of games) {
    await page.getByTestId(`minigame-room-open-${id}`).click();
    await expect(page.getByTestId("minigame-start")).toBeEnabled();
    if (!(await page.getByTestId("minigame-practice").count())) {
      await page.getByTestId("minigame-room-back").click();
      continue;
    }
    walked = true;
    const play = page.getByTestId("minigame-play");
    // 「中断する」 in the cut-in: back to the instruction card, and the cut-in's timer starts nothing after.
    await practiceToCutIn(page);
    await page.getByTestId("minigame-quit").click();
    await expect(play).toHaveCount(0);
    await expect(page.getByTestId("minigame-start")).toBeFocused();
    await page.clock.runFor(MINI_GAME_TO_REAL_MS + 200);
    await expect(play).toHaveCount(0);
    await expect(page.getByTestId("minigame-room-last")).toHaveText("まだ遊んでいません。");
    // A page hidden in the cut-in starts no real play unseen; shown again, the cut-in runs its time and the real play starts.
    await practiceToCutIn(page);
    await setHidden(page, true);
    await page.clock.runFor(3 * MINI_GAME_TO_REAL_MS);
    await expect(play).toHaveAttribute("data-practice", "true");
    await expect(page.getByTestId("minigame-cutin")).toBeVisible();
    await setHidden(page, false);
    await page.clock.runFor(MINI_GAME_TO_REAL_MS + 50);
    await expect(play).not.toHaveAttribute("data-practice", /.+/u);
    await expect(page.getByTestId("minigame-cutin")).toHaveCount(0);
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
