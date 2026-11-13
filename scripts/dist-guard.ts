/**
 * Checks what of Debug and the test code a production build contains.
 *
 * Debug (「場面の確認」, its launch URLs, the scene builders and 仮の場面) and the
 * asset preview ship since 2026-11-08 (user decision: Debug mode for everyone, behind
 * the switch in 設定, src/app/debug-mode.ts), but only as lazily loaded files the
 * title page does not load: their markers (`lazyDebugMarkers`) may appear only in
 * files that index.html does not load at once. The read-only test hook, the in-memory
 * test fixtures, the sample journey and the tests never ship: their markers
 * (`devOnlyMarkers`) must not appear in any built file or path. Each marker is text
 * that only such code contains. scripts/dist-guard.test.ts checks that every marker
 * is still found in its source, so renaming the source cannot silently switch a
 * check off.
 */

export interface DevOnlyMarker {
  /** Text that only development, test or Debug code contains. */
  text: string;
  /** Repository file or folder (ending in "/") whose path or content contains `text`. */
  source: string;
}

/** Never in a production build, in any file or path. */
export const devOnlyMarkers: readonly DevOnlyMarker[] = [
  // The read-only test hook (development server only: DebugMode installs it under import.meta.env.DEV).
  { text: "__dreamscapeDebug", source: "src/dev/debug-hook.ts" },
  // A journey's own test helpers (tests/journeys/<journeyId>/) have no marker of
  // their own, so removing a journey's test folder needs no change here: their
  // paths carry the "tests/journeys/" marker below, they build on
  // src/dev/test-cities.ts, and scripts/dist-guard.test.ts checks that neither the
  // game's sources nor the shipped Debug files import tests/.
  // The journey for development and tests only (npm run dev:sample, unit tests);
  // its ID also names its image folder. Debug's 仮の場面 uses the ID only under
  // import.meta.env.DEV (src/dev/fixture-template.ts), so it stays out of the build.
  { text: "sample_trip", source: "authoring/templates/sample_trip/manifest.json" },
  // Source paths, as written by source maps and the development JSX transform.
  // (tests/fixtures/current-game.ts has no text of its own: it calls the scene
  // builders and imports tests/, which the import scan of dist-guard.test.ts refuses.)
  { text: "src/dev/", source: "src/dev/" },
  { text: "test-fixture", source: "src/content/test-fixtures.ts" },
  { text: "tests/fixtures/", source: "tests/fixtures/" },
  { text: "tests/journeys/", source: "tests/journeys/" },
];

/** Debug and the asset preview: in a production build only in files the title page does not load. */
export const lazyDebugMarkers: readonly DevOnlyMarker[] = [
  // Debug (?debug) and the asset preview (?character-preview).
  { text: "debug-panel", source: "src/dev/DebugMode.tsx" },
  { text: "Debug · 通常セーブとは別", source: "src/dev/DebugMode.tsx" },
  { text: "debug-prototype-preview", source: "src/dev/PrototypePreview.tsx" },
  { text: "preview-costume", source: "src/dev/CharacterPreview.tsx" },
  { text: "人物素材の確認", source: "src/dev/CharacterPreview.tsx" },
  { text: "仮の場面の都市なら data=fixture を付けます", source: "src/dev/debug-state.ts" },
  // Debug launch URLs and the shared scene builders.
  { text: "?debug だけで場面の確認を開いてください", source: "src/dev/debug-query.ts" },
  { text: "到着の会話を完了できませんでした", source: "src/dev/scenario-builders.ts" },
  { text: "を結果まで進められませんでした", source: "src/dev/scenario-builders.ts" },
  // Debug's explanation of an unmet condition.
  { text: "夜（18:00から眠るまで）", source: "src/dev/condition-explain.ts" },
  { text: "制作中の都市ではありません", source: "src/dev/prototype-preview-state.ts" },
  // Debug's 音と演出の見本 (every sound and effect to check, 2026-11-13) and its rules.
  { text: "ここでの音の設定はこの部屋だけのもので", source: "src/dev/EffectsRoom.tsx" },
  { text: "消す（# tint: off）", source: "src/dev/effects-room.ts" },
  // 最初の3分の計測's note (2026-11-13; Debug mode only): GameApp loads it lazily in ⚙設定 while Debug mode is on.
  { text: "導入の計測：このタブで「旅をはじめる」から遊ぶと", source: "src/app/IntroTimingNote.tsx" },
  // Debug's 台詞の声の速さ (2026-11-13; Debug mode only): GameApp loads it lazily in ⚙設定 while Debug mode is on.
  { text: "録音した声を速く・ゆっくり聞いて", source: "src/app/DebugVoiceRate.tsx" },
  // 仮の場面 (in-memory test cities, shared by unit tests and Debug).
  { text: "仮の場面の元になる都市がありません", source: "src/dev/fixture-template.ts" },
];

