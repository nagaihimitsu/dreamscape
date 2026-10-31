import { useEffect, useRef, useState } from "react";
import { dialogueObstructed } from "./dialogueObstructed";
export function DialogueText({
  text,
  speed,
  onReady,
  onAdvance,
}: {
  text: string;
  speed: number;
  onReady: (ready: boolean) => void;
  /** Clicking text reveals it first; a subsequent click advances. */
  onAdvance?: () => void;
}) {
  const timerRef = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLParagraphElement>(null);
  const revealRef = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);
  const chars = Array.from(text);
  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!speed || reduced) {
      setCount(Array.from(text).length);
      onReady(true);
      return;
    }
    setCount(0);
    onReady(false);
    let revealed = 0;
    const timer = window.setInterval(() => {
      // A modal or hidden scene must not keep revealing text behind the
      // player's back. Keep the counter and resume from the same character.
      if (
        dialogueObstructed() ||
        textRef.current?.closest("[inert]")
      ) return;
      revealed += 1;
      setCount(revealed);
      if (revealed >= Array.from(text).length) {
        if (document.activeElement === revealRef.current && textRef.current?.tabIndex === 0)
          textRef.current.focus({ preventScroll: true });
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
      // The reveal control is about to become unavailable. Keep keyboard
      // focus on the same line so a later activation can advance it.
      if (document.activeElement === revealRef.current && onAdvance)
        textRef.current?.focus({ preventScroll: true });
      setCount(chars.length);
      onReady(true);
    } else {
      onAdvance?.();
    }
  }
  useEffect(() => {
    if (ready) onReady(true);
  }, [ready, onReady]);
  return (
    <>
      <p
        ref={textRef}
        className="dialogue-text"
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
      {/* Keep the button's space after revealing: the window is anchored at
          the bottom, so removing a row would move the text the player reads. */}
      <button
        ref={revealRef}
        className="text-button reveal"
        onClick={activate}
        disabled={ready}
        tabIndex={ready ? -1 : undefined}
        aria-hidden={ready || undefined}
        style={{ visibility: ready ? "hidden" : "visible" }}
      >
        全文を表示
      </button>
    </>
  );
}
