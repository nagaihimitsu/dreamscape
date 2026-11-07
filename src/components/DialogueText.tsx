import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { dialogueObstructed } from "./dialogueObstructed";
import { DIALOGUE_LINE_ATTRIBUTE } from "./scene-tap";

/** What a tap on the line does, for a tap elsewhere on the scene (useSceneTap). */
export interface DialogueTextHandle {
  activate(): void;
}

export function DialogueText({
  text,
  speed,
  onReady,
  onAdvance,
  ref,
}: {
  text: string;
  speed: number;
  onReady: (ready: boolean) => void;
  /** Clicking text reveals it first; a subsequent click advances. */
  onAdvance?: () => void;
  ref?: Ref<DialogueTextHandle>;
}) {
  const timerRef = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLParagraphElement>(null);
  const [count, setCount] = useState(0);
  const progressRef = useRef({ text, count: 0 });
  const chars = Array.from(text);
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (progressRef.current.text !== text) progressRef.current = { text, count: 0 };
    const length = Array.from(text).length;
    if (!speed || reduced) {
      progressRef.current.count = length;
      setCount(length);
      onReady(true);
      return;
    }
    let revealed = progressRef.current.count;
    setCount(revealed);
    if (revealed >= length) { onReady(true); return; }
    onReady(false);
    const timer = window.setInterval(() => {
      // A modal or hidden scene must not keep revealing text behind the
      // player's back. Keep the counter and resume from the same character.
      if (
        dialogueObstructed() ||
        textRef.current?.closest("[inert]")
      ) return;
      revealed += 1;
      progressRef.current.count = revealed;
      setCount(revealed);
      if (revealed >= Array.from(text).length) {
        window.clearInterval(timer);
      }
    }, speed);
    timerRef.current = timer;
    return () => window.clearInterval(timer);
  }, [text, speed, onReady]);
  const ready = count >= chars.length;
  function activate() {
    // A compact settings menu is not a native modal, so its open state must
    // also block taps on the text behind it.
    if (dialogueObstructed() || textRef.current?.closest("[inert]")) return;
    if (!ready) {
      window.clearInterval(timerRef.current);
      setCount(chars.length);
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
        <span aria-hidden="true">
          {chars.slice(0, count).join("")}
          <span className="unrevealed">{chars.slice(count).join("")}</span>
        </span>
        {onAdvance && (
          <span
            className="dialogue-next-mark"
            aria-hidden="true"
            style={{ visibility: ready ? "visible" : "hidden" }}
          >
            {" ▾"}
          </span>
        )}
      </p>
    </>
  );
}