export interface DistFile {
  /** Path inside the build folder, with forward slashes. */
  path: string;
  /** The file's text, or null for a binary file (only its path is checked). */
  text: string | null;
}

export interface DevOnlyFinding {
  path: string;
  where: "path" | "content";
  marker: DevOnlyMarker;
}

const textExtensions = new Set([
  ".js", ".mjs", ".cjs", ".css", ".html", ".json", ".webmanifest", ".map", ".svg", ".txt", ".xml",
]);

/** Whether a built file is text whose content should be searched. */
export function isTextAsset(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && textExtensions.has(path.slice(dot).toLowerCase());
}

/** Every marker found in the paths or text of the built files. */
export function findDevOnlyCode(
  files: Iterable<DistFile>,
  markers: readonly DevOnlyMarker[] = devOnlyMarkers,
): DevOnlyFinding[] {
  const findings: DevOnlyFinding[] = [];
  for (const file of files) {
    for (const marker of markers) {
      if (file.path.includes(marker.text)) findings.push({ path: file.path, where: "path", marker });
      else if (file.text?.includes(marker.text)) findings.push({ path: file.path, where: "content", marker });
    }
  }
  return findings;
}

/** A report of the findings for the person who ran the build. */
export function describeFindings(folder: string, findings: readonly DevOnlyFinding[]): string {
  const lines = findings.map(({ path, where, marker }) =>
    `- ${path} の${where === "path" ? "ファイル名" : "内容"}に「${marker.text}」（目印の由来: ${marker.source}）`);
  return [
    `本番ビルド（${folder}）に開発・テスト専用のコードまたはデータが含まれています。`,
    ...lines,
    "テスト用の読み取り口（src/dev/debug-hook.ts）を import.meta.env.DEV の分岐の外で使っていないか、",
    "テスト用の仮データ・tests/ を読み込んでいないか、生成物（src/content/generated）に見本の旅行編が入っていないかを確認してください。",
    "生成物が原因の場合は `npm run content:build` で生成し直してからビルドします。",
  ].join("\n");
}

/**
 * The files the title page loads at once: the entry script, its preloaded chunks and
 * the stylesheets that index.html names (`<script type="module" src>`, `<link
 * rel="modulepreload" href>`, `<link rel="stylesheet" href>`), as build paths
 * (`./assets/x.js` → `assets/x.js`; vite.config.ts builds with `base: "./"`). Vite
 * lists every static dependency of the entry there, so any other script or stylesheet
 * is loaded later, by a dynamic import (Debug, the asset preview).
 */
