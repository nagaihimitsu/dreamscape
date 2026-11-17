/**
 * What a device that keeps a journey for 「オフラインで遊ぶ」 holds (user request and decisions 2026-11-17), and where:
 * one Cache Storage cache apart from the service worker's own (its name has a dot, so no worker's cleanup of
 * `dreamscape-…` caches ever removes it). In it: each kept file under an address that carries the hash of its bytes
 * (two builds sit side by side and share the files they have in common), the lists of the builds it names
 * (src/offline/list.ts), and one small state that says which build is complete. Deleting the cache removes everything
 * at once; no save, setting or English note is in it (those are in localStorage).
 *
 * The page writes it, only in the tab that holds the Web Lock (OFFLINE_LOCK); the service worker only reads it
 * (src/sw/offline-rules.ts). Pure: both share this module, and the build's cache rules read DOWNLOAD_PARAM.
 */
// With its extension: vite.config.ts loads this module through src/sw/cache-rules.ts (Vite's native config loader asks for it).
import { OFFLINE_LIST_FILE, type OfflineList } from "./list.ts";
import { OFFLINE_STATE_PATH } from "./store-name.ts";

/** The cache of the kept files, lists and state. */
export { OFFLINE_CACHE } from "./store-name.ts";
/** The Web Lock of the one tab that writes the cache. */
export const OFFLINE_LOCK = "dreamscape.offline";
/**
 * The search parameter of the page's own requests for the files it keeps (`?dreamscape-offline=<hash>`) and for the
 * list: the service worker leaves every request with it to the network and never keeps its answer.
 */
export const DOWNLOAD_PARAM = "dreamscape-offline";

/** The address of a file of the site: `path` under `scope` (index.html's folder), whatever characters its name has. */
export function fileUrl(scope: string, path: string): string {
  return new URL(path.split("/").map(encodeURIComponent).join("/"), scope).href;
}

/** Where a kept file is stored, and the address the page downloads it from: its address with the hash of its bytes. */
export function offlineKey(scope: string, path: string, sha: string): string {
  return `${fileUrl(scope, path)}?${DOWNLOAD_PARAM}=${sha}`;
}

/** Where the list of a build is stored. */
export function listKey(scope: string, build: string): string {
  return `${fileUrl(scope, OFFLINE_LIST_FILE)}?${DOWNLOAD_PARAM}=${build}`;
}

/** Where the state is stored: an address the site never serves. */
export function stateKey(scope: string): string {
  return new URL(OFFLINE_STATE_PATH, scope).href;
}

const FILE_TYPES: Readonly<Record<string, string>> = {
  js: "text/javascript", css: "text/css", html: "text/html; charset=utf-8", json: "application/json", webmanifest: "application/manifest+json",
  webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml",
  mp3: "audio/mpeg", mp4: "video/mp4", otf: "font/otf", woff2: "font/woff2",
};

/** The type a kept file is answered with when its stored copy names none, by its extension (a module script needs a JavaScript type). */
export function fileType(path: string): string {
  return FILE_TYPES[path.slice(path.lastIndexOf(".") + 1).toLowerCase()] ?? "application/octet-stream";
}

/** A build with the journeys kept of it (in the catalog's order): its shared files and those journeys' own. */
export type KeptBuild = { build: string; release: number; entry: string; journeys: string[] };

export type OfflineState = {
  schemaVersion: 1;
  /** Complete: every file of the build's shared group and of these journeys is stored and was checked. */
  installed: KeptBuild | null;
  /** Whether every start opens `installed` from the store, online too (false only while the site has no list any more). */
  pin: boolean;
  /** Being loaded: a newer build, more journeys, or files that went missing. */
  target: KeptBuild | null;
  /** The build the last switch replaced: its files stay until the next switch (a tab still running it loads its later parts). */
  previous: { build: string; journeys: string[] } | null;
  /** The address of the kept font stylesheet, or null. */
  fonts: string | null;
};

const BUILD = /^[0-9a-f]{16}$/u;
const record = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
const journeyIds = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === "string" && item !== "") && new Set(value).size === value.length ? [...value as string[]] : null;

function keptBuild(value: unknown): KeptBuild | null {
  const data = record(value);
  const journeys = journeyIds(data?.journeys);
  if (!data || !journeys?.length || typeof data.build !== "string" || !BUILD.test(data.build) || typeof data.entry !== "string" || data.entry === "" ||
    !Number.isSafeInteger(data.release) || (data.release as number) < 0) return null;
  return { build: data.build, release: data.release as number, entry: data.entry, journeys };
}

