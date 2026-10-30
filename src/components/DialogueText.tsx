import { useEffect, useRef, useState } from "react";
export function DialogueText({
  text,
  speed,
  onReady,
}: {
  text: string;
  speed: number;
  onReady: (ready: boolean) => void;
}) {
  const timerRef = useRef<number | undefined>(undefined);
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
      revealed += 1;
      setCount(revealed);
      if (revealed >= Array.from(text).length) window.clearInterval(timer);
    }, speed);
    timerRef.current = timer;
    return () => window.clearInterval(timer);
  }, [text, speed, onReady]);
  const ready = count >= chars.length;
  useEffect(() => {
    if (ready) onReady(true);
  }, [ready, onReady]);
  return (
    <>
      <p className="dialogue-text">
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {chars.slice(0, count).join("")}
          <span className="unrevealed">{chars.slice(count).join("")}</span>
        </span>
      </p>
      {!ready && (
        <button
          className="text-button reveal"
          onClick={() => {
            window.clearInterval(timerRef.current);
            setCount(chars.length);
            onReady(true);
          }}
        >
          全文を表示
        </button>
      )}
    </>
  );
}
