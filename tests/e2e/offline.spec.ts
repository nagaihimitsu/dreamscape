import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isDownload, startDistServer, type DistRequest, type DistServer } from "./dist-server";
import {
  allStorage, expect, expectError, journeyCatalog, ops, playUntil, readOfflineStore, savedGame, test as base, tier,
  type Locator, type Page,
} from "./helpers";
import { listSha, readOfflineList, type OfflineFile, type OfflineList } from "../../src/offline/list";
import { formatOfflineSize } from "../../src/offline/sizes";
import { OFFLINE_CACHE, offlineKey, stateKey } from "../../src/offline/state";

// 「オフラインで遊ぶ」 (user request and decisions 2026-11-17; docs/02 「オフラインで遊ぶ」, docs/07 acceptance 22): a
// journey the player chooses is kept on the device whole and then plays without a network, the same as with one;
// nothing is loaded for it unless the player asks.
//
// - Production tier only: the development server registers no service worker, and these tests need the built site.
// - Each test has a server of its own for `dist/` (dist-server.ts), under the sub-path GitHub Pages uses. "Without a
//   network" is that server stopped (nothing answers at the game's address any more) together with the browser's own
//   offline switch (so the page knows it, as on a phone). No test depends on Playwright cutting or routing a request
//   the service worker makes: the page's own requests are what the server's log and the store show.
// - Sizes are read from the build's list (dist/offline-files.json), never written here: the journeys grow.
const test = base.extend<{ server: DistServer }>({
  server: async ({}, use) => {
    const server = await startDistServer();
    await use(server);
    await server.stop();
  },
  // The shared fixtures (other sites cut off, the error guard) and every relative address follow this server.
  baseURL: async ({ server }, use) => {
    await use(server.url);
  },
});

const MILANO = "milano";
const INDIA = "golden_triangle";

/** The list of the build under test, read when a test runs (the tier's own server builds dist/ before the tests). */
function builtList(): OfflineList {
  const list = readOfflineList(JSON.parse(readFileSync("dist/offline-files.json", "utf8")));
  if (typeof list === "string") throw new Error(`dist/offline-files.json is not a list the page reads (${list})`);
  return list;
}
const bytes = (files: readonly OfflineFile[]) => files.reduce((sum, [, size]) => sum + size, 0);
const nameOf = (journeyId: string) => journeyCatalog().journeys.find((journey) => journey.id === journeyId)!.nameJa;
/** What the server was asked for 「オフラインで遊ぶ」: the list, and the files a device keeps (`downloads`: only those). */
const offlineAsks = (server: DistServer) => server.requests.filter((request) => request.search.includes("dreamscape-offline=") || request.path === "offline-files.json");
const downloads = (server: DistServer) => server.requests.filter(isDownload);
const LIST_ASK: DistRequest = { path: "offline-files.json", search: "?dreamscape-offline=list", range: null };
/** A photo of Milano's own that the title does not show (a test serves other bytes for it). */
function milanoPhoto(list: OfflineList): OfflineFile {
  const shown = journeyCatalog().journeys.flatMap((journey) => journey.titleArt ? [journey.titleArt.imagePath] : []);
  return list.journeys[MILANO].find(([path]) => path.endsWith(".webp") && !shown.includes(path))!;
}

/** The title screen, once the service worker serves the page (it is registered after the page has loaded). */
async function openTitle(page: Page) {
  await page.goto("./");
  await expect(ops.startButton(page)).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}
/** No network: the browser says so to the page, and nothing answers at the game's address. */
async function goOffline(page: Page, server: DistServer) {
  await page.context().setOffline(true);
  await server.stop();
}
async function goOnline(page: Page, server: DistServer) {
  await server.start();
  await page.context().setOffline(false);
}
/** How far the journey's run is, in bytes (its progress bar; 0 while the row shows none). */
function loaded(row: Locator): Promise<number> {
  return row.evaluate((element) => Number(element.querySelector("progress")?.getAttribute("value") ?? 0));
}
/** How long the server waits before each kept file while a test needs the run in flight (about 200 files, two at a time). */
const SLOW_MS = 150;
/** Every picture on screen that has an address of the game's is loaded (the map's tiles are another site's). */
async function expectPictures(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const own = [...document.images].filter((image) => image.currentSrc.startsWith(location.origin));
    return { count: own.length > 0, broken: own.filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc) };
  })).toEqual({ count: true, broken: [] });
}
/** The kept journeys' files are all in the store, each under the address that carries its hash. */
function expectStored(keys: readonly string[], scope: string, files: readonly OfflineFile[]) {
  const held = new Set(keys);
  expect(files.filter(([path, , sha]) => !held.has(offlineKey(scope, path, sha))).map(([path]) => path)).toEqual([]);
}
/** The worker's own caches (`dreamscape-…`) hold no copy of a file the page loaded for the store. */
async function expectNoCopies(page: Page) {
  expect(await page.evaluate(async () => {
    const copies: string[] = [];
    for (const name of await caches.keys()) {
      if (!name.startsWith("dreamscape-")) continue;
      for (const request of await (await caches.open(name)).keys()) if (request.url.includes("dreamscape-offline=")) copies.push(`${name}: ${request.url}`);
    }
    return copies;
  })).toEqual([]);
}

/**
 * A deploy: from now on the server answers a newer list (a higher release, another build name: a device only compares
 * them), the page with a mark in it, and one of Milano's photos with new bytes, whatever the query. The code is the
 * same build's, so the page's entry script is too; with `code`, the newer page has an entry script of its own (a small
 * file that loads this build's), as a deploy that changed the code has. `mark`: the mark as a page shows it (none on
 * the build under test).
 */
function deployNewer(page: Page, server: DistServer, list: OfflineList, { code = false } = {}) {
  const sha = (data: Buffer) => listSha(createHash("sha256").update(data).digest("hex"));
  const entry = code ? "assets/index-testnewer.js" : list.entry;
  const script = Buffer.from(`import "./${list.entry.split("/").at(-1)}";\n`);
  const page0 = readFileSync("dist/index.html", "utf8");
  expect(page0).toContain(`src="./${list.entry}"`);
  const html = Buffer.from(page0.replace(`src="./${list.entry}"`, `src="./${entry}"`).replace("</head>", '<meta name="dreamscape-test-build" content="newer" /></head>'));
  const photo = milanoPhoto(list);
  const picture = Buffer.from(`a newer picture of ${photo[0]}`);
  const changed: OfflineFile[] = [["index.html", html.byteLength, sha(html)], [photo[0], picture.byteLength, sha(picture)]];
  const swap = (files: OfflineFile[]) => files.map((file) => changed.find(([path]) => path === file[0]) ?? file);
  const added: OfflineFile[] = code ? [[entry, script.byteLength, sha(script)]] : [];
  const newer: OfflineList = {
    ...list, build: "0123456789abcdef", release: list.release + 1, entry,
    shared: [...swap(list.shared), ...added].sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
    journeys: { ...list.journeys, [MILANO]: swap(list.journeys[MILANO]) },
  };
  server.replace("offline-files.json", JSON.stringify(newer), "application/json");
  for (const path of ["", "index.html"]) server.replace(path, html, "text/html");
  server.replace(photo[0], picture, "image/webp");
  if (code) server.replace(entry, script, "text/javascript");
  return { newer, changed, photo, picture, mark: page.locator('meta[name="dreamscape-test-build"]') };
}

