import { preloadVoice } from "../components/useVoice";
import { preloadSound } from "../audio/sound-effects";
import {
  allowedPriorities, createPreloadQueue, screenFirst, type ConnectionHint, type PreloadPriority, type PreloadRequest,
} from "./preload-queue";

// The page's background loading (2026-11-13; its rules: preload-queue.ts). A picture is fetched with the URL its screen
// uses, so the browser's cache hands it over, and decoded before it is needed ("next"); a voice or a sound effect goes into
// the decoded sounds of src/components/useVoice.ts and src/audio/sound-effects.ts (their own size limits), so that it
// starts as its line does. A few files at a time, never while the page is hidden, and on a connection that saves data
// only the next line's. Presentation only: a file that fails is left to its screen.

/** How many files load at once (a "next" one may take one more). */
const CONCURRENCY = 2;
/** How many loaded files are remembered, not asked again (the browser keeps the files themselves). */
const REMEMBERED = 400;
/** How many loaded pictures are kept in memory, the most recent: a picture about to show is shown from them at once. */
const KEPT_PICTURES = 8;

/** The loaded pictures by served path (the most recently loaded last). */
const pictures = new Map<string, HTMLImageElement>();

const servedUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

function keepPicture(path: string, image: HTMLImageElement) {
  pictures.delete(path);
  pictures.set(path, image);
  for (const oldest of pictures.keys()) {
    if (pictures.size <= KEPT_PICTURES) break;
    pictures.delete(oldest);
  }
}

/**
 * Loads the picture at the served path `path` as its screen will (the same URL): a "next" one first among the page's
 * requests, decoded too unless it is only for idle time (the browser keeps decoded pictures as long as it can). It settles
 * when the picture can be shown, and fails when it cannot (a picture that loaded although its decode() was refused can:
 * the <img> decodes it as it paints).
 */
export function loadPicture(path: string, priority: PreloadPriority = "next"): Promise<void> {
  const known = pictures.get(path);
  if (known) {
    keepPicture(path, known);
    return Promise.resolve();
  }
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority === "next" ? "high" : "low";
  image.src = servedUrl(path);
  const loaded = priority !== "idle"
    ? image.decode().catch((error: unknown) => {
      if (!image.complete || image.naturalWidth === 0) throw error;
    })
    : new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`画像を読み込めませんでした: ${path}`));
    });
  return loaded.then(() => keepPicture(path, image));
}

/** Whether the picture at `path` has loaded and is kept in memory: shown now, it appears at once. */
export function pictureReady(path: string): boolean {
  return pictures.has(path);
}

function connection(): ConnectionHint | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: ConnectionHint }).connection;
}

function load(request: PreloadRequest): Promise<unknown> {
  if (request.kind === "image") return loadPicture(request.key, request.priority);
  if (request.kind === "voice") return preloadVoice(request.key);
  return preloadSound(request.key);
}

/** How long the files not for the next line wait at most for the screen's own pictures (a stalled one must not stop them). */
const SCREEN_FIRST_MS = 6000;
/** Since when the screen's own pictures have been loading (performance.now()), or null. */
let screenBusySince: number | null = null;
let screenBusy = false;
let screenTimer: number | undefined;
/** The screen's pictures whose end is listened for. */
const heard = new WeakSet<HTMLImageElement>();

const queue = createPreloadQueue({
  load, allowed: () => screenFirst(allowedPriorities(connection()), screenBusy), concurrency: CONCURRENCY, remember: REMEMBERED,
});

/** Who asks: GameApp for the screen on show ("game"), free time for its chosen card ("destination"). */
export type PreloadSource = "game" | "destination";
/** What each source asks for now (each ask replaces its own). */
const wanted = new Map<PreloadSource, readonly PreloadRequest[]>();
let listening = false;

/** The pictures of the screen on show still loading (in the page; a lazy one off screen does not count). */
function screenLoading(): HTMLImageElement[] {
  return Array.from(document.images).filter((image) => !image.complete && image.loading !== "lazy");
}

/**
 * Loads what is wanted while the page shows. While the screen's own pictures load (the title's, a new scene's), only
 * the next line's files start (screenFirst); the rest follow as those pictures arrive, or after SCREEN_FIRST_MS.
 */
function pump() {
  if (document.hidden) return;
  const loading = screenLoading();
  const now = performance.now();
  screenBusySince = loading.length ? screenBusySince ?? now : null;
  screenBusy = screenBusySince !== null && now - screenBusySince < SCREEN_FIRST_MS;
  window.clearTimeout(screenTimer);
  if (screenBusy) {
    for (const image of loading) {
      if (heard.has(image)) continue;
      heard.add(image);
      const arrived = () => {
        image.removeEventListener("load", arrived);
        image.removeEventListener("error", arrived);
        heard.delete(image);
        pump();
      };
      image.addEventListener("load", arrived);
      image.addEventListener("error", arrived);
    }
    screenTimer = window.setTimeout(pump, SCREEN_FIRST_MS - (now - screenBusySince!));
  }
  queue.want([...wanted.values()].flat());
}

/**
 * Asks for the files `source`'s screen is about to need (src/media/preload-ahead.ts), in place of those it asked before
 * (none: it asks for nothing more). The screen's own pictures come first (pump); nothing loads while the page is hidden:
 * hiding it drops what has not started, and showing it again goes on with what is wanted.
 */
export function preloadMedia(source: PreloadSource, requests: readonly PreloadRequest[]): void {
  if (typeof document === "undefined") return;
  if (!listening) {
    listening = true;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) queue.clear();
      else pump();
    });
  }
  wanted.set(source, requests);
  pump();
}
