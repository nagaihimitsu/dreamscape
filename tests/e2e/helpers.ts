import { test as base, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { JourneyCatalog } from "../../src/content/journey-catalog";
import type { GameState } from "../../src/domain/game";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString, settingsQuery, type DebugDataMode, type DebugSettings } from "../../src/dev/debug-query";

export { expect };
export type { Page };

/**
 * Tiers (docs/10「E2Eの段」): each test names the tiers it runs in, and every
 * tier is its own CI job. A test without one of these tags runs nowhere,
 * which scripts/e2e-specs.test.ts refuses.
 * - gate: every pull request and push to main, on the development server.
 * - debug: Debug as a scene launchpad (development server only; never counted as a save/resume check).
 * - prod: also against the production build (`vite preview` of `npm run build`).
 * - smoke: the WebKit (iPhone) weekly run; explore: the weekly exploration runs (both planned, not a gate).
 */
export const tier = { gate: "@gate", debug: "@debug", prod: "@prod", smoke: "@smoke", explore: "@explore" } as const;

/** Keys the game writes (saves, backups, English notes, presentation settings). */
const gameKeyPrefix = "dreamscape.";

/**
 * Shared fixtures, all automatic:
 * - Requests to other origins (OpenStreetMap tiles, Google Fonts) are blocked, so a test never
 *   depends on the network; the game must work without them.
 * - Every test fails on an uncaught page error, a console error or a missing image, media or
 *   font file of the game in any of its tabs. Blocked requests to other origins are ignored.
 * - A failed test gets each tab's URL and the game's localStorage keys attached (storage.json).
 */
export const test = base.extend<{ externalNetwork: void; errorGuard: void; failureReport: void }>({
  externalNetwork: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    await context.route((url) => url.origin !== origin, (route) => route.abort("blockedbyclient"));
    await use();
  }, { auto: true }],
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
  failureReport: [async ({ context }, use, testInfo) => {
    await use();
    if (testInfo.status !== testInfo.expectedStatus) await attachStorage(context.pages(), testInfo);
  }, { auto: true }],
});

async function attachStorage(pages: Page[], testInfo: TestInfo) {
  const tabs = await Promise.all(pages.map(async (page) => {
    const storage = await Promise.race([
      page.evaluate((prefix) => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith(prefix))), gameKeyPrefix),
      new Promise<string>((resolve) => setTimeout(() => resolve("(the page did not answer)"), 2_000)),
    ]).catch((error: Error) => `(unreadable: ${error.message})`);
    return { url: page.url(), localStorage: storage };
  }));
  await testInfo.attach("storage.json", { body: JSON.stringify(tabs, null, 2), contentType: "application/json" });
}

export const saveKey = (journeyId = "milano") => `dreamscape.journey.${journeyId}.save.v1`;
export const learningKey = (journeyId = "milano") => `dreamscape.journey.${journeyId}.learning.v1`;
export const presentationKey = "dreamscape.presentation.v1";

/** Where a test reads the game state from: a journey's normal save, or Debug's game (read-only hook). */
export type StateSource = (page: Page) => Promise<GameState | null>;
export const savedGame = (journeyId = "milano"): StateSource => (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), saveKey(journeyId));
export const debugGame: StateSource = (page) => page.evaluate((name) =>
  (window as unknown as Record<string, DreamscapeDebugHook | undefined>)[name]?.getState() ?? null, DEBUG_HOOK_NAME);

/** The journey's saved game, read from the same browser storage the game uses. */
export async function readSave(page: Page, journeyId = "milano"): Promise<GameState> {
  return (await savedGame(journeyId)(page))!;
}

export function allStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
}

/** Both browser storages, to prove a scene left them as they were. */
export function bothStorages(page: Page): Promise<{ local: Record<string, string>; session: Record<string, string> }> {
  return page.evaluate(() => ({
    local: Object.fromEntries(Object.entries(localStorage)), session: Object.fromEntries(Object.entries(sessionStorage)),
  }));
}

/** The generated catalogs of the checkout under test, as the dev server or the build wrote them. */
export function generated<T>(file: string): T {
  return JSON.parse(readFileSync(new URL(`../../src/content/generated/content/${file}`, import.meta.url), "utf8")) as T;
}
export const journeyCatalog = () => generated<JourneyCatalog>("journeys/catalog.json");

/** Game modules the development server serves to tests running code in the page (never the production build). */
export const devModules = {
  builders: "/src/dev/scenario-builders.ts",
  persistence: "/src/persistence/index.ts",
  journeyStorage: "/src/persistence/journey-storage.ts",
  content: "/src/content/index.ts",
  encounters: "/src/content/encounters.ts",
  debugState: "/src/dev/debug-state.ts",
} as const;

/**
 * Lane 2 (docs/10): build a state with the real game functions of the dev server
 * (src/dev/scenario-builders.ts) and store it with the game's own saveGame, as a
 * normal save of `journeyId`. Development server only. The test then plays on in the UI.
 */
export async function placeSave(page: Page, journeyId: string, builder: string, ...args: unknown[]) {
  const result = await page.evaluate(async ({ journeyId, builder, args, modules }) => {
    // Served by the dev server; the paths are arguments so TypeScript does not resolve them.
    const builders: Record<string, (...input: unknown[]) => unknown> = await import(/* @vite-ignore */ modules.builders);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    return saveGame(journeyStorage(localStorage, journeyId), builders[builder](...args));
  }, { journeyId, builder, args, modules: devModules });
  expect(result, `placing ${builder}(${JSON.stringify(args)}) as the ${journeyId} save`).toEqual({ ok: true });
}

