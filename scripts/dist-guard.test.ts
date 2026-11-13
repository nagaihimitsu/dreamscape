import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkDist, checkThirdPartyLicenses, debugEntryModules, describeDebugInGame, describeDebugOnTitle, describeFindings, describeJourneyParts,
  describeMiniGamesOnTitle, devOnlyMarkers, eagerFiles, findDebugCodeOnTitle, findDevOnlyCode, importedScripts, isDebugEntryChunk, isTextAsset,
  JOURNEY_PART_MARKER, journeyPartsIn, lazyDebugMarkers, miniGameMarkers, THIRD_PARTY_LICENSES_PATH, type DistFile,
} from "./dist-guard";
import { MINI_GAME_ENGINES, MINI_GAME_IDS } from "../src/minigames/registry";
import { runtimeImports } from "./test-sets";

// No content build needed: the markers are checked against the repository's
// sources and the detection against small in-memory "builds".
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const cleanBuild: DistFile[] = [
  { path: "index.html", text: '<script type="module" src="./assets/index-abc.js"></script>' },
  { path: "assets/index-abc.js", text: 'const s=new Map;function App(){return"旅をはじめる"}' },
  { path: "assets/index-abc.css", text: ".travel-menu{display:grid}" },
  { path: "assets/tourism/milano/duomo.jpg", text: null },
];

