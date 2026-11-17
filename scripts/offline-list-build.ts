import { createHash } from "node:crypto";
// With their extensions: vite.config.ts loads this module through scripts/service-worker-build.ts (Vite's native config loader asks for them).
import { entryScript } from "./dist-guard.ts";
import type { JourneyFiles } from "./journey-files.ts";
import { listSha, OFFLINE_LIST_FILE, readOfflineList, UNLISTED_FILES, type OfflineFile, type OfflineList } from "../src/offline/list.ts";

// The production build's list for 「オフラインで遊ぶ」 (src/offline/list.ts; user request 2026-11-17): every file of the
// build, by the journey it belongs to, with its size and hash. The service worker's build plugin writes it beside
// index.html once the build is complete (scripts/service-worker-build.ts) and the dist check reads it back
// (scripts/dist-guard.ts checkOfflineList). Nothing downloads by it unless a player asks.

/** A file of the build as the list and the cache versions read it: its path, its size and the SHA-256 of its bytes (hex), computed once. */
export type BuiltFile = { path: string; bytes: number; sha256: string };

/** A built file's facts from its bytes. */
export function builtFile(path: string, data: Uint8Array): BuiltFile {
  return { path, bytes: data.byteLength, sha256: createHash("sha256").update(data).digest("hex") };
}

/**
 * The deploy's number from the build's `DREAMSCAPE_RELEASE` (the Pages workflow gives its run number, which rises with
 * every deploy, a redeploy of an older commit included): 0 without one (a local or test build, whose address shares no
 * storage with the published game). A device that keeps a journey never goes back to a lower number, so a value that
 * is no number stops the build instead of counting as 0.
 */
export function releaseNumber(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(Number(value)))
    throw new Error(`DREAMSCAPE_RELEASE（${value}）は0以上の整数にしてください（公開のたびに増える番号。「オフラインで遊ぶ」の端末は、番号が下がった版を使いません）。`);
  return Number(value);
}

/**
 * The list of a build (`files`: every file of it; the worker and the list itself are left out). Each file is in
 * exactly one group: its journey's when `owners` (content:build's journey-files.json) gives it to one, else `shared`
 * — the page, every built script and stylesheet (Debug's and the preparing journeys' parts too: a page of the kept
 * build may ask for any of them), the root public/ files. `playable` are the journeys players can open, in the
 * catalog's order; only they get a group. Throws when the build holds a file of another journey, lacks a file of a
 * playable one, or cannot be read back as a list.
 */
export function offlineList(input: {
  files: readonly BuiltFile[];
  indexHtml: string;
  owners: JourneyFiles;
  playable: readonly string[];
  release: number;
}): OfflineList {
  const owner = new Map<string, string>();
  for (const [journeyId, paths] of Object.entries(input.owners.journeys)) for (const item of paths) owner.set(item, journeyId);
  const journeys: Record<string, OfflineFile[]> = {};
  for (const journeyId of input.playable) {
    if (!Object.hasOwn(input.owners.journeys, journeyId))
      throw new Error(`旅行編ごとの配信ファイルの一覧に ${journeyId} がありません。npm run content:build で生成し直してからビルドしてください。`);
    journeys[journeyId] = [];
  }
  const listed = input.files.filter((file) => !UNLISTED_FILES.includes(file.path)).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  const shared: OfflineFile[] = [];
  const build = createHash("sha256");
  for (const file of listed) {
    const journeyId = owner.get(file.path);
    if (journeyId !== undefined && !Object.hasOwn(journeys, journeyId)) throw new Error(`公開していない旅行編のファイルが本番ビルドにあります: ${file.path}（${journeyId}）`);
    (journeyId === undefined ? shared : journeys[journeyId]).push([file.path, file.bytes, listSha(file.sha256)]);
    build.update(`${file.path}\0${listSha(file.sha256)}\n`);
  }
  const present = new Set(listed.map((file) => file.path));
  for (const journeyId of input.playable) {
    const missing = input.owners.journeys[journeyId].filter((item) => !present.has(item));
    if (missing.length) throw new Error(`${journeyId} の配信ファイルが本番ビルドにありません（${missing.length} 件）: ${missing.slice(0, 5).join("、")}`);
  }
  const list: OfflineList = { schemaVersion: 1, build: build.digest("hex").slice(0, 16), release: input.release, entry: entryScript(input.indexHtml), shared, journeys };
  // What the page and the worker will read: a list they would refuse must not leave the build.
  if (typeof readOfflineList(JSON.parse(JSON.stringify(list))) === "string")
    throw new Error(`${OFFLINE_LIST_FILE} を作れません: index.html かその最初のスクリプト（${list.entry}）がビルドにないか、扱えない名前のファイルがあります。`);
  return list;
}

/** A size in decimal megabytes, as phones show it. */
function megabytes(files: readonly OfflineFile[]): string {
  return `${(files.reduce((sum, [, bytes]) => sum + bytes, 0) / 1_000_000).toFixed(1)} MB`;
}

/** The sizes a device takes in, for the dist check's printout: what every journey shares, each journey's own files, and both for a first journey. */
export function describeOfflineSizes(list: OfflineList): string {
  return [
    `端末に入れる大きさ（オフラインで遊ぶ）: 共通 ${megabytes(list.shared)}（${list.shared.length} ファイル）`,
    ...Object.entries(list.journeys).map(([journeyId, files]) =>
      `- ${journeyId}: ${megabytes(files)}（${files.length} ファイル）。最初の旅行編なら共通と合わせて ${megabytes([...list.shared, ...files])}`),
  ].join("\n");
}
