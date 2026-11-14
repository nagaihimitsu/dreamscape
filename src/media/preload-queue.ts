// Loading in the background (2026-11-13 user request 「ロードを速くする工夫を入れたい」): the pictures and sounds a scene is
// about to show are fetched before they are needed, so a line's picture and voice are there when it appears. This file
// holds the rules as pure functions and a small queue that runs any loader it is given (src/media/preload.ts gives the
// browser's): which priorities a connection allows, the order of the requests, how many load at once. Presentation only:
// nothing here changes the game or its save, and a load that fails is left to the screen, which loads its own as before.

/** How soon a file is needed: the next line's ("next"), a little later ("soon"), whenever the network is free ("idle"). */
export const PRELOAD_PRIORITIES = ["next", "soon", "idle"] as const;
export type PreloadPriority = (typeof PRELOAD_PRIORITIES)[number];

/**
 * What a request loads: a picture (its served path, `assets/…`), a line's voice (its ID: src/content/voice-files.ts) or a
 * sound effect (its ID: src/content/sounds.ts).
 */
export type PreloadKind = "image" | "voice" | "sound";
export type PreloadRequest = { kind: PreloadKind; key: string; priority: PreloadPriority };

/** What the browser says of its connection (`navigator.connection`; Safari and Firefox have none). */
export type ConnectionHint = { saveData?: boolean; effectiveType?: string };

/**
 * The priorities this connection loads ahead: only "next" while the reader saves data (データセーバー) or the network is as
 * slow as 2G, no "idle" on 3G, all of them otherwise (and where the browser does not say).
 */
export function allowedPriorities(connection: ConnectionHint | undefined): readonly PreloadPriority[] {
  if (connection?.saveData || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return ["next"];
  if (connection?.effectiveType === "3g") return ["next", "soon"];
  return PRELOAD_PRIORITIES;
}

/**
 * The priorities that may start while the screen's own pictures are still loading (`screenLoading`): only the next line's
 * (what the next tap shows), so the background loading never slows what is already on screen; all of `allowed` otherwise.
 */
export function screenFirst(allowed: readonly PreloadPriority[], screenLoading: boolean): readonly PreloadPriority[] {
  return screenLoading ? allowed.filter((priority) => priority === "next") : allowed;
}

/** A request's identity: the same file asked twice is loaded once. */
export const requestId = (request: Pick<PreloadRequest, "kind" | "key">): string => `${request.kind}:${request.key}`;

const rank = (priority: PreloadPriority) => PRELOAD_PRIORITIES.indexOf(priority);

/**
 * The requests in the order they load: by priority ("next" first), then in the order asked; each file once, at the highest
 * priority it was asked with; those of a priority not `allowed`, and those `done` already, left out.
 */
export function preloadOrder(requests: readonly PreloadRequest[], allowed: readonly PreloadPriority[],
  done: (id: string) => boolean): PreloadRequest[] {
  const best = new Map<string, PreloadRequest>();
  for (const request of requests) {
    const id = requestId(request);
    const known = best.get(id);
    if (known && rank(request.priority) >= rank(known.priority)) continue;
    // Its place is that of the ask that gave it its priority.
    best.delete(id);
    best.set(id, request);
  }
  return [...best.values()]
    .filter((request) => allowed.includes(request.priority) && !done(requestId(request)))
    .sort((a, b) => rank(a.priority) - rank(b.priority));
}

/** A set that keeps the `size` most recently added keys (the oldest go first). */
export function recentSet(size: number) {
  const keys = new Set<string>();
  return {
    has: (key: string) => keys.has(key),
    add(key: string) {
      keys.delete(key);
      keys.add(key);
      for (const oldest of keys) {
        if (keys.size <= size) break;
        keys.delete(oldest);
      }
    },
    clear: () => keys.clear(),
  };
}

/** The background loading of a page: what it is asked for replaces what it was asked for before. */
export type PreloadQueue = {
  /**
   * The files wanted now (each screen change asks again): those not started yet load in preloadOrder, those no longer
   * wanted are dropped before they start (a load under way finishes).
   */
  want(requests: readonly PreloadRequest[]): void;
  /** Drops every request not started yet (the page hidden: nothing loads for a page nobody sees). */
  clear(): void;
  /** Whether the file of `request` has been loaded (or tried: a failed one is not tried again). */
  done(request: Pick<PreloadRequest, "kind" | "key">): boolean;
};

export type PreloadQueueOptions = {
  /** Loads one file; settles when it has loaded or failed. */
  load: (request: PreloadRequest) => Promise<unknown>;
  /** The priorities allowed now (allowedPriorities of the connection), read as each request is asked. */
  allowed: () => readonly PreloadPriority[];
  /** How many files load at once; a "next" file may take one more, so it never waits behind two quiet ones. */
  concurrency: number;
  /** How many loaded files are remembered (not asked again). */
  remember: number;
};

/** A queue of background loads that runs `load` for each wanted file, a few at a time (PreloadQueueOptions). */
export function createPreloadQueue({ load, allowed, concurrency, remember }: PreloadQueueOptions): PreloadQueue {
  const finished = recentSet(remember);
  const running = new Set<string>();
  let waiting: PreloadRequest[] = [];

  function pump() {
    while (waiting.length) {
      const next = waiting[0];
      const room = next.priority === "next" ? concurrency + 1 : concurrency;
      if (running.size >= room) return;
      waiting.shift();
      const id = requestId(next);
      running.add(id);
      let settled: Promise<unknown>;
      try {
        settled = load(next);
      } catch (error) {
        settled = Promise.reject(error);
      }
      settled.catch(() => undefined).then(() => {
        running.delete(id);
        finished.add(id);
        pump();
      });
    }
  }

  return {
    want(requests) {
      waiting = preloadOrder(requests, allowed(), (id) => finished.has(id) || running.has(id));
      pump();
    },
    clear() {
      waiting = [];
    },
    done: (request) => finished.has(requestId(request)),
  };
}
