/**
 * What the screens know of 「オフラインで遊ぶ」 (user request and decisions 2026-11-17), and the few things the title
 * page itself needs: whether the browser can keep a journey at all, a small store the screens read, and the look at
 * each page start whether this device keeps anything. In the title page's own files, so it stays small: the work
 * itself (offline-controller.ts) is a file of its own, loaded only when the device keeps something or the player
 * opens 「オフラインで遊ぶ」. A device that keeps nothing loads no list and no file for it.
 */
import { useSyncExternalStore } from "react";
import type { OfflineSizes, RunKind } from "./plan";
import { mirrorKeptJourneys } from "./kept-journeys";
import { OFFLINE_CACHE, OFFLINE_STATE_PATH } from "./store-name";

/** Whether this page can keep a journey: "development" on the development server (no service worker there), "unsupported" in a browser without what it needs. */
export type OfflineSupport = "ok" | "unsupported" | "development";

export function offlineSupport(): OfflineSupport {
  if (!import.meta.env.PROD) return "development";
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unsupported";
  return "serviceWorker" in navigator && "caches" in window && "locks" in navigator && !!window.crypto?.subtle && window.isSecureContext ? "ok" : "unsupported";
}

/**
 * Why the last run (or removal) stopped, for the journey's row; `journeyId` null for a run of the kept journeys'
 * newer or missing files. "reload": the page must be loaded anew first. "no-space": refused before anything was
 * written (`needed`: the room the run asks for, `free`: what the device has); "quota": the device filled up (`needed`:
 * what is left, when known). "other-tab": another tab is at work, so nothing can be removed; "other-tab-run": so
 * nothing can be loaded.
 */
export type OfflineStop = {
  journeyId: string | null;
  reason: "stopped" | "offline" | "reload" | "mismatch" | "no-space" | "quota" | "storage" | "other-tab" | "other-tab-run";
  needed?: number;
  free?: number;
};

/**
 * What the last run or removal achieved: a journey is complete (`journeyId`), or the kept journeys' newer or missing
 * files are (`journeyId` null, with the `run`'s kind), or something was removed (`bytes` freed; `reload`: everything
 * went while this page runs another build than the site's, so its later parts are no longer to be had: the page is
 * loaded anew).
 */
export type OfflineResult = { journeyId: string | null; kind: "done" | "removed"; run?: RunKind; bytes?: number; reload?: boolean };

export type OfflineSnapshot = {
  support: OfflineSupport;
  /** What the device holds: not looked at yet, nothing, something this version reads, or data it cannot read. */
  store: "unknown" | "none" | "kept" | "unreadable";
  /** The journeys complete on the device. */
  installed: readonly string[];
  /** The journeys being loaded or left midway. */
  partial: readonly string[];
  /** The sizes a run would load against (plan.ts storeFacts); null without a list (offline with nothing kept). */
  sizes: OfflineSizes | null;
  /** Whether the site's list could be read at the last look: a run can start. */
  reachable: boolean;
  /** Whether the site has a newer build than the installed one, and the bytes the installed journeys lack of it (or of their own build: files that went missing). */
  newer: boolean;
  pending: number;
  /** Whether the installed build is newer than the one this page runs: the next start opens it. */
  switched: boolean;
  /** The bytes of the kept files (fonts not counted), and the same by group: what the journeys share, and each journey's own (plan.ts storeFacts). */
  storedBytes: number;
  storedBy: { shared: number; journeys: Record<string, number> };
  /**
   * The run in flight: its kind, the journey asked for (null: the kept journeys' newer or missing files), how far it
   * is in bytes of what it is for (plan.ts runFiles), and whether it waits for the network (`waiting`: a file did not
   * arrive and is tried again; gone with the next file that arrives).
   */
  run: { kind: RunKind; journeyId: string | null; done: number; total: number; waiting?: boolean } | null;
  /** Whether another tab is loading or removing. */
  otherTab: boolean;
  stop: OfflineStop | null;
  result: OfflineResult | null;
  /** Whether the browser promised to keep the site's data (null: not asked, or it does not say). */
  persisted: boolean | null;
  fonts: "kept" | "loading" | "none";
};

let snapshot: OfflineSnapshot = {
  support: offlineSupport(), store: "unknown", installed: [], partial: [], sizes: null, reachable: false, newer: false, pending: 0, switched: false,
  storedBytes: 0, storedBy: { shared: 0, journeys: {} }, run: null, otherTab: false, stop: null, result: null, persisted: null, fonts: "none",
};
const listeners = new Set<() => void>();

export const getOfflineSnapshot = (): OfflineSnapshot => snapshot;