describe("production build guard", () => {
  it("keeps every marker in the file it comes from", () => {
    for (const { text, source } of [...devOnlyMarkers, ...lazyDebugMarkers]) {
      const file = path.join(root, source);
      expect(existsSync(file), `${source} (source of "${text}") is missing; update scripts/dist-guard.ts`).toBe(true);
      const found = source.includes(text) || (!source.endsWith("/") && readFileSync(file, "utf8").includes(text));
      expect(found, `"${text}" is no longer in ${source}; pick new text unique to that file`).toBe(true);
    }
  });

  it("keeps Debug's 音と演出の見本 out of the title page with a marker of its own", () => {
    // The room (2026-11-13) ships as Debug's lazy code: DebugMode shows it, and only DebugMode imports it.
    const room = ["src/dev/EffectsRoom.tsx", "src/dev/effects-room.ts"];
    expect(lazyDebugMarkers.filter((marker) => room.includes(marker.source)).map((marker) => [marker.source, marker.text])).toEqual([
      ["src/dev/EffectsRoom.tsx", "ここでの音の設定はこの部屋だけのもので"],
      ["src/dev/effects-room.ts", "消す（# tint: off）"],
    ]);
    expect(devOnlyMarkers.some((marker) => room.includes(marker.source))).toBe(false);
  });

  it("finds nothing in a build without development code", () => {
    expect(findDevOnlyCode(cleanBuild)).toEqual([]);
    expect(findDebugCodeOnTitle(cleanBuild, ["index.html", ...eagerFiles(cleanBuild[0].text!)])).toEqual([]);
  });

  it("finds the test hook, fixtures and test journeys in the text and paths of any built file, Debug's lazy chunks included", () => {
    const leaked: DistFile[] = [
      ...cleanBuild,
      { path: "assets/DebugMode-x1.js", text: 'Object.defineProperty(t,"__dreamscapeDebug",{value:h})' },
      { path: "assets/index-def.js", text: 'const e={id:"test-fixture-city"}' },
      { path: "assets/tourism/sample_trip/mihon_market.png", text: null },
      { path: "assets/index-abc.js.map", text: '{"sources":["../src/dev/debug-state.ts"]}' },
    ];
    expect(findDevOnlyCode(leaked).map(({ path, where, marker }) => [path, where, marker.text])).toEqual([
      ["assets/DebugMode-x1.js", "content", "__dreamscapeDebug"],
      ["assets/index-def.js", "content", "test-fixture"],
      ["assets/tourism/sample_trip/mihon_market.png", "path", "sample_trip"],
      ["assets/index-abc.js.map", "content", "src/dev/"],
    ]);
  });

  it("lets Debug's code ship in lazily loaded files only", () => {
    const debug = 'jsx("main",{className:"debug-panel","data-testid":"debug-panel"});throw Error("仮の場面の元になる都市がありません。")';
    const html = '<script type="module" crossorigin src="./assets/index-abc.js"></script><link rel="stylesheet" crossorigin href="./assets/index-abc.css">';
    const build: DistFile[] = [
      { path: "index.html", text: html },
      { path: "assets/index-abc.js", text: 'const d=()=>import("./DebugMode-x1.js")' },
      { path: "assets/index-abc.css", text: ".travel-menu{display:grid}" },
      { path: "assets/DebugMode-x1.js", text: debug },
      { path: "assets/DebugMode-x1.css", text: ".debug-panel{display:grid}" },
    ];
    const eager = ["index.html", ...eagerFiles(html)];
    // The test-only markers are not lazy markers: the lazy chunk holds none of them.
    expect(findDevOnlyCode(build)).toEqual([]);
    expect(findDebugCodeOnTitle(build, eager)).toEqual([]);
    // The same code in the entry script, a chunk the entry preloads, the eager stylesheet or the page itself is on the title page.
    const preloaded = '<script type="module" src="./assets/index-abc.js"></script><link rel="modulepreload" href="./assets/DebugMode-x1.js">';
    expect(findDebugCodeOnTitle(build, ["index.html", ...eagerFiles(preloaded)]).map(({ path, marker }) => [path, marker.text])).toEqual([
      ["assets/DebugMode-x1.js", "debug-panel"],
      ["assets/DebugMode-x1.js", "仮の場面の元になる都市がありません"],
    ]);
    const leaked = build.map((file) => file.path === "assets/index-abc.js" ? { ...file, text: `${file.text};${debug}` }
      : file.path === "assets/index-abc.css" ? { ...file, text: ".debug-panel{display:grid}" }
        : file.path === "index.html" ? { ...file, text: `${html}<p>Debug · 通常セーブとは別</p>` } : file);
    expect(findDebugCodeOnTitle(leaked, eager).map(({ path, marker }) => [path, marker.source])).toEqual([
      ["index.html", "src/dev/DebugMode.tsx"],
      ["assets/index-abc.js", "src/dev/DebugMode.tsx"],
      ["assets/index-abc.js", "src/dev/fixture-template.ts"],
      ["assets/index-abc.css", "src/dev/DebugMode.tsx"],
    ]);
  });

  it("reads the files index.html loads at once, however its attributes are written", () => {
    expect(eagerFiles([
      '<link rel="icon" type="image/png" href="./favicon-16.png" /><link rel="manifest" href="./manifest.webmanifest" />',
      '<script type="module" crossorigin src="./assets/index-06YRtxEe.js"></script>',
      "<link crossorigin rel=modulepreload href=assets/shared-a1.js>",
      "<LINK HREF='/assets/index-Cc3mH7MU.css' REL='stylesheet'>",
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP">',
      '<script src="./legacy.js"></script><script type="module">import "./inline"</script>',
      '<link rel="preload" href="./assets/font.woff2" as="font">',
    ].join("\n"))).toEqual(["assets/index-06YRtxEe.js", "assets/shared-a1.js", "assets/index-Cc3mH7MU.css"]);
  });

  it("reports the sample journey in generated content and in served image paths", () => {
    // What a production build would contain after `npm run content:build -- --with-sample`.
    const build = [
      { path: "assets/index-abc.js", text: '{"id":"sample_trip","status":"available"}' },
      { path: "assets/tourism/sample_trip/mihon_clock_tower.png", text: null },
    ];
    expect(findDevOnlyCode(build).map(({ path, where, marker }) => [path, where, marker.source])).toEqual([
      ["assets/index-abc.js", "content", "authoring/templates/sample_trip/manifest.json"],
      ["assets/tourism/sample_trip/mihon_clock_tower.png", "path", "authoring/templates/sample_trip/manifest.json"],
    ]);
  });

  it("checks only the path of binary files", () => {
    expect(findDevOnlyCode([{ path: "assets/items/pick.png", text: null }])).toEqual([]);
    expect(isTextAsset("assets/index-abc.js")).toBe(true);
    expect(isTextAsset("manifest.webmanifest")).toBe(true);
    expect(isTextAsset("assets/items/item.SVG")).toBe(true);
    expect(isTextAsset("assets/tourism/milano/duomo.jpg")).toBe(false);
    expect(isTextAsset("assets.js/photo")).toBe(false);
  });

  // What scripts/check-dist.ts runs on every build: a small build whose lazy Debug chunk may hold Debug's code
  // but never the test hook or the sample journey, and whose title files may hold no Debug code. It has the
  // licence list the real build writes (one entry per package.json dependency, which the command reads), so the
  // command passes the licence check and its exit code says whether the test-code or title check failed.
  const checkedHtml = '<script type="module" crossorigin src="./assets/index-abc.js"></script><link rel="stylesheet" href="./assets/index-abc.css">';
  const dependencies = Object.keys(JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).dependencies ?? {});
  const licenses = JSON.stringify(dependencies.map((name) =>
    ({ name, version: "1.0.0", identifier: "MIT", text: `MIT License\n\nCopyright (c) ${name} authors` })));
  const checkedBuild: DistFile[] = [
    { path: "index.html", text: checkedHtml },
    { path: "assets/index-abc.js", text: 'const d=()=>import("./DebugMode-x1.js")' },
    { path: "assets/index-abc.css", text: ".travel-menu{display:grid}" },
    { path: "assets/DebugMode-x1.js", text: 'jsx("main",{className:"debug-panel"})' },
    { path: THIRD_PARTY_LICENSES_PATH, text: licenses },
  ];
  const withText = (build: DistFile[], file: string, text: string) =>
    build.map((item) => item.path === file ? { ...item, text: `${item.text};${text}` } : item);
  const hookAndSampleInDebug = withText(checkedBuild, "assets/DebugMode-x1.js", 'Object.defineProperty(t,"__dreamscapeDebug",{});const s="sample_trip"');
  const debugOnTitle = withText(checkedBuild, "assets/index-abc.js", 'jsx("div",{className:"debug-panel"})');

  it("checks every built file for test-only code and the title page's files for Debug code", () => {
    expect(checkDist(checkedBuild)).toEqual({
      devOnly: [], titleFiles: ["index.html", "assets/index-abc.js", "assets/index-abc.css"], missing: [], onTitle: [], miniGamesOnTitle: [],
      gameFiles: ["index.html", "assets/index-abc.js", "assets/index-abc.css"], inGame: [], journeyPartsOnTitle: [], mixedJourneyParts: [],
    });
    // The lazy Debug chunk is searched for the test hook and the sample journey like every other file.
    expect(checkDist(hookAndSampleInDebug).devOnly.map(({ path, marker }) => [path, marker.text])).toEqual([
      ["assets/DebugMode-x1.js", "__dreamscapeDebug"],
      ["assets/DebugMode-x1.js", "sample_trip"],
    ]);
    expect(checkDist(hookAndSampleInDebug).onTitle).toEqual([]);
    // Debug's code in the entry script is on the title page.
    expect(checkDist(debugOnTitle).onTitle.map(({ path, marker }) => [path, marker.text])).toEqual([["assets/index-abc.js", "debug-panel"]]);
    expect(checkDist(debugOnTitle).devOnly).toEqual([]);
    // A file index.html loads at once that the build lacks, and a build without index.html.
    expect(checkDist(checkedBuild.filter((file) => file.path !== "assets/index-abc.css")).missing).toEqual(["assets/index-abc.css"]);
    expect(checkDist(checkedBuild.filter((file) => file.path !== "index.html")).missing).toEqual(["index.html"]);
  });

  // A build split as the real one: the entry imports a shared chunk, loads a journey's part, a dialog and Debug lazily;
  // the dialog imports a chunk of its own, and Debug a chunk only it uses.
  const splitHtml = '<script type="module" src="./assets/index-abc.js"></script><link rel="modulepreload" href="./assets/shared-s1.js"><link rel="stylesheet" href="./assets/index-abc.css">';
  const splitBuild: DistFile[] = [
    { path: "index.html", text: splitHtml },
    { path: "assets/index-abc.js", text: 'import{a}from"./shared-s1.js";const m=()=>import(`./milano-m1.js`),c=()=>import("./CreditsDialog-c1.js"),d=()=>Y(()=>import("./DebugMode-x1.js"),__vite__mapDeps([0,1]));const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./DebugMode-x1.js","./debug-only-o1.js"])))=>i.map(i=>d[i])' },
    { path: "assets/index-abc.css", text: ".travel-menu{display:grid}" },
    { path: "assets/shared-s1.js", text: "export const a=1" },
    { path: "assets/milano-m1.js", text: 'var e={marker:"dreamscape-journey-part:milano",journeyId:"milano",stories:{}};export{e as default}' },
    { path: "assets/CreditsDialog-c1.js", text: 'import "./credits-data-k1.js";export const C=1' },
    { path: "assets/CreditsDialog-c2.css", text: ".credits{display:grid}" },
    { path: "assets/credits-data-k1.js", text: "export const k=1" },
    { path: "assets/DebugMode-x1.js", text: 'import"./debug-only-o1.js";jsx("main",{className:"debug-panel"})' },
    { path: "assets/DebugMode-x2.css", text: ".debug-panel{display:grid}" },
    { path: "assets/debug-only-o1.js", text: 'throw Error("仮の場面の元になる都市がありません。")' },
  ];

  it("follows the title's imports to every file the game loads with Debug mode off, stopping at Debug's own modules", () => {
    const check = checkDist(splitBuild);
    expect(check.titleFiles).toEqual(["index.html", "assets/index-abc.js", "assets/shared-s1.js", "assets/index-abc.css"]);
    // Static and dynamic imports (a template literal too) and every stylesheet but Debug's; not the chunk only Debug imports.
    expect(check.gameFiles.sort()).toEqual(["assets/CreditsDialog-c1.js", "assets/CreditsDialog-c2.css", "assets/credits-data-k1.js",
      "assets/index-abc.css", "assets/index-abc.js", "assets/milano-m1.js", "assets/shared-s1.js", "index.html"]);
    expect(check.onTitle).toEqual([]);
    expect(check.inGame).toEqual([]);
    expect(isDebugEntryChunk("assets/DebugMode-x1.js")).toBe(true);
    expect(isDebugEntryChunk("assets/DebugModeSetting-x1.js")).toBe(false);
    expect(importedScripts(splitBuild[5], new Set(splitBuild.map((file) => file.path)))).toEqual(["assets/credits-data-k1.js"]);
    // Debug's code in a chunk the game loads later (a dialog's own chunk, or its stylesheet) is found.
    const leaked = withText(withText(splitBuild, "assets/credits-data-k1.js", 'const p="Debug · 通常セーブとは別"'), "assets/CreditsDialog-c2.css", ".debug-panel{}");
    expect(checkDist(leaked).inGame.map(({ path, marker }) => [path, marker.text])).toEqual([
      ["assets/CreditsDialog-c2.css", "debug-panel"],
      ["assets/credits-data-k1.js", "Debug · 通常セーブとは別"],
    ]);
    expect(describeDebugInGame("dist", checkDist(leaked).inGame)).toContain("- assets/credits-data-k1.js に「Debug · 通常セーブとは別」（目印の由来: src/dev/DebugMode.tsx）");
    // A renamed Debug module counts as the game's: its Debug code then fails the check.
    const renamed = splitBuild.map((file) => ({ ...file, path: file.path.replace("DebugMode-x1", "DebugScreen-x1"),
      text: file.text?.replaceAll("DebugMode-x1", "DebugScreen-x1") ?? null }));
    expect(checkDist(renamed).inGame.map(({ path }) => path)).toEqual(["assets/DebugScreen-x1.js", "assets/debug-only-o1.js"]);
  });

  it("keeps each journey's part of the content in a file of its own, off the title page", () => {
    expect(journeyPartsIn('{marker:"dreamscape-journey-part:milano"}')).toEqual(["milano"]);
    expect(journeyPartsIn('{marker:"dreamscape-core-part"}')).toEqual([]);
    expect(checkDist(splitBuild).journeyPartsOnTitle).toEqual([]);
    expect(checkDist(splitBuild).mixedJourneyParts).toEqual([]);
    // A part imported statically by the title, and two parts in one file.
    const onTitle = withText(splitBuild, "assets/shared-s1.js", 'var g={marker:"dreamscape-journey-part:golden_triangle"}');
    expect(checkDist(onTitle).journeyPartsOnTitle).toEqual([{ path: "assets/shared-s1.js", journeyIds: ["golden_triangle"] }]);
    const mixed = withText(splitBuild, "assets/milano-m1.js", 'var g={marker:"dreamscape-journey-part:golden_triangle"}');
    expect(checkDist(mixed).mixedJourneyParts).toEqual([{ path: "assets/milano-m1.js", journeyIds: ["milano", "golden_triangle"] }]);
    expect(describeJourneyParts("dist", checkDist(onTitle))).toContain("- タイトル画面で読み込む assets/shared-s1.js に golden_triangle のデータ");
    // content:build writes the marker into every journey's part, and the game's code never names it.
    expect(read("scripts/content-outputs.ts")).toContain("`${JOURNEY_PART_MARKER}${journeyId}`");
    expect(productionSources().filter((file) => read(file).includes(JOURNEY_PART_MARKER))).toEqual([]);
  });

  it("names Debug's own modules after files that exist and are loaded only lazily", () => {
    for (const { name, source } of debugEntryModules) {
      expect(path.basename(source).replace(/\.tsx?$/u, ""), source).toBe(name);
      expect(existsSync(path.join(root, source)), source).toBe(true);
      const importers = productionSources().filter((file) => runtimeImports(read(file)).some((specifier) => specifier.endsWith(`/${name}`)));
      expect(importers.length, `${source} is imported`).toBeGreaterThan(0);
      for (const file of importers) expect(read(file), `${file} imports ${source} lazily`).toMatch(new RegExp(`import\\("\\.{1,2}/(?:dev/)?${name}"\\)`, "u"));
    }
  });

  it("passes a clean build and fails the build command (scripts/check-dist.ts) on a leak, whichever built file holds the code", () => {
    const tsx = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
    const folder = mkdtempSync(path.join(tmpdir(), "dreamscape-dist-"));
    const check = (build: DistFile[]) => {
      rmSync(folder, { recursive: true, force: true });
      for (const file of build) {
        mkdirSync(path.dirname(path.join(folder, file.path)), { recursive: true });
        writeFileSync(path.join(folder, file.path), file.text ?? "");
      }
      return spawnSync(process.execPath, ["--import", tsx, path.join(root, "scripts/check-dist.ts"), folder], { cwd: root, encoding: "utf8" });
    };
    try {
      expect(dependencies.length).toBeGreaterThan(0);
      expect(checkThirdPartyLicenses(licenses, dependencies)).toEqual([]);
      // The clean build passes every check, the licence check included.
      const clean = check(checkedBuild);
      expect(clean.status, clean.stderr).toBe(0);
      expect(clean.stdout).toContain(`の検査: テスト専用のコードとデータは含まれていません（${checkedBuild.length} ファイル）。`);
      // Each leak fails at its own check (the licence list is the same valid one).
      const hook = check(hookAndSampleInDebug);
      expect(hook.status, hook.stdout).toBe(1);
      expect(hook.stderr).toContain("- assets/DebugMode-x1.js の内容に「__dreamscapeDebug」");
      expect(hook.stderr).toContain("- assets/DebugMode-x1.js の内容に「sample_trip」");
      expect(hook.stderr).not.toContain("ライセンス一覧に問題があります");
      const title = check(debugOnTitle);
      expect(title.status, title.stdout).toBe(1);
      expect(title.stderr).toContain("のタイトル画面で読み込むファイルにDebugのコードが入っています。");
      expect(title.stderr).toContain("- assets/index-abc.js に「debug-panel」");
      expect(title.stderr).not.toContain("ライセンス一覧に問題があります");
      // A file index.html loads but the build lacks fails at its own check, before the licence check.
      const missingCss = check(checkedBuild.filter((file) => file.path !== "assets/index-abc.css"));
      expect(missingCss.status, missingCss.stdout).toBe(1);
      expect(missingCss.stderr).toContain("index.html が読み込むファイルがビルドにありません: assets/index-abc.css");
      expect(missingCss.stderr).not.toContain("ライセンス一覧に問題があります");
      // Without the licence list the clean build fails at the licence check.
      const unlicensed = check(checkedBuild.filter((file) => file.path !== THIRD_PARTY_LICENSES_PATH));
      expect(unlicensed.status, unlicensed.stdout).toBe(1);
      expect(unlicensed.stderr).toContain("のライブラリのライセンス一覧に問題があります。\n- third-party-licenses.json がありません。");
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  });

  it("keeps every mini-game's play and engine out of the title page, by markers made from the registry (docs/13 5)", () => {
    const markers = miniGameMarkers(MINI_GAME_IDS, MINI_GAME_ENGINES);
    expect(markers.map((marker) => marker.text)).toContain("mg-cricket-batting");
    expect(markers.map((marker) => marker.text)).toContain("mg-engine-cue-tap");
    // Each folder's sources carry its marker (a renamed class would leave the check blind).
    for (const { text, source } of markers) {
      const files = readdirSync(path.join(root, source), { recursive: true, encoding: "utf8" }).filter((file) => /\.(tsx?|css)$/u.test(file));
      expect(files.some((file) => readFileSync(path.join(root, source, file), "utf8").includes(text)), `${source} has no "${text}"`).toBe(true);
    }
    // In a lazily loaded chunk it is fine; in the entry script or its CSS it is on the title page.
    const lazy = [...checkedBuild, { path: "assets/play-x2.js", text: 'jsx("div",{className:"mg-cricket-batting"})' }];
    expect(checkDist(lazy, markers).miniGamesOnTitle).toEqual([]);
    const eager = withText(checkedBuild, "assets/index-abc.css", ".mg-engine-cue-tap{display:flex}");
    expect(checkDist(eager, markers).miniGamesOnTitle.map(({ path, marker }) => [path, marker.text])).toEqual([["assets/index-abc.css", "mg-engine-cue-tap"]]);
    expect(describeMiniGamesOnTitle("dist", checkDist(eager, markers).miniGamesOnTitle))
      .toContain("- assets/index-abc.css に「mg-engine-cue-tap」（目印の由来: src/minigames/engines/cue_tap/）");
  });

  it("names the file, the text and its source in the reports", () => {
    const [finding] = findDevOnlyCode([{ path: "assets/DebugMode-x1.js", text: "__dreamscapeDebug" }]);
    const report = describeFindings("dist", [finding]);
    expect(report).toContain("本番ビルド（dist）");
    expect(report).toContain("- assets/DebugMode-x1.js の内容に「__dreamscapeDebug」（目印の由来: src/dev/debug-hook.ts）");
    const [onTitle] = findDebugCodeOnTitle([{ path: "assets/index-abc.js", text: "debug-panel" }], ["assets/index-abc.js"]);
    const titleReport = describeDebugOnTitle("dist", [onTitle]);
    expect(titleReport).toContain("本番ビルド（dist）のタイトル画面で読み込むファイルにDebugのコードが入っています。");
    expect(titleReport).toContain("- assets/index-abc.js に「debug-panel」（目印の由来: src/dev/DebugMode.tsx）");
  });
});

