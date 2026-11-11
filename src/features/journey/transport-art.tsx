import type { ReactElement } from "react";
import type { TransportArtKind } from "../../content/transport";

// Built-in transition art, one illustration per kind of transport. A journey
// picks the kind of each declared mode in its manifest (transportModes[].kind);
// a new kind needs one illustration here (the record type makes it required).

const svg = (children: ReactElement) => <svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">{children}</svg>;

function Walker({ coat, bag }: { coat: string; bag: string }) {
  return <>
    <circle cx="12" cy="12" r="5" fill="#e6c6a2" />
    <path d="M9 20 Q12 18 15 20 L19 38 H5 Z" fill={coat} />
    <path className="travel-transition-arm is-first" d="M8 23 L3 34" fill="none" stroke="#e6c6a2" strokeWidth="3" strokeLinecap="round" />
    <path className="travel-transition-arm is-second" d="M16 23 L21 32" fill="none" stroke="#e6c6a2" strokeWidth="3" strokeLinecap="round" />
    <path className="travel-transition-leg is-first" d="M9 37 L5 53" fill="none" stroke="#344e42" strokeWidth="4" strokeLinecap="round" />
    <path className="travel-transition-leg is-second" d="M15 37 L19 53" fill="none" stroke="#344e42" strokeWidth="4" strokeLinecap="round" />
    <path d="M6 21 L16 33 M14 29 H20 V37 H14 Z" fill={bag} stroke="#795e48" strokeWidth="1.5" />
  </>;
}

/** One rider on a bicycle, facing right; `x` shifts it along the road. */
function Cyclist({ x, coat }: { x: number; coat: string }) {
  return <g transform={`translate(${x} 0)`}>
    <circle cx="10" cy="49" r="8.5" fill="none" stroke="#30473e" strokeWidth="2.5" />
    <circle cx="40" cy="49" r="8.5" fill="none" stroke="#30473e" strokeWidth="2.5" />
    <path d="M10 49 L20 35 H35 L40 49 M20 35 L25 49 L10 49 M25 49 L35 35 M35 35 L34 29 H39" fill="none" stroke="#9a5b45" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 33 H24" stroke="#30473e" strokeWidth="3" strokeLinecap="round" />
    <circle cx="26" cy="10" r="4.5" fill="#e6c6a2" />
    <path d="M23 16 Q27 14 29 18 L25 32 H19 Z" fill={coat} />
    <path d="M27 20 L36 29" fill="none" stroke="#e6c6a2" strokeWidth="2.5" strokeLinecap="round" />
    <path className="travel-transition-leg is-first" d="M22 31 L27 41 L25 49" fill="none" stroke="#344e42" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </g>;
}

const art: Record<TransportArtKind, () => ReactElement> = {
  walk: () => svg(<>
    <g transform="translate(32 0)"><Walker coat="#426a5a" bag="#d8b378" /></g>
    <g transform="translate(61 2)"><Walker coat="#9f7567" bag="#e6d9bd" /></g>
  </>),
  rail: () => svg(<>
    <path d="M13 20 Q13 13 20 13 H91 Q99 13 106 26 L112 38 V47 H13 Z" fill="#f9f5e8" stroke="#375c50" strokeWidth="3" strokeLinejoin="round" />
    <path d="M14 36 H110 V43 H14 Z" fill="#5e8b79" />
    <path d="M21 19 H36 V31 H21 Z M42 19 H57 V31 H42 Z M63 19 H78 V31 H63 Z M84 19 H92 Q97 19 101 29 H84 Z" fill="#7eaab1" />
    <path d="M11 49 H112" stroke="#375c50" strokeWidth="3" strokeLinecap="round" />
    <circle cx="32" cy="49" r="4" fill="#30473e" /><circle cx="90" cy="49" r="4" fill="#30473e" />
  </>),
  tram: () => svg(<>
    <path d="M54 14 L67 5 L80 14 M67 5 H77" fill="none" stroke="#4b6155" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="18" y="16" width="87" height="34" rx="7" fill="#e4b969" stroke="#4e6555" strokeWidth="3" />
    <path d="M25 22 H40 V34 H25 Z M45 22 H60 V34 H45 Z M65 22 H80 V34 H65 Z M85 22 H98 V34 H85 Z" fill="#d9eee9" />
    <path d="M20 39 H103" stroke="#f7efd9" strokeWidth="4" /><path d="M79 17 V49" stroke="#4e6555" strokeWidth="2" />
    <circle cx="35" cy="51" r="4" fill="#30473e" /><circle cx="89" cy="51" r="4" fill="#30473e" />
  </>),
  bus: () => svg(<>
    <path d="M18 19 Q18 13 25 13 H96 Q104 13 106 23 L110 42 V48 H18 Z" fill="#6b927b" stroke="#36594c" strokeWidth="3" strokeLinejoin="round" />
    <path d="M26 20 H41 V32 H26 Z M46 20 H61 V32 H46 Z M66 20 H81 V32 H66 Z M86 20 H97 Q100 20 102 30 L103 32 H86 Z" fill="#e6f0e7" />
    <path d="M20 38 H107" stroke="#f6ead0" strokeWidth="3" /><path d="M81 17 V46" stroke="#36594c" strokeWidth="2" />
    <circle cx="37" cy="49" r="6" fill="#30473e" /><circle cx="91" cy="49" r="6" fill="#30473e" /><circle cx="37" cy="49" r="2" fill="#ede9d9" /><circle cx="91" cy="49" r="2" fill="#ede9d9" />
  </>),
  car: () => svg(<>
    <path d="M29 35 L41 22 Q44 19 50 19 H75 Q81 19 87 28 L92 35 H101 Q107 35 108 42 V48 H21 V43 Q21 37 29 35 Z" fill="#e9be6b" stroke="#765c37" strokeWidth="3" strokeLinejoin="round" />
    <path d="M46 24 H59 V34 H37 L44 26 Q45 24 46 24 Z M64 24 H75 Q79 24 83 34 H64 Z" fill="#e4f0e9" />
    <rect x="55" y="13" width="18" height="6" rx="2" fill="#f6f1df" stroke="#765c37" strokeWidth="2" />
    <path d="M60 37 V44 M65 37 V44" stroke="#765c37" strokeWidth="2" />
    <circle cx="39" cy="49" r="6" fill="#343e37" /><circle cx="91" cy="49" r="6" fill="#343e37" /><circle cx="39" cy="49" r="2" fill="#f8efdc" /><circle cx="91" cy="49" r="2" fill="#f8efdc" />
  </>),
  // A small three-wheeled taxi (tuk-tuk / auto-rickshaw) seen from the side: canopy, open seat, one front wheel.
  three_wheeler: () => svg(<>
    <path d="M24 20 Q24 11 34 11 H82 Q93 11 96 21 L99 30" fill="#e4b969" stroke="#6b5a35" strokeWidth="3" strokeLinejoin="round" />
    <path d="M24 20 V44 H101 Q106 44 106 38 L99 30 H80 V20 Z" fill="#4f8a62" stroke="#355a45" strokeWidth="3" strokeLinejoin="round" />
    <path d="M32 22 H72 V33 H32 Z" fill="#e6f0e7" />
    <path d="M80 21 L86 31 H96" fill="none" stroke="#e6f0e7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M28 37 H74" stroke="#f6ead0" strokeWidth="3" />
    <circle cx="38" cy="49" r="6" fill="#30473e" /><circle cx="96" cy="49" r="6" fill="#30473e" /><circle cx="38" cy="49" r="2" fill="#ede9d9" /><circle cx="96" cy="49" r="2" fill="#ede9d9" />
  </>),
  bicycle: () => svg(<>
    <Cyclist x={6} coat="#426a5a" />
    <Cyclist x={62} coat="#9f7567" />
  </>),
};

