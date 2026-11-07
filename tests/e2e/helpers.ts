import { test as base, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { JourneyCatalog } from "../../src/content/journey-catalog";
import type { QuizDefinition } from "../../src/content/schemas";
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
 * - sample: the sample journey's own development server, built with the sample (playwright.sample.config.ts).
 * - smoke: also in the weekly WebKit (iPhone) run (playwright.webkit.config.ts); explore: the weekly
 *   monkey (tests/e2e/explore/, playwright.explore.config.ts). Neither is a gate.
 */
export const tier = { gate: "@gate", debug: "@debug", prod: "@prod", sample: "@sample", smoke: "@smoke", explore: "@explore" } as const;

/** Keys the game writes (saves, backups, English notes, presentation settings). */
const gameKeyPrefix = "dreamscape.";

/**
 * Shared fixtures, all automatic:
 * - Requests to other origins (OpenStreetMap tiles, Google Fonts) are blocked, so a test never
 *   depends on the network; the game must work without them.
 * - Every test fails on an uncaught page error, a console error or a missing image, media or
 *   font file of the game in any of its tabs. Blocked requests to other origins are ignored.
 *   A test that can be replayed (the monkey's seed) adds a `reproduce` annotation; the
 *   guard's failure message repeats it.
 * - A failed test gets each tab's URL and the game's localStorage keys attached (storage.json).
 */
export const test = base.extend<{ externalNetwork: void; errorGuard: void; failureReport: void }>({
  externalNetwork: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    await context.route((url) => url.origin !== origin, (route) => route.abort("blockedbyclient"));
    await use();
  }, { auto: true }],
  errorGuard: [async ({ context, baseURL }, use, testInfo) => {
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
    const reproduce = testInfo.annotations.filter((note) => note.type === "reproduce").map((note) => ` (${note.description})`).join("");
    expect(errors, `console errors, uncaught exceptions or missing game files${reproduce}`).toEqual([]);
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

const readJson = <T>(url: URL): T => JSON.parse(readFileSync(url, "utf8")) as T;
/** The generated catalogs of the checkout under test, as the dev server or the build wrote them. */
export function generated<T>(file: string): T {
  return readJson<T>(new URL(`../../src/content/generated/content/${file}`, import.meta.url));
}
export const journeyCatalog = () => generated<JourneyCatalog>("journeys/catalog.json");
/** Every generated quiz by its ID. */
export const quizCatalog = () => readJson<Record<string, QuizDefinition>>(new URL("../../src/content/generated/quizzes.json", import.meta.url));

/** Game modules the development server serves to tests running code in the page (never the production build). */
export const devModules = {
  builders: "/src/dev/scenario-builders.ts",
  persistence: "/src/persistence/index.ts",
  journeyStorage: "/src/persistence/journey-storage.ts",
  content: "/src/content/index.ts",
  encounters: "/src/content/encounters.ts",
  debugState: "/src/dev/debug-state.ts",
  game: "/src/domain/game.ts",
  cityTravel: "/src/domain/city-travel.ts",
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
 * placeSave with a story scene on screen: the journey's new game (scenario-builders' newJourney)
 * with the first sightseeing guide that Debug lists in its first city opened (openTourismScene),
 * at the guide's first line. Returns the saved state. Development server only.
 */
export async function placeGuideSave(page: Page, journeyId: string): Promise<GameState> {
  const result = await page.evaluate(async ({ journeyId, modules }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const start = builders.newJourney(journeyId, ["航", "澪"]);
    const guide = debugTargets(start.currentCityId).tourism.find((target: { unavailable?: string }) => !target.unavailable);
    return saveGame(journeyStorage(localStorage, journeyId), builders.openTourismScene(start, guide.id));
  }, { journeyId, modules: devModules });
  expect(result, `placing a sightseeing guide as the ${journeyId} save`).toEqual({ ok: true });
  return readSave(page, journeyId);
}

/**
 * Every UI operation the specs share, in one place (button names and labels
 * change here, not in each spec).
 */
export const ops = {
  /** Title screen: choose a journey and names, and start playing. */
  async startJourney(page: Page, journeyId = "milano", names: readonly [string, string] = ["航", "澪"]) {
    await page.goto("/");
    await ops.beginJourney(page, journeyId, names);
    await expect(page.getByTestId("travel-menu")).toBeVisible();
  },
  /** Title screen: choose a journey and names and press 「旅をはじめる」 (a fresh title: its start says so), without waiting for the scene that opens (an arrival, or the map). */
  async beginJourney(page: Page, journeyId = "milano", names: readonly [string, string] = ["航", "澪"]) {
    await ops.chooseJourney(page, journeyId);
    await ops.fillNames(page, names);
    const start = ops.startButton(page);
    await expect(start).toHaveAccessibleName(ops.startLabel);
    await start.click();
  },
  /** Title screen: the start button, whatever it says (「旅をはじめる」, or 「元のデータを退避して／残して新しく始める」 over an unreadable save). */
  startButton(page: Page): Locator {
    return page.getByTestId("title-start");
  },
  /** The start button's name on a title in its normal state (no unreadable save); the arrow after it is hidden from the name. */
  startLabel: "旅をはじめる",
  /** Title screen: choose the journey (a page load opens the first available one; its save, if any, opens with it). */
  async chooseJourney(page: Page, journeyId: string) {
    await page.getByLabel("旅行編").selectOption(journeyId);
  },
  /** Title screen: the player's and the heroine's names. */
  async fillNames(page: Page, names: readonly [string, string] = ["航", "澪"]) {
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
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
  /** The 「閉じる」 of the notice shown at the top of the screen (after 「セーブ」, for one). */
  noticeClose(page: Page): Locator {
    return page.getByRole("main").getByRole("status").getByRole("button", { name: "閉じる", exact: true });
  },
  async manualSave(page: Page) {
    await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: "セーブ", exact: true }).click();
  },
  /**
   * The header's 「ロード」 while progress is unsaved (manual saving): returns the confirmation
   * 「保存した場面を読み込みますか？」 with its 「ロードする」 (`loadButton`).
   */
  async askToLoad(page: Page): Promise<{ dialog: Locator; loadButton: Locator }> {
    await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: "ロード", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "保存した場面を読み込みますか？" });
    await expect(dialog).toBeVisible();
    return { dialog, loadButton: dialog.getByRole("button", { name: "ロードする", exact: true }) };
  },
  async openEnglishNote(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "英語ノートを開く" }).click();
    const note = page.getByRole("dialog", { name: "英語ノート" });
    await expect(note).toBeVisible();
    return note;
  },
  /** A destination's button on the travel menu, opening the longer list when needed. */
  async destination(page: Page, placeId: string): Promise<Locator> {
    const place = page.getByTestId(`travel-place-${placeId}`);
    if (!(await place.isVisible())) await page.getByText("ほかの行き先を見る", { exact: true }).click();
    return place.getByRole("button");
  },
  /** Pick a destination on the travel menu, opening the longer list when needed. */
  async goTo(page: Page, placeId: string) {
    await (await ops.destination(page, placeId)).click();
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
  /**
   * A story scene: a point on its picture above the dialogue window, where no control is
   * (a tap anywhere but on a control reads on, docs/02 「UX/スマホ」). Taken while the window is
   * shown, once the page takes taps again (a scene that has just started holds them).
   */
  async sceneBackgroundPoint(page: Page): Promise<{ x: number; y: number }> {
    await ops.settled(page);
    const picture = (await page.getByTestId("scene-picture").filter({ visible: true }).boundingBox())!;
    const line = (await page.getByTestId("dialogue-text").boundingBox())!;
    // A quarter of the way down from the picture's top to the line: well above the window's name plate and tools.
    const point = { x: picture.x + picture.width / 2, y: picture.y + (line.y - picture.y) / 4 };
    const hit = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.closest('[data-testid="scene-picture"]') !== null &&
        element?.closest("a, button, input, select, textarea, label, summary, dialog, [role=button], [role=link], [data-no-advance]") === null;
    }, point);
    expect(hit, "the point shows the scene's picture, not a control or the window").toBe(true);
    return point;
  },
  /**
   * A point in a gap of the dialogue window's tool row (「閉じる」「ログ」「高速送り」), between two
   * of its buttons: a near miss, which never reads on.
   */
  async dialogueToolsGap(page: Page): Promise<{ x: number; y: number }> {
    await ops.settled(page);
    const point = await page.getByLabel("会話の操作", { exact: true }).filter({ visible: true }).evaluate((row) => {
      const buttons = [...row.querySelectorAll(":scope > button, :scope > * > button")].map((button) => button.getBoundingClientRect())
        .filter((box) => box.width > 0).sort((a, b) => a.left - b.left);
      for (let index = 1; index < buttons.length; index++) {
        const [left, right] = [buttons[index - 1], buttons[index]];
        if (right.left - left.right >= 2) return { x: (left.right + right.left) / 2, y: left.top + left.height / 2 };
      }
      return null;
    });
    expect(point, "a gap between two buttons of the tool row").not.toBeNull();
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.getAttribute("aria-label"), point!);
    expect(hit, "the point is the tool row itself, not one of its buttons").toBe("会話の操作");
    return point!;
  },
  /** The middle of an element on screen, for taps at a point (`tap`, `doubleTap`). */
  async centerOf(locator: Locator): Promise<{ x: number; y: number }> {
    await expect(locator).toBeVisible();
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  },
  /** A finger's tap at a point of the page, once the game takes taps again (settled). */
  async tap(page: Page, point: { x: number; y: number }) {
    await ops.settled(page);
    await page.touchscreen.tap(point.x, point.y);
  },
  /**
   * Two taps of a finger at a point, as one quick double tap. Hold the page's clock
   * first (`page.clock.pauseAt`), so they fall within the double-tap window however
   * slow the machine; `page.clock.fastForward(DOUBLE_TAP_WINDOW_MS)` ends it.
   */
  async doubleTap(page: Page, point: { x: number; y: number }) {
    await page.touchscreen.tap(point.x, point.y);
    await page.touchscreen.tap(point.x, point.y);
  },
  /**
   * A finger's short sideways drag from a point (Chromium's touch input): the browser takes it
   * for a pan and cancels the pointer (pointerdown, then pointercancel), so no click follows.
   */
  async pan(page: Page, point: { x: number; y: number }) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: point.x - 60, y: point.y }] });
    for (let step = 1; step <= 6; step++)
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: point.x - 60 + step * 20, y: point.y }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  },
  /**
   * The game takes taps again: right after an answer the battle ignores the second tap of
   * a double tap (`data-answer-settling`), right after a press on a control (or a tap over
   * something on a story scene) the scene takes no reading tap (`data-tap-settling`), and
   * right after a story scene starts or ends, a load, a journey switch or 再試行 no tap reaches the page
   * (`data-tap-hold` on the root). Each lasts DOUBLE_TAP_WINDOW_MS. A scene that a move
   * has just started takes no reading tap on the travel transition's card, so this also
   * waits for the transition to go.
   */
  async settled(page: Page) {
    await expect(page.locator("[data-answer-settling], [data-tap-settling], html[data-tap-hold], [data-testid=travel-transition]")).toHaveCount(0);
  },
  /** A story scene's 「ログ」: opens the dialogue log. */
  async openDialogueLog(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "会話ログ", exact: true }).click();
    const log = page.getByRole("dialog", { name: "会話ログ" });
    await expect(log).toBeVisible();
    return log;
  },
  /** A story scene's 「閉じる」 in the dialogue window: hides the window; returns the full-scene control that shows it again. */
  async hideDialogueWindow(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "会話ウィンドウを隠す", exact: true }).click();
    const restore = page.getByRole("button", { name: "会話ウィンドウを表示", exact: true });
    await expect(restore).toBeVisible();
    return restore;
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
  /** Special battle B/C: after the claim, the optional rebuttal lines and the cut-in (presentation only, never saved). */
  async passReasoningIntro(page: Page) {
    const notebook = page.getByTestId("reasoning-notebook");
    const line = page.getByTestId("dialogue-text");
    const rebuttal = page.getByTestId("reasoning-rebuttal-advance");
    const skip = page.getByTestId("reasoning-cutin-skip");
    for (let step = 0; step < 50 && !(await notebook.isVisible()); step++) {
      await expect(notebook.or(skip).or(rebuttal).or(line).first()).toBeVisible();
      if (await skip.isVisible()) await skip.click();
      else if (await rebuttal.isVisible()) await rebuttal.click();
      else if (await line.isVisible()) await line.click();
    }
    await expect(notebook).toBeVisible();
  },
  /** Special battle B/C: choose each clue as evidence in the clue book, then return to the battle. */
  async chooseEvidence(page: Page, clueIds: readonly string[]) {
    for (const clueId of clueIds) {
      await page.getByTestId("reasoning-notebook").click();
      await page.getByTestId("clue-picker").selectOption(clueId);
      await page.getByTestId(`select-evidence-${clueId}`).click();
      await expect(page.getByTestId(`select-evidence-${clueId}`)).toContainText("選択中");
      await page.getByTestId("case-return").click();
    }
  },
};

/** A 3-choice pick: the option ID (A/B/C) to press for a question, encounter choice or quiz. */
export type Pick = (state: GameState) => string;
const firstOption: Pick = () => "A";

const nextButtons = ["tourism-advance", "battle-advance", "epilogue-advance", "arrival-advance", "encounter-advance", "date-finish"]
  .map((id) => `[data-testid="${id}"]`).join(", ");

/** One player action in the current scene: answer, choose, or tap the line or its next button. */
async function act(page: Page, state: GameState, pick: Pick) {
  // Right after an answer, a reply or a scene's end, taps are ignored for a moment (the second tap of a double tap).
  await ops.settled(page);
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
    if (done(state)) {
      // The caller may tap at once (also with the page's clock held).
      await ops.settled(page);
      return state;
    }
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