// A stand-in for the two font hosts (cut off in every other test): a stylesheet that names three font files.
const FONT_FILES = ["a", "b", "c"].map((name) => `https://fonts.gstatic.com/s/dreamscape-test/${name}.woff2`);
const FONT_CSS = FONT_FILES.map((url) => `@font-face { font-family: 'Noto Sans JP'; font-weight: 400; src: url(${url}) format('woff2'); unicode-range: U+3040-309F; }`).join("\n");

test("nothing is loaded for 「オフラインで遊ぶ」 until the player asks: a new Milano journey played to its first scene asks the server for no list and no kept file", { tag: tier.prod }, async ({ page, server }) => {
  const list = builtList();
  // The server under test answers as a static host does: a part of a file, a tag to ask again with, 404 for a missing file.
  const tune = list.shared.find(([path]) => path.startsWith("assets/bgm/") && path.endsWith(".mp3"))!;
  const part = await page.request.get(`./${tune[0]}`, { headers: { Range: "bytes=0-99" } });
  expect([part.status(), part.headers()["content-range"], (await part.body()).byteLength]).toEqual([206, `bytes 0-99/${tune[1]}`, 100]);
  expect(part.headers().etag).toBeTruthy();
  expect((await page.request.get("./assets/no-such-file.webp")).status()).toBe(404);
  server.requests.length = 0;

  await openTitle(page);
  await expect(page.getByTestId("offline-entry")).toHaveAccessibleName("オフラインで遊ぶ");
  await ops.beginJourney(page, MILANO);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expectPictures(page);
  // セーブ・ロード looks at what the device keeps as it opens: nothing, and it asks the server nothing.
  const saveLoad = await ops.openSaveLoad(page);
  await expect(saveLoad.getByTestId("offline-summary")).toHaveText("旅行編をこの端末に入れておくと、通信がなくても遊べます。");
  await expect(saveLoad.getByTestId("offline-save-load-entry")).toBeVisible();
  await ops.closeDialog(saveLoad);

  expect(await readOfflineStore(page), "no store on a device that keeps nothing").toBeNull();
  expect(offlineAsks(server)).toEqual([]);
  // Neither the dialog nor the work behind it is loaded (files of their own, asked for only when needed).
  expect(server.requests.filter((request) => /offline-controller|OfflinePlayDialog/u.test(request.path))).toEqual([]);
  expect(server.requests.some((request) => request.path === list.entry), "the log holds the page's own files").toBe(true);
});

