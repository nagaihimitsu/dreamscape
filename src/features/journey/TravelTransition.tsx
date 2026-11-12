import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TransportMode } from "../../content/transport";
import { PassingScenery, railKinds, sceneryPace, TransportIllustration } from "./transport-art";
import { playSe, playSound } from "../../audio/sound-effects";
import "./travel-transition.css";

/**
 * Small, decorative transition; movement and saving are handled by the caller.
 * The caption and the art come from the mode's declaration (manifest transportModes).
 * Generic scenery passes behind the art at the pace of the mode's kind (user decision
 * 2026-11-11); it stands still under reduced motion. The transition's length is unchanged.
 */
export function TravelTransition({ mode, reduceMotion = false, onEnd }: {
  mode: TransportMode;
  reduceMotion?: boolean;
  onEnd: () => void;
}) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const [systemReduced, setSystemReduced] = useState(() =>
    typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setSystemReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  const reduced = reduceMotion || systemReduced;
  // The ride's sound as it comes: the mode's own (its manifest `se`), else its kind's (travel_walk on foot).
  useEffect(() => {
    if (mode.se) playSound(mode.se);
    else playSe(`travel_${mode.kind}` as const);
  // Once a ride (useTravelEffects gives each its own key).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => onEndRef.current(), reduced ? 450 : 1800);
    return () => window.clearTimeout(timer);
  }, [mode.id, reduced]);
  const onRails = railKinds.has(mode.kind);

  return createPortal(<div className={`travel-transition${reduced ? " is-reduced" : ""}`}
    data-testid="travel-transition" data-mode={mode.id} data-kind={mode.kind} aria-hidden="true">
    <div className="travel-transition-scene" data-pace={sceneryPace(mode.kind)}>
      <span className="travel-transition-label">{mode.movingJa}</span>
      <span className="travel-transition-hill travel-transition-hill-back" />
      <span className="travel-transition-hill travel-transition-hill-front" />
      <PassingScenery />
      {onRails && <span className="travel-transition-wire" />}
      <div className={`travel-transition-vehicle is-${mode.kind}`}>
        <TransportIllustration kind={mode.kind} />
      </div>
      <span className={`travel-transition-ground${onRails ? " is-rail" : ""}`} />
    </div>
  </div>, document.body);
}
