import { test as base, expect, type Page } from "@playwright/test";
import type { GameState } from "../../src/domain/game";

export { expect };

/**
 * Every test fails on an uncaught page error, a console error or a missing
 * image, media or font file of the game in any of its tabs. Failed requests to
 * other origins (map tiles, web fonts) are outside the game and are ignored.
 */
export const test = base.extend<{ errorGuard: void }>({
  errorGuard: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    const errors: string[] = [];
    const watch = (page: Page) => {
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const { url } = message.location();
        if (message.text().startsWith("Failed to load resource") && !url.startsWith(origin)) return;
        errors.push(`console: ${message.text()} (${url})`);
      });
      // The dev server answers a missing file with its HTML page, not a 404.
      page.on("response", (response) => {
        const type = response.request().resourceType();
        const url = new URL(response.url());
        if (!["image", "media", "font"].includes(type) || url.origin !== origin) return;
        if (response.status() >= 400 || response.headers()["content-type"]?.startsWith("text/html"))
          errors.push(`missing ${type}: ${response.url()}`);
      });
    };
    context.pages().forEach(watch);
    context.on("page", watch);
    await use();
    expect(errors, "console errors, uncaught exceptions or missing game files").toEqual([]);
  }, { auto: true }],
});

export const saveKey = (journeyId = "milano") => `dreamscape.journey.${journeyId}.save.v1`;

/** The journey's saved game, read from the same browser storage the game uses. */
export function readSave(page: Page, journeyId = "milano"): Promise<GameState> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), saveKey(journeyId));
}

export function allStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
}

/** Open the title screen, choose a journey and names, and start playing. */
export async function startJourney(page: Page, journeyId = "milano", names: [string, string] = ["航", "澪"]) {
  await page.goto("/");
  await page.getByLabel("旅行編").selectOption(journeyId);
  await page.getByLabel("主人公の名前").fill(names[0]);
  await page.getByLabel("ヒロインの名前").fill(names[1]);
  await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
}

/** Show whole lines at once through the in-game setting, so one tap advances one line. */
export async function useInstantText(page: Page) {
  await page.getByRole("button", { name: "設定", exact: true }).click();
  const settings = page.getByRole("dialog", { name: "設定" });
  await settings.getByLabel("文字送り").selectOption("0");
  await settings.getByRole("button", { name: "閉じる", exact: true }).click();
}

/** Pick a destination on the travel menu, opening the longer list when needed. */
export async function goTo(page: Page, placeId: string) {
  const place = page.getByTestId(`travel-place-${placeId}`);
  if (!(await place.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
  await place.getByRole("button").click();
}

const nextButtons = ["tourism-advance", "battle-advance", "epilogue-advance", "arrival-advance"]
  .map((id) => `[data-testid="${id}"]`).join(", ");

/** One player action in the current scene: tap the line or its next button,
 * answer A, or take the first conversation choice. */
async function act(page: Page, state: GameState) {
  const date = state.activeDate;
  if (state.activeBattle?.phase === "question") return page.getByTestId("answer-A").click();
  if (date?.frame.choices.length) return page.locator(".choice").first().click();
  if (date?.frame.ended) return page.getByRole("button", { name: "デートを終える", exact: true }).click();
  // The arrival logo finishes by itself and saves its completion.
  if (state.activeEpilogue?.kind === "arrival" && !state.activeEpilogue.logoComplete) return;
  const next = page.locator(nextButtons).filter({ visible: true });
  if (await next.count()) return next.first().click();
  return page.locator('.dialogue-text[role="button"]').first().click();
}

/** Play the current scene like a player until `done` holds for the saved game.
 * Every action must be saved (a new revision) before the next one. */
export async function playUntil(page: Page, done: (state: GameState) => boolean, journeyId = "milano") {
  for (let step = 0; step < 200; step++) {
    const state = await readSave(page, journeyId);
    if (done(state)) return state;
    await act(page, state);
    await expect.poll(async () => (await readSave(page, journeyId)).revision, {
      message: "the scene did not save a response to the player's action", timeout: 10_000,
    }).toBeGreaterThan(state.revision);
  }
  throw new Error("The scene did not finish within 200 actions");
}

/** No scene is open: the player is back on the travel menu. */
export function expectNoActiveScene(state: GameState) {
  expect(state).toMatchObject({
    activeTourism: null, activeBattle: null, activeDate: null, activeEncounter: null, activeEpilogue: null,
  });
}
