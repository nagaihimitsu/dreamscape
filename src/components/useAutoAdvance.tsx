import { useEffect, useRef, useState } from "react";
import { dialogueObstructed } from "./dialogueObstructed";

/** Optional presentation state. It is never written to the game save. */
export function useAutoAdvance({
  ready,
  canAdvance,
  text,
  onAdvance,
}: {
  ready: boolean;
  canAdvance: boolean;
  text: string;
  onAdvance: () => void;
}) {
  const [active, setActive] = useState(false);
  const [blocked, setBlocked] = useState(dialogueObstructed);
  const advanceRef = useRef(onAdvance);
  const canAdvanceRef = useRef(canAdvance);
  advanceRef.current = onAdvance;
  canAdvanceRef.current = canAdvance;

  useEffect(() => {
    if (!canAdvance) setActive(false);
  }, [canAdvance]);

  useEffect(() => {
    const stopIfObstructed = () => {
      const obstructed = dialogueObstructed();
      setBlocked(obstructed);
      if (obstructed) setActive(false);
    };
    const observer = new MutationObserver(stopIfObstructed);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    document.addEventListener("visibilitychange", stopIfObstructed);
    stopIfObstructed();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", stopIfObstructed);
    };
  }, []);

  useEffect(() => {
    if (!active || !ready || !canAdvance) return;
    // Reading time follows the actual line without delaying unusually long
    // lines indefinitely. A manual tap remains available throughout.
    const delay = Math.min(7000, Math.max(2000, Array.from(text).length * 90));
    const timer = window.setTimeout(() => {
      if (!canAdvanceRef.current || dialogueObstructed()) {
        setActive(false);
        return;
      }
      advanceRef.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [active, ready, canAdvance, text]);

  return {
    active,
    canStart: canAdvance && !blocked,
    toggle: () => {
      if (dialogueObstructed()) return;
      if (canAdvance) setActive((value) => !value);
    },
  };
}

export function AutoAdvanceButton({
  state,
}: {
  state: ReturnType<typeof useAutoAdvance>;
}) {
  return (
    <button
      type="button"
      className="text-button"
      aria-pressed={state.active}
      disabled={!state.canStart}
      onClick={state.toggle}
    >
      {state.active ? "自動送り中" : "自動送り"}
    </button>
  );
}
