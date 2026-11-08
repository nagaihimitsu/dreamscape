import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TransportMode } from "../../content/transport";
import { railKinds, TransportIllustration } from "./transport-art";
import "./travel-transition.css";

/**
 * Small, decorative transition; movement and saving are handled by the caller.
 * The caption and the art come from the mode's declaration (manifest transportModes).
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
  useEffect(() => {
    const timer = window.setTimeout(() => onEndRef.current(), reduced ? 450 : 1800);
    return () => window.clearTimeout(timer);
  }, [mode.id, reduced]);
  const onRails = railKinds.has(mode.kind);

  return createPortal(<div className={`travel-transition${reduced ? " is-reduced" : ""}`}
    data-testid="travel-transition" data-mode={mode.id} data-kind={mode.kind} aria-hidden="true">
    <div className="travel-transition-scene">
      <span className="travel-transition-label">{mode.movingJa}</span>
      <span className="travel-transition-hill travel-transition-hill-back" />
      <span className="travel-transition-hill travel-transition-hill-front" />
      {onRails && <span className="travel-transition-wire" />}
      <div className={`travel-transition-vehicle is-${mode.kind}`}>
        <TransportIllustration kind={mode.kind} />
      </div>
      <span className={`travel-transition-ground${onRails ? " is-rail" : ""}`} />
    </div>
  </div>, document.body);
}
