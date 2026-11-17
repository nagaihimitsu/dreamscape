/**
 * The page's sums for 「オフラインで遊ぶ」 (user request and decisions 2026-11-17): which files a build's kept journeys
 * need, which of them the device still lacks, what may be removed, how a list fetched from the site stands to what is
 * kept, and when a newer build's files load by themselves. Pure: the page's run (download.ts, offline-controller.ts)
 * calls these, and the unit test checks them. (How sizes read on screen: sizes.ts.)
 */
import type { OfflineFile, OfflineList } from "./list";
import { fileUrl, listKey, offlineKey, stateKey, type OfflineState } from "./state";
import type { ConnectionHint } from "../media/preload-queue";

/** The files a device that keeps `journeys` of a build holds: the shared ones, then each journey's own (a journey the list has not adds nothing). */
export function keptFiles(list: OfflineList, journeys: readonly string[]): OfflineFile[] {
  return [...list.shared, ...journeys.flatMap((journeyId) => list.journeys[journeyId] ?? [])];
}

/** Those of `files` the device does not hold (`storedKeys`: the keys of its store). */
export function missingFiles(files: readonly OfflineFile[], storedKeys: ReadonlySet<string>, scope: string): OfflineFile[] {
  return files.filter(([path, , sha]) => !storedKeys.has(offlineKey(scope, path, sha)));
}

export function bytesOf(files: readonly OfflineFile[]): number {
  return files.reduce((sum, [, bytes]) => sum + bytes, 0);
}

/**
 * The files a run is for: those of its target (`files`) that the installed build does not already hold on the device
 * (`installed`: the installed build's files). A device's first journey counts everything, a journey added to a kept
 * build its own files, a newer build its changed files, a repair the files that went missing: what the screens named
 * before the run started is what its progress counts toward.
 */
export function runFiles(files: readonly OfflineFile[], installed: readonly OfflineFile[], storedKeys: ReadonlySet<string>, scope: string): OfflineFile[] {
  const held = new Set(installed.map(([path, , sha]) => offlineKey(scope, path, sha)).filter((key) => storedKeys.has(key)));
  return files.filter(([path, , sha]) => !held.has(offlineKey(scope, path, sha)));
}

/**
 * The sizes of a build's groups in bytes, and how much of each the device still lacks. The shared files count once,
 * whatever the number of journeys. `held`: the bytes of the shared group and of the installed journeys that the
 * installed build already holds on the device (no run loads them again, and none counts them: runFiles).
 */
export type OfflineSizes = {
  shared: number;
  sharedMissing: number;
  held: number;
  journeys: Record<string, { own: number; ownMissing: number }>;
};

/** `installed`: the installed build's files and journeys (none on a device that keeps nothing yet). */
export function journeySizes(list: OfflineList, storedKeys: ReadonlySet<string>, scope: string,
  installed: { files: readonly OfflineFile[]; journeys: readonly string[] } = { files: [], journeys: [] }): OfflineSizes {
  const journeys: OfflineSizes["journeys"] = {};
  for (const [journeyId, files] of Object.entries(list.journeys))
    journeys[journeyId] = { own: bytesOf(files), ownMissing: bytesOf(missingFiles(files, storedKeys, scope)) };
  const kept = keptFiles(list, installed.journeys);
  return {
    shared: bytesOf(list.shared), sharedMissing: bytesOf(missingFiles(list.shared, storedKeys, scope)),
    held: bytesOf(kept) - bytesOf(runFiles(kept, installed.files, storedKeys, scope)), journeys,
  };
}

/**
 * The journeys of `list` that are not among `installed` but have files of their own on the device: a loading that was
 * stopped. Each switch and removal names them in the state's target, so what was loaded stays until the player
 * continues or removes it.
 */
export function partialJourneys(list: OfflineList, installed: readonly string[], storedKeys: ReadonlySet<string>, scope: string): string[] {
  return Object.keys(list.journeys).filter((journeyId) => !installed.includes(journeyId) &&
    list.journeys[journeyId].some(([path, , sha]) => storedKeys.has(offlineKey(scope, path, sha))));
}

/**
 * The store keys the state still needs: the state itself, and for each build it names (installed, target, previous)
 * its list and the files of its shared group and kept journeys (`lists`: the builds' lists by name; a build whose list
 * is not there names only its list key), plus `fontKeys` (the kept fonts, under their own addresses).
 */
export function referencedKeys(state: OfflineState, lists: ReadonlyMap<string, OfflineList>, fontKeys: Iterable<string>, scope: string): Set<string> {
  const keys = new Set<string>([stateKey(scope), ...fontKeys]);
  for (const build of [state.installed, state.target, state.previous]) {
    if (!build) continue;
    keys.add(listKey(scope, build.build));
    const list = lists.get(build.build);
    if (list) for (const [path, , sha] of keptFiles(list, build.journeys)) keys.add(offlineKey(scope, path, sha));
  }
  return keys;
}

/** The stored keys nothing needs any more. */
export function garbageKeys(storedKeys: Iterable<string>, referenced: ReadonlySet<string>): string[] {
  return [...storedKeys].filter((key) => !referenced.has(key));
}

/**
 * How a list fetched from the site stands to what the device keeps:
 * - "stale": of a lower release than the installed build (an old copy from the network): the installed build stays;
 * - "current": the installed build;
 * - "newer": another build than the installed one, not older;
 * - "first-ok": nothing is installed, and the list is this page's own build (its entry script);
 * - "first-reload": nothing is installed, and the page runs another build than the list's: the page is loaded anew first
 *   (its own later parts would not be among the kept files).
 */
