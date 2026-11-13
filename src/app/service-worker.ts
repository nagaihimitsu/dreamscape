/**
 * Registers the service worker (src/sw/service-worker.ts, built to `sw.js` beside index.html) once the page has loaded,
 * so it never competes with the page's own files: later visits then read the game's files from the browser
 * (src/sw/cache-rules.ts). Production builds only (src/main.tsx); nothing shows to the player. The saves are in
 * localStorage and never pass through it.
 */
export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  const workers = navigator.serviceWorker;
  // A page no worker served yet (the first visit, or after the browser's data was cleared).
  const unserved = !workers.controller;
  window.addEventListener("load", () => {
    workers.register("./sw.js").then(async (registration) => {
      // A newer version, installed during an earlier visit, waits while pages of the older one are open: this page has
      // just started, and if it is that version's own page (the same entry script), the new worker takes over now.
      registration.waiting?.postMessage({ type: "activate", entry: entryScript() });
      // The first worker keeps the files this page loaded before it served the page.
      if (unserved) (await workers.ready).active?.postMessage({ type: "keep", urls: loadedFiles() });
    }).catch(() => undefined);
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
