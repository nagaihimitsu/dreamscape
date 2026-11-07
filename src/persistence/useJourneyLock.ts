import { useEffect, useState } from "react";
import { SAVE_KEY } from "./index";
import { storagePhysicalKey } from "./journey-storage";
import type { StorageLike } from "./index";

export type JourneyLockStatus = "loading" | "ready" | "busy" | "unsupported";

// A view released by this page (a React remount, a journey switch and back)
// must finish releasing before the same lock is requested again; otherwise
// the page would report its own lock as held by another tab.
const settledRequests = new Map<string, Promise<unknown>>();
// A document being replaced by a reload can release the lock a moment after
// the new page asks. Retry briefly before reporting another tab.
const LOCK_RETRIES = 10;
const LOCK_RETRY_MS = 100;

/** Hold the journey's exclusive Web Lock for the lifetime of its editing view.
 * `enabled` is false for views that never write the slot (Debug, read-only preparation). */
export function useJourneyLock(journeyId: string, storage: StorageLike, attempt: number, enabled: boolean): JourneyLockStatus {
  // A status answers one journey's request of one attempt: after 再試行 the
  // previous answer no longer holds, so the view reports loading until the
  // new request answers.
  const [answer, setAnswer] = useState<{ journeyId: string; attempt: number; status: JourneyLockStatus }>({
    journeyId, attempt, status: enabled ? "loading" : "ready",
  });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    const report = (status: JourneyLockStatus) => setAnswer({ journeyId, attempt, status });
    if (!enabled) {
      report("ready");
      return;
    }
    let cancelled = false;
    let pageActive = true;
    let release: (() => void) | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    report("loading");
    if (typeof navigator === "undefined" || !navigator.locks?.request) {
      report("unsupported");
      return;
    }
    const pagehide = () => {
      pageActive = false;
      release?.();
      release = undefined;
      if (!cancelled) report("loading");
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted && !cancelled) setGeneration((value) => value + 1);
    };
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    const locks = navigator.locks;
    const name = `dreamscape:${storagePhysicalKey(storage, SAVE_KEY)}`;
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
    return () => {
      cancelled = true;
      clearTimeout(retry);
      release?.();
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
    };
  }, [journeyId, storage, generation, attempt, enabled]);
  return !enabled ? "ready" : answer.journeyId === journeyId && answer.attempt === attempt ? answer.status : "loading";
}
