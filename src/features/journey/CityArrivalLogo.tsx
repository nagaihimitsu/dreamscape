import { useEffect } from "react";
import { playCue } from "../../audio/sound-effects";
import "./city-arrival.css";

/**
 * A short decorative title; completing it only records the presentation boundary. It ends by itself (1.8 s; reduced
 * motion 0.2 s), with 「会話へ」, or with a tap anywhere on it (2026-11-13: the scene's start held the taps a moment before).
 */
export function CityArrivalLogo({ nameJa, reduceMotion, onEnd }: {
  nameJa: string; reduceMotion: boolean; onEnd: () => void;
}) {
  // Its sound as it comes (not when a load brings the arrival back: playCue).
  useEffect(() => playCue("city_arrive"), []);
  return <div className={`city-arrival-logo${reduceMotion ? " is-reduced" : ""}`} data-testid="arrival-logo"
    onClick={(event) => { if (!(event.target instanceof Element && event.target.closest("button"))) onEnd(); }}
    onAnimationEnd={(event) => { if (event.target === event.currentTarget) onEnd(); }}>
    <div className="city-arrival-mark" role="status" aria-label={`${nameJa}に到着`}>
      <svg viewBox="0 0 180 64" aria-hidden="true"><path pathLength="1" d="M10 58H170M40 58V34Q40 12 62 12H118Q140 12 140 34V58M60 58V36Q60 25 90 8Q120 25 120 36V58M82 58V42Q90 31 98 42V58" /></svg>
      <strong>{nameJa}</strong>
      <span className="city-arrival-line" aria-hidden="true" />
    </div>
    <button type="button" className="secondary city-arrival-continue" onClick={onEnd}>会話へ</button>
  </div>;
}
