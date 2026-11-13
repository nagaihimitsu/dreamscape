import { test as base, expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { JourneyCatalog } from "../../src/content/journey-catalog";
import type { QuizDefinition } from "../../src/content/schemas";
import type { GameState } from "../../src/domain/game";
import { DEBUG_HOOK_NAME, type DreamscapeDebugHook } from "../../src/dev/debug-hook";
import { debugQueryString, settingsQuery, type DebugDataMode, type DebugSettings } from "../../src/dev/debug-query";

export { expect };
export type { Locator, Page };

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
/** The lines this device has read in a journey (read-skip; written as lines are shown in full). */
export const readLinesKey = (journeyId = "milano") => `dreamscape.journey.${journeyId}.read-lines.v1`;
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
  journeys: "/src/content/journeys.ts",
  encounters: "/src/content/encounters.ts",
  encounter: "/src/domain/encounter.ts",
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
 * placeSave with a date on screen: Milan cleared (scenario-builders' completedCity, 12 AP) and the first
 * date that Debug lists for the journey's first city started there with the saved reaction ticket 0
 * (every reply positive), at its first line. Returns the saved state. Development server only.
 */
export async function placeDateSave(page: Page, journeyId = "milano"): Promise<GameState> {
  const result = await page.evaluate(async ({ journeyId, modules }) => {
    const builders = await import(/* @vite-ignore */ modules.builders);
    const { debugTargets } = await import(/* @vite-ignore */ modules.debugState);
    const { saveGame } = await import(/* @vite-ignore */ modules.persistence);
    const { journeyStorage } = await import(/* @vite-ignore */ modules.journeyStorage);
    const cityId = builders.newJourney(journeyId, ["航", "澪"]).currentCityId;
    const date = debugTargets(cityId).date.find((target: { unavailable?: string }) => !target.unavailable);
    const cleared = builders.withAp(builders.completedCity(cityId, { names: ["航", "澪"] }), 12);
    return saveGame(journeyStorage(localStorage, journeyId), builders.startDateScene(cleared, date.id, builders.rollTickets.positive));
  }, { journeyId, modules: devModules });
  expect(result, `placing a date as the ${journeyId} save`).toEqual({ ok: true });
  return readSave(page, journeyId);
}

/** Where a tap never reads a story scene on: controls and `data-no-advance` areas (src/components/scene-tap.ts). */
const notReadingOn = "a, button, input, select, textarea, label, summary, dialog, [role=button], [role=link], [data-no-advance]";
/**
 * Whether the page shows `surface` (a CSS selector) at the point, and no control or `data-no-advance`
 * area there other than the surface itself (the line is a button that reads on).
 */
function showsAt(page: Page, point: { x: number; y: number }, surface: string): Promise<boolean> {
  return page.evaluate(({ x, y, surface, controls }) => {
    const element = document.elementFromPoint(x, y);
    const shown = element?.closest(surface);
    const control = element?.closest(controls);
    return !!shown && (!control || control === shown);
  }, { ...point, surface, controls: notReadingOn });
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
    // A journey with an opening movie (manifest openingMovie) plays it first: skip it, as a player may. A browser that
    // cannot play it ends it by itself, so it may be gone already.
    if (await page.getByTestId("opening-movie").isVisible().catch(() => false))
      await page.getByTestId("opening-movie-skip").click().catch(() => undefined);
  },
  /** Title screen: the start button, whatever it says (「旅をはじめる」, or 「元のデータを退避して／残して新しく始める」 over an unreadable save). */
  startButton(page: Page): Locator {
    return page.getByTestId("title-start");
  },
  /** The start button's name on a title in its normal state (no unreadable save); the arrow after it is hidden from the name. */
  startLabel: "旅をはじめる",
  /**
   * Title screen: choose the journey. A page load opens the playable journey last opened in this browser
   * (in a new browser context, the first available one); its save, if any, opens with it.
   */
  async chooseJourney(page: Page, journeyId: string) {
    await page.getByLabel("旅行編").selectOption(journeyId);
  },
  /** Title screen: the player's and the heroine's names (an empty name leaves its field empty: the journey starts with the default name shown as its placeholder). */
  async fillNames(page: Page, names: readonly [string, string] = ["航", "澪"]) {
    await page.getByLabel("主人公の名前").fill(names[0]);
    await page.getByLabel("ヒロインの名前").fill(names[1]);
  },
  /**
   * The header's ⚙設定: a button whose small panel holds セーブ, ロード, 旅の記録, アルバム, 英語ノート, 写真の出典 (free time)
   * or 画像の出典 (a story scene's photo) and ゲームの設定 (openMenu). While 英語ノート has a new entry, its name and
   * 「英語ノート」's go on with 「、…新しい項目あり」 (its dot; the browser may put a space before it, as the words are a
   * separate visually hidden span).
   */
  settingsButton(page: Page): Locator {
    return page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: /^設定\s*(?:、|$)/u });
  },
  /** Opens ⚙設定's panel (if it is not open yet) and returns it. */
  async openMenu(page: Page): Promise<Locator> {
    const button = ops.settingsButton(page);
    if (await button.getAttribute("aria-expanded") !== "true") await button.click();
    const panel = page.getByTestId("hud-menu-panel");
    await expect(panel).toBeVisible();
    return panel;
  },
  /** One of ⚙設定's items, pressed from its panel (inside the header's 「旅の操作」). */
  async menuItem(page: Page, name: "セーブ" | "ロード" | "旅の記録" | "アルバム" | "英語ノート" | "写真の出典" | "画像の出典" | "ゲームの設定") {
    await ops.openMenu(page);
    await page.getByRole("navigation", { name: "旅の操作" }).getByRole("button", { name: new RegExp(`^${name}\\s*(?:、|$)`, "u") }).click();
  },
  /**
   * ⚙設定 → 「ゲームの設定」: returns the settings dialog (文字送り, 自動保存, names, the saved data)
   * once it takes presses (it opens under the finger and waits a moment: Modal's settlePresses).
   */
  async openSettings(page: Page): Promise<Locator> {
    await ops.menuItem(page, "ゲームの設定");
    const settings = page.getByRole("dialog", { name: "ゲームの設定" });
    await expect(settings).toBeVisible();
    await expect(settings).not.toHaveAttribute("data-settling");
    return settings;
  },
  /** Settings → 「古い保存データの整理」 (the settings dialog closes, the cleanup dialog opens). */
  async openOldDataCleanup(page: Page): Promise<Locator> {
    const settings = await ops.openSettings(page);
    await settings.getByRole("button", { name: "古い保存データの整理" }).click();
    const cleanup = page.getByRole("dialog", { name: "古い保存データの整理" });
    await expect(cleanup).toBeVisible();
    return cleanup;
  },
  /**
   * 「出典・権利の一覧」 from the title screen (under its note) or from ⚙設定 → ゲームの設定 (which closes);
   * returns the dialog once it takes presses (it opens under the finger: Modal's settlePresses).
   */
  async openCredits(page: Page, from: "title" | "settings"): Promise<Locator> {
    const scope = from === "title" ? page.getByRole("main") : await ops.openSettings(page);
    await scope.getByRole("button", { name: "出典・権利の一覧", exact: true }).click();
    const credits = page.getByRole("dialog", { name: "出典・権利の一覧" });
    await expect(credits).toBeVisible();
    await expect(credits).not.toHaveAttribute("data-settling");
    return credits;
  },
  /** In 「古い保存データの整理」: tick the listed items whose titles match, then 「選んだデータを消去する」 (the confirmation opens). */
  async chooseOldData(page: Page, cleanup: Locator, titles: readonly RegExp[]): Promise<Locator> {
    for (const title of titles) await cleanup.getByRole("checkbox", { name: title }).check();
    await cleanup.getByRole("button", { name: "選んだデータを消去する" }).click();
    const confirm = page.getByRole("dialog", { name: "選んだ保存データを消去しますか？" });
    await expect(confirm).toBeVisible();
    return confirm;
  },
  /**
   * A finger tap at the centre of `target` as it is on screen now, without waiting for it to be
   * enabled or still: a quick second tap lands on whatever has moved under the finger.
   */
  async tap(page: Page, target: Locator) {
    await target.scrollIntoViewIfNeeded();
    const box = (await target.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
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
  /** ゲームの設定's 自動送り (story lines read on by themselves after a reading time). */
  async setAutoAdvance(page: Page, on: boolean) {
    const settings = await ops.openSettings(page);
    await settings.getByLabel("自動送りする").setChecked(on);
    await ops.closeDialog(settings);
  },
  /**
   * ⚙設定 → ゲームの設定 → 「Debugモード」 → 「Debugモードをオンにする」, the password (「adminmode」, not a
   * secret: src/app/debug-mode.ts) and 「オンにする」; closes ゲームの設定 again. The switch is this device's preference.
   */
  async turnOnDebugMode(page: Page, password = "adminmode") {
    const settings = await ops.openSettings(page);
    const section = settings.getByTestId("debug-mode-setting");
    await section.getByRole("button", { name: "Debugモードをオンにする" }).click();
    await section.getByLabel("パスワード").fill(password);
    await section.getByRole("button", { name: "オンにする", exact: true }).click();
    await expect(section.getByText("Debugモードはオンです（この端末だけ）。")).toBeVisible();
    await ops.closeDialog(settings);
  },
  /** ⚙設定 → ゲームの設定 → 「Debugモードをオフにする」 (no password; it waits out its 0.5 s settle); closes ゲームの設定 again. */
  async turnOffDebugMode(page: Page) {
    const settings = await ops.openSettings(page);
    const section = settings.getByTestId("debug-mode-setting");
    await section.getByRole("button", { name: "Debugモードをオフにする" }).click();
    await expect(section.getByText("Debugモードをオフにしました。")).toBeVisible();
    await ops.closeDialog(settings);
  },
  /** The 「閉じる」 of the notice shown at the top of the screen (after 「セーブ」, for one). */
  noticeClose(page: Page): Locator {
    return page.getByRole("main").getByRole("status").getByRole("button", { name: "閉じる", exact: true });
  },
  /** ⚙設定 → 「セーブ」. */
  async manualSave(page: Page) {
    await ops.menuItem(page, "セーブ");
  },
  /** ⚙設定 → 「ロード」: with nothing unsaved the saved scene comes back at once (with unsaved progress it asks first: askToLoad). */
  async loadSaved(page: Page) {
    await ops.menuItem(page, "ロード");
  },
  /**
   * ⚙設定 → 「ロード」 while progress is unsaved (manual saving): returns the confirmation
   * 「保存した場面を読み込みますか？」 with its 「ロードする」 (`loadButton`), once it takes presses
   * (it opens under the finger and waits a moment, like the settings).
   */
  async askToLoad(page: Page): Promise<{ dialog: Locator; loadButton: Locator }> {
    await ops.loadSaved(page);
    const dialog = page.getByRole("dialog", { name: "保存した場面を読み込みますか？" });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute("data-settling");
    return { dialog, loadButton: dialog.getByRole("button", { name: "ロードする", exact: true }) };
  },
  /** ⚙設定 → 「旅の記録」 (its first line, `city-progress`, is the city's progress: 観光・クイズ / 都市クリア); returns that dialog. */
  async openRecords(page: Page): Promise<Locator> {
    await ops.menuItem(page, "旅の記録");
    const records = page.getByRole("dialog", { name: "旅の記録" });
    await expect(records).toBeVisible();
    return records;
  },
  /** 「{player} と {heroine}」 from 旅の記録's header line (the names are not in the header): opens 旅の記録, reads the line, closes it. */
  async readTravelers(page: Page): Promise<string> {
    const records = await ops.openRecords(page);
    const travelers = await records.getByTestId("travelers").innerText();
    await ops.closeDialog(records);
    return travelers;
  },
  /**
   * The header's held items: one item's own button (「{item}の詳細」), or 「所持品」 (「所持品（{n}個）」) for two or more;
   * 「、新しい品物あり」 follows while one has not been looked at (its dot).
   */
  heldItemsButton(page: Page): Locator {
    return page.getByRole("group", { name: "所持アイテム" }).getByRole("button", { name: /(?:の詳細|^所持品（\d+個）)(?:、新しい品物あり)?$/u });
  },
  /** Opens the held items' detail (the item, or every held item) under the header and returns it. */
  async openHeldItems(page: Page): Promise<Locator> {
    await ops.heldItemsButton(page).click();
    const detail = page.getByRole("group", { name: "所持アイテム" }).getByRole("dialog");
    await expect(detail).toBeVisible();
    return detail;
  },
  /** ⚙設定 → 「英語ノート」. */
  async openEnglishNote(page: Page): Promise<Locator> {
    await ops.menuItem(page, "英語ノート");
    const note = page.getByRole("dialog", { name: "英語ノート" });
    await expect(note).toBeVisible();
    return note;
  },
  /**
   * A destination's photo card (B案「写真札で旅先を選ぶ」, docs/02): its button in free time's row, which holds every
   * place, sightseeing and dates alike. A press on it only selects the place (never travels).
   */
  destination(page: Page, placeId: string): Locator {
    // The card's own button comes first (in the list the chosen row also holds its introduction card).
    return page.getByTestId("travel-menu").getByTestId(`travel-place-${placeId}`).getByRole("button").first();
  },
  /** Select a destination by its photo card and return its introduction card (`place-card`, every event there) showing the place. */
  async selectDestination(page: Page, placeId: string): Promise<Locator> {
    const menu = page.getByTestId("travel-menu");
    const card = menu.getByTestId(`travel-place-${placeId}`);
    await card.getByRole("button").first().click();
    await expect(card).toHaveAttribute("data-selected", "true");
    const intro = menu.getByTestId("place-card");
    await expect(intro).toHaveAttribute("data-place-id", placeId);
    return intro;
  },
  /**
   * An introduction card's button that goes (「…で行く」, 「行く」 or 「ここで始める」; in the row of photo cards it is for screen
   * readers and keys only, the card is swiped up: press Enter on it); with several events, that of `eventId` (shown once chosen).
   */
  wayButton(card: Locator, eventId?: string): Locator {
    return (eventId ? card.getByTestId(`place-event-${eventId}`) : card).locator('[data-testid^="travel-go-"]').first();
  },
  /** Presses a 「行く」 (ops.wayButton): a click where it shows (the list, the expanded map), else Enter (the row's, for keys). */
  async pressGo(go: Locator) {
    if (await go.evaluate((button) => button.classList.contains("is-quiet"))) await go.press("Enter");
    else await go.click();
  },
  /**
   * Go to a destination as B案 does: select its photo card, then in its introduction card (once armed, `data-armed`)
   * the event `eventId` (when the place has several), the mode `mode` (walking unless named; a mode is pressed only
   * when the event has several) and its 「行く」 (in the row, Enter on it: a finger swipes the photo card up instead).
   * Fails with a clear message when the requested choice is not offered.
   * The page's clock must run (the arming waits on a timer): hold it only after the last press.
   */
  async goTo(page: Page, placeId: string, choice: TravelChoice = {}) {
    await chooseInCard(await ops.selectDestination(page, placeId), placeId, choice);
  },
  /**
   * The same from the expanded map: the header's 「地図」 (「地図を大きく見る」), the place's marker by keyboard (Enter
   * selects it), then the same steps in the dialog's 「選んだ行き先」 (its own introduction card).
   */
  async goToFromMap(page: Page, placeId: string, choice: TravelChoice = {}) {
    await page.getByRole("button", { name: "地図を大きく見る" }).click();
    const dialog = page.getByRole("dialog", { name: /の地図$/u });
    await expect(dialog).toBeVisible();
    await dialog.getByTestId(`map-marker-${placeId}`).focus();
    await page.keyboard.press("Enter");
    await chooseInCard(dialog.getByTestId("map-selection").getByTestId("place-card"), placeId, choice);
  },
  /**
   * 「ホテルに戻る」, the last card of free time's row: returns its card (休む's ways home, one always chosen, and its 「休む」)
   * once 「休む」 takes presses (armed). 待機's waits are on 「待機」, the first card, chosen the same way (then its 「待つ」).
   */
  async stay(page: Page): Promise<Locator> {
    const menu = page.getByTestId("travel-menu");
    await menu.getByTestId("travel-stay").getByRole("button").first().click();
    const card = menu.getByTestId("stay-card");
    await expect(card).toHaveAttribute("data-armed", "true");
    return card;
  },
  /**
   * 休む: 「ホテルに戻る」, its way home `mode` chosen (via `viaPlaceId`; at the hotel 「ホテルに戻って休む」, walking), then
   * its 「休む」 (ops.pressGo: in the row it is for screen readers and keys only, pressed by Enter; a finger swipes the
   * photo card up instead).
   */
  async sleep(page: Page, { mode = "walk", viaPlaceId }: { mode?: string; viaPlaceId?: string } = {}) {
    const card = await ops.stay(page);
    const way = card.getByTestId(`travel-sleep-route-${mode}${viaPlaceId ? `-${viaPlaceId}` : ""}`);
    expect(await way.count(), `a way home by ${mode}${viaPlaceId ? ` via ${viaPlaceId}` : ""}`).toBe(1);
    await way.click();
    await expect(way).toHaveAttribute("aria-pressed", "true");
    await ops.pressGo(card.getByTestId("travel-sleep-go"));
  },
  /** The tour's card in free time's row (tour stage 2a; B案): a booked tour's line with its cancel, and 「ツアーを見る」. */
  async tourCard(page: Page): Promise<Locator> {
    const menu = page.getByTestId("travel-menu");
    await menu.getByTestId("travel-tour").getByRole("button").first().click();
    const card = menu.getByTestId("tour-card");
    await expect(card).toBeVisible();
    return card;
  },
  /** The tour's card → 「ツアーを見る」: the sheet of the city's tours. */
  async openTours(page: Page): Promise<Locator> {
    await (await ops.tourCard(page)).getByTestId("travel-tours-open").click();
    const sheet = page.getByRole("dialog", { name: "ツアー", exact: true });
    await expect(sheet).toBeVisible();
    await expect(sheet).not.toHaveAttribute("data-settling");
    return sheet;
  },
  /** Book a tour from the sheet through `offerId` and confirm it: the line then names tomorrow's tour. */
  async bookTour(page: Page, offerId: string) {
    const sheet = await ops.openTours(page);
    await sheet.getByTestId(`travel-tour-book-${offerId}`).click();
    await page.getByTestId("travel-tour-confirm").click();
    await expect(page.getByTestId("travel-tour-booked")).toBeVisible();
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
  /**
   * The result's 「自由時間へ進む」, then the scenes that follow the battle (Milan's 「切れた三本目」 after the Duomo's),
   * played with their first choices, back to the travel menu. Returns the saved state there.
   */
  async toFreeTimeThroughScenes(page: Page): Promise<GameState> {
    await page.getByRole("button", { name: "自由時間へ進む", exact: true }).click();
    const state = await playUntil(page, (current) => !current.activeEncounter && !current.occasion);
    await expect(page.getByTestId("travel-menu")).toBeVisible();
    return state;
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
    // The picture runs on behind the header that lies over its top: what shows of it starts below it.
    const covered = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('[data-testid="journey-bar"]')]
      .map((element) => element.getBoundingClientRect()).filter((box) => box.height > 0).map((box) => box.bottom)));
    const top = Math.max(picture.y, covered);
    // A quarter of the way down from the picture's shown top to the line: well above the window's name plate and tools.
    const point = { x: picture.x + picture.width / 2, y: top + (line.y - top) / 4 };
    expect(await showsAt(page, point, '[data-testid="scene-picture"]'), "the point shows the scene's picture, not a control or the window").toBe(true);
    return point;
  },
  /**
   * Whether a tap at the point would read the story scene on: it shows the line (a button that
   * reads on), or the scene's picture with no control or `data-no-advance` area there (the same
   * rule as sceneBackgroundPoint).
   */
  async readsOnAt(page: Page, point: { x: number; y: number }): Promise<boolean> {
    return await showsAt(page, point, '[data-testid="dialogue-text"]') || await showsAt(page, point, '[data-testid="scene-picture"]');
  },
  /**
   * The heading of a sightseeing guide, a battle, a date or an encounter (level 1: the landmark, the battle's
   * title for a city finale, the date's destination, the encounter's place, after a running tour's tag), for
   * screen readers only: over a conversation the header shows where the couple are (user decision 2026-11-11).
   */
  sceneHeading(page: Page): Locator {
    return page.getByTestId("scene-heading");
  },
  /**
   * A point in a gap of the dialogue window's tool row (「隠す」or the guide's 「閉じる」, 「ログ」,
   * 「高速送り」), between two of its buttons: a near miss, which never reads on.
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
  /**
   * The middle of an element on screen, for taps at a point (`tapAt`, `doubleTap`). The element is
   * scrolled into view first, as a player scrolls to what they tap: one shown only in part at the
   * edge of a scrolling area (the battle's reading area after a long explanation, whose length
   * depends on the fonts) has its middle outside that area, where a tap reaches something else.
   */
  async centerOf(locator: Locator): Promise<{ x: number; y: number }> {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    const box = (await locator.boundingBox())!;
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  },
  /** A finger's tap at a point of the page, once the game takes taps again (settled). */
  async tapAt(page: Page, point: { x: number; y: number }) {
    await ops.settled(page);
    await page.touchscreen.tap(point.x, point.y);
  },
  /**
   * Holds the page's clock (installed with `page.clock.install()`): the timers due in the next
   * second run, then time stands still until `page.clock.resume()` (`page.clock.fastForward`
   * moves it on while held). `page.clock.pauseAt` takes a time, and on a slow machine the page's
   * clock can pass a time read from the page a moment before the call arrives ("Cannot
   * fast-forward to the past"). That failed call has already stopped the clock (Playwright's
   * clock pauses before it moves to the time), so the time is read again and the hold retried.
   */
  async holdClock(page: Page) {
    for (let attempt = 1; ; attempt++) {
      const now = await page.evaluate(() => Date.now());
      try {
        await page.clock.pauseAt(now + 1_000);
        return;
      } catch (error) {
        if (attempt === 3 || !String(error).includes("Cannot fast-forward to the past")) throw error;
      }
    }
  },
  /**
   * Two taps of a finger at a point, as one quick double tap. Hold the page's clock
   * first (`holdClock`), so they fall within the double-tap window however slow the
   * machine; `page.clock.fastForward(DOUBLE_TAP_WINDOW_MS)` ends it.
   */
  async doubleTap(page: Page, point: { x: number; y: number }) {
    await page.touchscreen.tap(point.x, point.y);
    await page.touchscreen.tap(point.x, point.y);
  },
  /**
   * The game takes taps again: right after an answer the battle ignores the second tap of
   * a double tap (`data-answer-settling`), right after a press on a control (or a tap over
   * something on a story scene) the scene takes no reading tap (`data-tap-settling`), and
   * right after a story scene starts or ends, a load, a journey switch or 再試行 no tap reaches the page
   * (`data-tap-hold` on the root). Each lasts DOUBLE_TAP_WINDOW_MS. A scene that a move
   * has just started takes no reading tap on the travel transition's card, so this also
   * waits for the transition to go, for the day's end visuals (night-rest, night-leaving, night-fade: a tap ends each) and for
   * the journey's moments that cover a screen by themselves (an episode's title card, a departure's packing; each ends by itself).
   */
  async settled(page: Page) {
    await expect(page.locator("[data-answer-settling], [data-tap-settling], html[data-tap-hold], [data-testid=travel-transition], [data-testid=night-rest], [data-testid=night-leaving], [data-testid=night-fade], [data-testid=episode-title-card], [data-testid=packing-scene]")).toHaveCount(0);
  },
  /** A story scene's 「ログ」: opens the dialogue log. */
  async openDialogueLog(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "会話ログ", exact: true }).click();
    const log = page.getByRole("dialog", { name: "会話ログ" });
    await expect(log).toBeVisible();
    return log;
  },
  /**
   * A story scene's 「隠す」 in the dialogue window: hides the window; returns the full-scene control that shows it
   * again (no words on screen, an eye; its name 「会話を表示」 is for readers).
   */
  async hideDialogueWindow(page: Page): Promise<Locator> {
    await page.getByRole("button", { name: "会話ウィンドウを隠す", exact: true }).click();
    const restore = page.getByRole("button", { name: "会話を表示", exact: true });
    await expect(restore).toBeVisible();
    return restore;
  },
  /**
   * After a navigation into Debug (a launch URL, or a link to its scene picker 「場面の確認」): what Debug
   * shows first. Debug is loaded only after the page's load event (React.lazy in src/main.tsx),
   * module by module from the development server, and then builds its game: about 1 s here,
   * 1.4–1.7 s under 6× CPU throttling, and more than the 5 s an assertion waits by default with
   * four throttled browsers at once. It is part of opening the page, so it gets a page load's time.
   */
  async debugShown(shown: Locator) {
    await expect(shown).toBeVisible({ timeout: 30_000 });
  },
  /** Lane 3 (docs/10): open a scene through its Debug launch URL; returns the URL. */
  async openDebugScene(page: Page, settings: DebugSettings, dataMode: DebugDataMode = "real") {
    const url = debugQueryString(settingsQuery(dataMode, settings));
    await page.goto(`/${url}`);
    await ops.debugShown(page.getByTestId("debug-session"));
    return url;
  },
  /** Debug's bar 「場面の選択へ戻る」: back to the scene picker 「場面の確認」. */
  async backToDebugSettings(page: Page) {
    await page.getByRole("button", { name: "場面の選択へ戻る" }).click();
    await expect(page.getByTestId("debug-panel")).toBeVisible();
  },
  /** Special battle B/C: after the claim, the rebuttal lines if any and the cut-in (presentation only). */
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
/** What ops.goTo chooses in an introduction card: the event (a place with several) and the mode (walking by default). */
export type TravelChoice = { eventId?: string; mode?: string };

