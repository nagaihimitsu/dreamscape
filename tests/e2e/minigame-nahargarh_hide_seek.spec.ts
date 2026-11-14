import { MINI_GAME_RESULT_GUARD_MS, MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { HIDE_SEEK_HINT_MS, HIDE_SEEK_IDLE_MS, HIDE_SEEK_TUNING } from "../../src/minigames/nahargarh_hide_seek/rules";
import { expect, test, tier } from "./helpers";

// The hide-and-seek's own play (docs/13 6.4), in Debug's 「ミニゲームの見本」 with the page's clock: a player who opened a
// door and stopped to think is never ended as 「廊下で待った」 (2026-11-13 playtest); the pause brings a hint instead; a
// call's echo comes back from her door with her giggle; and her door, opened second, is 「すぐに見つけた」.
// She plays too (round 3, 2026-11-14): at 3 s she peeks out of her door and leaves it ajar, and a player who watched and
// opens it then finds her at once; one who keeps waiting hears her 「……まだかな」 before she leans out of the corner.
test("the hide-and-seek: she peeks out and a watching player finds her at once; a waiting one hears her ask", { tag: tier.debug }, async ({ page }) => {
  await page.clock.install();
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await page.getByTestId("minigame-room-open-nahargarh_hide_seek").click();
  const play = page.getByTestId("minigame-play");
  const herDoor = page.getByTestId("minigame-spot-6");
  await page.getByTestId("minigame-start").click();
  await expect(play).toBeVisible();
  await page.clock.runFor(HIDE_SEEK_TUNING.peekFirstMs + 100);
  await expect(herDoor).toHaveAttribute("data-peek", "peek");
  await expect(page.locator(".mg-nahargarh-hide-seek-giggle[data-kind=\"peek\"]")).toHaveCount(1);
  await page.clock.runFor(HIDE_SEEK_TUNING.peekMs);
  await expect(herDoor).toHaveAttribute("data-peek", "ajar");
  await herDoor.click();
  await page.clock.runFor(1600);
  await expect(play).toHaveAttribute("data-outcome", "door_quick");

  // Again, waiting: her 「……まだかな」, then the corner (the play's own end for one who waits).
  await expect(page.getByTestId("minigame-again")).toBeVisible();
  await page.clock.runFor(MINI_GAME_RESULT_GUARD_MS + 50);
  await page.getByTestId("minigame-again").click();
  await expect(play).not.toHaveAttribute("data-outcome", /.+/u);
  await page.clock.runFor(HIDE_SEEK_TUNING.askMs + 100);
  await expect(page.locator(".mg-nahargarh-hide-seek-giggle[data-kind=\"ask\"]")).toContainText("まだかな");
  await page.clock.runFor(HIDE_SEEK_IDLE_MS - HIDE_SEEK_TUNING.askMs + 1600);
  await expect(play).toHaveAttribute("data-outcome", "just_wait");
});

test("the hide-and-seek gives a hint, not an end, to a player who stopped, and her giggle in the echo", { tag: tier.debug }, async ({ page }) => {
  await page.clock.install();
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await page.getByTestId("minigame-room-open-nahargarh_hide_seek").click();
  const play = page.getByTestId("minigame-play");
  await page.getByTestId("minigame-start").click();
  await expect(play).toBeVisible();
  await page.clock.runFor(MINI_GAME_START_GUARD_MS + 100);

  await page.getByTestId("minigame-spot-0").click();
  // Its name says how the room is: far from her door (the 7th), quiet.
  await expect(page.getByTestId("minigame-spot-0")).toHaveAttribute("aria-label", "扉1：空っぽの部屋。しんとしている");
  // Well past the time that ends an unstarted play: a giggle, and the search goes on.
  await page.clock.runFor(HIDE_SEEK_HINT_MS + 200);
  await expect(page.locator(".mg-nahargarh-hide-seek-giggle")).toHaveCount(1);
  await page.clock.runFor(HIDE_SEEK_IDLE_MS * 2);
  await expect(play).not.toHaveAttribute("data-outcome", /.+/u);

  await page.getByTestId("minigame-button-call").click();
  await page.clock.runFor(300);
  await expect(page.locator(".mg-nahargarh-hide-seek-echo")).toHaveCount(12);
  await expect(page.locator(".mg-nahargarh-hide-seek-echo[data-hers]")).toContainText("ふふっ");

  await page.getByTestId("minigame-spot-6").click();
  await page.clock.runFor(1600);
  await expect(play).toHaveAttribute("data-outcome", "door_quick");
});
