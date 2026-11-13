import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { readingHeld } from "./dialogueObstructed";
import { stopsFastForward, type ReadSkip } from "./read-skip";
import type { LineVoiceState, VoiceLink } from "./useVoice";
import { setSceneFastForward } from "../audio/sound-effects";

/** How long auto mode waits after a line's voice has ended before it reads on (milliseconds). */
const AFTER_VOICE_MS = 700;

/** Optional presentation state. It is never written to the game save. */
export function useAutoAdvance({
  ready,
  canAdvance,
  text,
  onAdvance,
  defaultEnabled = false,
  readSkip,
  lineId = null,
}: {
  ready: boolean;
  canAdvance: boolean;
  text: string;
  onAdvance: () => void;
  defaultEnabled?: boolean;
  /** This device's read lines (read-skip.ts, GameApp); without it fast-forward never stops at a line. */
  readSkip?: ReadSkip;
  /** The line on screen (readLineId of its story and text), null when it has none (no text, a quiz). */
  lineId?: string | null;
}) {
  const [fast, setFast] = useState(false);
  const [blocked, setBlocked] = useState(readingHeld);
  // The voice of the line on screen (`# voice:`), as its DialogueText reports it (null: none, or it stopped early).
  const [voice, setVoice] = useState<LineVoiceState | null>(null);
  // Read-skip: arriving at a line not read before stops fast-forward (unless the reader skips unread lines too). Decided
  // while rendering the new line (React's adjustment of state during render), so it is drawn at the reader's speed.
  const [shownLine, setShownLine] = useState(lineId);
  const [stoppedAt, setStoppedAt] = useState<string | null>(null);
  if (shownLine !== lineId) {
    setShownLine(lineId);
    const stop = stopsFastForward({ fast, readBefore: lineId && readSkip ? readSkip.isRead(lineId) : null, skipUnread: readSkip?.skipUnread ?? false });
    if (stop) setFast(false);
    setStoppedAt(stop ? lineId : null);
  }
  // A line shown in full has been read.
  useEffect(() => {
    if (ready && lineId) readSkip?.markRead(lineId);
  }, [ready, lineId, readSkip]);
  const advanceRef = useRef(onAdvance);
  const canAdvanceRef = useRef(canAdvance);
  advanceRef.current = onAdvance;
  canAdvanceRef.current = canAdvance;

  useEffect(() => {
    if (!canAdvance) setFast(false);
  }, [canAdvance]);
  // The scene's cues outside its line (a word learned) stay silent while 高速送り runs (sound-effects.ts playCue).
  useEffect(() => {
    setSceneFastForward(fast);
    return () => setSceneFastForward(false);
  }, [fast]);

  useEffect(() => {
    const stopIfObstructed = () => {
      const obstructed = readingHeld();
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
    // Auto mode lets the line's voice finish (高速送り plays none); a voice that fails or stops early leaves the reading time.
    if (!fast && voice === "busy") return;
    // Reading time follows the actual line without delaying unusually long
    // lines indefinitely. A manual tap remains available throughout.
    const delay = fast ? 250 : voice === "ended" ? AFTER_VOICE_MS : Math.min(7000, Math.max(2000, Array.from(text).length * 90));
    const timer = window.setTimeout(() => {
      if (!canAdvanceRef.current || readingHeld()) {
        setFast(false);
        return;
      }
      advanceRef.current();
    }, delay);
    return () => window.clearTimeout(timer);
  }, [fast, defaultEnabled, blocked, ready, canAdvance, text, voice]);
  const voiceLink: VoiceLink = { muted: fast, onState: setVoice };

  return {
    active: fast,
    fast,
    /** Fast-forward has just stopped at this line, which was not read before (said to screen readers). */
    stoppedAtUnread: stoppedAt !== null && stoppedAt === lineId,
    canStart: canAdvance && !blocked,
    /** For the line's DialogueText (useLineVoice, useLineSounds): no voice and no sound while 高速送り, and the voice's state for auto mode. */
    voice: voiceLink,
    toggle: () => {
      if (readingHeld()) return;
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
    <>
      <button
        type="button"
        className="text-button"
        aria-pressed={state.active}
        disabled={!state.canStart}
        onClick={state.toggle}
      >
        <Icon name="fast" />{state.active ? "高速送り中" : "高速送り"}
      </button>
      {/* Seen as the button's release; heard from here (read-skip). Out of the row's flow (sr-only). */}
      <span className="sr-only" role="status">{state.stoppedAtUnread ? "まだ読んでいない台詞で、高速送りを止めました。" : ""}</span>
    </>
  );
}