/**
 * Every UI operation the specs share, in one place (button names and labels
 * change here, not in each spec).
 */
export const ops = {
  /** Title screen: choose a journey and names, and start playing. */
  async startJourney(page: Page, journeyId = "milano", names: readonly [string, string] = ["航", "澪"]) {
    await page.goto("/");
    await page.getByLabel("旅行編").selectOption(journeyId);
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
    await page.getByRole("button", { name: "旅をはじめる", exact: true }).click();
    await expect(page.getByTestId("travel-menu")).toBeVisible();
  },
  async openSettings(page: Page): Promise<Locator> {
    await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: "設定", exact: true }).click();
    const settings = page.getByRole("dialog", { name: "設定" });
    await expect(settings).toBeVisible();
    return settings;
  },
  async closeDialog(dialog: Locator) {
    await dialog.getByRole("button", { name: "閉じる", exact: true }).click();
    await expect(dialog).toBeHidden();
  },
  /** 文字送り: 45 = ゆっくり, 25 = ふつう (the default), 0 = 一括表示. */
  async setTextSpeed(page: Page, speed: 0 | 25 | 45) {
    const settings = await ops.openSettings(page);
    await settings.getByLabel("文字送り").selectOption(String(speed));
    await ops.closeDialog(settings);
  },
  async setAutoSave(page: Page, on: boolean) {
    const settings = await ops.openSettings(page);
    await settings.getByLabel("自動保存する").setChecked(on);
    await ops.closeDialog(settings);
  },
  async manualSave(page: Page) {
    await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: "セーブ", exact: true }).click();
  },
  async openEnglishNote(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "英語ノートを開く" }).click();
    const note = page.getByRole("dialog", { name: "英語ノート" });
    await expect(note).toBeVisible();
    return note;
  },
  /** Pick a destination on the travel menu, opening the longer list when needed. */
  async goTo(page: Page, placeId: string) {
    const place = page.getByTestId(`travel-place-${placeId}`);
    if (!(await place.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
    await place.getByRole("button").click();
  },
  /** Close a sightseeing guide and go on to the landmark's battle. */
  async skipGuideToBattle(page: Page) {
    await page.getByTestId("tourism-skip").click();
    await page.getByRole("button", { name: "進む", exact: true }).click();
  },
  async toFreeTime(page: Page) {
    await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
    await expect(page.getByTestId("travel-menu")).toBeVisible();
  },
  async toEpilogue(page: Page) {
    await page.getByRole("button", { name: "エピローグへ進む", exact: true }).click();
    await expect(page.getByTestId("city-epilogue-screen")).toBeVisible();
  },
  /** Lane 3 (docs/10): open a scene through its Debug launch URL; returns the URL. */
  async openDebugScene(page: Page, settings: DebugSettings, dataMode: DebugDataMode = "real") {
    const url = debugQueryString(settingsQuery(dataMode, settings));
    await page.goto(`/${url}`);
    await expect(page.getByTestId("debug-session")).toBeVisible();
    return url;
  },
  async backToDebugSettings(page: Page) {
    await page.getByRole("button", { name: "設定へ戻る" }).click();
    await expect(page.getByTestId("debug-panel")).toBeVisible();
  },
};

/** A 3-choice pick: the option ID (A/B/C) to press for a question, encounter choice or quiz. */
export type Pick = (state: GameState) => string;
const firstOption: Pick = () => "A";

const nextButtons = ["tourism-advance", "battle-advance", "epilogue-advance", "arrival-advance", "encounter-advance", "date-finish"]
  .map((id) => `[data-testid="${id}"]`).join(", ");

/** One player action in the current scene: answer, choose, or tap the line or its next button. */
async function act(page: Page, state: GameState, pick: Pick) {
  // Right after an answer the battle ignores taps for a moment (the second tap of a double tap).
  await expect(page.locator("[data-answer-settling]")).toHaveCount(0);
  const date = state.activeDate;
  const encounter = state.activeEncounter;
  if (state.activeBattle?.phase === "question") return page.getByTestId(`answer-${pick(state)}`).click();
  if (date?.frame.choices.length) return page.getByTestId("date-choice").first().click();
  if (encounter && !(await page.locator(nextButtons).filter({ visible: true }).count())) {
    const choose = page.getByRole("button", { name: `${pick(state)}を選ぶ`, exact: true });
    if (await choose.count()) return choose.click();
  }
  // The arrival logo finishes by itself and saves its completion.
  if (state.activeEpilogue?.kind === "arrival" && !state.activeEpilogue.logoComplete) return;
  const next = page.locator(nextButtons).filter({ visible: true });
  if (await next.count()) return next.first().click();
  return page.getByTestId("dialogue-text").click();
}

export interface PlayOptions {
  /** Where the state is read (default: Milan's normal save). */
  source?: StateSource;
  /** Which option to press in a 3-choice (default A). */
  pick?: Pick;
}

/** Play the current scene like a player until `done` holds for the game state.
 * Every action must be saved (a new revision) before the next one. */
export async function playUntil(page: Page, done: (state: GameState) => boolean, { source = savedGame(), pick = firstOption }: PlayOptions = {}) {
  for (let step = 0; step < 200; step++) {
    const state = (await source(page))!;
    if (done(state)) return state;
    await act(page, state, pick);
    await expect.poll(async () => (await source(page))?.revision, {
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
