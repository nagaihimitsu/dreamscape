import { useEffect, useState } from "react";
import { SAVE_KEY } from "./index";
import { storagePhysicalKey } from "./journey-storage";
import type { StorageLike } from "./index";

export type JourneyLockStatus = "loading" | "ready" | "busy" | "unsupported";

/** Hold the journey's exclusive Web Lock for the lifetime of its editing view. */
export function useJourneyLock(journeyId: string, storage: StorageLike, attempt = 0): JourneyLockStatus {
  const [state, setState] = useState<{ journeyId: string; status: JourneyLockStatus }>({
    journeyId, status: journeyId === "milano" ? "ready" : "loading",
  });
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (journeyId === "milano") {
      setState({ journeyId, status: "ready" });
      return;
    }
    let cancelled = false;
    let pageActive = true;
    let release: (() => void) | undefined;
    setState({ journeyId, status: "loading" });
    if (typeof navigator === "undefined" || !navigator.locks?.request) {
      setState({ journeyId, status: "unsupported" });
      return;
    }
    const pagehide = () => {
      pageActive = false;
      release?.();
      release = undefined;
      if (!cancelled) setState({ journeyId, status: "loading" });
    };
    const pageshow = (event: PageTransitionEvent) => {
      if (event.persisted && !cancelled) setGeneration((value) => value + 1);
    };
    window.addEventListener("pagehide", pagehide);
    window.addEventListener("pageshow", pageshow);
    void navigator.locks.request(`dreamscape:${storagePhysicalKey(storage, SAVE_KEY)}`, { ifAvailable: true }, (lock) => {
      if (cancelled || !pageActive) return;
      if (!lock) {
        setState({ journeyId, status: "busy" });
        return;
      }
      return new Promise<void>((resolve) => {
        release = resolve;
        setState({ journeyId, status: "ready" });
      });
    }).catch(() => {
      if (!cancelled) setState({ journeyId, status: "unsupported" });
    });
    return () => {
      cancelled = true;
      release?.();
      window.removeEventListener("pagehide", pagehide);
      window.removeEventListener("pageshow", pageshow);
    };
  }, [journeyId, storage, generation, attempt]);
  return state.journeyId === journeyId ? state.status : "loading";
}
