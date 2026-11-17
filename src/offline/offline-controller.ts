/**
 * The page's work for 「オフラインで遊ぶ」 (user request and decisions 2026-11-17): one object per page that keeps a
 * journey when the player asks, loads a newer build's files, removes, and tells the screens (offline-status.ts) how
 * things stand. A file of its own, loaded only on a device that keeps something or when the player opens
 * 「オフラインで遊ぶ」.
 *
 * - One thing at a time, under the Web Lock of the one tab that writes the store (download.ts does the work and holds
 *   the rules; this file gives it the browser and the page).
 * - Nothing is loaded unless the player asked: a journey only on 「この端末に入れる」; after that, only a newer build's
 *   changed files or missing ones load by themselves, when small (plan.ts autoRun).
 * - A run that lost its network continues by itself in this page when the network is back; one the player stopped
 *   does not. The fonts a run could not copy are tried again at a page's start and when the network is back.
 * - The saves, settings and English notes are in localStorage: nothing here reads or writes them.
 */
import type { ConnectionHint } from "../media/preload-queue";
import {
  fetchList, keepFonts, keepRun, moveTarget, readStore, removeKept, setPin, underLock, type DownloadEnv, type ListAnswer, type RunOutcome, type StoreRead,
} from "./download";
import { fontStylesheetUrl } from "./fonts";
import { mirrorKeptJourneys } from "./kept-journeys";
import { autoRun, classifyList, downloadConcurrency, storeFacts, type RunKind } from "./plan";
import { OFFLINE_CACHE, OFFLINE_LOCK } from "./state";
import { emitOfflineEvent, getOfflineSnapshot, offlineDownloadsHeld, publishOffline, type OfflineEvent, type OfflineSnapshot, type OfflineStop } from "./offline-status";
import { browserTakeover, takeOver } from "../app/worker-takeover";

/** How long the service worker may take to say it has read the store. */
const WORKER_ANSWER_MS = 3_000;
/** How long this page's own version of the worker may take to be installed before it is asked to take over. */
const WORKER_INSTALL_MS = 8_000;
/** How long the dialog waits for the page's service worker before it says the browser cannot keep a journey. */
const WORKER_READY_MS = 15_000;
/** The screens hear of a run's progress at most this often. */
const PROGRESS_MS = 250;
/** A run that lost its network is tried again this often while the page is open (besides when the browser says the network is back). */
const RESUME_MS = 60_000;
/** A site that seems to have no list any more is asked once more, this much later, before starts stop opening the kept build. */
const GONE_RECHECK_MS = 3_000;

const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const connection = (): ConnectionHint | undefined => (navigator as Navigator & { connection?: ConnectionHint }).connection;

const env: DownloadEnv = {
  caches: window.caches,
  fetch: (url, init) => fetch(url, init),
  digest: async (bytes) => hex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))),
  online: () => navigator.onLine,
  setTimeout: (run, ms) => window.setTimeout(run, ms),
  clearTimeout: (timer) => window.clearTimeout(timer as number),
};

class OfflineController {
  /** index.html's folder: the service worker's scope. */
  private readonly scope = new URL("./", window.location.href).href;
  /** This page's entry script (index.html's module script), as an address. */
  private readonly pageEntry = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src ?? "";
  /** One thing at a time in this tab. */
  private queue: Promise<void> = Promise.resolve();
  /** Stops what is in flight (a run, the fonts). */
  private abort: AbortController | null = null;
  /** What the store held at the last look, and what the site last answered about its list. */
  private store: StoreRead | null = null;
  private latest: ListAnswer | null = null;
  /** A run that lost its network: continued when the network is back (never one the player stopped). */
  private resumable: { add: string | null; by: "player" | "auto" } | null = null;
  private resumeTimer: number | null = null;
  private holding = false;
  private watching = false;
  private fontsLoading = false;
  private dialogOpen = false;
  private wake: WakeLockSentinel | null = null;
  private lastProgress = 0;
  /** How far the run is, not shown yet (the screens hear at most every PROGRESS_MS), and whether it waits for the network. */
  private unshown: NonNullable<OfflineSnapshot["run"]> | null = null;
  private progressTimer: number | null = null;
  private waiting = false;
  private usable: Promise<"ok" | "storage" | "worker"> | null = null;

