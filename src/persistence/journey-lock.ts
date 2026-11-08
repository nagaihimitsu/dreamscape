import type { Journey } from "../content/journeys";
import { SAVE_KEY, type StorageLike } from "./index";
import { storagePhysicalKey } from "./journey-storage";

/** The other-tab protection of a journey's save slot (AGENTS.md 「別タブ競合の保護」, docs/07 acceptance 10). */
export type JourneyLockStatus = "loading" | "ready" | "busy" | "unsupported";

/** The part of the Web Locks API (`navigator.locks`) the journey lock uses. */
export interface LockManagerLike {
  request(name: string, options: { ifAvailable: true }, callback: (lock: Lock | null) => unknown): Promise<unknown>;
}

/** Handle of one view's lock request. */
export type JourneyLockHold = {
  /** The page is being hidden (reload, navigation, back-forward cache): give the lock up now. */
  pageHidden(): void;
  /** The view is gone (unmount, journey switch, 再試行): stop asking and release the lock. */
  cancel(): void;
};

// A document being replaced by a reload can release the lock a moment after
// the new page asks. Retry briefly before reporting another tab.
export const LOCK_RETRIES = 10;
export const LOCK_RETRY_MS = 100;

// A view released by this page (a React remount, a journey switch and back)
// must finish releasing before the same lock is requested again; otherwise
// the page would report its own lock as held by another tab.
const settledRequests = new Map<string, Promise<unknown>>();

/** One lock per journey slot, shared by every tab of the browser. */
export function journeyLockName(storage: StorageLike): string {
  return slotLockName(storagePhysicalKey(storage, SAVE_KEY));
}

/** The lock of the slot whose game save is stored under the browser key `physicalSaveKey`. */
export function slotLockName(physicalSaveKey: string): string {
  return `dreamscape:${physicalSaveKey}`;
}

/** Views that edit the journey's slot hold its lock. Debug storage is isolated and a
 * read-only preparation page has no save to edit, so neither needs it. */
export function needsJourneyLock(journey: Pick<Journey, "status" | "initialState"> | undefined, debug: boolean): boolean {
  return !debug && !(journey?.status === "preparing" && !journey.initialState);
}

/**
 * Ask for the journey's exclusive lock and hold it until the view is cancelled or the page is
 * hidden. `report` receives "ready" once held, "busy" while another tab keeps it after the
 * retries, and "unsupported" when the browser cannot provide the lock (no Web Locks, or the
 * request is refused): the journey then stays closed. Returns null when there is nothing to hold.
 */
export function holdJourneyLock(
  locks: LockManagerLike | undefined,
  name: string,
  report: (status: JourneyLockStatus) => void,
): JourneyLockHold | null {
  if (!locks?.request) {
    report("unsupported");
    return null;
  }
  let cancelled = false;
  let pageActive = true;
  let release: (() => void) | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const acquire = (retriesLeft: number): Promise<unknown> => {
    let request: Promise<unknown>;
    try {
      request = locks.request(name, { ifAvailable: true }, (lock) => {
        if (cancelled || !pageActive) return;
        if (!lock) {
          if (retriesLeft > 0) retry = setTimeout(() => track(acquire(retriesLeft - 1)), LOCK_RETRY_MS);
          else report("busy");
          return;
        }
        return new Promise<void>((resolve) => {
          release = resolve;
          report("ready");
        });
      });
    } catch (error) {
      // A request that throws instead of returning a rejected promise is refused the same way
      // (and the page's chain of requests stays settled for the next view).
      request = Promise.reject(error);
    }
    return request.catch(() => {
      if (!cancelled) report("unsupported");
    });
  };
  // The request promise settles only after its lock has been released.
  const track = (request: Promise<unknown>) => { settledRequests.set(name, request); };
  const previous = settledRequests.get(name) ?? Promise.resolve();
  track(previous.then(() => cancelled ? undefined : acquire(LOCK_RETRIES)));
  return {
    pageHidden() {
      pageActive = false;
      release?.();
      release = undefined;
      if (!cancelled) report("loading");
    },
    cancel() {
      cancelled = true;
      clearTimeout(retry);
      release?.();
    },
  };
}

export type LockedRun<T> = { status: "done"; value: T } | { status: "busy"; name: string } | { status: "unsupported" };

/**
 * Run `action` once while this page holds every named slot lock, each asked without waiting
 * (`ifAvailable`): a lock another tab holds (that journey is open there) refuses the run before
 * anything is done, reported as "busy" with the first such name. The locks are let go of as soon as
 * `action` returns. "unsupported" without Web Locks or when a request is refused. Do not pass a lock
 * this page already holds (it would answer busy); with no names the action runs at once.
 */
export async function runWithSlotLocks<T>(
  locks: LockManagerLike | undefined,
  names: readonly string[],
  action: () => T,
): Promise<LockedRun<T>> {
  if (!locks?.request) return { status: "unsupported" };
  const ordered = [...new Set(names)].sort();
  let failure: { error: unknown } | undefined;
  const step = async (index: number): Promise<LockedRun<T>> => {
    if (index === ordered.length) {
      try { return { status: "done", value: action() }; }
      catch (error) { failure = { error }; throw error; }
    }
    let outcome: LockedRun<T> = { status: "busy", name: ordered[index] };
    await locks.request(ordered[index], { ifAvailable: true }, async (lock) => {
      if (lock) outcome = await step(index + 1);
    });
    return outcome;
  };
  try {
    return await step(0);
  } catch (error) {
    // The action's own error is not a refusal of the locks.
    if (failure) throw failure.error;
    return { status: "unsupported" };
  }
}

/** What the editing view shows in place of the journey while it does not hold the lock. */
export type JourneyLockNotice = { role: "status" | "alert"; message: string; retry: boolean };

/** null once the lock is held (the journey opens). Without Web Locks the journey stays closed and
 * 再試行 is not offered: nothing would change until the player uses another browser. */
export function journeyLockNotice(status: JourneyLockStatus): JourneyLockNotice | null {
  switch (status) {
    case "ready":
      return null;
    case "loading":
      return { role: "status", message: "保存データを確認しています。", retry: false };
    case "busy":
      return { role: "alert", message: "この旅行編は別のタブで開いています。そちらを閉じてから再試行してください。", retry: true };
    case "unsupported":
      return { role: "alert", retry: false,
        message: "このブラウザでは別タブとの保存競合を防げないため、この旅行編を開けません。対応ブラウザをご利用ください。" };
  }
}
