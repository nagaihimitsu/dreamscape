import { useEffect, useState } from "react";
import { holdJourneyLock, journeyLockName, type JourneyLockStatus } from "./journey-lock";
import type { StorageLike } from "./index";

export type { JourneyLockStatus } from "./journey-lock";

/** Hold the journey's exclusive Web Lock for the lifetime of its editing view (journey-lock.ts).
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
    report("loading");
    const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
    const hold = holdJourneyLock(locks, journeyLockName(storage), report);
    if (!hold) return;
    const pagehide = () => hold.pageHidden();
    // A page restored from the back-forward cache asks again.
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted) setGeneration((value) => value + 1);
    };
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    return () => {
      hold.cancel();
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
    };
  }, [journeyId, storage, generation, attempt, enabled]);
  return !enabled ? "ready" : answer.journeyId === journeyId && answer.attempt === attempt ? answer.status : "loading";
}
