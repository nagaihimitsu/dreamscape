import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { FLIGHT_MS, FLIGHT_STAGGER_MS, flightPaths, type FlightKind, type FlightPath } from "./hud-cues";
import "./hud-effects.css";

/** How long a flight plays at most (milliseconds): five tokens one after another, and a moment. */
export const FLIGHT_TOTAL_MS = 4 * FLIGHT_STAGGER_MS + FLIGHT_MS + 100;

/**
 * Coins (into the budget) or stars (into the AP) flying from around the screen's centre into a header value as it rises
 * in play (2026-11-13 user decision; JourneyHud). Display only: drawn in the header's own layer (hud-effects.css), over
 * the screen, aria-hidden, taking no presses. Not drawn under reduced motion and 「演出を短縮する」.
 */
export function HudFlight({ kind, count, to }: { kind: FlightKind; count: number; to: RefObject<HTMLElement | null> }) {
  const layer = useRef<HTMLSpanElement>(null);
  const [paths, setPaths] = useState<FlightPath[]>([]);
  // Measured once as the flight starts: where the layer is, the screen's centre and the value.
  useLayoutEffect(() => {
    const origin = layer.current?.getBoundingClientRect();
    const target = to.current?.getBoundingClientRect();
    if (origin && target) setPaths(flightPaths(count, { width: window.innerWidth, height: window.innerHeight }, origin, target));
  }, [count, to]);
  return (
    <span ref={layer} className="hud-flight" aria-hidden="true">
      {paths.map((path, index) => (
        <span key={index} className={`hud-flight-token hud-flight-${kind}`}
          style={{ left: path.x, top: path.y, "--dx": `${path.dx}px`, "--dy": `${path.dy}px`, animationDelay: `${path.delayMs}ms` } as CSSProperties} />
      ))}
    </span>
  );
}