  constructor() {
    window.addEventListener("online", () => {
      this.continueRun();
      this.retryFonts();
    });
    document.addEventListener("visibilitychange", () => {
      this.syncWakeLock();
      if (document.visibilityState === "visible") this.continueRun();
    });
  }

  /** Look again at what the device keeps and (online) at the site's list, and tell the screens. */
  async refresh(): Promise<void> {
    if (getOfflineSnapshot().support !== "ok") return;
    const can = await this.canKeep();
    // Storage that refuses (a private window) is final. A worker that has not come while the dialog waited on screen is
    // said too; at a page's start it is only waited for the next time.
    if (can === "storage" || (can === "worker" && this.dialogOpen)) publishOffline({ support: "unsupported" });
    if (can === "ok") await this.look(true);
  }

  /**
   * At a page's start on a device that keeps something (online): starts open the kept build again when the site's
   * list is its own; they stop doing so when the site has no list any more; a newer build's files or missing ones
   * load by themselves when small, and so do the fonts an earlier run could not copy. A journey left midway is never
   * continued by itself; when nothing is installed yet and this page runs a newer build than the one it was begun
   * on, that newer build becomes the one to continue with (the worker then no longer answers with the older files).
   */
  async startup(): Promise<void> {
    await this.refresh();
    const state = this.store?.state;
    if (!navigator.onLine || !state || state === "unreadable") return;
    if (this.latest?.kind === "gone") {
      await sleep(GONE_RECHECK_MS);
      if ((await fetchList(env, this.scope)).kind === "gone") await this.enqueue(() => this.locked(() => setPin(env, this.scope, false, this.tell)).then(() => undefined));
      return;
    }
    if (this.latest?.kind !== "list") return;
    const latest = this.latest.list;
    if (!state.installed) {
      if (state.target && state.target.build !== latest.build) {
        await this.enqueue(async () => {
          const moved = await this.locked(() => moveTarget(env, this.scope, latest, this.pageEntry, this.tell)).catch(() => false);
          if (moved === true) await this.look(false);
        });
      }
      return;
    }
    if (!state.pin && classifyList(latest, state, this.pageEntry, this.scope) === "current")
      await this.enqueue(() => this.locked(() => setPin(env, this.scope, true, this.tell)).then(() => undefined));
    const now = getOfflineSnapshot();
    if (now.installed.length && (now.newer || now.pending > 0) && autoRun(now.newer ? "update" : "repair", now.pending, connection()))
      await this.start(null, "auto");
    else this.retryFonts();
  }

  /** Keep a journey, or continue one left midway (the player confirmed). */
  keep(journeyId: string): Promise<void> {
    // Asked inside the player's press: browsers grant it more readily then. Only its answer is used, for a line of the dialog.
    void navigator.storage?.persist?.().then((persisted) => publishOffline({ persisted })).catch(() => undefined);
    return this.start(journeyId, "player");
  }

  /** Load the newer build's files of the kept journeys, or the files that went missing (the player asked). */
  update(): Promise<void> {
    return this.start(null, "player");
  }

  /** Stop the run in flight (the player pressed 止める): what it loaded stays, and it does not continue by itself. */
  stop(): void {
    this.forget();
    if (getOfflineSnapshot().run) this.abort?.abort();
  }

  /** Stop keeping a journey ("all": everything). A run in flight in this tab is stopped first. */
  remove(target: string | "all"): Promise<void> {
    this.forget();
    this.abort?.abort();
    const journeyId = target === "all" ? null : target;
    return this.enqueue(async () => {
      publishOffline({ stop: null, result: null });
      const before = getOfflineSnapshot();
      const removed = await this.locked(() => removeKept(env, this.scope, target, this.tell)).catch(() => false as const);
      if (removed === "other-tab") {
        publishOffline({ stop: { journeyId, reason: "other-tab" } });
        await this.look(false);
        return;
      }
      await this.look(false);
      if (!removed) return;
      const after = getOfflineSnapshot();
      // Everything went, and this page runs another build than the site's (a newer one was on offer, or was loaded for
      // the next start): the page's own later parts are no longer to be had, so it is loaded anew.
      const reload = after.store === "none" && before.reachable && (before.newer || before.switched);
      publishOffline({ result: { journeyId, kind: "removed", bytes: Math.max(0, before.storedBytes - after.storedBytes), ...(reload ? { reload } : {}) } });
    });
  }

