/**
 * Fails when the production build contains test-only code or data, loads
 * Debug's code on the title page or in a file the game loads with Debug mode off
 * (Debug ships only as lazily loaded files it alone opens), loads a journey's part
 * of the content on the title page or mixes two journeys' parts in a file, holds a
 * served file of a journey players cannot open yet (scripts/withheld-files.ts), or
 * lacks the licence notices of the bundled libraries (see scripts/dist-guard.ts).
 * `npm run build` and `npm run verify` run it after `vite build`.
 *
 * Usage: tsx scripts/check-dist.ts [folder]   (default: dist)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  checkDist, checkThirdPartyLicenses, describeDebugInGame, describeDebugOnTitle, describeFindings, describeJourneyParts, describeMiniGamesOnTitle,
  describeWithheld, isTextAsset, miniGameMarkers,
  THIRD_PARTY_LICENSES_PATH, type DistFile,
} from "./dist-guard";
import { readWithheldFiles, WITHHELD_FILES_FILE, withheldPaths } from "./withheld-files";
import { MINI_GAME_ENGINES, MINI_GAME_IDS } from "../src/minigames/registry";
import { journeyCatalogSchema, journeyFilesShip } from "../src/content/journey-catalog";

const folder = process.argv[2] ?? "dist";
const root = path.resolve(folder);

if (!existsSync(path.join(root, "index.html"))) {
  console.error(`${folder}/index.html がありません。先に本番ビルド（vite build）を実行してください。`);
  process.exit(1);
}

const files: DistFile[] = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(root, file).split(path.sep).join("/");
    return { path: relative, text: isTextAsset(relative) ? readFileSync(file, "utf8") : null };
  });

// The served files of the journeys players cannot open yet (content:build lists them): the list must name exactly the
// journeys of the generated catalog whose files do not ship, or it is older than the content.
let withheld: ReturnType<typeof readWithheldFiles>;
try {
  withheld = readWithheldFiles(".");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync("src/content/generated/content/journeys/catalog.json", "utf8")));
const notShipped = catalog.journeys.filter((journey) => !journeyFilesShip(journey)).map((journey) => journey.id);
if (Object.keys(withheld.journeys).join(",") !== notShipped.join(",")) {
  console.error(`${WITHHELD_FILES_FILE} の旅行編（${Object.keys(withheld.journeys).join("・") || "なし"}）が、生成した旅行編の一覧の公開中でない旅行編` +
    `（${notShipped.join("・") || "なし"}）と違います。npm run content:build で生成し直してからビルドしてください。`);
  process.exit(1);
}

// Every file goes to the check (scripts/dist-guard.test.ts runs this command on small builds).
const check = checkDist(files, miniGameMarkers(MINI_GAME_IDS, MINI_GAME_ENGINES), withheldPaths(withheld));
const { devOnly, titleFiles, missing, onTitle, gameFiles, inGame, miniGamesOnTitle } = check;
if (devOnly.length > 0) {
  console.error(describeFindings(folder, devOnly));
  process.exit(1);
}
if (missing.length > 0) {
  console.error(`${folder}/index.html が読み込むファイルがビルドにありません: ${missing.join(", ")}`);
  process.exit(1);
}
if (onTitle.length > 0) {
  console.error(describeDebugOnTitle(folder, onTitle));
  process.exit(1);
}
if (inGame.length > 0) {
  console.error(describeDebugInGame(folder, inGame));
  process.exit(1);
}
if (miniGamesOnTitle.length > 0) {
  console.error(describeMiniGamesOnTitle(folder, miniGamesOnTitle));
  process.exit(1);
}
if (check.journeyPartsOnTitle.length > 0 || check.mixedJourneyParts.length > 0) {
  console.error(describeJourneyParts(folder, check));
  process.exit(1);
}
if (check.withheld.length > 0) {
  console.error(describeWithheld(folder, check.withheld));
  process.exit(1);
}
const dependencies = Object.keys(JSON.parse(readFileSync("package.json", "utf8")).dependencies ?? {});
const licenses = files.find((file) => file.path === THIRD_PARTY_LICENSES_PATH)?.text ?? null;
const licenseProblems = checkThirdPartyLicenses(licenses, dependencies);
if (licenseProblems.length > 0) {
  console.error([`本番ビルド（${folder}）のライブラリのライセンス一覧に問題があります。`, ...licenseProblems.map((problem) => `- ${problem}`)].join("\n"));
  process.exit(1);
}
console.log(`${folder} の検査: テスト専用のコードとデータは含まれていません（${files.length} ファイル）。` +
  `タイトル画面で読み込む ${titleFiles.length} ファイルにDebugのコードとミニゲームの遊ぶ部分と旅行編ごとのデータはなく、` +
  `Debugモードがオフでも読み込む ${gameFiles.length} ファイルにDebugのコードはありません。` +
  `ライブラリのライセンス一覧（${THIRD_PARTY_LICENSES_PATH}）に dependencies の ${dependencies.length} 件があります。` +
  `公開中でない旅行編（${notShipped.join("・") || "なし"}）の配信ファイル ${withheldPaths(withheld).size} 件は入っていません`);