export function eagerFiles(indexHtml: string): string[] {
  const files = new Set<string>();
  for (const [tag] of indexHtml.matchAll(/<(?:script|link)\b[^>]*>/giu)) {
    const attribute = (name: string) => new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "iu").exec(tag);
    const value = (name: string) => { const match = attribute(name); return match ? match[1] ?? match[2] ?? match[3] : undefined; };
    const isScript = /^<script\b/iu.test(tag);
    const url = isScript ? (value("type")?.toLowerCase() === "module" ? value("src") : undefined)
      : /^(?:modulepreload|stylesheet)$/iu.test(value("rel") ?? "") ? value("href") : undefined;
    if (!url || /^[a-z][a-z0-9+.-]*:|^\/\//iu.test(url)) continue;
    files.add(url.replace(/^\.?\//u, "").replace(/[?#].*$/u, ""));
  }
  return [...files];
}

export interface DebugOnTitleFinding {
  path: string;
  marker: DevOnlyMarker;
}

/** Every lazy Debug marker found in a file the title page loads at once (`eager`, from eagerFiles). */
export function findDebugCodeOnTitle(
  files: Iterable<DistFile>,
  eager: readonly string[],
  markers: readonly DevOnlyMarker[] = lazyDebugMarkers,
): DebugOnTitleFinding[] {
  const loaded = new Set(eager);
  const findings: DebugOnTitleFinding[] = [];
  for (const file of files)
    if (loaded.has(file.path)) for (const marker of markers) if (file.text?.includes(marker.text)) findings.push({ path: file.path, marker });
  return findings;
}

/**
 * The mini-games' markers (docs/13 5): a game's play, rules, CSS and art load through its definition's `load()`, in files
 * the title page does not load. Every game's root class `mg-<game-id>` and every engine's `mg-engine-<engine-id>` (an ID's
 * `_` as `-`) may appear only in such files. Made from the registry's IDs (check-dist.ts passes them), so adding a game
 * changes no check; scripts/dist-guard.test.ts checks each folder's sources carry its marker.
 */
export function miniGameMarkers(gameIds: readonly string[], engineIds: readonly string[]): DevOnlyMarker[] {
  const dashed = (id: string) => id.replaceAll("_", "-");
  return [
    ...gameIds.map((id) => ({ text: `mg-${dashed(id)}`, source: `src/minigames/${id}/` })),
    ...engineIds.map((id) => ({ text: `mg-engine-${dashed(id)}`, source: `src/minigames/engines/${id}/` })),
  ];
}

/**
 * The modules only Debug mode opens with a dynamic import (src/main.tsx, src/app/GameApp.tsx). Vite names each one's
 * lazy chunk, and its stylesheet, after the module: `assets/<name>-<hash>.js` / `.css`. The files of the normal game
 * (gameFiles) stop at them. A renamed module makes its chunk count as the game's, so the check then fails on its
 * Debug code instead of passing it by.
 */
export const debugEntryModules: readonly { name: string; source: string }[] = [
  { name: "DebugMode", source: "src/dev/DebugMode.tsx" },
  { name: "CharacterPreview", source: "src/dev/CharacterPreview.tsx" },
  { name: "IntroTimingNote", source: "src/app/IntroTimingNote.tsx" },
  { name: "DebugVoiceRate", source: "src/app/DebugVoiceRate.tsx" },
];

/** Whether a built file is the lazy chunk (or its stylesheet) of a module only Debug mode opens (debugEntryModules). */
export function isDebugEntryChunk(path: string): boolean {
  return debugEntryModules.some(({ name }) => new RegExp(`^assets/${name}-[\\w-]+\\.(?:js|css)$`, "u").test(path));
}

/**
 * The scripts a built script imports: `from "…"`, `import "…"` and `import("…")` (also with a template literal, as
 * Vite writes the journeys' parts) of a relative path that is a file of the build, as build paths.
 */
export function importedScripts(script: DistFile, paths: ReadonlySet<string>): string[] {
  const found = new Set<string>();
  for (const [, specifier] of (script.text ?? "").matchAll(/\b(?:from|import)\s*\(?\s*["'`](\.{1,2}\/[^"'`\s]+\.js)["'`]/gu)) {
    const resolved = new URL(specifier, `https://build.invalid/${script.path}`).pathname.slice(1);
    if (paths.has(resolved)) found.add(resolved);
  }
  return [...found];
}

/**
 * The files the game may load while Debug mode is off: the title files and every script they reach by its imports
 * (static or dynamic: the journeys' parts, the maps' library, the dialogs, the mini-games' play), except through a
 * module only Debug mode opens (isDebugEntryChunk); and every stylesheet but those modules' own (Vite loads a chunk's
 * stylesheet with it).
 */
export function gameFiles(files: readonly DistFile[], titleFiles: readonly string[]): string[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const paths = new Set(byPath.keys());
  const reached = new Set(titleFiles);
  const queue = [...titleFiles];
  while (queue.length) {
    const file = byPath.get(queue.pop()!);
    if (!file?.path.endsWith(".js")) continue;
    for (const next of importedScripts(file, paths))
      if (!reached.has(next) && !isDebugEntryChunk(next)) { reached.add(next); queue.push(next); }
  }
  for (const path of paths) if (path.endsWith(".css") && !isDebugEntryChunk(path)) reached.add(path);
  return [...reached];
}

/**
 * The start of the `marker` of each journey's part of the content (content:build writes it, scripts/content-outputs.ts;
 * no game code contains it): `<marker><journeyId>`. A production build makes each part a file of its own, which the
 * page loads when that journey opens: none may be in a title file, and no file may hold two journeys' parts.
 */
export const JOURNEY_PART_MARKER = "dreamscape-journey-part:";

/** The journeys whose part (JOURNEY_PART_MARKER) a built file holds. */
export function journeyPartsIn(text: string | null): string[] {
  const found = (text ?? "").matchAll(new RegExp(`${JOURNEY_PART_MARKER}([a-z][a-z0-9_]*)`, "gu"));
  return [...new Set([...found].map((match) => match[1]))];
}

export interface DistCheck {
  /** Test-only code or data in any built file or path (devOnlyMarkers over every file). */
  devOnly: DevOnlyFinding[];
  /** index.html and the files it loads at once (eagerFiles). */
  titleFiles: string[];
  /** Title files that index.html names but the build lacks (index.html itself included). */
  missing: string[];
  /** Debug code in a title file (lazyDebugMarkers over titleFiles only). */
  onTitle: DebugOnTitleFinding[];
  /** The files the game may load with Debug mode off (gameFiles: the title files and what they import). */
  gameFiles: string[];
  /** Debug code in a file the game loads later (lazyDebugMarkers over gameFiles but the title files). */
  inGame: DebugOnTitleFinding[];
  /** A mini-game's or engine's play in a title file (miniGameMarkers over titleFiles only). */
  miniGamesOnTitle: DebugOnTitleFinding[];
  /** A journey's part of the content in a title file (journeyPartsIn). */
  journeyPartsOnTitle: { path: string; journeyIds: string[] }[];
  /** A file that holds the parts of more than one journey. */
  mixedJourneyParts: { path: string; journeyIds: string[] }[];
}

/**
 * The checks of scripts/check-dist.ts over all files of a build, except the
 * licence check. Which marker list scans which files is decided here (and unit
 * tested), so the command only reads the folder, passes every file and prints.
 */
export function checkDist(files: readonly DistFile[], miniGames: readonly DevOnlyMarker[] = []): DistCheck {
  const indexHtml = files.find((file) => file.path === "index.html")?.text ?? "";
  // The page itself and what it loads at once; Debug's chunks load only when Debug is opened.
  const titleFiles = ["index.html", ...eagerFiles(indexHtml)];
  const game = gameFiles(files, titleFiles);
  const parts = files.map((file) => ({ path: file.path, journeyIds: journeyPartsIn(file.text) })).filter((file) => file.journeyIds.length);
  return {
    devOnly: findDevOnlyCode(files),
    titleFiles,
    missing: titleFiles.filter((name) => !files.some((file) => file.path === name)),
    onTitle: findDebugCodeOnTitle(files, titleFiles),
    gameFiles: game,
    inGame: findDebugCodeOnTitle(files, game.filter((path) => !titleFiles.includes(path))),
    miniGamesOnTitle: findDebugCodeOnTitle(files, titleFiles, miniGames),
    journeyPartsOnTitle: parts.filter((file) => titleFiles.includes(file.path)),
    mixedJourneyParts: parts.filter((file) => file.journeyIds.length > 1),
  };
}

/** A report of Debug code in a file the game loads after the title for the person who ran the build. */
export function describeDebugInGame(folder: string, findings: readonly DebugOnTitleFinding[]): string {
  return [
    `本番ビルド（${folder}）の、Debugモードがオフでも読み込むファイル（タイトル画面のファイルが import でたどるもの）にDebugのコードが入っています。`,
    ...findings.map(({ path, marker }) => `- ${path} に「${marker.text}」（目印の由来: ${marker.source}）`),
    "Debugの画面は src/main.tsx と src/app/GameApp.tsx の Debug 用の React.lazy（scripts/dist-guard.ts の debugEntryModules）からだけ読み込みます。",
    "ゲームのコードから src/dev/ やDebug専用のモジュールを import していないか、Debug専用のモジュールの名前を変えていないかを確認してください。",
  ].join("\n");
}

/** A report of journeys' parts of the content on the title page or together in a file. */
export function describeJourneyParts(folder: string, check: Pick<DistCheck, "journeyPartsOnTitle" | "mixedJourneyParts">): string {
  return [
    `本番ビルド（${folder}）で、旅行編ごとのデータ（src/content/generated/journey-parts/）が分かれていません。`,
    ...check.journeyPartsOnTitle.map(({ path, journeyIds }) => `- タイトル画面で読み込む ${path} に ${journeyIds.join("・")} のデータ`),
    ...check.mixedJourneyParts.map(({ path, journeyIds }) => `- ${path} に複数の旅行編（${journeyIds.join("・")}）のデータ`),
    "旅行編のデータは src/content/index.ts の loadJourneyContent が、その旅行編を開くときに import.meta.glob で1つずつ読み込みます。",
    "ゲームのコードから generated/journey-parts/ のファイルを静的な import で読み込んでいないかを確認してください。",
  ].join("\n");
}

/** A report of a mini-game's play on the title page for the person who ran the build. */
export function describeMiniGamesOnTitle(folder: string, findings: readonly DebugOnTitleFinding[]): string {
  return [
    `本番ビルド（${folder}）のタイトル画面で読み込むファイルに、ミニゲームの遊ぶ部分が入っています。`,
    ...findings.map(({ path, marker }) => `- ${path} に「${marker.text}」（目印の由来: ${marker.source}）`),
    "ゲームの遊ぶ画面・規則・CSS・絵は、definition.ts の load: () => import(\"./play\") からだけ読み込みます（docs/13 5章）。",
    "definition.ts やゲームの外のコードから、そのフォルダの play・Skin・rules・CSS を静的な import で読み込んでいないかを確認してください。",
  ].join("\n");
}

/** A report of Debug code on the title page for the person who ran the build. */
export function describeDebugOnTitle(folder: string, findings: readonly DebugOnTitleFinding[]): string {
  return [
    `本番ビルド（${folder}）のタイトル画面で読み込むファイルにDebugのコードが入っています。`,
    ...findings.map(({ path, marker }) => `- ${path} に「${marker.text}」（目印の由来: ${marker.source}）`),
    "Debug・プレビューは src/main.tsx の React.lazy(() => import(\"./dev/…\")) からだけ読み込みます。",
    "ゲームのコードから src/dev/ のモジュールを静的な import で読み込んでいないかを確認してください。",
  ].join("\n");
}

/**
 * The licence notices of the libraries the production build bundles: MIT and
 * BSD-2-Clause ask that the copyright and licence text go with every copy.
 * vite.config.ts writes them (`build.license`) to this file of the build,
 * which the credits list shows.
 */
export const THIRD_PARTY_LICENSES_PATH = "third-party-licenses.json";

/**
 * Problems with the build's licence file (`text` is its content, or null when
 * it is missing): it must be a JSON list of { name, version, identifier, text }
 * with an identifier and a licence text for every entry, and name every
 * package of package.json `dependencies` (all of them end up in the bundle).
 */
export function checkThirdPartyLicenses(text: string | null, dependencies: readonly string[]): string[] {
  if (text === null) return [`${THIRD_PARTY_LICENSES_PATH} がありません。vite.config.ts の build.license でライブラリのライセンス一覧を書き出してください。`];
  let entries: unknown;
  try {
    entries = JSON.parse(text);
  } catch {
    return [`${THIRD_PARTY_LICENSES_PATH} を JSON として読めません。`];
  }
  if (!Array.isArray(entries)) return [`${THIRD_PARTY_LICENSES_PATH} はライブラリの一覧（JSON の配列）ではありません。`];
  const problems: string[] = [];
  const names = new Set<string>();
  entries.forEach((entry, index) => {
    const item = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    const label = typeof item.name === "string" ? `${item.name}${typeof item.version === "string" ? ` ${item.version}` : ""}` : `${index + 1} 件目`;
    if (typeof item.name === "string") names.add(item.name);
    for (const key of ["name", "version", "identifier", "text"])
      if (typeof item[key] !== "string" || !(item[key] as string).trim())
        problems.push(`${THIRD_PARTY_LICENSES_PATH} の ${label} に ${key} がありません。`);
  });
  for (const name of dependencies)
    if (!names.has(name)) problems.push(`${THIRD_PARTY_LICENSES_PATH} に ${name}（package.json の dependencies）のライセンスがありません。`);
  return problems;
}
