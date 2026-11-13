import { useEffect } from "react";
import { createPortal } from "react-dom";
import { playSe } from "../../audio/sound-effects";
import { useNightCard } from "./NightRest";
import "./time-passage.css";

/** How long 「次の日」 shows (ms; time-passage.css's timeline matches); reduced motion: still, shorter. */
const PASSAGE_MS = 2800;
const PASSAGE_REDUCED_MS = 900;

/**
 * Decorative only: the game clock and save have already been updated. It ends with its animation (2.8 s; reduced
 * motion 0.9 s), or at once on a tap or Enter, Space or Esc (2026-11-13), as the night cards do (useNightCard: the
 * taps are held a moment as it comes and as it goes).
 */
export function TimePassage({ onEnd, reduceMotion }: { onEnd: () => void; reduceMotion: boolean }) {
  useEffect(() => playSe("time_passage"), []);
  const { end } = useNightCard({ reduceMotion, ms: PASSAGE_MS, reducedMs: PASSAGE_REDUCED_MS, onEnd });
  return createPortal(<div className={`time-passage${reduceMotion ? " is-reduced" : ""}`} data-testid="time-passage" aria-hidden="true"
    onClick={end} onAnimationEnd={(event) => { if (event.target === event.currentTarget) end(); }}>
    <div className="time-passage-sky">
      <span className="time-passage-label">次の日</span>
      <span className="time-passage-sun" />
      <span className="time-passage-moon" />
      <span className="time-passage-horizon" />
    </div>
  </div>, document.body);
}
