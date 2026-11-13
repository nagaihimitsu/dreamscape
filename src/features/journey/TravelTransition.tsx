import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { TransportMode } from "../../content/transport";
import { PassingScenery, railKinds, sceneryPace, TransportIllustration } from "./transport-art";
import { RIDE_MAP, rideMapLayout, type RideLabel, type RideMapLayout, type RideRoute } from "./ride-map";
import { playSe, playSound } from "../../audio/sound-effects";
import "./travel-transition.css";

/**
 * Small, decorative transition; movement and saving are handled by the caller.
 * The caption and the art come from the mode's declaration (manifest transportModes).
 * Generic scenery passes behind the art at the pace of the mode's kind (user decision
 * 2026-11-11); it stands still under reduced motion. The transition's length is unchanged.
 * Under it, when both places of the ride are known (`route`), a small map card: the two places
 * as dots with their names and a straight dotted line that draws itself from the place left to
 * the place reached over the ride (2026-11-13; ride-map.ts), whole at once under reduced motion.
 * Like the rest of the transition it is a picture only (aria-hidden).
 */
export function TravelTransition({ mode, route, reduceMotion = false, onEnd }: {
  mode: TransportMode;
  /** The places left and reached (useTravelEffects; none when either is unknown). */
  route?: RideRoute;
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
  const map = route ? rideMapLayout(route) : null;

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
    {map && <RideMap layout={map} />}
  </div>, document.body);
}

/** The ride's map card: the line's dots (each comes at its share of the ride, --ride-dot-at), then both places and their names. */
function RideMap({ layout }: { layout: RideMapLayout }) {
  const last = Math.max(1, layout.dots.length - 1);
  const name = (label: RideLabel) => <text className="travel-ride-name" x={label.x} y={label.y} textAnchor={label.anchor}>{label.text}</text>;
  return <div className="travel-ride-map" data-testid="travel-transition-map">
    <svg viewBox={`0 0 ${RIDE_MAP.width} ${RIDE_MAP.height}`} focusable="false">
      {layout.dots.map((dot, index) => <circle key={index} className="travel-ride-dot" cx={dot.x} cy={dot.y} r={1.8}
        style={{ "--ride-dot-at": index / last } as CSSProperties} />)}
      <circle className="travel-ride-from" cx={layout.from.x} cy={layout.from.y} r={5} />
      <circle className="travel-ride-to" cx={layout.to.x} cy={layout.to.y} r={6} />
      {name(layout.labels.from)}
      {name(layout.labels.to)}
    </svg>
  </div>;
}
