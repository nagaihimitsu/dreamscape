import { MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { SAY_COUNT_MS, SAY_END_MS } from "../../src/minigames/say_together/rules";
import { expect, test, tier } from "./helpers";

// Saying it together's real input (docs/13 6.4), in Debug's 「ミニゲームの見本」: four words on her beat (group2 S4). A tap
// in her breath before 「せー」 is turned away (no tap: the play goes on), a tap from 「せー」 says the first word (its
// timing is the story's outcome), the play goes on through her four words and ends on the last, and the result card
// counts the words said together. Taps by touch, as on a phone. Margins of hundreds of milliseconds: the precise
// timing is the rules' tests'.

test("say_together: a tap in her breath does not count; the play goes on to her last word and counts the words", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await page.getByTestId("minigame-room-open-say_together").click();
  await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", "say_together");
  await page.getByTestId("minigame-room-hand").check();
  const play = page.getByTestId("minigame-play");
  const action = page.getByTestId("minigame-action");
  await page.getByTestId("minigame-start").click();
  await expect(play).toBeVisible();
  // Past the start's double-tap guard, in her breath: no word, no outcome.
  await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 80);
  await action.tap();
  await page.waitForTimeout(200);
  await expect(page.getByTestId("say-yours")).toHaveCount(0);
  // From 「せー」 on, a tap says the first word (early here: on her count), and the play goes on.
  await page.waitForTimeout(SAY_COUNT_MS - MINI_GAME_START_GUARD_MS);
  await action.tap();
  await expect(page.getByTestId("say-yours")).toBeVisible();
  await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
  // Her four words: the play ends on the last, and the card counts the words said together.
  await expect(play).toHaveAttribute("data-outcome", "early", { timeout: SAY_END_MS + 2000 });
  await expect(page.getByTestId("minigame-stars")).toHaveAttribute("data-stars", /^[12]$/u);
  await expect(page.getByTestId("minigame-score")).toContainText("語そろった（4語中）");
});