test("Milano kept from the title plays with the server stopped: the page, the pictures, a part of a tune, the fonts, the licence list and a dialog loaded later", { tag: tier.prod }, async ({ page, context, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  const size = formatOfflineSize(bytes(files));
  const fonts = (url: URL) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  await context.route(fonts, (route) => {
    const css = new URL(route.request().url()).hostname === "fonts.googleapis.com";
    return route.fulfill({ status: 200, contentType: css ? "text/css; charset=utf-8" : "font/woff2", headers: { "access-control-allow-origin": "*" }, body: css ? FONT_CSS : `font ${route.request().url()}` });
  });
  await openTitle(page);

  // The dialog reads the site's list for the sizes it shows; nothing else is asked for, and nothing is written.
  const dialog = await ops.openOfflinePlay(page, "title");
  const row = ops.offlineRow(page, MILANO);
  await expect(row).toContainText(`この端末には入っていません。入れると${size}です。`);
  expect(offlineAsks(server)).toEqual([LIST_ASK]);
  expect(await readOfflineStore(page)).toBeNull();
  // The confirmation says the size before anything loads; 「やめる」 loads nothing and gives the focus back.
  const keep = row.getByRole("button", { name: "この端末に入れる", exact: true });
  await ops.pressOffline(keep);
  await expect(dialog.getByRole("heading", { name: `${nameOf(MILANO)}をこの端末に入れますか？` })).toBeFocused();
  await expect(dialog).toContainText(`${size}をこの端末に入れます（ほかの旅行編と共通の分を含みます）。`);
  await expect(dialog).toContainText("保存データ（ゲームの進行）・クイズと旅のことばの記録・設定は変わりません。");
  await dialog.getByRole("button", { name: "やめる", exact: true }).click();
  await expect(keep).toBeFocused();
  expect(downloads(server)).toEqual([]);
  expect(await readOfflineStore(page)).toBeNull();

  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  await expect(row).toContainText(`この端末に入っています（${size}）。通信がなくても遊べます。`);
  await expect(row.getByRole("button", { name: "端末から消す", exact: true })).toBeVisible();
  const kept = (await readOfflineStore(page))!;
  expect(kept.state).toMatchObject({
    installed: { build: list.build, release: list.release, entry: list.entry, journeys: [MILANO] }, pin: true, target: null, previous: null,
  });
  expectStored(kept.keys, server.url, files);
  // Every file asked for was one of the journey's, with its hash, and none twice; the rest came from the worker's caches.
  const asked = downloads(server).map((request) => `${request.path}${request.search}`);
  expect(new Set(asked).size).toBe(asked.length);
  expect(asked.filter((item) => !files.some(([path, , sha]) => item === `${path}?dreamscape-offline=${sha}`))).toEqual([]);
  await expectNoCopies(page);
  // The fonts follow the journey (never in its way): the stylesheet the page uses and the files it names.
  const sheet = await page.locator('link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]').getAttribute("href");
  await expect.poll(async () => (await readOfflineStore(page))?.state?.fonts, { timeout: 30_000 }).toBe(sheet);
  expect((await readOfflineStore(page))!.keys).toEqual(expect.arrayContaining([sheet!, ...FONT_FILES]));
  await expect(dialog.getByText("文字の形（フォント）は入れられませんでした。", { exact: false })).toHaveCount(0);
  await ops.closeDialog(dialog);
  // Back on the title, the way in says that a journey is on the device (and a status region says which, for a screen reader).
  await expect(page.getByTestId("offline-entry")).toHaveAccessibleName("オフラインで遊ぶ（入っています）");
  await expect(page.getByTestId("offline-title-status")).toHaveText(`この端末に入っています：${nameOf(MILANO)}`);

  // Without a network (and without the stand-in for the font hosts: only the store can answer).
  await context.unroute(fonts);
  await goOffline(page, server);
  const opened = await page.reload();
  expect(opened?.fromServiceWorker(), "the page itself comes from the store").toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  // The page's own font stylesheet arrived (its three faces are known to the page; they would be none without it),
  // and a font file it names is the kept one.
  await expect.poll(() => page.evaluate(() => [...document.fonts].filter((face) => face.family.replace(/["']/gu, "") === "Noto Sans JP").length)).toBe(FONT_FILES.length);
  expect(await page.evaluate(async (file) => (await fetch(file)).text(), FONT_FILES[0])).toBe(`font ${FONT_FILES[0]}`);

  // The journey starts and plays into its first sightseeing guide and the quiz after it.
  await ops.beginJourney(page, MILANO);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expectPictures(page);
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expectPictures(page);
  await ops.readGuideToBattle(page);
  await playUntil(page, (state) => state.activeBattle?.phase === "question");
  await expect(page.getByTestId("answer-A")).toBeVisible();
  await expectPictures(page);
  // A part of a tune, as the music player asks for it.
  const tune = list.shared.find(([path]) => path.startsWith("assets/bgm/") && path.endsWith(".mp3"))!;
  expect(await page.evaluate(async (path) => {
    const response = await fetch(`./${path}`, { headers: { Range: "bytes=0-99" } });
    return [response.status, response.headers.get("Content-Range"), (await response.arrayBuffer()).byteLength];
  }, tune[0])).toEqual([206, `bytes 0-99/${tune[1]}`, 100]);
  // Dialogs whose files load only when they open: 旅の記録, and 出典・権利の一覧 with the build's licence list.
  await ops.menuItem(page, "旅の記録");
  const records = page.getByRole("dialog", { name: "旅の記録" });
  await expect(records).toBeVisible();
  await ops.closeDialog(records);
  const licences = JSON.parse(readFileSync("dist/third-party-licenses.json", "utf8")) as { name: string; version: string; identifier: string }[];
  const react = licences.find((licence) => licence.name === "react")!;
  const credits = await ops.openCredits(page, "menu");
  await expect(credits.getByTestId("credits-licences").getByText(`${react.name} ${react.version}（${react.identifier}）`, { exact: true })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "開けませんでした" })).toHaveCount(0);
  // (The error guard fails this test on any file of the game that did not arrive.)
});

test("without a network the title opens a journey the device keeps, and index.html starts loading that journey's part; the remembered journey stays, and with a network nothing changes", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  // index.html's own script names each playable journey's part file (scripts/journey-parts-build.ts).
  const parts = JSON.parse(/var p=(\{[^}]*\})/u.exec(readFileSync("dist/index.html", "utf8"))![1]) as Record<string, string>;
  expect(Object.keys(parts)).toEqual(expect.arrayContaining([MILANO, INDIA]));
  const selector = page.getByLabel("旅行編");
  const remembered = () => page.evaluate(() => localStorage.getItem("dreamscape.last-journey.v1"));
  const preloaded = () => page.locator('link[rel="modulepreload"]').evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  await openTitle(page);
  // The player opens the golden triangle (the remembered journey from now on) and keeps Milano only.
  await ops.chooseJourney(page, INDIA);
  await expect(selector).toHaveValue(INDIA);
  const dialog = await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  await ops.closeDialog(dialog);
  expect(await remembered()).toBe(INDIA);
  // What the title reads before it can read the store (src/offline/kept-journeys.ts).
  await expect.poll(() => page.evaluate(() => localStorage.getItem("dreamscape.offline.kept.v1"))).toBe(JSON.stringify([MILANO]));

  // With a network a start opens the remembered journey, as before.
  const settled = async () => {
    // The start's look at the site's list is over before the network goes (it would fail as a lost connection).
    await expect.poll(() => offlineAsks(server), { timeout: 30_000 }).toEqual([LIST_ASK]);
    await expect(page.getByTestId("offline-title-status")).toHaveText(`この端末に入っています：${nameOf(MILANO)}`);
  };
  server.requests.length = 0;
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(selector).toHaveValue(INDIA);
  expect(await preloaded()).toContain(parts[INDIA]);
  await settled();

  // Without one: Milano, the journey that plays here; nothing says the chosen journey is missing; the remembered one stays.
  await goOffline(page, server);
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(selector).toHaveValue(MILANO);
  expect(await preloaded()).toEqual(expect.arrayContaining([parts[MILANO]]));
  expect(await preloaded()).not.toContain(parts[INDIA]);
  await expect(page.locator(".offline-hint")).toHaveCount(0);
  await expect(page.getByTestId("offline-title-status")).toHaveText(`この端末に入っています：${nameOf(MILANO)}`);
  expect(await remembered()).toBe(INDIA);
  // (Milano's title has no picture of its own; the error guard fails this test on any file of the game that did not arrive.)

  // The network back: the remembered journey again.
  await goOnline(page, server);
  server.requests.length = 0;
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(selector).toHaveValue(INDIA);
  await settled();
});

test("the golden triangle kept from セーブ・ロード plays its voices and its opening movie with the server stopped; a second journey loads only its own files; removing one keeps the other", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(480_000);
  const list = builtList();
  const india = [...list.shared, ...list.journeys[INDIA]];
  await page.goto("./");
  await ops.beginJourney(page, INDIA);
  await expect(page.getByTestId("dialogue-text")).toBeVisible();

  let dialog = await ops.openOfflinePlay(page, "saveLoad");
  await expect(ops.offlineRow(page, INDIA)).toContainText(`入れると${formatOfflineSize(bytes(india))}です。`);
  await ops.keepJourney(page, INDIA);
  await ops.waitKept(page, INDIA, 360_000);
  expectStored((await readOfflineStore(page))!.keys, server.url, india);
  await ops.closeDialog(dialog);
  await expect(page.getByRole("dialog", { name: "セーブ・ロード" }).getByTestId("offline-summary")).toHaveText(`この端末に入っています：${nameOf(INDIA)}`);
  await ops.closeDialog(page.getByRole("dialog", { name: "セーブ・ロード" }));

  // Without a network the game comes back from its save, and a voiced line's file is answered by the worker.
  await goOffline(page, server);
  const answered: { path: string; status: number; worker: boolean }[] = [];
  page.on("response", (response) => {
    const path = decodeURIComponent(new URL(response.url()).pathname);
    if (path.includes("/assets/voice/") || path.endsWith(".mp4")) answered.push({ path, status: response.status(), worker: response.fromServiceWorker() });
  });
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(page.getByTestId("dialogue-text")).toBeVisible();
  const voices = () => answered.filter((answer) => answer.path.includes("/assets/voice/"));
  await playUntil(page, (state) => voices().length > 0 || state.activeEpilogue === null, { source: savedGame(INDIA) });
  expect(voices().length, "a voiced line of the arrival was asked for").toBeGreaterThan(0);
  expect(voices().filter((answer) => !answer.worker || answer.status !== 200)).toEqual([]);
  await expectPictures(page);

  // The save is deleted in 「セーブ・ロード」 (its confirmation says the kept files stay): the store is as it was.
  const saveLoad = await ops.openSaveLoad(page, "save");
  await saveLoad.getByRole("button", { name: "保存データの消去", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "保存データを消去しますか？" });
  await expect(confirm).toContainText("この端末に入れた旅行編のファイル（オフラインで遊ぶ）は消えません。");
  await ops.pressOffline(confirm.getByRole("button", { name: "保存データを消去する", exact: true }));
  await expect(ops.startButton(page)).toBeVisible();
  expect(await savedGame(INDIA)(page)).toBeNull();
  expect((await readOfflineStore(page))?.state?.installed?.journeys).toEqual([INDIA]);
  // A new journey: its opening movie is asked for in parts, and the worker answers them from the kept file (this
  // browser cannot play the movie's format, so the answer is checked, not the picture).
  const movie = journeyCatalog().journeys.find((journey) => journey.id === INDIA)!.openingMovie!.videoPath;
  await ops.beginJourney(page, INDIA);
  await expect(page.getByTestId("dialogue-text")).toBeVisible();
  const parts = answered.filter((answer) => answer.path.endsWith(`/${movie}`));
  expect(parts.length, "the opening movie was asked for").toBeGreaterThan(0);
  expect(parts.filter((answer) => !answer.worker || answer.status !== 206)).toEqual([]);

  // With the network back, Milano is added: only its own files are loaded (what the journeys share is there).
  await goOnline(page, server);
  server.requests.length = 0;
  dialog = await ops.openOfflinePlay(page, "saveLoad");
  const own = list.journeys[MILANO];
  await expect(ops.offlineRow(page, MILANO)).toContainText(`入れると${formatOfflineSize(bytes(own))}です（ほかの旅行編と共通の分は入っています）。`);
  // Its run counts toward the size its row named (Milano's own files), from nothing: not toward all the device then holds.
  server.slow(SLOW_MS);
  await ops.keepJourney(page, MILANO);
  await expect.poll(() => ops.offlineRow(page, MILANO).evaluate((element) => Number(element.querySelector("progress")?.getAttribute("max") ?? 0))).toBe(bytes(own));
  server.slow(0);
  await ops.waitKept(page, MILANO);
  expect(downloads(server).map((request) => request.path).filter((path) => !own.some(([file]) => file === path))).toEqual([]);
  expect(downloads(server).length).toBeGreaterThan(0);
  expect((await readOfflineStore(page))?.state?.installed?.journeys).toEqual([MILANO, INDIA]);

  // The golden triangle is removed: what the journeys share stays for Milano, and its own files go.
  await ops.pressOffline(ops.offlineRow(page, INDIA).getByRole("button", { name: "端末から消す", exact: true }));
  await expect(dialog).toContainText(`ほかの旅行編と共通のファイル（${formatOfflineSize(bytes(list.shared))}）は、${nameOf(MILANO)}が使うので残ります。`);
  await ops.pressOffline(dialog.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(ops.offlineRow(page, INDIA)).toHaveAttribute("data-kind", "none");
  await expect(ops.offlineRow(page, INDIA)).toContainText(`端末から消しました（${formatOfflineSize(bytes(list.journeys[INDIA]))}）。`);
  const left = (await readOfflineStore(page))!;
  expect(left.state?.installed?.journeys).toEqual([MILANO]);
  expectStored(left.keys, server.url, [...list.shared, ...own]);
  const voice = list.journeys[INDIA].find(([path]) => path.startsWith("assets/voice/"))!;
  expect(left.keys).not.toContain(offlineKey(server.url, voice[0], voice[2]));
  await ops.closeDialog(dialog);
  // Milano opens from セーブ・ロード and plays without a network.
  await page.getByRole("dialog", { name: "セーブ・ロード" }).getByLabel("旅行編").selectOption(MILANO);
  await expect(ops.startButton(page)).toBeVisible();
  await goOffline(page, server);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await ops.beginJourney(page, MILANO);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expectPictures(page);
});

test("a run stopped with 「止める」 keeps what it loaded, loads nothing by itself after a reload, and 「続きを入れる」 loads only the rest", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  server.slow(SLOW_MS);
  await openTitle(page);
  await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  const row = ops.offlineRow(page, MILANO);
  await expect.poll(() => loaded(row), { timeout: 120_000 }).toBeGreaterThan(bytes(files) / 10);
  await ops.pressOffline(row.getByRole("button", { name: "止める", exact: true }));
  await expect(row).toHaveAttribute("data-kind", "partial");
  await expect(row.getByRole("status").filter({ hasText: "止めました" })).toHaveText("止めました。入れた分は残っています。");
  await expect(row).toContainText(/途中まで入っています（\d+ \/ \d+ MB）。/u);
  await expect(row.getByRole("button", { name: "続きを入れる", exact: true })).toBeVisible();
  await expect(row.getByRole("button", { name: "端末から消す", exact: true })).toBeVisible();
  expect((await readOfflineStore(page))?.state).toMatchObject({ installed: null, target: { build: list.build, journeys: [MILANO] } });
  server.slow(0);

  // A new start of the page looks at the site's list and continues nothing by itself: a journey is loaded only when asked.
  const first = downloads(server).map((request) => request.path);
  expect(first.length).toBeGreaterThan(0);
  server.requests.length = 0;
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect.poll(() => offlineAsks(server), { timeout: 30_000 }).toEqual([LIST_ASK]);
  await page.waitForTimeout(3_000);
  expect(downloads(server)).toEqual([]);
  // The title says so without the dialog: the way in carries a mark.
  await expect(page.getByTestId("offline-entry")).toHaveAccessibleName("オフラインで遊ぶ（途中まで）");
  await expect(page.getByTestId("offline-title-status")).toHaveText(`途中まで入っています：${nameOf(MILANO)}`);

  // A deploy while the journey is left midway (another build of the same page; one file already on the device has
  // new bytes): at the next start the newer build is the one being loaded, and the page is no longer answered with
  // the older build's copy of that file. Nothing is loaded for it.
  const kept = new Set((await readOfflineStore(page))!.keys);
  const old = list.journeys[MILANO].concat(list.shared).find(([path, , hash]) => path.endsWith(".mp3") && kept.has(offlineKey(server.url, path, hash)))!;
  const tune = Buffer.from(`a newer tune at ${old[0]}`);
  const changed: OfflineFile = [old[0], tune.byteLength, listSha(createHash("sha256").update(tune).digest("hex"))];
  const swap = (group: OfflineFile[]) => group.map((file) => (file[0] === old[0] ? changed : file));
  const newer: OfflineList = { ...list, build: "fedcba9876543210", release: list.release + 1, shared: swap(list.shared), journeys: { ...list.journeys, [MILANO]: swap(list.journeys[MILANO]) } };
  server.replace("offline-files.json", JSON.stringify(newer), "application/json");
  server.replace(old[0], tune, "audio/mpeg");
  const heard = () => page.evaluate(async (path) => (await (await fetch(`./${path}`)).arrayBuffer()).byteLength, old[0]);
  expect(await heard(), "before the page starts anew, the copy on the device answers").toBe(old[1]);
  server.requests.length = 0;
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect.poll(async () => (await readOfflineStore(page))?.state?.target?.build, { timeout: 30_000 }).toBe(newer.build);
  expect((await readOfflineStore(page))!.state).toMatchObject({ installed: null, target: { build: newer.build, release: newer.release, journeys: [MILANO] } });
  expect((await readOfflineStore(page))!.keys).not.toContain(offlineKey(server.url, old[0], old[2]));
  await expect.poll(heard).toBe(tune.byteLength);
  expect(downloads(server)).toEqual([]);
  server.requests.length = 0;

  await ops.openOfflinePlay(page, "title");
  await expect(row).toHaveAttribute("data-kind", "partial");
  await ops.pressOffline(row.getByRole("button", { name: "続きを入れる", exact: true }));
  await ops.waitKept(page, MILANO);
  const whole = [...newer.shared, ...newer.journeys[MILANO]];
  expectStored((await readOfflineStore(page))!.keys, server.url, whole);
  expect((await readOfflineStore(page))!.state?.installed?.build).toBe(newer.build);
  // Only what was missing is loaded: no file twice, but the two at most that were on their way at the stop and the
  // one whose bytes the deploy changed.
  const rest = downloads(server).map((request) => request.path);
  expect(rest.length).toBeGreaterThan(0);
  expect([new Set(first).size, new Set(rest).size]).toEqual([first.length, rest.length]);
  // (That one comes from the network or from the worker's cache, where the page's own request for it just put it.)
  expect(rest.filter((path) => first.includes(path) && path !== old[0]).length).toBeLessThanOrEqual(2);
});

test("a connection lost while a journey loads stops the run with a word, and it continues by itself in the same page once the connection is back", { tag: tier.prod }, async ({ page, context, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  server.slow(SLOW_MS);
  await openTitle(page);
  await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  const row = ops.offlineRow(page, MILANO);
  await expect.poll(() => loaded(row), { timeout: 120_000 }).toBeGreaterThan(bytes(files) / 10);
  // (The requests on their way fail, as they do on a phone that loses its network.)
  expectError("net::ERR_INTERNET_DISCONNECTED");
  await context.setOffline(true);
  await expect(row.getByRole("alert")).toHaveText("通信が切れたため、止まりました。このページを開いたまま通信が戻ると、続きを入れます。", { timeout: 60_000 });
  expect((await readOfflineStore(page))?.state).toMatchObject({ installed: null, target: { build: list.build, journeys: [MILANO] } });
  server.slow(0);
  await context.setOffline(false);
  await ops.waitKept(page, MILANO);
  expectStored((await readOfflineStore(page))!.keys, server.url, files);
});

test("a file that arrives with other bytes than the list names is never kept: the run stops, nothing counts as kept, and it completes once the right file arrives", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const photo = milanoPhoto(list);
  server.replace(photo[0], "not the picture the list names", "image/webp");
  await openTitle(page);
  const dialog = await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  const row = ops.offlineRow(page, MILANO);
  await expect(row.getByRole("alert")).toHaveText("ファイルを正しく読み込めませんでした。時間をおいて「続きを入れる」を押してください。", { timeout: 120_000 });
  await expect(row).toHaveAttribute("data-kind", "partial");
  await expect(dialog).not.toContainText("この端末に入っています");
  const stopped = (await readOfflineStore(page))!;
  expect(stopped.state).toMatchObject({ installed: null, target: { build: list.build, journeys: [MILANO] } });
  expect(stopped.keys).not.toContain(offlineKey(server.url, photo[0], photo[2]));

  server.restore(photo[0]);
  await ops.pressOffline(row.getByRole("button", { name: "続きを入れる", exact: true }));
  await ops.waitKept(page, MILANO);
  expectStored((await readOfflineStore(page))!.keys, server.url, [...list.shared, ...list.journeys[MILANO]]);
});

test("after a deploy a kept journey loads only the changed files by itself, and the page keeps opening from the store: the old build until the new one is whole, then the new one", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  await openTitle(page);
  const dialog = await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  await ops.closeDialog(dialog);

  // The deploy: the page with a mark in it and one of Milano's photos with new bytes.
  const { newer, changed, photo, picture, mark } = deployNewer(page, server, list);
  server.requests.length = 0;

  // The next start opens the kept build from the store: the old page, though the server now has the new one (the
  // browser may still ask the server for the page when it has to start the worker first; that answer is not used).
  // Then the page looks at the list and loads the two changed files. The switch is one write: the newer build is
  // installed, the old one stays for this page.
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);
  await expect.poll(async () => (await readOfflineStore(page))?.state?.installed?.build, { timeout: 60_000 }).toBe(newer.build);
  expect((await readOfflineStore(page))!.state).toMatchObject({
    installed: { build: newer.build, release: newer.release, journeys: [MILANO] }, previous: { build: list.build, journeys: [MILANO] }, target: null, pin: true,
  });
  expect(downloads(server)).toEqual(changed.map(([path, , hash]) => ({ path, search: `?dreamscape-offline=${hash}`, range: null })));
  // The dialog says so (the result of a run that went by itself, shown once).
  await ops.openOfflinePlay(page, "title");
  await expect(ops.offlinePlay(page).getByRole("status").filter({ hasText: "新しい版" })).toHaveText("新しい版の分を入れ終えました。");
  await ops.waitKept(page, MILANO);
  await ops.closeDialog(ops.offlinePlay(page));

  // The start after that: still from the store, now the newer build (its page, its photo); nothing more is loaded.
  server.requests.length = 0;
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(1);
  expect(await page.evaluate(async (path) => (await fetch(`./${path}`)).text(), photo[0])).toBe(picture.toString());
  await expect.poll(() => offlineAsks(server), { timeout: 30_000 }).toEqual([LIST_ASK]);
  await page.waitForTimeout(2_000);
  expect(downloads(server)).toEqual([]);
});

