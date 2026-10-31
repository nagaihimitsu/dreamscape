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
      if (revealed >= Array.from(text).length) window.clearInterval(timer);
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
        {ready && onAdvance && <span className="dialogue-next-mark" aria-hidden="true"> ▾</span>}
      </p>
      {!ready && (
        <button className="text-button reveal" onClick={activate}>
          全文を表示
        </button>
      )}
    </>
  );
}
