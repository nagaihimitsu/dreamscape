import { MINI_GAME_START_GUARD_MS } from "../../src/minigames/host/timing";
import { AGAIN_JA, DECOY_JA, FIRST_WRONG_JA, HINT_JA } from "../../src/minigames/mehndi_hidden_name/lines";
import { mehndiHintRing, mehndiMarkRing, mehndiMarks } from "../../src/minigames/mehndi_hidden_name/marks";
import { expect, test, tier, type Locator, type Page } from "./helpers";

// 「手のひらの模様」 by hand (docs/13 6.4), in Debug's 「ミニゲームの見本」: a real finger and real keys on the palm (the
// walk through every game plays it by 「おまかせ」, and the unit tests read the field's markup and the pure decisions, so
// a tap that saw no decorations, or a decoration that counted as the writing, passed every test: 2026-11-17 review). The
// writing at the thumb's base, the name Taichi.
// - A finger dragged on below the palm takes the lamp down to the palm's lower edge (it stopped 52px above it).
// - A tap on a run of decorations: her word about decorations and a dashed ring round the run; the play goes on.
// - Enter on the peacock's place, where a run of decorations lies: the run is pointed at (her warning, the second wrong
//   thing; a ring round the run, not the place's).
// - A tap on another run of the first run's place (a place the look has already counted): her hint, as she promised
//   (「次も外れたら、教えちゃうね」), and its ring round the writing's area.
// - A tap on the name's first letter (beyond its place's reach: a dead tap before 2026-11-17) finds it.
const UNITS = { width: 300, height: 420 };
/** A ring's width as the field writes it in its style: a share of the palm's width (cqw), for a ring this wide in the hand's units. */
const across = (diameter: number) => Number(((diameter / UNITS.width) * 100).toFixed(2));
const widthOf = (ring: Locator) => ring.evaluate((element) => {
  const { width } = (element as HTMLElement).style;
  return width.endsWith("cqw") ? Number.parseFloat(width) : null;
});
/** The palm in view, and a point of the hand (its own units) on the page. */
async function palmPoint(page: Page) {
  const palm = page.locator(".mg-mehndi-hidden-name-palm");
  await palm.evaluate((element) => element.scrollIntoView({ block: "center" }));
  const box = (await palm.boundingBox())!;
  return { box, at: (x: number, y: number) => ({ x: box.x + (x / UNITS.width) * box.width, y: box.y + (y / UNITS.height) * box.height }) };
}
/** A finger's tap at a point of the hand. */
async function tap(page: Page, x: number, y: number) {
  const point = (await palmPoint(page)).at(x, y);
  await page.touchscreen.tap(point.x, point.y);
}

test("the mehndi by hand: decorations get her words, her warning and her hint, and the name is found on its letters", { tag: tier.debug }, async ({ page }) => {
  await page.goto("/?debug");
  await page.getByTestId("debug-open-minigame-room").click();
  await page.getByTestId("minigame-room-open-mehndi_hidden_name").click();
  await expect(page.getByTestId("minigame-room-stage")).toHaveAttribute("data-game", "mehndi_hidden_name");
  // The first example: the writing at the thumb's base, the player's name.
  await expect(page.locator(".minigame-room-example select").first()).toHaveValue("0");
  await page.getByTestId("minigame-room-name").fill("Taichi");
  await page.getByTestId("minigame-room-hand").check();
  // What the player reads before the play says that some of the pattern only looks like letters.
  await expect(page.getByTestId("minigame-card")).toContainText("文字に似せた飾りもある");

  const play = page.getByTestId("minigame-play");
  await page.getByTestId("minigame-start").click();
  await expect(play).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(MINI_GAME_START_GUARD_MS + 50);

  const marks = mehndiMarks({ target: "thumb", text: "player" }, "Taichi");
  const mark = (id: string) => marks.find((item) => item.id === id)!;
  const said = page.locator(".mg-mehndi-hidden-name-said");
  const rings = page.locator(".mg-mehndi-hidden-name-mark-ring[data-wrong]");
  const field = page.locator(".mg-mehndi-hidden-name");
  // The decorations are drawn (the lit pattern's), and none is the writing.
  await expect(page.locator(".mg-mehndi-hidden-name-lit [data-decoy]")).toHaveCount(marks.length - 1);

  // A finger dragged down the palm's left side and on below the palm (where nothing can be pointed at): the lamp, which
  // rides above the finger, comes down to the palm's lower edge.
  const { box, at } = await palmPoint(page);
  const touch = await page.context().newCDPSession(page);
  const finger = (type: "touchStart" | "touchMove", point: { x: number; y: number }) => touch.send("Input.dispatchTouchEvent", { type, touchPoints: [{ ...point, id: 1 }] });
  const from = at(60, 300);
  const below = { x: from.x, y: box.y + box.height + 56 };
  await finger("touchStart", from);
  for (let step = 1; step <= 12; step += 1) await finger("touchMove", { x: from.x, y: from.y + ((below.y - from.y) * step) / 12 });
  await expect.poll(() => page.locator(".mg-mehndi-hidden-name-palm").evaluate((element) => (element as HTMLElement).style.getPropertyValue("--mehndi-lamp-y"))).toBe("100%");
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(rings).toHaveCount(0);

  // The run on the middle finger: her first word about decorations, a dashed ring round the run, and the look goes on.
  await tap(page, mark("middle_tip").x, mark("middle_tip").y);
  await expect(said).toHaveText(`${FIRST_WRONG_JA}${DECOY_JA[0]}`);
  await expect(rings).toHaveCount(1);
  expect(await widthOf(rings.first())).toBe(across(mehndiMarkRing(mark("middle_tip")).diameter));
  await expect(field).not.toHaveAttribute("data-ending", /.+/u);

  // Enter on the peacock's place: the run of decorations laid there is what is pointed at (the ring is the run's), and it
  // is the second wrong thing: her warning.
  await page.getByRole("button", { name: "孔雀の羽の付け根" }).focus();
  await page.keyboard.press("Enter");
  await expect(said).toHaveText(AGAIN_JA);
  await expect(rings).toHaveCount(2);
  expect(await widthOf(rings.nth(1))).toBe(across(mehndiMarkRing(mark("feather_base")).diameter));

  // The run on the index finger, of the first run's place (counted already by the rules, a new wrong thing to her): her
  // promise kept, her hint and its ring round the writing's area.
  await tap(page, mark("index_band").x, mark("index_band").y);
  await expect(said).toHaveText(HINT_JA);
  await expect(said).toHaveAttribute("data-hint", "true");
  expect(await widthOf(page.locator(".mg-mehndi-hidden-name-hint-ring"))).toBe(across(mehndiHintRing("thumb").diameter));
  await expect(rings).toHaveCount(3);
  await expect(field).not.toHaveAttribute("data-ending", /.+/u);
  await expect(play).not.toHaveAttribute("data-outcome", /.+/u);

  // The T of Taichi, 39.8 of the hand's units from the thumb's place (beyond its reach): the writing, found after wrong places.
  await tap(page, 183, 323);
  await expect(field).toHaveAttribute("data-ending", "found");
  await expect(play).toHaveAttribute("data-outcome", "wrong_spot");
});