test("「端末から消す」 removes the kept journey and leaves the save, the English notes and the settings byte for byte; the game plays on with the network", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  await ops.startJourney(page, MILANO);
  const dialog = await ops.openOfflinePlay(page, "saveLoad");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  // The fonts could not be copied (their hosts are cut off in the tests): the journey is kept all the same, and the dialog says so.
  await expect(dialog.getByText("文字の形（フォント）は入れられませんでした。通信がないときは、端末にある文字で表示します。通信があるときにページを開くと、もう一度入れます。")).toBeVisible({ timeout: 30_000 });
  await expect(dialog.getByText(`この端末に入れたファイル：${formatOfflineSize(bytes(files))}`)).toBeVisible();
  const before = await allStorage(page);
  expect(Object.keys(before).some((key) => key.includes(".save."))).toBe(true);
  // The one key of 「オフラインで遊ぶ」: which journeys are on the device, for the title of a start without a network
  // (src/offline/kept-journeys.ts). It goes with the journey; everything else stays byte for byte.
  expect(before["dreamscape.offline.kept.v1"]).toBe(JSON.stringify([MILANO]));
  const { "dreamscape.offline.kept.v1": _kept, ...game } = before;

  const row = ops.offlineRow(page, MILANO);
  await ops.pressOffline(row.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(dialog.getByRole("heading", { name: `${nameOf(MILANO)}をこの端末から消しますか？` })).toBeFocused();
  await expect(dialog).toContainText(`この端末に入れた${nameOf(MILANO)}の絵・音・声・ムービー・物語（${formatOfflineSize(bytes(list.journeys[MILANO]))}）を消します。`);
  await expect(dialog).toContainText(`ほかの旅行編と共通のファイル（${formatOfflineSize(bytes(list.shared))}）も消します。`);
  await expect(dialog).toContainText(`もう一度入れることもできます（また${formatOfflineSize(bytes(files))}を読み込みます）。`);
  await expect(dialog).toContainText("保存データ（ゲームの進行）・クイズと旅のことばの記録・設定は消えません。");
  // 「消さずに戻る」 removes nothing.
  await dialog.getByRole("button", { name: "消さずに戻る", exact: true }).click();
  await expect(row.getByRole("button", { name: "端末から消す", exact: true })).toBeFocused();
  expect((await readOfflineStore(page))?.state?.installed?.journeys).toEqual([MILANO]);

  await ops.pressOffline(row.getByRole("button", { name: "端末から消す", exact: true }));
  await ops.pressOffline(dialog.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(row).toHaveAttribute("data-kind", "none");
  await expect(row.getByRole("status").filter({ hasText: "端末から消しました" })).toHaveText(`端末から消しました（${formatOfflineSize(bytes(files))}）。`);
  expect(await readOfflineStore(page), "the store is gone whole").toBeNull();
  expect(await allStorage(page)).toEqual(game);
  await ops.closeDialog(dialog);
  const saveLoad = page.getByRole("dialog", { name: "セーブ・ロード" });
  await expect(saveLoad.getByTestId("offline-summary")).toHaveText("旅行編をこの端末に入れておくと、通信がなくても遊べます。");
  await ops.closeDialog(saveLoad);

  // The journey plays on with the network; a new start of the page opens the site's page again, not a kept one.
  server.requests.length = 0;
  await page.reload();
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  expect(server.requests.some((request) => request.path === ""), "the page is asked of the server again").toBe(true);
  await ops.goTo(page, "p_duomo");
  await expect(page.getByTestId("tourism-guide")).toBeVisible();
  await expectPictures(page);
});

test("two tabs never load at once: while one tab keeps a journey the other says so and offers no button, and shows the journey kept when the first is done", { tag: tier.prod }, async ({ page, context, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  server.slow(300);
  await openTitle(page);
  await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await expect(ops.offlineRow(page, MILANO)).toHaveAttribute("data-kind", "running");

  // (One journey is open in one tab at a time, so the second tab opens the other journey.)
  const second = await context.newPage();
  await second.goto("./");
  await ops.chooseJourney(second, INDIA);
  await expect(ops.startButton(second)).toBeVisible();
  const other = await ops.openOfflinePlay(second, "title");
  for (const journeyId of [MILANO, INDIA]) {
    await expect(ops.offlineRow(second, journeyId)).toHaveAttribute("data-kind", "other-tab");
    await expect(ops.offlineRow(second, journeyId)).toContainText("別のタブで入れています。");
  }
  await expect(other.locator("[data-row] button")).toHaveCount(0);
  expect((await readOfflineStore(page))?.state?.installed, "the first tab was still at work").toBeNull();

  server.slow(0);
  await ops.waitKept(page, MILANO);
  await ops.waitKept(second, MILANO);
  await expect(ops.offlineRow(second, INDIA)).toContainText(`入れると${formatOfflineSize(bytes(list.journeys[INDIA]))}です（ほかの旅行編と共通の分は入っています）。`);
  await expect(ops.offlineRow(second, INDIA).getByRole("button", { name: "この端末に入れる", exact: true })).toBeVisible();
});

test("a quick double tap in 「オフラインで遊ぶ」 never confirms what it opened: nothing loads before 「入れる」, one run starts, and nothing is removed before the confirmation's own 「端末から消す」", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  server.slow(SLOW_MS);
  await openTitle(page);
  const dialog = await ops.openOfflinePlay(page, "title");
  const row = ops.offlineRow(page, MILANO);
  const list_ = dialog.getByRole("heading", { name: "オフラインで遊ぶ", exact: true });
  /** Two taps of a finger at the middle of a button that takes presses, as one quick double tap. */
  const doubleTap = async (button: Locator) => {
    await expect(button).not.toHaveAttribute("data-settling");
    await ops.doubleTap(page, await ops.centerOf(button));
  };

  // On 「この端末に入れる」: the confirmation opens and its 「入れる」 is not pressed.
  await doubleTap(row.getByRole("button", { name: "この端末に入れる", exact: true }));
  const confirm = dialog.getByRole("button", { name: "入れる", exact: true });
  await expect(confirm).not.toHaveAttribute("data-settling");
  await expect(dialog.getByRole("heading", { name: `${nameOf(MILANO)}をこの端末に入れますか？` })).toBeVisible();
  expect(downloads(server)).toEqual([]);
  expect(await readOfflineStore(page)).toBeNull();

  // On 「入れる」: one run starts, and the second tap neither stops it nor opens anything.
  await doubleTap(confirm);
  await expect(row).toHaveAttribute("data-kind", "running");
  await expect(row.getByRole("button", { name: "止める", exact: true })).not.toHaveAttribute("data-settling");
  await expect(row).toHaveAttribute("data-kind", "running");
  await expect(list_).toBeVisible();
  server.slow(0);
  await ops.waitKept(page, MILANO);
  const asked = downloads(server).map((request) => request.path);
  expect(new Set(asked).size, "one run: no file was asked for twice").toBe(asked.length);

  // On the row's 「端末から消す」: the confirmation opens and nothing is removed.
  await doubleTap(row.getByRole("button", { name: "端末から消す", exact: true }));
  const sure = dialog.getByRole("button", { name: "端末から消す", exact: true });
  await expect(sure).not.toHaveAttribute("data-settling");
  await expect(dialog.getByRole("heading", { name: `${nameOf(MILANO)}をこの端末から消しますか？` })).toBeVisible();
  expectStored((await readOfflineStore(page))!.keys, server.url, files);
  // On the confirmation's 「端末から消す」: removed, and the second tap presses nothing of the list that comes back.
  await doubleTap(sure);
  await expect(row).toHaveAttribute("data-kind", "none");
  await expect(row.getByRole("button", { name: "この端末に入れる", exact: true })).not.toHaveAttribute("data-settling");
  await expect(list_).toBeVisible();
  expect(await readOfflineStore(page)).toBeNull();
});

test("a device without room is told so with the sizes before anything is written, and one that fills up while loading stops with what is left", { tag: tier.prod }, async ({ page, context, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const total = bytes([...list.shared, ...list.journeys[MILANO]]);
  // The browser says it has 29 MB free: less than the journey takes.
  const room = { quota: 30_000_000, usage: 1_000_000 };
  await page.addInitScript((estimate) => { navigator.storage.estimate = async () => estimate; }, room);
  await openTitle(page);
  await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  const row = ops.offlineRow(page, MILANO);
  // The room it asks for is the files, a tenth more and 20 MB, in whole megabytes: more than the 29 MB there are.
  const asked = Math.ceil((Math.ceil(total * 1.1) + 20_000_000) / 1_000_000) * 1_000_000;
  expect(asked).toBeGreaterThan(room.quota - room.usage);
  await expect(row.getByRole("alert")).toHaveText(
    `この端末の空きが足りないため、入れられません（${formatOfflineSize(asked)} の空きが要ります。使える空きは${formatOfflineSize(room.quota - room.usage)} です）。`, { timeout: 30_000 });
  // The title says it too once the dialog is closed.
  await ops.closeDialog(ops.offlinePlay(page));
  await expect(page.getByTestId("offline-entry")).toHaveAccessibleName("オフラインで遊ぶ（止まりました）");
  await ops.openOfflinePlay(page, "title");
  await expect(row.getByRole("button", { name: "この端末に入れる", exact: true })).toBeVisible();
  expect(await readOfflineStore(page), "nothing was written").toBeNull();
  expect(downloads(server)).toEqual([]);
  await page.close();

  // The browser's figure says there is room, but the device takes only 30 MB: the run stops partway, with what is left to load.
  const full = await context.newPage();
  await (await context.newCDPSession(full)).send("Storage.overrideQuotaForOrigin", { origin: new URL(server.url).origin, quotaSize: 30_000_000 });
  await openTitle(full);
  await ops.openOfflinePlay(full, "title");
  await ops.keepJourney(full, MILANO);
  const stopped = ops.offlineRow(full, MILANO);
  await expect(stopped.getByRole("alert")).toHaveText(/^この端末の空きが足りなくなったため、止まりました（あと約\d+ MB 要ります）。空きを作ってから「続きを入れる」を押してください。$/u, { timeout: 120_000 });
  await expect(stopped).toHaveAttribute("data-kind", "partial");
  expect((await readOfflineStore(full))?.state).toMatchObject({ installed: null, target: { build: list.build, journeys: [MILANO] } });
});

test("the first session after 「オフラインで遊ぶ」 arrives: a page still served by the worker of before gets its own version's worker first, then the journey is kept and plays with the server stopped", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  const files = [...list.shared, ...list.journeys[MILANO]];
  // The device last visited before the feature: its worker is the one of then (the build of commit 1605939, kept as a
  // small file; it knows nothing of the store and would keep the page's downloads in its own caches).
  const before = readFileSync(new URL("./fixtures/sw-before-offline.js", import.meta.url));
  expect(before.toString()).not.toContain("dreamscape.offline");
  server.replace("sw.js", before, "text/javascript");
  await openTitle(page);
  // The deploy with the feature: the browser finds this build's worker, which waits while the page is open.
  server.restore("sw.js");
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
  const waiting = () => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting);
  await expect.poll(waiting, { timeout: 30_000 }).toBe(true);
  server.requests.length = 0;

  // 「入れる」: the old worker does not answer about the store, so the waiting one is asked to take over (it is the
  // page's own version); only then is anything loaded.
  await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  expect(await waiting()).toBe(false);
  expectStored((await readOfflineStore(page))!.keys, server.url, files);
  // Nothing the page loaded for the store went into a worker's cache, and no file was asked for twice.
  await expectNoCopies(page);
  const asked = downloads(server).map((request) => request.path);
  expect(new Set(asked).size).toBe(asked.length);
  await ops.closeDialog(ops.offlinePlay(page));

  await goOffline(page, server);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await ops.beginJourney(page, MILANO);
  await expect(page.getByTestId("travel-menu")).toBeVisible();
  await expectPictures(page);
});