/** Game source files outside src/dev/ that ship: src/ without tests and in-memory test fixtures. */
function productionSources(): string[] {
  return readdirSync(path.join(root, "src"), { recursive: true, encoding: "utf8" })
    .map((file) => `src/${file.split(path.sep).join("/")}`)
    .filter((file) => /\.tsx?$/.test(file) && !file.startsWith("src/dev/") && !/\.test\.tsx?$/.test(file) && !file.includes("test-fixture"));
}
const devOnlyImport = /(^|\/)dev\/|test-fixture|(^|\/)tests\//;
const testImport = /test-fixture|(^|\/)tests\//;
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

describe("Debug's code in the game's sources", () => {
  it("is reached only through main.tsx's two lazy imports, opened only on the dev server or with Debug mode on", () => {
    const sources = productionSources();
    expect(sources).toContain("src/main.tsx");
    expect(sources).toContain("src/app/GameApp.tsx");
    expect(sources).toContain("src/app/debug-mode.ts");
    expect(sources).toContain("src/domain/relationship-change.ts");
    const reached = sources.flatMap((file) => runtimeImports(read(file))
      .filter((specifier) => devOnlyImport.test(specifier)).map((specifier) => `${file} → ${specifier}`));
    expect(reached).toEqual(["src/main.tsx → ./dev/CharacterPreview", "src/main.tsx → ./dev/DebugMode"]);
    // Each one is a dynamic import only (a lazy chunk the title page does not load, checked by
    // scripts/check-dist.ts on every build); a static import of the same module would add a second line above.
    const main = read("src/main.tsx");
    // (Each loads every journey's content first: Debug opens any journey's scenes.)
    const lazy = [...main.matchAll(/= React\.lazy\(\(\) => loadAllJourneyContent\(\)\.then\(\(\) => import\("(\.\/dev\/\w+)"\)\)\);/g)].map((match) => match[1]);
    expect(lazy.sort()).toEqual(["./dev/CharacterPreview", "./dev/DebugMode"]);
    // ?debug and ?character-preview open them only on the development server or on a device whose
    // Debug mode is on (AGENTS.md; the boot production test checks it with a fresh browser).
    expect(main).toContain("const debugAllowed = import.meta.env.DEV || readDebugMode(browserStorage);");
    expect(main).toContain('const showDebug = debugAllowed && query.has("debug");');
    expect(main).toContain('const showCharacterPreview = debugAllowed && query.has("character-preview");');
  });

  it("ships without the test hook, which DebugMode installs only on the development server", () => {
    const debugMode = read("src/dev/DebugMode.tsx");
    expect(debugMode).toMatch(/useEffect\(\(\) => import\.meta\.env\.DEV \? installDebugHook\(window, \{/u);
    expect(debugMode.match(/installDebugHook\(/gu)).toHaveLength(1);
  });

  it("shipped as Debug, imports no tests and no in-memory test fixtures", () => {
    // src/dev/ ships as Debug's lazy chunks (not its unit tests). The dist markers tests/fixtures/ and
    // tests/journeys/ only match source-map paths, which the build does not write, so this scan is what
    // keeps such an import out.
    // Every file of src/dev/ and its subfolders, as productionSources() reads src/.
    const shipped = readdirSync(path.join(root, "src/dev"), { recursive: true, encoding: "utf8" })
      .map((file) => `src/dev/${file.split(path.sep).join("/")}`)
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
    expect(shipped).toEqual(expect.arrayContaining(["src/dev/DebugMode.tsx", "src/dev/EffectsRoom.tsx", "src/dev/scenario-builders.ts", "src/dev/test-cities.ts"]));
    expect(shipped.flatMap((file) => runtimeImports(read(file)).filter((specifier) => testImport.test(specifier))
      .map((specifier) => `${file} → ${specifier}`))).toEqual([]);
  });
});

describe("library licence notices of the production build", () => {
  const entry = (name: string, extra: Record<string, unknown> = {}) =>
    ({ name, version: "1.0.0", identifier: "MIT", text: `MIT License\n\nCopyright (c) ${name} authors`, ...extra });
  const dependencies = ["leaflet", "zod"];

  it("accepts a list with a licence text for every package, dependencies and their bundled packages", () => {
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet", { identifier: "BSD-2-Clause" }), entry("scheduler"), entry("zod")]), dependencies)).toEqual([]);
  });

  it("names a missing or unreadable file, an entry without its licence and a dependency left out", () => {
    expect(checkThirdPartyLicenses(null, dependencies)).toEqual([
      "third-party-licenses.json がありません。vite.config.ts の build.license でライブラリのライセンス一覧を書き出してください。"]);
    expect(checkThirdPartyLicenses("<!doctype html>", dependencies)).toEqual(["third-party-licenses.json を JSON として読めません。"]);
    expect(checkThirdPartyLicenses("{}", dependencies)).toEqual(["third-party-licenses.json はライブラリの一覧（JSON の配列）ではありません。"]);
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet", { text: "" }), entry("zod", { identifier: undefined }), {}]), dependencies)).toEqual([
      "third-party-licenses.json の leaflet 1.0.0 に text がありません。",
      "third-party-licenses.json の zod 1.0.0 に identifier がありません。",
      "third-party-licenses.json の 3 件目 に name がありません。",
      "third-party-licenses.json の 3 件目 に version がありません。",
      "third-party-licenses.json の 3 件目 に identifier がありません。",
      "third-party-licenses.json の 3 件目 に text がありません。",
    ]);
    // A text of white space only is no licence text.
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet", { text: " \n\t " }), entry("zod")]), dependencies)).toEqual([
      "third-party-licenses.json の leaflet 1.0.0 に text がありません。"]);
    expect(checkThirdPartyLicenses(JSON.stringify([entry("leaflet")]), dependencies)).toEqual([
      "third-party-licenses.json に zod（package.json の dependencies）のライセンスがありません。"]);
  });
});