/** The steps in a selected place's introduction card (on the page, in the date sheet or in the expanded map's slot): see ops.goTo. */
async function chooseInCard(card: Locator, placeId: string, { eventId, mode = "walk" }: TravelChoice) {
  await expect(card).toHaveAttribute("data-place-id", placeId);
  await expect(card).toHaveAttribute("data-armed", "true");
  const ids = await card.locator('[data-testid^="place-event-"]').evaluateAll((items) => items.map((item) => item.getAttribute("data-testid")!.slice("place-event-".length)));
  if (ids.length > 1 && (!eventId || !ids.includes(eventId)))
    throw new Error(`${placeId} offers the events ${ids.join(", ")}: name one of them (eventId${eventId ? `, not ${eventId}` : ""})`);
  const event = ids.length > 1 ? eventId! : ids[0];
  const block = card.getByTestId(`place-event-${event}`);
  // Several events: the event is chosen first (its ways show under it).
  if (ids.length > 1) {
    const pick = block.getByTestId(`event-choice-${event}`);
    await pick.click();
    await expect(pick).toHaveAttribute("aria-pressed", "true");
  }
  // Several modes: one row of modes (a press only chooses one), then the one 「行く」.
  const modes = block.locator('[data-testid^="travel-mode-"]');
  if (await modes.count()) {
    const chip = block.getByTestId(`travel-mode-${event}-${mode}`);
    if (!(await chip.count())) {
      const offered = await modes.evaluateAll((items) => items.map((item) => item.getAttribute("data-testid")));
      throw new Error(`${placeId} (${event}) is not reached by ${mode}; offered: ${offered.join(", ")}`);
    }
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
  }
  const go = block.getByTestId(`travel-go-${event}`);
  const offered = await go.getAttribute("data-mode");
  if (offered !== mode) throw new Error(`${placeId} (${event}) is not reached by ${mode}; offered: ${offered}`);
  await ops.pressGo(go);
}

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
  // A guide's, an arrival's or an epilogue's Japanese choices (stage 3a): the first shown one.
  if (state.activeTourism?.phase === "guide" && state.activeTourism.frame?.choices.length) return page.getByTestId("guide-choice").first().click();
  if (state.activeEpilogue?.frame.choices.length) return page.getByTestId("epilogue-choice").first().click();
  // A battle's conversation choices (stage 5; its quiz and reasoning calls are not shown as choices).
  if (state.activeBattle?.phase === "dialogue" && state.activeBattle.frame?.choices.some((choice) => !choice.call))
    return page.getByTestId("battle-choice").first().click();
  if (encounter && !(await page.locator(nextButtons).filter({ visible: true }).count())) {
    const choose = page.getByRole("button", { name: `${pick(state)}を選ぶ`, exact: true });
    if (await choose.count()) return choose.click();
  }
  // The arrival logo finishes by itself and saves its completion.
  if (state.activeEpilogue?.kind === "arrival" && !state.activeEpilogue.logoComplete) return;
  const next = page.locator(nextButtons).filter({ visible: true });
  if (await next.count()) return next.first().click();
  // During a line's pause (# pause:) or its typing, a tap only shows the whole line and saves nothing: the line is let
  // finish first, so the tap goes on.
  const line = page.getByTestId("dialogue-text");
  await expect(line).toHaveAttribute("data-ready", "true");
  return line.click();
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
    activeTourism: null, activeBattle: null, activeDate: null, activeEncounter: null, activeEpilogue: null, occasion: null,
  });
}