test("after a deploy with a new worker, its page's first start sees the takeover through even when the page asks for files as it starts, and a reload then loads (never hangs)", { tag: tier.prod }, async ({ browser, server }) => {
  test.setTimeout(420_000);
  const list = builtList();
  // The deploy: a newer page with an entry script of its own, and a worker of that version (the same worker, which
  // names the newer entry script: the browser installs it as a new version).
  const worker = readFileSync("dist/sw.js", "utf8");
  expect(worker.split(list.entry).length - 1, "the worker names the page's entry script once").toBe(1);
  const newerEntry = "assets/index-testnewer.js";
  // As a title that loads its pictures as it appears: the page asks for a picture every 10 ms during its first 2 s.
  // When one of these reaches the older worker in the instant Chromium ends it, the takeover stays pending (with
  // DevTools attached, as here, the next load then hung until the page saw the takeover through: worker-takeover.ts).
  const photo = milanoPhoto(list)[0];
  const busy = `addEventListener("load", () => { for (let t = 0; t <= 2000; t += 10) setTimeout(() => { fetch("./${photo}", { cache: "no-store" }).then((r) => r.body?.cancel()).catch(() => {}); }, t); });`;
  const origin = new URL(server.url).origin;
  // Six devices in turn, each with the build under test's worker before the deploy (the takeover stays pending only on
  // some starts, about one in five here without the fix; together they mostly reach it).
  for (let device = 1; device <= 6; device += 1) {
    for (const path of ["", "index.html", "offline-files.json", photo, newerEntry, "sw.js"]) server.restore(path);
    const context = await browser.newContext({ baseURL: server.url, viewport: { width: 390, height: 844 } });
    await context.route((url) => url.origin !== origin, (route) => route.abort("blockedbyclient"));
    const page = await context.newPage();
    try {
      await openTitle(page);
      const { mark } = deployNewer(page, server, list, { code: true });
      server.replace("sw.js", worker.replace(list.entry, newerEntry), "text/javascript");
      // The newer page's first visit: its worker installs and waits while the older one serves the page.
      await page.reload();
      await expect(mark).toHaveCount(1);
      await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.waiting?.state ?? null), { timeout: 30_000 }).toBe("installed");
      // Its next start asks the waiting worker to take over, while it asks for many files.
      await page.addInitScript(busy);
      await page.reload();
      await expect(ops.startButton(page)).toBeVisible();
      await expect.poll(() => page.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        return { waiting: registration?.waiting?.state ?? null, controller: navigator.serviceWorker.controller?.state ?? null };
      }), { timeout: 20_000, message: `device ${device}: the new worker takes over` }).toEqual({ waiting: null, controller: "activated" });
      // A reload now loads (it hung while the takeover stayed pending).
      await page.reload({ timeout: 20_000 });
      await expect(ops.startButton(page)).toBeVisible();
      await expect(mark).toHaveCount(1);
    } finally {
      await context.close();
    }
  }
});

