import type { Journey } from "../content/journeys";
import { SAVE_KEY, type StorageLike } from "./index";
import { storagePhysicalKey } from "./journey-storage";

/** The other-tab protection of a journey's save slot (docs/07: 別タブ競合の保護). */
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
  return `dreamscape:${storagePhysicalKey(storage, SAVE_KEY)}`;
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
  const acquire = (retriesLeft: number): Promise<unknown> =>
    locks.request(name, { ifAvailable: true }, (lock) => {
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
    }).catch(() => {
      if (!cancelled) report("unsupported");
    });
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
