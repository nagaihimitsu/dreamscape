import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MiniGameRating } from "../contract";
import { countedScore, resultButtons } from "./flow";
import { MINI_GAME_RESULT_GUARD_MS, MINI_GAME_SCORE_COUNT_MS, MINI_GAME_STAR_STEP_MS } from "./timing";

// The result card (docs/13 2.6; group3 6.3-5): low over the play's dead controls (or high: `resultAnchor`), so the
// field's key picture stays in view. ★ one by one (a rated play only), the outcome's label, the score counted up from 0,
// the heroine's face and line, and its buttons. Every press in its first moment is dropped (a finger still tapping the
// play does not skip it); its buttons did not exist when that finger went down, so no press of it reaches them.

export interface ResultCardProps {
  label: string;
  rating: MiniGameRating | null;
  /** The score line (the rating's, else the play's detail), counted up; `detail` under it when both are given. */
  score?: string;
  detail?: string;
  /** The heroine's face (CharacterFace) and her line. */
  face?: ReactNode;
  line?: string;
  practice: boolean;
  retry: boolean;
  anchor: "top" | "bottom";
  still: boolean;
  /** When the card came (performance.now): the guard counts from it. */
  shownAt: number;
  onNext(): void;
  onRetry(): void;
  onToReal(): void;
}

/** Whether the card's guard has passed (a press now is the player's own). */
export const resultCardReady = (shownAt: number, now = performance.now()): boolean => now - shownAt >= MINI_GAME_RESULT_GUARD_MS;

export function ResultCard({ label, rating, score, detail, face, line, practice, retry, anchor, still, shownAt, onNext, onRetry, onToReal }: ResultCardProps) {
  const buttons = resultButtons({ practice, retry });
  const [counted, setCounted] = useState(() => (score && !still ? countedScore(score, 0) : score));
  const primary = useRef<HTMLButtonElement>(null);
  // The score counts up from 0 (at once with less motion).
  useEffect(() => {
    if (!score || still) return;
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - shownAt) / MINI_GAME_SCORE_COUNT_MS);
      setCounted(countedScore(score, t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [score, still, shownAt]);
  useEffect(() => {
    primary.current?.focus({ preventScroll: true });
  }, []);
  const guarded = (action: () => void) => () => {
    if (resultCardReady(shownAt)) action();
  };
  const stars = rating ? [1, 2, 3].map((index) => (
    <span key={index} className="minigame-star" data-on={index <= rating.stars || undefined} data-big={rating.stars === 3 && index === 3 || undefined}
      style={still ? undefined : { animationDelay: `${(index - 1) * MINI_GAME_STAR_STEP_MS}ms` }}>★</span>
  )) : null;

  return (
    <section className="minigame-result" data-anchor={anchor} data-testid="minigame-result" aria-label={practice ? "練習の結果" : "結果"}>
      <div className="minigame-result-head">
        {practice && <span className="minigame-result-practice">練習</span>}
        {stars && <span className="minigame-stars" data-testid="minigame-stars" data-stars={rating?.stars} aria-hidden="true">{stars}</span>}
      </div>
      <p className="minigame-result-label" aria-hidden="true">{label}</p>
      {counted && <p className="minigame-result-score" data-testid="minigame-score" aria-hidden="true">{counted}</p>}
      {detail && <p className="minigame-result-detail" aria-hidden="true">{detail}</p>}
      {face && <div className="minigame-result-react" aria-hidden="true">{face}{line && <p className="minigame-result-line">{line}</p>}</div>}
      <div className="minigame-result-actions">
        {buttons.retry && <button type="button" className="secondary" data-testid="minigame-again" onClick={guarded(onRetry)}>もう一回</button>}
        {buttons.toReal && <button ref={primary} type="button" className="primary" data-testid="minigame-to-real" data-minigame-card-primary
          onClick={guarded(onToReal)}>本番へ <span aria-hidden="true">→</span></button>}
        {buttons.next && <button ref={primary} type="button" className="primary" data-testid="minigame-next" data-minigame-card-primary
          onClick={guarded(onNext)}>次へ <span aria-hidden="true">→</span></button>}
      </div>
    </section>
  );
}