  /** Whether 「オフラインで遊ぶ」 is on screen: the screen stays on while it shows a run. */
  setDialogOpen(open: boolean): void {
    this.dialogOpen = open;
    // What a run or a removal achieved was on screen: it is not said again the next time (a problem stays until the next action).
    if (!open && getOfflineSnapshot().result) publishOffline({ result: null });
    this.syncWakeLock();
  }

  private enqueue(work: () => Promise<void>): Promise<void> {
    const next = this.queue.then(work).catch(() => undefined);
    this.queue = next;
    return next;
  }

  private async locked<T>(work: () => Promise<T>): Promise<T | "other-tab"> {
    return underLock<T>(navigator.locks, async () => {
      this.holding = true;
      try {
        return await work();
      } finally {
        this.holding = false;
      }
    });
  }

  private forget(): void {
    this.resumable = null;
    if (this.resumeTimer !== null) window.clearInterval(this.resumeTimer);
    this.resumeTimer = null;
  }

  private continueRun(): void {
    const { resumable } = this;
    if (!resumable || !navigator.onLine || document.visibilityState !== "visible" || getOfflineSnapshot().run) return;
    void this.start(resumable.add, resumable.by, true);
  }

  /**
   * The fonts follow a journey, and a page closed or a network lost right after it leaves them out: they are tried
   * again at a page's start and when the network is back (never with data saving or on a slow link; what was copied
   * before stays, so only the rest is loaded).
   */
  private retryFonts(): void {
    const now = getOfflineSnapshot();
    if (!navigator.onLine || now.run || this.fontsLoading || !now.installed.length || now.fonts === "kept" || !autoRun("repair", 0, connection())) return;
    void this.fonts();
  }

  /** Tell the screens how far the run is: at most every PROGRESS_MS, and always its last figure (a run that then waits shows what it has). */
  private progress(run: NonNullable<OfflineSnapshot["run"]>): void {
    this.unshown = run;
    this.waiting = false;
    const wait = PROGRESS_MS - (performance.now() - this.lastProgress);
    if (run.done >= run.total || wait <= 0) this.showProgress();
    else this.progressTimer ??= window.setTimeout(() => this.showProgress(), wait);
  }

  private showProgress(): void {
    if (this.progressTimer !== null) window.clearTimeout(this.progressTimer);
    this.progressTimer = null;
    const shown = getOfflineSnapshot().run;
    const run = this.unshown ?? shown;
    this.unshown = null;
    if (!run || !shown) return;
    this.lastProgress = performance.now();
    publishOffline({ run: { kind: run.kind, journeyId: run.journeyId, done: run.done, total: run.total, ...(this.waiting ? { waiting: true } : {}) } });
  }