test("a site that has no list any more: starts stop opening the kept build (it opens only without a network) and open it again once the list is back; a state of a later form is left as it is, with only 「端末から消す」 for everything", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(300_000);
  const list = builtList();
  await openTitle(page);
  const dialog = await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  await ops.closeDialog(dialog);
  const listAsks = () => server.requests.filter((request) => request.path === "offline-files.json");
  const state = async () => (await readOfflineStore(page))?.state;

  // The site's page gets a mark (the kept one has none), and the site drops its list: the way of keeping files has
  // ended there. The page asks twice before it believes it; the kept build stays on the device.
  const html = readFileSync("dist/index.html", "utf8").replace("</head>", '<meta name="dreamscape-test-build" content="site" /></head>');
  for (const path of ["", "index.html"]) server.replace(path, html, "text/html");
  const mark = page.locator('meta[name="dreamscape-test-build"]');
  server.gone("offline-files.json");
  expectError("offline-files.json?dreamscape-offline=list");
  server.requests.length = 0;
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);
  await expect.poll(async () => (await state())?.pin, { timeout: 30_000 }).toBe(false);
  expect(listAsks()).toHaveLength(2);
  expect(await state()).toMatchObject({ installed: { build: list.build, journeys: [MILANO] }, target: null });

  // From the next start the page is the site's; without a network, the kept build opens (and plays).
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(1);
  await goOffline(page, server);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);
  const photo = milanoPhoto(list);
  expect(await page.evaluate(async (path) => (await (await fetch(`./${path}`)).arrayBuffer()).byteLength, photo[0]), "a kept file is answered from the store").toBe(photo[1]);

  // The list is back, and it is the kept build's: starts open the kept build again.
  await goOnline(page, server);
  server.restore("offline-files.json");
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(1);
  await expect.poll(async () => (await state())?.pin, { timeout: 30_000 }).toBe(true);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);

  // A state of a later form (a newer version of the game wrote it): this version opens nothing from the store,
  // writes nothing over it and removes nothing by itself.
  await page.evaluate(async ({ name, key }) => {
    const store = await caches.open(name);
    const stored = await (await store.match(key))!.json() as Record<string, unknown>;
    await store.put(key, new Response(JSON.stringify({ ...stored, schemaVersion: 2 })));
  }, { name: OFFLINE_CACHE, key: stateKey(server.url) });
  const kept = (await readOfflineStore(page))!;
  await page.reload();
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(1);
  await expect(page.getByTestId("offline-title-status")).toHaveText("この端末に入っているオフライン用のデータを、この版では読み取れません。", { timeout: 30_000 });
  await ops.openOfflinePlay(page, "title");
  const all = ops.offlineRow(page, "all");
  await expect(all.getByRole("alert")).toHaveText("この端末に入っているオフライン用のデータを、この版では読み取れません。");
  await expect(ops.offlinePlay(page).locator("[data-row] button")).toHaveText(["端末から消す"]);
  expect(await readOfflineStore(page)).toEqual(kept);
  expect((kept.state as unknown as { schemaVersion: number }).schemaVersion).toBe(2);
  // The one thing offered: everything goes, behind its confirmation.
  await ops.pressOffline(all.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(ops.offlinePlay(page).getByRole("heading", { name: "端末に入れたオフライン用のファイルを、すべて消しますか？" })).toBeFocused();
  await ops.pressOffline(ops.offlinePlay(page).getByRole("button", { name: "端末から消す", exact: true }));
  await expect(ops.offlinePlay(page).getByRole("status").filter({ hasText: "端末から消しました" })).toBeVisible();
  expect(await readOfflineStore(page)).toBeNull();
  await expect(ops.offlineRow(page, MILANO).getByRole("button", { name: "この端末に入れる", exact: true })).toBeVisible();
});