export type ListClass = "stale" | "current" | "newer" | "first-ok" | "first-reload";

export function classifyList(list: OfflineList, state: OfflineState | null, pageEntry: string, scope: string): ListClass {
  const installed = state?.installed;
  if (!installed) return fileUrl(scope, list.entry) === pageEntry ? "first-ok" : "first-reload";
  if (list.release < installed.release) return "stale";
  return list.build === installed.build ? "current" : "newer";
}

/** Why a run loads: a device's first journey, one more, a newer build's changed files, or files that went missing. */
export type RunKind = "first" | "add" | "update" | "repair";

/** The most a newer build's files (or missing ones) may weigh to load by themselves (user decision 2026-11-17: 「小さければ自動」). */
export const AUTO_UPDATE_LIMIT_BYTES = 30_000_000;

const slowLink = (connection: ConnectionHint | undefined) =>
  !!connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");

/**
 * Whether a run starts by itself while online: only a newer build's files or missing ones, up to AUTO_UPDATE_LIMIT_BYTES,
 * and not while the browser reports data saving or a slow link. A journey is never loaded unless the player asks.
 */
export function autoRun(kind: RunKind, deltaBytes: number, connection: ConnectionHint | undefined): boolean {
  return (kind === "update" || kind === "repair") && deltaBytes <= AUTO_UPDATE_LIMIT_BYTES && !slowLink(connection);
}

/** How many files load at once: two, one with data saving or on a slow link. */
export function downloadConcurrency(connection: ConnectionHint | undefined): number {
  return slowLink(connection) ? 1 : 2;
}

/** What the screens need to know of the store, from its state, its keys and the lists at hand. */
export type StoreFacts = {
  /** The journeys that are complete on the device (the installed build's). */
  installed: string[];
  /** The journeys being loaded or left midway: the target's that are not installed, and those with files of their own stored. */
  partial: string[];
  /** The sizes against the list a run would load (`latest`, else the kept build's); null when no list is at hand. */
  sizes: OfflineSizes | null;
  /** Whether that list is another build than the installed one (a newer one: an older list is never used). */
  newer: boolean;
  /** The bytes the device lacks of the installed journeys in that list: a newer build's changed files, or files that went missing. */
  pending: number;
  /** Whether the installed build is not the one this page runs (and no newer is known): the next start opens it. */
  switched: boolean;
  /** The bytes of the stored files the lists name (fonts are not counted). */
  storedBytes: number;
  /**
   * Those bytes by group, as the builds the state names group them (the installed build's list first): the files the
   * journeys share, and each journey's own. What a removal takes away is read here, not from the list a run would load
   * (a newer build's list names other files than the device holds).
   */
  storedBy: { shared: number; journeys: Record<string, number> };
};

/**
 * `latest`: the list fetched from the site, or null (offline, or none there). An older one than the installed build
 * is not used. `lists`: the stored lists of the state's builds, by name.
 */
export function storeFacts(input: {
  state: OfflineState | null;
  lists: ReadonlyMap<string, OfflineList>;
  latest: OfflineList | null;
  storedKeys: ReadonlySet<string>;
  scope: string;
  pageEntry: string;
}): StoreFacts {
  const { state, lists, latest, storedKeys, scope, pageEntry } = input;
  const kept = state?.installed ?? null;
  const fresh = latest && (!kept || latest.release >= kept.release) ? latest : null;
  const plan = fresh ?? (kept && lists.get(kept.build)) ?? (state?.target && lists.get(state.target.build)) ?? null;
  const installed = kept ? [...kept.journeys] : [];
  const targeted = (state?.target?.journeys ?? []).filter((journeyId) => !installed.includes(journeyId));
  const begun = plan ? partialJourneys(plan, installed, storedKeys, scope) : [];
  const partial = plan ? Object.keys(plan.journeys).filter((journeyId) => targeted.includes(journeyId) || begun.includes(journeyId)) : targeted;
  const newer = !!kept && !!plan && plan.build !== kept.build;
  const pending = plan && installed.length ? bytesOf(missingFiles(keptFiles(plan, installed), storedKeys, scope)) : 0;
  // Each stored file once, in the group of the first list that names it (the state's builds first, then the plan).
  const storedBy: StoreFacts["storedBy"] = { shared: 0, journeys: {} };
  const counted = new Set<string>();
  const count = (files: readonly OfflineFile[], journeyId: string | null) => {
    for (const [path, bytes, sha] of files) {
      const key = offlineKey(scope, path, sha);
      if (counted.has(key) || !storedKeys.has(key)) continue;
      counted.add(key);
      if (journeyId === null) storedBy.shared += bytes;
      else storedBy.journeys[journeyId] = (storedBy.journeys[journeyId] ?? 0) + bytes;
    }
  };
  for (const list of new Set([...lists.values(), ...(plan ? [plan] : [])])) {
    count(list.shared, null);
    for (const [journeyId, files] of Object.entries(list.journeys)) count(files, journeyId);
  }
  const storedBytes = storedBy.shared + Object.values(storedBy.journeys).reduce((sum, bytes) => sum + bytes, 0);
  const keptList = kept ? lists.get(kept.build) : undefined;
  const held = { files: kept && keptList ? keptFiles(keptList, kept.journeys) : [], journeys: installed };
  return {
    installed, partial, sizes: plan ? journeySizes(plan, storedKeys, scope, held) : null, newer, pending,
    switched: !!kept && !newer && fileUrl(scope, kept.entry) !== pageEntry, storedBytes, storedBy,
  };
}