  /** A run: `add` the journey asked for, or null for the kept journeys' newer or missing files. `again`: a run that lost its network, tried again. */
  private start(add: string | null, by: "player" | "auto", again = false): Promise<void> {
    if (getOfflineSnapshot().run) return this.queue;
    // The fonts of an earlier run may still be loading: they give way (the next run takes them up again).
    if (this.fontsLoading) this.abort?.abort();
    const before = getOfflineSnapshot();
    const guess: RunKind = add !== null ? (before.installed.length ? "add" : "first") : before.newer ? "update" : "repair";
    publishOffline({ run: { kind: guess, journeyId: add, done: 0, total: 0 }, stop: null, result: null });
    this.syncWakeLock();
    // From this moment 止める stops it, even before its turn comes.
    const controller = new AbortController();
    this.abort = controller;
    return this.enqueue(async () => {
      let outcome: RunOutcome | "other-tab";
      try {
        outcome = controller.signal.aborted ? { status: "failed", kind: null, reason: "stopped" }
          : !(await this.workerReads()) ? { status: "failed", kind: null, reason: "reload" }
          : await this.locked(() => keepRun(env, { scope: this.scope, pageEntry: this.pageEntry, add, signal: controller.signal }, {
            tell: this.tell,
            estimate: async () => navigator.storage?.estimate?.(),
            held: offlineDownloadsHeld,
            concurrency: () => downloadConcurrency(connection()),
            progress: ({ kind, done, total }) => this.progress({ kind, journeyId: add, done, total }),
            // A file did not arrive and is tried again: said at once, until the next file arrives.
            waiting: () => {
              this.waiting = true;
              this.showProgress();
            },
          }));
      } catch {
        outcome = { status: "failed", kind: null, reason: "storage" };
      }
      if (this.abort === controller) this.abort = null;
      if (this.progressTimer !== null) window.clearTimeout(this.progressTimer);
      this.progressTimer = null;
      this.unshown = null;
      this.waiting = false;
      await this.look(false);
      const change: Partial<OfflineSnapshot> = { run: null };
      if (outcome === "other-tab") {
        if (by === "player") change.stop = { journeyId: add, reason: "other-tab-run" };
      } else if (outcome.status === "done") {
        this.forget();
        change.stop = null;
        change.result = { journeyId: add, kind: "done", run: outcome.kind };
        if (add !== null) emitOfflineEvent({ type: "done", journeyId: add });
      } else if (outcome.status === "failed" && outcome.reason !== "unreadable") {
        const stop: OfflineStop = { journeyId: add, reason: outcome.reason === "replaced" ? "mismatch" : outcome.reason,
          ...(outcome.needed === undefined ? {} : { needed: outcome.needed }), ...(outcome.free === undefined ? {} : { free: outcome.free }) };
        // A run that started by itself fails quietly: what it would load stays on offer.
        if (by === "player") change.stop = stop;
        if (outcome.reason === "offline") {
          this.resumable = { add, by };
          this.resumeTimer ??= window.setInterval(() => this.continueRun(), RESUME_MS);
        } else {
          this.forget();
        }
        // A journey's run that stops says so wherever the player is by now (not when 止める was pressed, and once for a
        // run that is tried again by itself).
        if (add !== null && !again && outcome.reason !== "stopped") {
          const reason: Extract<OfflineEvent, { type: "stopped" }>["reason"] =
            outcome.reason === "offline" ? "offline" : outcome.reason === "quota" || outcome.reason === "no-space" ? "quota" : "problem";
          emitOfflineEvent({ type: "stopped", journeyId: add, reason });
        }
      } else {
        this.forget();
      }
      publishOffline(change);
      this.syncWakeLock();
      // The fonts, after the journey and never in its way.
      if (outcome !== "other-tab" && outcome.status === "done") void this.fonts();
    });
  }

  /** Copy the page's web fonts, best effort (download.ts keepFonts). */
  private fonts(): Promise<void> {
    return this.enqueue(async () => {
      const url = fontStylesheetUrl(document);
      const state = this.store?.state;
      if (!url || !state || state === "unreadable" || !state.installed || getOfflineSnapshot().run) return;
      const controller = new AbortController();
      this.abort = controller;
      this.fontsLoading = true;
      if (state.fonts !== url) publishOffline({ fonts: "loading" });
      await this.locked(() => keepFonts(env, this.scope, url, controller.signal, this.tell)).catch(() => false);
      this.fontsLoading = false;
      if (this.abort === controller) this.abort = null;
      await this.look(false);
    });
  }

  /** Read the store (and, with `network`, the site's list) and tell the screens what they need of it. */
  private async look(network: boolean): Promise<void> {
    try {
      const store = await readStore(env, this.scope);
      this.store = store;
      if (network) this.latest = navigator.onLine ? await fetchList(env, this.scope) : { kind: "offline" };
      const latest = this.latest?.kind === "list" ? this.latest.list : null;
      const otherTab = await this.otherTabWorks();
      const persisted = await navigator.storage?.persisted?.().catch(() => null) ?? null;
      // What the title must know before it can read the store (kept-journeys.ts): the journeys complete here, or none.
      mirrorKeptJourneys(store.state && store.state !== "unreadable" && store.state.installed ? store.state.installed.journeys : []);
      if (store.state === "unreadable") {
        publishOffline({
          store: "unreadable", installed: [], partial: [], sizes: null, reachable: !!latest, newer: false, pending: 0, switched: false, storedBytes: 0,
          storedBy: { shared: 0, journeys: {} }, otherTab, persisted, fonts: "none",
        });
        return;
      }
      const facts = storeFacts({ state: store.state, lists: store.lists, latest, storedKeys: store.keys, scope: this.scope, pageEntry: this.pageEntry });
      const url = fontStylesheetUrl(document);
      publishOffline({
        store: store.state ? "kept" : "none", ...facts, reachable: !!latest, otherTab, persisted,
        fonts: store.state?.fonts && store.state.fonts === url ? "kept" : this.fontsLoading ? "loading" : "none",
      });
    } catch {
      // The browser refused its storage this time: the screens keep what they knew.
    }
  }

