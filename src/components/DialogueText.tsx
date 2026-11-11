import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { LineDelivery } from "../content/tags";
import { dialogueObstructed } from "./dialogueObstructed";
import { DIALOGUE_LINE_ATTRIBUTE } from "./scene-tap";

/** What a tap on the line does, for a tap elsewhere on the scene (useSceneTap). */
export interface DialogueTextHandle {
  activate(): void;
}

/** Marks a scene's dialogue window: a line's `# shake: window` shakes it (else the line itself). */
export const DIALOGUE_WINDOW_ATTRIBUTE = "data-dialogue-window";

/**
 * The one shake of a line's `# shake: window`: sideways only, short, on `translate` (it adds to
 * any transform the window has and never moves the layout). None under reduced motion.
 */
function shakeWindow(line: HTMLElement) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || line.closest(".reduce-motion")) return;
  const target = line.closest<HTMLElement>(`[${DIALOGUE_WINDOW_ATTRIBUTE}]`) ?? line;
  target.animate?.(
    [{ translate: "0 0" }, { translate: "-6px 0" }, { translate: "5px 0" }, { translate: "-3px 0" }, { translate: "2px 0" }, { translate: "0 0" }],
    { duration: 320, easing: "ease-out" },
  );
}

export function DialogueText({
  text,
  speed,
  onReady,
  onAdvance,
  delivery,
  ref,
}: {
  text: string;
  speed: number;
  onReady: (ready: boolean) => void;
  /** Clicking text reveals it first; a subsequent click advances. */
  onAdvance?: () => void;
  /** The line's `# pause:`, `# shake:` and `# size:` (the frame's delivery). */
  delivery?: LineDelivery;
  ref?: Ref<DialogueTextHandle>;
}) {
  const timerRef = useRef<number | undefined>(undefined);
  const pauseRef = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [count, setCount] = useState(0);
  // `paused`: the line's pause is over (or was cut short); `shaken`: its shake has played.
  const progressRef = useRef({ text, count: 0, paused: false, shaken: false });
  const chars = Array.from(text);
  const pauseMs = delivery?.pauseMs ?? 0;
  const shake = !!delivery?.shake;
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (progressRef.current.text !== text) progressRef.current = { text, count: 0, paused: false, shaken: false };
    const progress = progressRef.current;
    const length = Array.from(text).length;
    const showAll = () => {
      progress.count = length;
      setCount(length);
      onReady(true);
    };
    // 一括表示 and 高速送り show the line at once, without its pause.
    if (!speed) {
      showAll();
      return;
    }
    let timer: number | undefined;
    const write = () => {
      if (reduced) {
        showAll();
        return;
      }
      let revealed = progress.count;
      setCount(revealed);
      if (revealed >= length) { onReady(true); return; }
      onReady(false);
      timer = window.setInterval(() => {
        // A modal or hidden scene must not keep revealing text behind the
        // player's back. Keep the counter and resume from the same character.
        if (
          dialogueObstructed() ||
          textRef.current?.closest("[inert]")
        ) return;
        revealed += 1;
        progress.count = revealed;
        setCount(revealed);
        if (revealed >= length) {
          window.clearInterval(timer);
        }
      }, speed);
      timerRef.current = timer;
    };
    // The line's pause (# pause:) comes before its first character, also where the
    // text then shows at once (reduced motion); a tap ends it (activate).
    let pause: number | undefined;
    if (pauseMs && !progress.paused && progress.count === 0 && length > 0) {
      setCount(0);
      onReady(false);
      pause = window.setTimeout(() => {
        progress.paused = true;
        write();
      }, pauseMs);
      pauseRef.current = pause;
    } else write();
    return () => {
      window.clearTimeout(pause);
      window.clearInterval(timer);
    };
  }, [text, speed, onReady, pauseMs]);
  const ready = count >= chars.length;
  // The line's shake (# shake: window) plays once, as its text starts to show.
  useEffect(() => {
    const progress = progressRef.current;
    if (!shake || progress.shaken || count === 0 || !textRef.current) return;
    progress.shaken = true;
    shakeWindow(textRef.current);
  }, [shake, count]);
  function activate() {
    // A compact settings menu is not a native modal, so its open state must
    // also block taps on the text behind it.
    if (dialogueObstructed() || textRef.current?.closest("[inert]")) return;
    if (!ready) {
      window.clearTimeout(pauseRef.current);
      window.clearInterval(timerRef.current);
      setCount(chars.length);
      progressRef.current.paused = true;
      progressRef.current.count = chars.length;
      onReady(true);
    } else {
      onAdvance?.();
    }
  }
  useImperativeHandle(ref, () => ({ activate }));
  useEffect(() => {
    if (ready) onReady(true);
  }, [ready, onReady]);
  return (
    <>
      <p
        ref={textRef}
        className="dialogue-text"
        data-testid="dialogue-text"
        {...{ [DIALOGUE_LINE_ATTRIBUTE]: "" }}
        data-ready={ready}
        role={onAdvance ? "button" : undefined}
        tabIndex={onAdvance ? 0 : undefined}
        onClick={onAdvance ? activate : undefined}
        onKeyDown={
          onAdvance
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  activate();
                }
              }
            : undefined
        }
      >
        <span className="sr-only">{text}</span>
        <span aria-hidden="true" className={delivery?.large ? "dialogue-large" : undefined}>
          {chars.slice(0, count).join("")}
          <span className="unrevealed">{chars.slice(count).join("")}</span>
        </span>
        {onAdvance && (
          <span
            className="dialogue-next-mark"
            aria-hidden="true"
            style={{ visibility: ready ? "inherit" : "hidden" }}
          >
            ▼
          </span>
        )}
      </p>
    </>
  );
}