/**
 * Read the stored state (parsed JSON), strictly: "unreadable" for a later schemaVersion, any other shape, or nothing
 * (a cache with files but no state). The worker then answers as if nothing were kept; the page offers only to remove
 * everything, behind a confirmation. Nothing is overwritten or removed silently.
 */
export function readOfflineState(value: unknown): OfflineState | "unreadable" {
  const data = record(value);
  if (!data || data.schemaVersion !== 1 || typeof data.pin !== "boolean") return "unreadable";
  const installed = data.installed === null ? null : keptBuild(data.installed);
  const target = data.target === null ? null : keptBuild(data.target);
  if ((data.installed !== null && !installed) || (data.target !== null && !target)) return "unreadable";
  let previous: OfflineState["previous"] = null;
  if (data.previous !== null) {
    const old = record(data.previous);
    const journeys = journeyIds(old?.journeys);
    if (!old || !journeys || typeof old.build !== "string" || !BUILD.test(old.build)) return "unreadable";
    previous = { build: old.build, journeys };
  }
  if (data.fonts !== null && (typeof data.fonts !== "string" || data.fonts === "")) return "unreadable";
  return { schemaVersion: 1, installed, pin: data.pin, target, previous, fonts: data.fonts as string | null };
}

const sameBuild = (left: KeptBuild | null, right: KeptBuild | null) =>
  left !== null && right !== null && left.build === right.build && left.journeys.join("\n") === right.journeys.join("\n");

/**
 * Begin loading the build of `list` with `journeys` and every journey already installed (a device holds one build:
 * what it keeps moves to the new one together): the target. `state` is null on a device that keeps nothing yet. The
 * journeys are kept in the list's order, and only those the list has. A list of a lower release than the installed
 * build's (an old copy from the network) and one with none of the journeys change nothing.
 */
export function startTarget(state: OfflineState | null, list: OfflineList, journeys: readonly string[]): OfflineState | null {
  const wanted = Object.keys(list.journeys).filter((journeyId) => journeys.includes(journeyId) || state?.installed?.journeys.includes(journeyId));
  if (!wanted.length || (state?.installed && list.release < state.installed.release)) return state;
  const target: KeptBuild = { build: list.build, release: list.release, entry: list.entry, journeys: wanted };
  return { ...(state ?? { schemaVersion: 1, installed: null, pin: true, previous: null, fonts: null }), target };
}

/**
 * The switch, once every file of the target is stored: the target becomes the installed build and starts open it. When
 * the build changes, the one it replaces becomes `previous` (the earlier previous is no longer named, so its files can
 * go); when only journeys were added to the same build, `previous` stays. A target of a lower release than the
 * installed build's is dropped instead: a device never goes back. Without a target the state is returned as it is.
 */
export function completeTarget(state: OfflineState): OfflineState {
  const { installed, target } = state;
  if (!target) return state;
  if (installed && target.release < installed.release) return { ...state, target: null };
  const previous = installed && installed.build !== target.build ? { build: installed.build, journeys: installed.journeys } : state.previous;
  return { ...state, installed: target, target: null, previous, pin: true };
}

/**
 * Stop keeping a journey: it leaves the installed build, the target and the previous build. A build left without a
 * journey is no longer kept (its shared files alone open nothing), and a target that then equals the installed build
 * has nothing left to load. Null when nothing is kept any more: the whole cache can go.
 */
export function removeJourney(state: OfflineState, journeyId: string): OfflineState | null {
  const without = (build: KeptBuild | null): KeptBuild | null => {
    const journeys = build?.journeys.filter((id) => id !== journeyId) ?? [];
    return build && journeys.length ? { ...build, journeys } : null;
  };
  const installed = without(state.installed);
  const left = without(state.target);
  const target = sameBuild(installed, left) ? null : left;
  if (!installed && !target) return null;
  const previous = state.previous && { build: state.previous.build, journeys: state.previous.journeys.filter((id) => id !== journeyId) };
  return { ...state, installed, target, previous };
}

/** Starts take the page from the network again (the kept one only when offline): the site has no list any more. */
export function unpin(state: OfflineState): OfflineState {
  return state.pin ? { ...state, pin: false } : state;
}

/** Starts open the installed build again. */
export function repin(state: OfflineState): OfflineState {
  return state.pin ? state : { ...state, pin: true };
}
