import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { MiniGameRating } from "../contract";
import { countedScore, resultButtons, resultCardCompact, type ScreenSpan } from "./flow";
import { MINI_GAME_RESULT_GUARD_MS, MINI_GAME_SCORE_COUNT_MS, MINI_GAME_STAR_STEP_MS } from "./timing";

// The result card (docs/13 2.6; group3 6.3-5): at the bottom, in the place of the play's controls, which the host hides
// as it comes (2026-11-14, the phone UI audit: they still looked pressable under it), so its buttons are where the
// thumb was; with `resultAnchor: "top"` its words go high, under the band (the field's key picture is low), and its
// buttons stay at the bottom. ★ one by one (a rated play only), the outcome's label, the score counted up from 0, the
// heroine's face and line, and its buttons. Every press in its first moment is dropped (a finger still tapping the play
// does not skip it); its buttons did not exist when that finger went down, so no press of it reaches them. On a short
// play, or where the full card would cover too much of the field, it is compact: ★ beside the label on one row, a small
// face beside the score and her line, tighter (resultCardCompact); its buttons stay 44 px or more.

export interface ResultCardProps {
  label: string;
  rating: MiniGameRating | null;
  /** The score line (the rating's, else the play's detail), counted up; `detail` under it when both are given. */
  score?: string;
  detail?: string;
  /** The heroine's face (CharacterFace) and her line. */
  face?: ReactNode;
  line?: string;
  retry: boolean;
  anchor: "top" | "bottom";
  /** The play's field on the screen (its key picture): the card goes compact when it would cover too much of it. */
  field?: ScreenSpan;
  still: boolean;
  /** When the card came (performance.now): the guard counts from it. */
  shownAt: number;
  onNext(): void;
  /** 「もう一回」, with the button pressed (the next play's start guard reads its place). */
  onRetry(from: Element): void;
}

/** Whether the card's guard has passed (a press now is the player's own). */
export const resultCardReady = (shownAt: number, now = performance.now()): boolean => now - shownAt >= MINI_GAME_RESULT_GUARD_MS;

export function ResultCard({ label, rating, score, detail, face, line, retry, anchor, field, still, shownAt, onNext, onRetry }: ResultCardProps) {
  const buttons = resultButtons({ retry });
  const [counted, setCounted] = useState(() => (score && !still ? countedScore(score, 0) : score));
  const card = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const primary = useRef<HTMLButtonElement>(null);
  // Measured once as it comes, before it is painted: the full card, or the compact one when that would hide too much.
  // What lies over the field: the whole card, or a high card's words (its buttons are over the hidden controls).
  useLayoutEffect(() => {
    const box = (anchor === "top" ? body.current : card.current)?.getBoundingClientRect();
    const layer = card.current?.parentElement?.getBoundingClientRect();
    if (box && resultCardCompact({ card: box, ...(field ? { field } : {}), layerHeight: layer?.height ?? 0 })) setCompact(true);
  }, [field, anchor]);
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
  }, [compact]);
  const guarded = (action: (from: Element) => void) => (event: MouseEvent<HTMLButtonElement>) => {
    if (resultCardReady(shownAt)) action(event.currentTarget);
  };
  const stars = rating ? [1, 2, 3].map((index) => (
    <span key={index} className="minigame-star" data-on={index <= rating.stars || undefined} data-big={rating.stars === 3 && index === 3 || undefined}
      style={still ? undefined : { animationDelay: `${(index - 1) * MINI_GAME_STAR_STEP_MS}ms` }}>★</span>
  )) : null;
  const head = stars && (
    <div className="minigame-result-head">
      {stars && <span className="minigame-stars" data-testid="minigame-stars" data-stars={rating?.stars} aria-hidden="true">{stars}</span>}
    </div>
  );
  const labelLine = <p className="minigame-result-label" aria-hidden="true">{label}</p>;
  const scoreLine = counted && <p className="minigame-result-score" data-testid="minigame-score" aria-hidden="true">{counted}</p>;
  const detailLine = detail && <p className="minigame-result-detail" aria-hidden="true">{detail}</p>;
  const lineText = line && <p className="minigame-result-line">{line}</p>;

  return (
    // A key held down from the play (its repeats) never presses the card's buttons.
    <section ref={card} className="minigame-result" data-anchor={anchor} data-compact={compact || undefined} data-testid="minigame-result"
      aria-label="結果"
      onKeyDown={(event) => { if (event.repeat) event.preventDefault(); }}>
      {/* Its words: part of the card low down (no box of its own there), a card of their own high up (host.css). */}
      <div ref={body} className="minigame-result-body">
        {compact ? (
          <>
            <div className="minigame-result-title">{head}{labelLine}</div>
            {(face || scoreLine || detailLine) && (
              <div className="minigame-result-react" aria-hidden="true">
                {face}
                <div className="minigame-result-texts">{scoreLine}{detailLine}{face && lineText}</div>
              </div>
            )}
          </>
        ) : (
          <>
            {head}
            {labelLine}
            {scoreLine}
            {detailLine}
            {face && <div className="minigame-result-react" aria-hidden="true">{face}{lineText}</div>}
          </>
        )}
      </div>
      <div className="minigame-result-actions">
        {buttons.retry && <button type="button" className="secondary" data-testid="minigame-again" onClick={guarded(onRetry)}>もう一回</button>}
        {buttons.next && <button ref={primary} type="button" className="primary" data-testid="minigame-next" data-minigame-card-primary
          onClick={guarded(onNext)}>次へ <span aria-hidden="true">→</span></button>}
      </div>
    </section>
  );
}
