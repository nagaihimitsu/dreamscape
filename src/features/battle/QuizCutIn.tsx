import { useCallback, useEffect, useRef } from "react";
import { isSecondTap } from "../../components/double-tap";
import { showIgnoredTap } from "../../components/ignored-tap";
import { quizCutInDuration } from "./quiz-cutin";
import "./quiz-cutin.css";

/**
 * 「Quiz」 over the battle as its first question comes from the talk (shouldShowQuizCutIn; 2026-11-18 user decision:
 * short, nothing elaborate). Presentation only: ending it changes no game state. It covers the battle while it shows,
 * so a tap meant for the last line cannot land on an answer; a tap anywhere on it ends it early (not the second tap of
 * the double tap that brought it), and so do Esc and the page going to the background. No skip button: it is short.
 */
export function QuizCutIn({ reduceMotion, onComplete }: { reduceMotion: boolean; onComplete: () => void }) {
  const callback = useRef(onComplete);
  callback.current = onComplete;
  const completed = useRef(false);
  const shownAt = useRef(performance.now());
  const finish = useCallback(() => {
    if (completed.current) return;
    completed.current = true;
    callback.current();
  }, []);

  useEffect(() => {
    const still = reduceMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = window.setTimeout(finish, quizCutInDuration(still));
    const onVisibility = () => { if (document.hidden) finish(); };
    // The battle under it is inert and the talk's focused line has gone, so Esc is read on the document. A layer over
    // the cut-in takes its own Esc: a dialog opened from the header meanwhile (手がかり帳) closes on it, which a cancelled
    // Esc would stop, and the cut-in still ends by itself under it; so does a key another handler has already taken.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      finish();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("keydown", onKey);
    if (document.hidden) finish();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("keydown", onKey);
    };
  }, [finish, reduceMotion]);

  return (
    <div
      className="quiz-cutin"
      data-testid="quiz-cutin"
      data-reduce-motion={reduceMotion || undefined}
      onClick={(event) => {
        if (isSecondTap(performance.now() - shownAt.current)) {
          if (event.detail > 0) showIgnoredTap(event.clientX, event.clientY);
          return;
        }
        finish();
      }}
    >
      <div className="quiz-cutin-band">
        <p className="quiz-cutin-word" role="status" aria-live="polite" lang="en">Quiz</p>
      </div>
    </div>
  );
}
