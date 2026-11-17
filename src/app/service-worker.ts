import { reopenKeptBuild, startOfflineCheck } from "../offline/offline-status";
import { browserTakeover, takeOver } from "./worker-takeover";

/**
 * Registers the service worker (src/sw/service-worker.ts, built to `sw.js` beside index.html) once the page has loaded,
 * so it never competes with the page's own files: later visits then read the game's files from the browser
 * (src/sw/cache-rules.ts). Production builds only (src/main.tsx). Nothing of it shows to the player, except
 * 「オフラインで遊ぶ」 (2026-11-17), where the player may keep a journey on the device: with `offline` (the game's own
 * page, not Debug's), a device that keeps one then looks for a newer build of it (src/offline/offline-status.ts). A
 * page that came around the worker (a forced reload) on a device that keeps another build is loaded anew first. The
 * saves are in localStorage and never pass through the worker.
 */
export function registerServiceWorker({ offline }: { offline: boolean }): void {
  if (!("serviceWorker" in navigator)) return;
  const workers = navigator.serviceWorker;
  // A page no worker served yet (the first visit, or after the browser's data was cleared).
  const unserved = !workers.controller;
  // Looked at before the page has loaded: a page that must be opened anew is so as early as can be.
  const reopening = reopenKeptBuild();
  window.addEventListener("load", () => {
    void reopening.then((leaving) => (leaving ? undefined : workers.register("./sw.js").then(async (registration) => {
      // A newer version, installed during an earlier visit, waits while pages of the older one are open: this page has
      // just started, and if it is that version's own page (the same entry script), the new worker takes over now
      // (worker-takeover.ts sees it through: a takeover that stays pending would make the next load hang).
      const waiting = registration.waiting;
      const taken = waiting ? takeOver(browserTakeover(waiting, entryScript())) : Promise.resolve(false);
      // The first worker keeps the files this page loaded before it served the page.
      if (unserved) (await workers.ready).active?.postMessage({ type: "keep", urls: loadedFiles() });
      // The older worker ends once it is idle: the page asks it for nothing more of its own while it is being replaced
      // (each request at that moment may start it again).
      if (offline) void taken.then(() => startOfflineCheck());
    }))).catch(() => undefined);
  }, { once: true });
}

/** This page's entry script (index.html's module script), as an address. */
function entryScript(): string | undefined {
  return document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src;
}

/** The addresses of the files this page has loaded so far (the worker keeps only its own kinds of them). */
function loadedFiles(): string[] {
  return performance.getEntriesByType("resource").map((entry) => entry.name);
}