/** Change what the screens know (the controller's; the screens only read). */
export function publishOffline(change: Partial<OfflineSnapshot>): void {
  snapshot = { ...snapshot, ...change };
  for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useOfflineStatus(): OfflineSnapshot {
  return useSyncExternalStore(subscribe, getOfflineSnapshot, getOfflineSnapshot);
}

type Controller = typeof import("./offline-controller");
let controller: Promise<Controller> | null = null;

/** The work of 「オフラインで遊ぶ」, loaded when first needed (a failed load is tried again the next time). */
export function loadOfflineController(): Promise<Controller> {
  controller ??= import("./offline-controller").catch((error: unknown) => { controller = null; throw error; });
  return controller;
}

/**
 * Look again at what the device keeps (ゲームの設定 as it opens). A device that keeps nothing is only asked whether its
 * store exists: no list is fetched and the controller is not loaded.
 */
export async function refreshOffline(): Promise<void> {
  if (snapshot.support !== "ok") return;
  try {
    if (!controller && !(await window.caches.has(OFFLINE_CACHE))) {
      if (snapshot.store === "unknown") publishOffline({ store: "none" });
      mirrorKeptJourneys([]);
      return;
    }
    await (await loadOfflineController()).offlineController.refresh();
  } catch {
    // The entries stay as they are; the dialog says what it cannot do.
  }
}

/** The mark of a page that was loaded anew to open the kept build (reopenKeptBuild): this tab does it once, until a page the worker serves starts. */
const REOPENED_KEY = "dreamscape.offline.reopened";

/**
 * A page the service worker did not serve — a forced reload goes around it — on a device whose starts open the kept
 * build (user decision 2026-11-17: 「固定する」): when this page is another build than the kept one, it is loaded anew,
 * through the worker, so the device stays on the build it keeps (a save written by a newer build could be one the
 * kept build cannot read). True when the page is being loaded anew. Once per tab: a page that is still not served
 * after that stays as it is. A device that keeps nothing is only asked whether its store exists.
 */
export async function reopenKeptBuild(): Promise<boolean> {
  if (snapshot.support !== "ok") return false;
  try {
    if (navigator.serviceWorker.controller) {
      window.sessionStorage.removeItem(REOPENED_KEY);
      return false;
    }
    if (window.sessionStorage.getItem(REOPENED_KEY) !== null || !(await window.caches.has(OFFLINE_CACHE))) return false;
    const scope = new URL("./", window.location.href).href;
    const stored = await window.caches.match(new URL(OFFLINE_STATE_PATH, scope).href, { cacheName: OFFLINE_CACHE });
    // (Only what this needs of the state; a state of another form opens nothing by itself: src/offline/state.ts.)
    const state = await stored?.json().catch(() => undefined) as { schemaVersion?: unknown; pin?: unknown; installed?: { entry?: unknown } | null } | undefined;
    const kept = state?.schemaVersion === 1 && state.pin === true && typeof state.installed?.entry === "string" ? new URL(state.installed.entry, scope).href : null;
    const own = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src;
    // Only when a worker is there to serve the next load.
    if (kept === null || !own || kept === own || !(await navigator.serviceWorker.getRegistration())?.active) return false;
    window.sessionStorage.setItem(REOPENED_KEY, "1");
    window.location.reload();
    return true;
  } catch {
    // Storage that refuses (a private window): the page stays as it is.
    return false;
  }
}

/**
 * At a page's start, once the service worker is registered (src/app/service-worker.ts): a device that keeps something
 * looks, in idle time, whether the site has a newer build of it (small ones load by themselves) and whether its files
 * are all there (and mirrors which journeys it keeps for the next start's title: kept-journeys.ts). A device that keeps
 * nothing does nothing more than ask whether its store exists (and drops a mirror the browser's emptied store left).
 */
export function startOfflineCheck(): void {
  if (snapshot.support !== "ok") return;
  void (async () => {
    try {
      if (!(await window.caches.has(OFFLINE_CACHE))) {
        mirrorKeptJourneys([]);
        return;
      }
      const start = () => { void loadOfflineController().then((module) => module.offlineController.startup()).catch(() => undefined); };
      if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 10_000 });
      else window.setTimeout(start, 3_000);
    } catch {
      // A browser that refuses its storage here (a private window): nothing is kept.
    }
  })();
}

let held = false;
/** No new file is loaded while `on` (the opening movie plays: it streams, and nothing should compete with it). */
export function holdOfflineDownloads(on: boolean): void {
  held = on;
}
export const offlineDownloadsHeld = (): boolean => held;

/**
 * What happens to a journey's loading while the player is elsewhere in the game (a short word under the header): it is
 * complete, or it stopped because the network went, the device has no room, or for another reason the dialog names
 * ("problem").
 */
export type OfflineEvent = { type: "done"; journeyId: string } | { type: "stopped"; journeyId: string; reason: "offline" | "quota" | "problem" };
const eventListeners = new Set<(event: OfflineEvent) => void>();

export function onOfflineEvent(listener: (event: OfflineEvent) => void): () => void {
  eventListeners.add(listener);
  return () => { eventListeners.delete(listener); };
}

export function emitOfflineEvent(event: OfflineEvent): void {
  for (const listener of [...eventListeners]) listener(event);
}

function subscribeOnline(listener: () => void): () => void {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

/** Whether the browser says it has a network. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}
