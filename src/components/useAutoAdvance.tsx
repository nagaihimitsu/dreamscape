import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { dialogueObstructed } from "./dialogueObstructed";

/** Optional presentation state. It is never written to the game save. */
export function useAutoAdvance({
  ready,
  canAdvance,
  text,
  onAdvance,
  defaultEnabled = false,
}: {
  ready: boolean;
  canAdvance: boolean;
  text: string;
  onAdvance: () => void;
  defaultEnabled?: boolean;
}) {
  const [fast, setFast] = useState(false);
  const [blocked, setBlocked] = useState(dialogueObstructed);
  const advanceRef = useRef(onAdvance);
  const canAdvanceRef = useRef(canAdvance);
  advanceRef.current = onAdvance;
  canAdvanceRef.current = canAdvance;

  useEffect(() => {
    if (!canAdvance) setFast(false);
  }, [canAdvance]);

  useEffect(() => {
    const stopIfObstructed = () => {
      const obstructed = dialogueObstructed();
      setBlocked(obstructed);
      if (obstructed) setFast(false);
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
    if ((!fast && !defaultEnabled) || blocked || !ready || !canAdvance) return;
    // Reading time follows the actual line without delaying unusually long
    // lines indefinitely. A manual tap remains available throughout.
    const delay = fast ? 250 : Math.min(7000, Math.max(2000, Array.from(text).length * 90));
    const timer = window.setTimeout(() => {
      if (!canAdvanceRef.current || dialogueObstructed()) {
        setFast(false);
        return;
      }
      advanceRef.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [fast, defaultEnabled, blocked, ready, canAdvance, text]);

  return {
    active: fast,
    fast,
    canStart: canAdvance && !blocked,
    toggle: () => {
      if (dialogueObstructed()) return;
      if (canAdvance) setFast((value) => !value);
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
      <Icon name="fast" />{state.active ? "高速送り中" : "高速送り"}
    </button>
  );
}
