/**
 * How the service worker (service-worker.ts) answers from what 「オフラインで遊ぶ」 keeps on the device (src/offline/state.ts;
 * user request and decisions 2026-11-17). Pure: the unit test checks every rule.
 *
 * - A device that keeps nothing is answered exactly as before (cache-rules.ts).
 * - A device that keeps a journey opens the installed build's page from the store at every start, online too (it
 *   moves to a newer build only once that build is complete), and every kept file is answered from the store first:
 *   whole, or the asked part of it (a movie, streamed audio).
 * - The page's own requests for the files it keeps (cache-rules.ts, DOWNLOAD_PARAM) always go to the network.
 */
import type { RequestFacts } from "./cache-rules";
import { PAGE_FILE, type OfflineFile, type OfflineList } from "../offline/list";
import { DOWNLOAD_PARAM, offlineKey, type OfflineState } from "../offline/state";

/** The two hosts of the fonts index.html names: the stylesheet's and the font files'. */
export const FONT_STYLESHEET_ORIGIN = "https://fonts.googleapis.com";
export const FONT_FILE_ORIGIN = "https://fonts.gstatic.com";

/** What a device keeps, as the worker reads it from the store. */
export type Kept = {
  /** Each kept path under the scope with the store keys that may hold it: the installed build's first, then the target's, then the previous build's. */
  files: ReadonlyMap<string, readonly string[]>;
  /** The installed build's page and entry script (store keys), and whether every start opens it (the state's pin); null when no build is installed. */
  page: { key: string; entry: string; pinned: boolean } | null;
  /** The address of the kept font stylesheet, or null. */
  fonts: string | null;
};

/** What the worker knows of the store: not read yet (it has just started), nothing kept (or a state it cannot read), or what is kept. */
export type Known = "unknown" | null | Kept;

/** The files of a build's shared group and of the journeys kept of it. */
function buildFiles(list: OfflineList, journeys: readonly string[]): OfflineFile[] {
  return [...list.shared, ...journeys.flatMap((journeyId) => list.journeys[journeyId] ?? [])];
}

/**
 * The store keys of every kept path, by the builds the state names (`lists`: their lists, by build name; a build
 * whose list is not there adds nothing): the installed build's key first, then the target's, then the previous
 * build's. A file two builds share has one key.
 */
export function keptMaps(lists: ReadonlyMap<string, OfflineList>, state: OfflineState, scope: string): Map<string, string[]> {
  const files = new Map<string, string[]>();
  for (const build of [state.installed, state.target, state.previous]) {
    const list = build && lists.get(build.build);
    if (!list) continue;
    for (const [path, , sha] of buildFiles(list, build.journeys)) {
      const key = offlineKey(scope, path, sha);
      const keys = files.get(path);
      if (!keys) files.set(path, [key]);
      else if (!keys.includes(key)) keys.push(key);
    }
  }
  return files;
}

/**
 * The installed build's page and entry script in the store, with the state's pin; null when nothing is installed or
 * its list is not there. (The worker still looks whether both are stored before it answers with the page.)
 */
export function installedPage(lists: ReadonlyMap<string, OfflineList>, state: OfflineState, scope: string): Kept["page"] {
  const list = state.installed && lists.get(state.installed.build);
  if (!list) return null;
  const sha = (path: string) => list.shared.find(([file]) => file === path)?.[2];
  const page = sha(PAGE_FILE);
  const entry = sha(list.entry);
  if (page === undefined || entry === undefined) return null;
  return { key: offlineKey(scope, PAGE_FILE, page), entry: offlineKey(scope, list.entry, entry), pinned: state.pin };
}

/** What the worker reads of a state and the lists of its builds. */
export function keptOf(lists: ReadonlyMap<string, OfflineList>, state: OfflineState, scope: string): Kept {
  return { files: keptMaps(lists, state, scope), page: installedPage(lists, state, scope), fonts: state.fonts };
}

/** What of the store a request could be answered with. */
export type StoreTarget =
  /** The page: a navigation to index.html's folder (any query) or to index.html. */
  | { kind: "page" }
  /** A file of the site, by its path under the scope. */
  | { kind: "file"; path: string }
  /** The fonts' stylesheet or one of its font files, kept under its own address. */
  | { kind: "font" };

/** What of the store a request asks for; null for what the store never answers (a write, the page's own downloads, another site or path). */
export function storeTarget(request: RequestFacts, scope: string): StoreTarget | null {
  if (request.method !== "GET") return null;
  const url = new URL(request.url);
  if (url.origin === FONT_STYLESHEET_ORIGIN || url.origin === FONT_FILE_ORIGIN) return { kind: "font" };
  const base = new URL(scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.searchParams.has(DOWNLOAD_PARAM)) return null;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname.slice(base.pathname.length));
  } catch {
    return null;
  }
  return request.mode === "navigate" && (path === "" || path === PAGE_FILE) ? { kind: "page" } : { kind: "file", path };
}

/**
 * Where a request goes:
 * - "pass": left to the browser, as if there were no worker;
 * - "today": answered as before 「オフラインで遊ぶ」 (cache-rules.ts; that rule may itself leave it to the browser);
 * - "store": answered from the store (when the copy is not there after all, as "today");
 * - "await-state": the worker has just started and has not read the store yet: it waits for that, then decides again
 *   (a kept file must be answered from the store even then, e.g. the next part of a tune while offline).
 */
export type OfflineRoute = "pass" | "today" | "store" | "await-state";

export function offlineRoute(request: RequestFacts, scope: string, known: Known): OfflineRoute {
  const target = storeTarget(request, scope);
  if (!target) return "pass";
  if (known === "unknown") return "await-state";
  const kept = known !== null && (
    target.kind === "page" ? known.page !== null
      : target.kind === "file" ? known.files.has(target.path)
        : known.fonts !== null && (new URL(request.url).origin === FONT_FILE_ORIGIN || request.url === known.fonts));
  return kept ? "store" : target.kind === "font" ? "pass" : "today";
}

/**
 * The part of a file of `size` bytes a Range header asks for (`bytes=a-b`, `bytes=a-`, `bytes=-n`; the end is clipped
 * to the file): "unsatisfiable" when it starts at or after the end, null for a header that is no single byte range
 * (the whole file is then the answer).
 */
export function parseRange(header: string, size: number): { start: number; end: number } | "unsatisfiable" | null {
  const match = /^bytes=(\d*)-(\d*)$/u.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) return null;
  if (match[1] === "") {
    const last = Number(match[2]);
    return last === 0 || size === 0 ? "unsatisfiable" : { start: Math.max(0, size - last), end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  if (match[2] !== "" && Number(match[2]) < start) return null;
  return start >= size ? "unsatisfiable" : { start, end };
}

/** The headers of a whole kept file (status 200). */
export function wholeHeaders(type: string, size: number | null): Record<string, string> {
  return { "Content-Type": type, "Accept-Ranges": "bytes", ...(size === null ? {} : { "Content-Length": String(size) }) };
}

/** The headers of a part of a kept file (status 206): bytes `start` to `end` of `size`. */
export function rangeHeaders(start: number, end: number, size: number, type: string): Record<string, string> {
  return { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) };
}

/** The headers of the answer to a part no file has (status 416). */
export function unsatisfiableHeaders(size: number): Record<string, string> {
  return { "Content-Range": `bytes */${size}` };
}