export function TransportIllustration({ kind }: { kind: TransportArtKind }) {
  return art[kind]();
}

/** Kinds that ride on rails: the transition draws rails on the ground and an overhead wire. */
export const railKinds: ReadonlySet<TransportArtKind> = new Set(["rail", "tram"]);

/**
 * How fast the scenery passes by the window (TravelTransition): walking slowly; a bicycle, a three-wheeler, a tram or a
 * bus at a medium pace; a car or a train fast.
 */
export type SceneryPace = "slow" | "medium" | "fast";
const sceneryPaces: Record<TransportArtKind, SceneryPace> = {
  walk: "slow", bicycle: "medium", three_wheeler: "medium", tram: "medium", bus: "medium", car: "fast", rail: "fast",
};

/** The pace of a mode's kind (its declared `kind`, or walk); a kind not in the table passes at the medium pace. */
export function sceneryPace(kind: string): SceneryPace {
  return Object.hasOwn(sceneryPaces, kind) ? sceneryPaces[kind as TransportArtKind] : "medium";
}

/** The width of one tile of the scenery: each layer repeats it, and its loop moves it by one tile. */
const TILE = 120;
/**
 * The passing scenery's layers, far to near: a skyline, trees and poles (whose crossbar meets the rail kinds' wire).
 * Each tile is a silhouette drawn from the bottom-left corner of its layer with relative commands, so it repeats by
 * moving its start; three tiles cover the scene (at most 230 px wide) and the one-tile step of the loop.
 */
const sceneryLayers = [
  { name: "far", height: 40, tile: "v-14h10v-8h12v10h6v-22h8v20h10v14h14v-12h14v-6h12v8h10v-14h10v24h14z" },
  { name: "mid", height: 30, tile: "h16v-9a9 9 0 1 1 4 0v9h30v-6a7 7 0 1 1 3 0v6h10v-5a6 6 0 1 1 3 0v5h24v-10a8 8 0 1 1 4 0v10h26z" },
  { name: "near", height: 62, tile: "h59v-54h-7v-3h17v3h-7v54h58z" },
] as const;

/**
 * Generic scenery passing behind the vehicle in three layers (travel-transition.css moves each sideways, the farther
 * the slower). One small SVG and one path a layer; decorative only.
 */
export function PassingScenery() {
  return <>
    {sceneryLayers.map((layer) => <svg key={layer.name} className={`travel-scenery is-${layer.name}`} width={TILE * 3}
      height={layer.height} viewBox={`0 0 ${TILE * 3} ${layer.height}`} aria-hidden="true" focusable="false">
      <path d={[0, 1, 2].map((index) => `M${index * TILE} ${layer.height}${layer.tile}`).join("")} />
    </svg>)}
  </>;
}