  /** Whether another tab holds the store's lock; then this tab looks again once it is free. */
  private async otherTabWorks(): Promise<boolean> {
    if (this.holding) return false;
    const held = await navigator.locks.query?.().then((locks) => !!locks.held?.some((lock) => lock.name === OFFLINE_LOCK)).catch(() => false) ?? false;
    if (held && !this.watching) {
      this.watching = true;
      // Granted once the other tab is done (and given back at once): what it changed shows here.
      void navigator.locks.request(OFFLINE_LOCK, async () => undefined).catch(() => undefined).then(() => {
        this.watching = false;
        void this.look(true);
      });
    }
    return held;
  }

  /**
   * Whether this browser can keep a journey here: its storage answers ("storage": it refuses, as a private window
   * may), and the page has a service worker ("worker": none came; it is registered once the page has loaded, so it
   * is waited for).
   */
  private canKeep(): Promise<"ok" | "storage" | "worker"> {
    this.usable ??= (async () => {
      try {
        await window.caches.has(OFFLINE_CACHE);
      } catch {
        return "storage" as const;
      }
      return Promise.race([navigator.serviceWorker.ready.then(() => "ok" as const, () => "worker" as const), sleep(WORKER_READY_MS).then(() => "worker" as const)]);
    })().then((can) => {
      // A worker that was only slow is asked for again the next time.
      if (can === "worker") this.usable = null;
      return can;
    });
    return this.usable;
  }

  /** Ask one worker to read the store anew; whether it answered (a worker of before 「オフラインで遊ぶ」 never does). */
  private ask(worker: ServiceWorker): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => resolve(false), WORKER_ANSWER_MS);
      channel.port1.onmessage = (event: MessageEvent<{ type?: unknown } | null>) => {
        if (event.data?.type !== "offline-read") return;
        window.clearTimeout(timer);
        resolve(true);
      };
      worker.postMessage({ type: "offline-changed" }, [channel.port2]);
    });
  }

  /**
   * Tell the worker that serves this page that the store changed, and every other worker of the site: the active one,
   * and a newer one that waits or is being installed (it read the store when it started, and takes over later with
   * what it knows). Whether the first read it.
   */
  private readonly tellWorker = async (): Promise<boolean> => {
    try {
      const workers = navigator.serviceWorker;
      const registration = await workers.getRegistration();
      const targets = [...new Set([workers.controller, registration?.active, registration?.waiting, registration?.installing]
        .filter((worker): worker is ServiceWorker => !!worker))];
      if (!targets.length) return false;
      return (await Promise.all(targets.map((worker) => this.ask(worker))))[0];
    } catch {
      return false;
    }
  };
  private readonly tell = (): Promise<void> => this.tellWorker().then(() => undefined);

  /**
   * Whether the worker that serves this page reads the store: needed before anything is loaded (it must leave the
   * page's requests for the files alone, and answer from the store afterwards). On the first visit after
   * 「オフラインで遊ぶ」 arrived, an older worker still serves the page while this page's own version waits: that one is
   * asked to take over now (the same version as the page, so nothing changes under the game).
   */
  private async workerReads(): Promise<boolean> {
    if (await this.tellWorker()) return true;
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const next = registration?.waiting ?? registration?.installing;
      if (!next) return false;
      if (next.state === "installing") await new Promise<void>((resolve) => {
        next.addEventListener("statechange", () => { if (next.state !== "installing") resolve(); });
        window.setTimeout(resolve, WORKER_INSTALL_MS);
      });
      // Seen through as at a page's start (src/app/worker-takeover.ts).
      await takeOver(browserTakeover(next, this.pageEntry));
      return await this.tellWorker();
    } catch {
      return false;
    }
  }

  /** The screen stays on while 「オフラインで遊ぶ」 shows a run (a phone that sleeps stops loading). */
  private syncWakeLock(): void {
    const wanted = () => this.dialogOpen && !!getOfflineSnapshot().run && document.visibilityState === "visible";
    if (!wanted()) {
      void this.wake?.release().catch(() => undefined);
      this.wake = null;
      return;
    }
    if (this.wake || !navigator.wakeLock) return;
    void navigator.wakeLock.request("screen").then((lock) => {
      if (!wanted() || this.wake) return void lock.release().catch(() => undefined);
      this.wake = lock;
      lock.addEventListener("release", () => { if (this.wake === lock) this.wake = null; });
    }).catch(() => undefined);
  }
}

export const offlineController = new OfflineController();