test("a forced reload on a device that keeps a journey ends on the kept build, not on the site's newer one; removing everything under a page of an older build says to load the page anew", { tag: tier.prod }, async ({ page, server }) => {
  test.setTimeout(240_000);
  const list = builtList();
  // The browser reports data saving: a newer build's files are offered, never loaded by themselves.
  await page.addInitScript(() => { Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }); });
  await openTitle(page);
  let dialog = await ops.openOfflinePlay(page, "title");
  await ops.keepJourney(page, MILANO);
  await ops.waitKept(page, MILANO);
  await ops.closeDialog(dialog);
  // The deploy changed the code: the site's page has another entry script than the kept build's.
  const { newer, mark } = deployNewer(page, server, list, { code: true });
  const installed = async () => (await readOfflineStore(page))?.state?.installed?.build;

  // A start as usual opens the kept build, and the title's way in says that a newer one is there.
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);
  await expect(page.getByTestId("offline-entry")).toHaveAccessibleName("オフラインで遊ぶ（新しい版あり）", { timeout: 30_000 });

  // A forced reload goes around the worker: the site's newer page arrives, and loads itself anew through the worker
  // at once, so the device stays on the build it keeps (a save written by the newer build could be one the kept build
  // cannot read).
  server.requests.length = 0;
  await (await page.context().newCDPSession(page)).send("Page.reload", { ignoreCache: true });
  await expect.poll(() => page.evaluate(() => [navigator.serviceWorker.controller !== null, document.readyState]).catch(() => null), { timeout: 30_000 }).toEqual([true, "complete"]);
  await expect(ops.startButton(page)).toBeVisible();
  await expect(mark).toHaveCount(0);
  expect(server.requests.some((request) => request.path === ""), "the forced reload asked the site for its page").toBe(true);
  expect(await installed()).toBe(list.build);
  // (The mark of that one reload is gone once a page the worker serves has started: nothing is left behind.)
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
  expect((await page.reload())?.fromServiceWorker()).toBe(true);
  await expect(mark).toHaveCount(0);

  // 「端末から消す」 under this page, the older build: the confirmation sizes what the device holds (the kept build's
  // files, not the newer list's) and says that the page is to be loaded anew; so does the result, with its button.
  dialog = await ops.openOfflinePlay(page, "title");
  await expect(ops.offlineRow(page, "version")).toContainText("新しい版の分");
  const row = ops.offlineRow(page, MILANO);
  await ops.pressOffline(row.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(dialog).toContainText(`この端末に入れた${nameOf(MILANO)}の絵・音・声・ムービー・物語（${formatOfflineSize(bytes(list.journeys[MILANO]))}）を消します。`);
  await expect(dialog).toContainText(`ほかの旅行編と共通のファイル（${formatOfflineSize(bytes(list.shared))}）も消します。`);
  await expect(dialog).toContainText("ゲームが新しくなっているので、消したあとはページを読み込み直してください");
  await ops.pressOffline(dialog.getByRole("button", { name: "端末から消す", exact: true }));
  await expect(row.getByRole("status").filter({ hasText: "端末から消しました" }))
    .toHaveText(`端末から消しました（${formatOfflineSize(bytes([...list.shared, ...list.journeys[MILANO]]))}）。ゲームが新しくなっているので、ページを読み込み直してください。`);
  expect(await readOfflineStore(page)).toBeNull();
  await row.getByRole("button", { name: "ページを読み込み直す", exact: true }).click();
  // The page that comes is the site's newer one, and it plays on with the network.
  await expect(mark).toHaveCount(1);
  await expect(ops.startButton(page)).toBeVisible();
  expect(newer.build).not.toBe(list.build);
});
