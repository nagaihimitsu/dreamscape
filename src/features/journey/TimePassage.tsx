import { createPortal } from "react-dom";
import "./time-passage.css";

/** Decorative only: the game clock and save have already been updated. */
export function TimePassage({ onEnd, reduceMotion }: { onEnd: () => void; reduceMotion: boolean }) {
  return createPortal(<div className={`time-passage${reduceMotion ? " is-reduced" : ""}`} data-testid="time-passage" aria-hidden="true"
    onAnimationEnd={(event) => { if (event.target === event.currentTarget) onEnd(); }}>
    <div className="time-passage-sky">
      <span className="time-passage-label">次の日</span>
      <span className="time-passage-sun" />
      <span className="time-passage-moon" />
      <span className="time-passage-horizon" />
    </div>
  </div>, document.body);
}
