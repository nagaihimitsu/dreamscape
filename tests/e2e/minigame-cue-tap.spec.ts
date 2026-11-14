import { MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { expect, test, tier, type Page } from "./helpers";

// The cue_tap engine's real input (docs/13 6.4), in Debug's 「ミニゲームの見本」: a tap before the thing starts coming (her
// breath before 「せー」, the walker still standing at the top of the stairs) does not count. The play goes on, the button
// still takes a tap, and the next tap decides (a play the story cannot retry is never decided by a tap made too soon).
// Taps by touch, as on a phone (a pointerdown and then a click). Timing margins of hundreds of milliseconds: no game is
// played to a precise moment here (the rules' tests do that).

/** Each game: its lead (taps before it do not count), and the outcome of a play without a tap that counts. */
const GAMES = [
  { id: "cloth_flap", leadMs: 900, none: "frozen" },
  { id: "say_together", leadMs: 1000, none: "silent" },
] as const;

async function openGame(page: Page, id: string): Promise<void> {
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await page.getByTestId(`minigame-room-open-${id}`).click();
  await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", id);
  await page.getByTestId("minigame-room-hand").check();
}

for (const game of GAMES) {
  test(`${game.id}: a tap before the cue does not count, and the next one decides`, { tag: tier.debug }, async ({ page }) => {
    await openGame(page, game.id);
    const play = page.getByTestId("minigame-play");
    const action = page.getByTestId("minigame-action");
    await page.getByTestId("minigame-start").click();
    await expect(play).toBeVisible();
    // Past the start's double-tap guard, well before the lead ends.
    await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 80);
    await action.tap();
    await page.waitForTimeout(250);
    await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
    await expect(action).not.toHaveAttribute("aria-disabled", "true");
    // A tap once the thing comes counts: an outcome of a tap, never the one of no tap.
    await page.waitForTimeout(game.leadMs + 300);
    await action.tap();
    await expect(action).toHaveAttribute("aria-disabled", "true");
    await expect(play).toHaveAttribute("data-outcome", /.+/u, { timeout: 10_000 });
    await expect(play).not.toHaveAttribute("data-outcome", game.none);
    // The result card rates the tap that counted (★1–3 with how far off it was), never the one turned away.
    await expect(page.getByTestId("minigame-stars")).toHaveAttribute("data-stars", /^[123]$/u);
    await expect(page.getByTestId("minigame-score")).toContainText("秒");
  });
}
