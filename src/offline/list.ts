/**
 * The list of a production build's files that 「オフラインで遊ぶ」 keeps on a device (user request 2026-11-17: a journey
 * the player chooses is loaded whole, so it plays without a network; never by default). The build writes it as
 * `offline-files.json` beside index.html (scripts/offline-list-build.ts) and the dist check reads it back
 * (scripts/dist-guard.ts checkOfflineList); the page loads the files it names and the service worker answers from the
 * copies (src/offline/state.ts, src/sw/offline-rules.ts). Pure and without imports: the build, the page and the worker
 * share it.
 */

/** The list's file in the build, beside index.html. Its name never changes: the page asks for it to learn of a new build. */
export const OFFLINE_LIST_FILE = "offline-files.json";
/** The page: every start of a device that keeps a journey opens the kept copy of it. */
export const PAGE_FILE = "index.html";
/** The files of a build the list never names: the service worker (the browser itself keeps it) and the list. */
export const UNLISTED_FILES: readonly string[] = ["sw.js", OFFLINE_LIST_FILE];

/** A listed file: its path under index.html's folder, its size in bytes and the hash of its bytes (listSha). */
export type OfflineFile = [path: string, bytes: number, sha: string];

export type OfflineList = {
  schemaVersion: 1;
  /** The build's name: 16 hex of the SHA-256 over every listed file's path and hash. Two builds with the same files share it. */
  build: string;
  /** The deploy's number (the build's DREAMSCAPE_RELEASE: the CI run number, 0 for a local build). A device never goes back to a lower one. */
  release: number;
  /** The page's entry script (index.html's module script), one of `shared`. */
  entry: string;
  /** What every journey needs: the page, all the code and the served files of no journey. Sorted by path. */
  shared: OfflineFile[];
  /** Each playable journey's own files (in the catalog's order), sorted by path. */
  journeys: Record<string, OfflineFile[]>;
};

/** A listed file's hash: the first 16 hex of the SHA-256 of its bytes. */
export function listSha(sha256: string): string {
  return sha256.slice(0, 16);
}

const SHA = /^[0-9a-f]{16}$/u;

/** Whether `value` is a file's path under index.html's folder: no folder above it, no address of its own. */
function listedPath(value: unknown): value is string {
  return typeof value === "string" && !value.includes("\\") && value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function listedFiles(value: unknown, seen: Set<string>): OfflineFile[] | null {
  if (!Array.isArray(value)) return null;
  const files: OfflineFile[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || item.length !== 3) return null;
    const [path, bytes, sha] = item as unknown[];
    if (!listedPath(path) || seen.has(path) || !Number.isSafeInteger(bytes) || (bytes as number) < 0 || typeof sha !== "string" || !SHA.test(sha)) return null;
    seen.add(path);
    files.push([path, bytes as number, sha]);
  }
  return files;
}

/**
 * Read a list (parsed JSON), strictly: "newer" for a later schemaVersion (a build after this code), "malformed" for
 * anything else that is not a list — a file listed twice (in one group or in two), a path that leaves index.html's
 * folder, a size or hash of another shape, or a list without the page or its entry script among the shared files.
 */
export function readOfflineList(value: unknown): OfflineList | "newer" | "malformed" {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "malformed";
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1) return Number.isSafeInteger(data.schemaVersion) && (data.schemaVersion as number) > 1 ? "newer" : "malformed";
  if (typeof data.build !== "string" || !SHA.test(data.build)) return "malformed";
  if (!Number.isSafeInteger(data.release) || (data.release as number) < 0) return "malformed";
  const seen = new Set<string>();
  const shared = listedFiles(data.shared, seen);
  if (!shared || typeof data.journeys !== "object" || data.journeys === null || Array.isArray(data.journeys)) return "malformed";
  const journeys: Record<string, OfflineFile[]> = {};
  for (const [journeyId, files] of Object.entries(data.journeys)) {
    const own = listedFiles(files, seen);
    if (!own) return "malformed";
    journeys[journeyId] = own;
  }
  const kept = new Set(shared.map(([path]) => path));
  if (typeof data.entry !== "string" || !kept.has(data.entry) || !kept.has(PAGE_FILE)) return "malformed";
  return { schemaVersion: 1, build: data.build, release: data.release as number, entry: data.entry, shared, journeys };
}
