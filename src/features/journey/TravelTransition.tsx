import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type * as L from "leaflet";
import type { TransportMode } from "../../content/transport";
import { PassingScenery, railKinds, sceneryPace, TransportIllustration } from "./transport-art";
import { RIDE_MAP, RIDE_NAME_LINE, rideMapLayout, type RideLabel, type RideMapLayout, type RideRoute } from "./ride-map";
import { useLeaflet, type Leaflet } from "./leaflet";
import { project } from "./map-focus";
import { OSM_TILES } from "./PlaceMap";
import { whenLaidOut } from "./when-laid-out";
import { playSe, playSound } from "../../audio/sound-effects";
import { useNightCard } from "./NightRest";
import "./travel-transition.css";

/** How long a ride's visual shows (ms; travel-transition.css's timeline matches); reduced motion: still, shorter. */
const RIDE_MS = 1800;
const RIDE_REDUCED_MS = 450;

/**
 * Small, decorative transition; movement and saving are handled by the caller.
 * The caption and the art come from the mode's declaration (manifest transportModes).
 * Generic scenery passes behind the art at the pace of the mode's kind (user decision
 * 2026-11-11); it stands still under reduced motion. The transition's length is unchanged.
 * Under it, when both places of the ride are known (`route`), a map card: the two places
 * as dots with their names and a straight dotted line that draws itself from the place left to
 * the place reached over the ride (2026-11-13; ride-map.ts), whole at once under reduced motion.
 * Since 2026-11-26 (user request) it is larger, over the OpenStreetMap tiles of the same view, and
 * the party's mark goes along the line as it draws, the view drawing a little nearer to the place reached.
 * Like the rest of the transition it is a picture only (aria-hidden).
 * It lies on a dark ground over the whole screen (2026-11-25 user request), dark from its first frame: the place reached does
 * not show while the party moves. The ground fades to that place at the end, or stays dark (`held`) when another ride or the
 * episode's title card comes next, so the screen never brightens between them.
 */
export function TravelTransition({ mode, route, held = false, reduceMotion = false, onEnd }: {
  mode: TransportMode;
  /** The places left and reached (useTravelEffects; none when either is unknown). */
  route?: RideRoute;
  /** Something dark comes next (another ride, the episode's title card): the ground stays dark to the end. */
  held?: boolean;
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
  // It ends by itself (1.8 s; reduced motion 0.45 s), or at once on a tap or Enter, Space or Esc (2026-11-13), as the
  // night cards do: the taps are held a moment as it comes and as it goes (the double tap that started the ride).
  const { end } = useNightCard({ reduceMotion: reduced, ms: RIDE_MS, reducedMs: RIDE_REDUCED_MS, onEnd: () => onEndRef.current() });
  const onRails = railKinds.has(mode.kind);
  const map = useMemo(() => (route ? rideMapLayout(route) : null), [route]);

  return createPortal(<div className={`travel-transition${reduced ? " is-reduced" : ""}${held ? " is-held" : ""}`}
    data-testid="travel-transition" data-mode={mode.id} data-kind={mode.kind} aria-hidden="true" onClick={end}>
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
    {map && <RideMap layout={map} route={route!} reduced={reduced} />}
  </div>, document.body);
}

/**
 * The ride's map card: the tiles of the drawing's own view under it (RideTiles; the card's ground until they come, or
 * when they cannot), then the line's dots (each comes at its share of the ride, --ride-dot-at), the party's mark going
 * from the place left to the place reached as they come, both places and their whole names.
 */
function RideMap({ layout, route, reduced }: { layout: RideMapLayout; route: RideRoute; reduced: boolean }) {
  const last = Math.max(1, layout.dots.length - 1);
  const name = (label: RideLabel) => <text className="travel-ride-name" textAnchor={label.anchor}>
    {label.lines.map((line, index) => <tspan key={index} x={label.x} y={label.y + index * RIDE_NAME_LINE}>{line}</tspan>)}
  </text>;
  const zoomAt = { transformOrigin: `${(layout.to.x / RIDE_MAP.width) * 100}% ${(layout.to.y / layout.height) * 100}%` };
  const go = { "--ride-dx": `${layout.to.x - layout.from.x}px`, "--ride-dy": `${layout.to.y - layout.from.y}px` } as CSSProperties;
  return <div className="travel-ride-map" data-testid="travel-transition-map" style={{ aspectRatio: `${RIDE_MAP.width} / ${layout.height}` }}>
    <div className="travel-ride-view" style={zoomAt}>
      <RideTiles layout={layout} route={route} />
      <svg viewBox={`0 0 ${RIDE_MAP.width} ${layout.height}`} focusable="false">
        {layout.dots.map((dot, index) => <circle key={index} className="travel-ride-dot" cx={dot.x} cy={dot.y} r={2.4}
          style={{ "--ride-dot-at": index / last } as CSSProperties} />)}
        <circle className="travel-ride-from" cx={layout.from.x} cy={layout.from.y} r={6} />
        <circle className="travel-ride-to" cx={layout.to.x} cy={layout.to.y} r={7} />
        {!reduced && <circle className="travel-ride-party" cx={layout.from.x} cy={layout.from.y} r={5} style={go} />}
        {name(layout.labels.from)}
        {name(layout.labels.to)}
      </svg>
    </div>
    <span className="travel-ride-credit">© OpenStreetMap contributors</span>
  </div>;
}

/** The tiles once Leaflet is loaded (leaflet.ts; until then, and offline, the card's ground). */
function RideTiles(props: { layout: RideMapLayout; route: RideRoute }) {
  const L = useLeaflet();
  return L ? <LeafletRideTiles L={L} {...props} /> : null;
}

/**
 * A still Leaflet map with no controls (the card is a picture only), set to the drawing's view: the zoom at which a
 * zoom-0 pixel takes `scale` SVG units at the frame's width (fractional), centred where the drawing's centre falls.
 */
function LeafletRideTiles({ L, layout, route }: { L: Leaflet; layout: RideMapLayout; route: RideRoute }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = container.current;
    if (!frame) return;
    const map: L.Map = L.map(frame, {
      zoomControl: false, attributionControl: false, dragging: false, touchZoom: false, doubleClickZoom: false,
      scrollWheelZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0, inertia: false,
    });
    L.tileLayer(OSM_TILES.url, { maxZoom: 19 }).addTo(map);
    const cancel = whenLaidOut(frame, () => {
      map.invalidateSize();
      const unitsPerPixel = RIDE_MAP.width / Math.max(1, frame.clientWidth);
      const zoom = Math.log2(layout.scale / unitsPerPixel);
      const from = project(route.from, 0);
      const centre = L.point(
        from.x + (RIDE_MAP.width / 2 - layout.from.x) / layout.scale,
        from.y + (layout.height / 2 - layout.from.y) / layout.scale,
      );
      map.setView(L.CRS.EPSG3857.pointToLatLng(centre, 0), zoom, { animate: false });
    });
    return () => {
      cancel();
      map.remove();
    };
  }, [L, layout, route]);
  return <div ref={container} className="travel-ride-tiles" />;
}
