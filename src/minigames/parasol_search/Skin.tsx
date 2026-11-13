import { useEffect, useId, useRef, type CSSProperties } from "react";
import type { SearchFieldProps, SearchSkin } from "../engines/search/EnginePlay";
import { PARASOL_PLACES, PARASOL_SPOTS, parasolGame, parasolRules, type ParasolOutcome, type ParasolParams, type ParasolPlace, type ParasolSpot } from "./rules";
import "./skin.css";

// The parasol's field (a search skin): a lattice window of the palace's upper floor (the pierced stone wall round it, a
// cusped arch over it, a sill under it), and through it the old city's street from above, in three bands: the far
// pavement with four stalls, the road with two people walking to and fro under umbrellas (a cow, an auto-rickshaw and a
// cycle-rickshaw among them), the near pavement under the window with three stalls. A looked-at umbrella slides aside to
// show who is under it. The window takes the field's width and up to as much height (the stone wall fills the rest), so
// the street keeps its three rows apart on a short phone too: places are in % of the window, sizes in a unit of its
// smaller side. With the use's art (`art.street`), that picture in place of the drawn street, cow and traffic; the
// umbrellas and stalls are drawn by the game either way.

/** What an umbrella looks like and what is under it. */
export type ParasolKind = "juice" | "chai" | "fruit" | "bangles" | "black" | "floral" | "greens" | "old" | "marigold";
interface KindLook {
  /** Its panels, every other one. */
  panels: readonly [string, string];
  rib: string;
  /** Who is under it, seen from above: shoulders, then the head (hair, or a cloth over it). */
  person: readonly [string, string];
  /** The cloth or cart beside it, out on both sides of the umbrella (none for a walker). */
  stall: string | null;
  /** Its button's name: the colour and the stall or walker under it (what the picture shows), never whose it is. */
  labelJa: string;
}
const KINDS: Record<ParasolKind, KindLook> = {
  juice: { panels: ["#c63f2c", "#f1e9dc"], rib: "#7d2a1e", person: ["#3f6ea6", "#2a211c"], stall: "#3f7f55", labelJa: "赤白の縞の傘、ジュースの屋台" },
  chai: { panels: ["#d8c59d", "#ccb68b"], rib: "#8d7752", person: ["#f2eee4", "#2a211c"], stall: "#7b5636", labelJa: "古い日傘、チャイの屋台" },
  fruit: { panels: ["#2d68ad", "#3a78c0"], rib: "#1d4675", person: ["#7a8c5a", "#e08a2a"], stall: "#8a6440", labelJa: "青い傘、果物の荷車" },
  bangles: { panels: ["#e9c43a", "#f2d35a"], rib: "#9a7a14", person: ["#9b3f8c", "#2a211c"], stall: "#5b3a6e", labelJa: "黄色い傘、腕輪の店" },
  black: { panels: ["#24262b", "#30333a"], rib: "#0f1013", person: ["#c9c2b4", "#2a211c"], stall: null, labelJa: "黒い傘、車道を行く人" },
  floral: { panels: ["#e48bb0", "#eea7c3"], rib: "#a65476", person: ["#2f8c8a", "#2a211c"], stall: null, labelJa: "花柄の日傘、車道を行く人" },
  greens: { panels: ["#2e9852", "#3aa863"], rib: "#1d6537", person: ["#5c8a3c", "#2a211c"], stall: "#8c6f4b", labelJa: "緑の傘、野菜の店" },
  old: { panels: ["#c4a77b", "#b99c70"], rib: "#7b6340", person: ["#b8323a", "#a52b33"], stall: "#56709d", labelJa: "古い日傘、野菜の店" },
  marigold: { panels: ["#e5862a", "#ee983b"], rib: "#9c5414", person: ["#e9d36a", "#2a211c"], stall: "#7a5a3c", labelJa: "橙の傘、花輪の店" },
};

/**
 * Where each umbrella is (x, y in % of the window), its radius (in the window's unit), and, for a walker, how far it goes
 * either way (% of the width) and its round trip (ms). Three rows: the far pavement, the road, the near pavement.
 */
interface Place {
  x: number;
  y: number;
  r: number;
  walk?: { amp: number; periodMs: number; phase: number };
}
export const PARASOL_FIELD: Record<ParasolSpot, Place> = {
  far_1: { x: 14, y: 26, r: 15 },
  far_2: { x: 38, y: 25, r: 15 },
  far_3: { x: 62, y: 26, r: 15 },
  far_4: { x: 86, y: 25, r: 15 },
  road_left: { x: 20, y: 56, r: 12, walk: { amp: 12, periodMs: 17000, phase: 0 } },
  road_right: { x: 80, y: 57, r: 12, walk: { amp: 12, periodMs: 21000, phase: Math.PI } },
  near_left: { x: 20, y: 84, r: 18 },
  near_middle: { x: 50, y: 85, r: 18 },
  near_right: { x: 80, y: 84, r: 18 },
};
/** The street with the old parasol in the middle of the near pavement; `at` swaps it with the stall there. */
const STREET: Record<ParasolSpot, ParasolKind> = {
  far_1: "juice", far_2: "chai", far_3: "fruit", far_4: "bangles",
  road_left: "black", road_right: "floral",
  near_left: "greens", near_middle: "old", near_right: "marigold",
};

/** What stands at each place for the tag's `at`: the old parasol at its stall, the stall that was there in the middle. */
export function parasolKinds(at: ParasolPlace): Record<ParasolSpot, ParasolKind> {
  const kinds = { ...STREET };
  const place = PARASOL_PLACES[at] ?? PARASOL_PLACES.middle;
  kinds.near_middle = STREET[place];
  kinds[place] = "old";
  return kinds;
}

/** Where a place's umbrella is at a time of the play (a walker goes to and fro; with less motion, it stands at its start). */
export function parasolPosition(place: Place, ms: number): { x: number; y: number; sway: number } {
  if (!place.walk) return { x: place.x, y: place.y, sway: 0 };
  const { amp, periodMs, phase } = place.walk;
  return { x: place.x + amp * Math.sin((2 * Math.PI * ms) / periodMs + phase), y: place.y, sway: 6 * Math.sin(ms / 650 + phase) };
}

/** The road's traffic (looks only): where it starts and its lane (% of the window), its speed (% a second; minus: to the left). */
const VEHICLES = [
  { id: "auto", x: 10, y: 47, speed: 3.2 },
  { id: "cycle", x: 70, y: 66, speed: -2.2 },
] as const;
const vehicleX = (vehicle: (typeof VEHICLES)[number], ms: number) => {
  const span = 116;
  return ((((vehicle.x + 8 + (vehicle.speed * ms) / 1000) % span) + span) % span) - 8;
};
/** The cow, standing in the road between the walkers. */
const COW = { x: 50, y: 55 } as const;

const SOUNDS = { found: "clue_new", look: "ui_tap" } as const;
const RIBS = 8;
/** How far a stall's cloth or cart reaches out beside its umbrella (units). */
const STALL = 16;
const vertex = (index: number, r: number): [number, number] => {
  const angle = (index / RIBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / RIBS;
  return [r * Math.cos(angle), r * Math.sin(angle)];
};
const fixed = (value: number) => value.toFixed(1);

/** An umbrella from above: eight panels whose edges dip between the ribs, the ribs, the tip; the old one patched and frayed. */
function Canopy({ kind, r }: { kind: ParasolKind; r: number }) {
  const look = KINDS[kind];
  const panel = (index: number) => {
    const [ax, ay] = vertex(index, r);
    const [bx, by] = vertex(index + 1, r);
    const [cx, cy] = vertex(index + 0.5, 0.84 * r);
    return `M0 0 L${fixed(ax)} ${fixed(ay)} Q${fixed(cx)} ${fixed(cy)} ${fixed(bx)} ${fixed(by)} Z`;
  };
  return (
    <g>
      {Array.from({ length: RIBS }, (_, index) => (
        <path key={index} d={panel(index)} fill={kind === "old" && index === 0 ? "#d2bb91" : look.panels[index % 2]} />
      ))}
      {kind === "floral" && Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index + 0.5, r * 0.6);
        return <circle key={index} cx={fixed(x)} cy={fixed(y)} r={fixed(r * 0.12)} fill="#fff4f8" />;
      })}
      {kind === "old" && (
        <g>
          {/* A square of darker cloth sewn over one panel, its stitches showing, and a frayed edge on the far side. */}
          <path d={`M${fixed(r * 0.18)} ${fixed(r * 0.16)} L${fixed(r * 0.6)} ${fixed(r * 0.1)} L${fixed(r * 0.64)} ${fixed(r * 0.5)} L${fixed(r * 0.24)} ${fixed(r * 0.54)} Z`}
            fill="#86693f" stroke="#f0e2c4" strokeWidth="0.8" strokeDasharray="1.5 1.2" />
          <path d={`M${fixed(-r * 0.4)} ${fixed(-r * 0.86)} l2 2.6 l1.4 -2 l1.8 2.4 l1.6 -2.2 l1.8 2.6`} fill="none" stroke="#6e5736" strokeWidth="1" />
        </g>
      )}
      {Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index, r);
        // The old one's ribs: one is bent.
        return kind === "old" && index === 5
          ? <path key={index} d={`M0 0 L${fixed(x * 0.55 + 2.4)} ${fixed(y * 0.55)} L${fixed(x)} ${fixed(y)}`} fill="none" stroke={look.rib} strokeWidth="1" />
          : <line key={index} x1="0" y1="0" x2={fixed(x)} y2={fixed(y)} stroke={look.rib} strokeWidth="0.9" />;
      })}
      <circle r={fixed(Math.max(1.6, r * 0.09))} fill={look.rib} />
    </g>
  );
}

/** Who is under an umbrella, from above: shoulders and a head (the old parasol's seller in a red sari, its end over her grey hair). */
function Person({ kind, r }: { kind: ParasolKind; r: number }) {
  const [body, head] = KINDS[kind].person;
  return (
    <g transform={`scale(${fixed(Math.min(1, r / 18))})`}>
      <ellipse cx="0" cy="2" rx="9" ry="6" fill={body} />
      <circle cx="0" cy="0" r="4.6" fill={head} />
      {kind === "old" && <path d="M-3.6 -1.4 Q0 -3.4 3.6 -1.4" fill="none" stroke="#c9c3ba" strokeWidth="1" />}
    </g>
  );
}

/** What a stall has out on its cloth or cart, on both sides of the umbrella (`side` −1 left, 1 right). */
function Wares({ kind, r, side }: { kind: ParasolKind; r: number; side: 1 | -1 }) {
  const x = side * (r + STALL / 2);
  const at = (dx: number, dy: number) => `translate(${fixed(x + side * dx)} ${fixed(dy)})`;
  const heap = (points: readonly (readonly [number, number])[], radius: number, fill: string) => points.map(([dx, dy], index) => (
    <circle key={`${fill}-${index}`} cx={fixed(x + side * dx)} cy={fixed(dy)} r={radius} fill={fill} />
  ));
  switch (kind) {
    case "old":
      // Her cloth: radishes and carrots on one side, small tomatoes and okra on the other.
      return side < 0 ? (
        <g>
          <path d={`M${fixed(x - 4)} -6 v12 M${fixed(x)} -7 v12 M${fixed(x + 4)} -6 v12`} stroke="#f3f0e6" strokeWidth="2.6" strokeLinecap="round" />
          <path d={`M${fixed(x - 4)} -9 v3 M${fixed(x)} -10 v3 M${fixed(x + 4)} -9 v3`} stroke="#4f9a3a" strokeWidth="2.6" strokeLinecap="round" />
          <path d={`M${fixed(x - 3)} 9 l3 5 M${fixed(x + 1)} 9 l3 5`} stroke="#e47a25" strokeWidth="2" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          {heap([[-3, -6], [2, -6], [-1, -1.6], [3.6, -1.4], [0.6, 2.8]], 2.3, "#d8342c")}
          {heap([[-3, 8], [1, 9], [4, 7]], 1.4, "#5d9a3a")}
        </g>
      );
    case "greens":
      // Cauliflowers on one side, aubergines and onions on the other.
      return side < 0 ? (
        <g>
          {heap([[0, -5], [-2, 4], [3, 5]], 4.2, "#5c9a46")}
          {heap([[0, -5], [-2, 4], [3, 5]], 3, "#f2eedf")}
        </g>
      ) : (
        <g>
          {[-4, 0, 4].map((dx) => <ellipse key={dx} cx={fixed(x + dx)} cy="-4" rx="1.9" ry="4.6" fill="#5b2d6e" />)}
          {heap([[-3, 7], [1, 8], [4.4, 6.4]], 2, "#b06070")}
        </g>
      );
    case "marigold":
      // Loops of orange and yellow flowers.
      return (
        <g>
          {[-5, 6].map((dy) => Array.from({ length: 9 }, (_, index) => {
            const angle = (index / 9) * Math.PI * 2;
            return <circle key={`${dy}-${index}`} cx={fixed(x + 4.6 * Math.cos(angle))} cy={fixed(dy + 4.6 * Math.sin(angle))} r="1.6" fill={index % 2 ? "#f4b93a" : "#ec7a1f"} />;
          }))}
        </g>
      );
    case "chai":
      // The kettle on its stove on one side, little glasses on the other.
      return side < 0 ? (
        <g transform={at(0, 0)}>
          <circle r="5" fill="#2b2b2b" />
          <circle r="3.6" fill="#b7b9bc" />
          <path d="M3 -2 l3 -3" stroke="#b7b9bc" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ) : <g>{heap([[-3, -6], [2, -6], [-3, -1], [2, -1], [-0.5, 4.5]], 1.7, "#e9c98a")}</g>;
    case "juice":
      // A bundle of canes on one side, the crank wheel on the other.
      return side < 0
        ? <path d={`M${fixed(x - 4)} -10 v20 M${fixed(x)} -10 v20 M${fixed(x + 4)} -10 v20`} stroke="#9bbf5a" strokeWidth="2.2" strokeLinecap="round" />
        : <circle cx={fixed(x)} cy="0" r="5.6" fill="none" stroke="#e8e2d4" strokeWidth="1.6" />;
    case "fruit":
      // Bananas on one side, pomegranates and oranges on the other.
      return side < 0 ? (
        <g>{[-4, 0, 4].map((dx) => <path key={dx} d={`M${fixed(x + dx)} -9 q3 6 0 13`} fill="none" stroke="#f0cf3c" strokeWidth="2.2" strokeLinecap="round" />)}</g>
      ) : (
        <g>
          {heap([[-2, -5], [2.6, -5], [0.3, -0.8]], 2.4, "#b3243a")}
          {heap([[-2, 5], [2.6, 5.4], [0.3, 9]], 2.4, "#ef8f22")}
        </g>
      );
    case "bangles":
      // Stacks of glass bangles in rings.
      return (
        <g>
          {[[-6, "#e23a5e"], [0, "#2f9bd6"], [6, "#f2c230"]].map(([dy, colour]) => (
            <ellipse key={dy} cx={fixed(x)} cy={dy} rx="4.6" ry="2.4" fill="none" stroke={colour as string} strokeWidth="1.6" />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** One umbrella with what is under and beside it, in its own drawing (units of the window; the button sizes it). */
function Umbrella({ kind, place, ring, swayRef }: { kind: ParasolKind; place: Place; ring: "wrong" | "found" | "pointed" | null; swayRef: (element: SVGGElement | null) => void }) {
  const { r } = place;
  const reach = r + STALL + 2;
  const stall = KINDS[kind].stall;
  const at = parasolPosition(place, 0);
  return (
    <svg className="mg-parasol-search-unit" viewBox={`${-reach} ${-reach} ${reach * 2} ${reach * 2}`} style={{ "--reach": reach } as CSSProperties}
      aria-hidden="true" focusable="false">
      {stall && <rect x={-reach + 2} y={-r * 0.62} width={(reach - 2) * 2} height={r * 1.34} rx="2" fill={stall} />}
      {stall && <><Wares kind={kind} r={r} side={-1} /><Wares kind={kind} r={r} side={1} /></>}
      <ellipse cx="3" cy="4" rx={r} ry={fixed(r * 0.92)} fill="rgba(30,20,15,0.28)" />
      <Person kind={kind} r={r} />
      <g ref={swayRef} transform={`rotate(${fixed(at.sway)})`}>
        <g className="mg-parasol-search-canopy"><Canopy kind={kind} r={r} /></g>
      </g>
      {ring === "wrong" && <circle className="mg-parasol-search-ring-wrong" r={r + 3} />}
      {ring === "found" && <circle className="mg-parasol-search-ring-found" r={r + 4} />}
      {ring === "pointed" && <circle className="mg-parasol-search-ring-pointed" r={r + 4} />}
    </svg>
  );
}

/**
 * The street's bands from above (stretched to the window: only flat shapes): the far shopfronts and their awnings, the far
 * pavement, the curb, the road, the curb, the near pavement under the window.
 */
function Street() {
  const shops = ["#c97b6b", "#d9a865", "#a86b5a", "#cf8f6f", "#b9845a", "#c9746a"];
  const line = { vectorEffect: "non-scaling-stroke", strokeWidth: 1 } as const;
  return (
    <svg className="mg-parasol-search-street" viewBox="0 0 240 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect width="240" height="100" fill="#dcb2a2" />
      {shops.map((fill, index) => (
        <g key={index}>
          <rect x={index * 40} y="0" width="40" height="13" fill={fill} />
          <rect x={index * 40 + 12} y="2" width="16" height="7" fill="#3b2a24" />
          <rect x={index * 40 + 2} y="9" width="36" height="4" fill={index % 2 ? "#e9d9b5" : "#3f7f8c"} />
        </g>
      ))}
      <rect y="13" width="240" height="28" fill="#d6bea5" />
      {[22, 32].map((y) => <path key={y} d={`M0 ${y} H240`} stroke="#c9ae94" {...line} />)}
      <rect y="41" width="240" height="2" fill="#a8927d" />
      <rect y="43" width="240" height="26" fill="#6f675f" />
      <ellipse cx="60" cy="52" rx="44" ry="4" fill="#7c7369" opacity="0.6" />
      <ellipse cx="180" cy="62" rx="50" ry="4" fill="#7c7369" opacity="0.5" />
      <path d="M0 56 H240" stroke="#8a8178" strokeDasharray="10 8" {...line} />
      <rect y="69" width="240" height="2" fill="#a8927d" />
      {[78, 90].map((y) => <path key={y} d={`M0 ${y} H240`} stroke="#cc9e8e" {...line} />)}
      {[34, 94, 154, 214].map((x) => <path key={x} d={`M${x} 71 V100`} stroke="#cc9e8e" {...line} />)}
    </svg>
  );
}

/** A cow standing in the road, from above, facing left. */
function Cow() {
  return (
    <svg className="mg-parasol-search-thing" viewBox="-22 -10 44 20" style={{ "--size": 44 } as CSSProperties} aria-hidden="true" focusable="false">
      <ellipse cx="2" cy="1.5" rx="13" ry="6" fill="rgba(0,0,0,0.22)" />
      <ellipse cx="0" cy="0" rx="12" ry="6.4" fill="#efe6d6" />
      <ellipse cx="-4" cy="-0.5" rx="3.4" ry="4" fill="#d9ccb6" />
      <ellipse cx="-15" cy="0" rx="4.2" ry="3.2" fill="#e6dccb" />
      <path d="M-16 -3 l-2 -3.4 M-16 3 l-2 3.4" stroke="#6b5a48" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 0 q4 1 5 4" fill="none" stroke="#bfb19a" strokeWidth="1" />
    </svg>
  );
}

/** The road's traffic from above: an auto-rickshaw (green, its yellow roof) and a cycle-rickshaw (its hood, the rider). */
function Vehicle({ id, left }: { id: (typeof VEHICLES)[number]["id"]; left: boolean }) {
  return (
    <svg className="mg-parasol-search-thing" viewBox="-16 -10 32 20" style={{ "--size": 32 } as CSSProperties} aria-hidden="true" focusable="false">
      <g transform={left ? "scale(-1 1)" : undefined}>
        {id === "auto" ? (
          <>
            <rect x="-12" y="-6" width="26" height="14" rx="3" fill="rgba(0,0,0,0.25)" />
            <rect x="-13" y="-7" width="26" height="14" rx="3" fill="#2f7a3c" />
            <rect x="-12" y="-6.5" width="17" height="13" rx="2.5" fill="#e8c13a" />
            <circle cx="11" cy="0" r="1.6" fill="#1b1b1b" />
          </>
        ) : (
          <>
            <rect x="-9" y="-6" width="20" height="13" rx="2" fill="rgba(0,0,0,0.22)" />
            <path d="M-10 -6 H10 M-10 6 H10" stroke="#2a2a2a" strokeWidth="1.2" />
            <rect x="2" y="-6" width="9" height="12" rx="3" fill="#8b2c2c" />
            <circle cx="-6" cy="0" r="3.2" fill="#2a211c" />
          </>
        )}
      </g>
    </svg>
  );
}

/** The window's cusped arch (stretched across the window's top): the stone over the top corners, its edge a row of lobes. */
const ARCH = (() => {
  const width = 240;
  const spring = 40;
  const lobes = 8;
  const point = (theta: number): [number, number] => [width / 2 + (width / 2) * Math.cos(theta), spring - (spring - 1) * Math.sin(theta)];
  let d = `M0 0 L0 ${spring}`;
  for (let lobe = 0; lobe < lobes; lobe += 1) {
    const [ax, ay] = point(Math.PI - (lobe * Math.PI) / lobes);
    const [bx, by] = point(Math.PI - ((lobe + 1) * Math.PI) / lobes);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const length = Math.hypot(mx - width / 2, my - spring) || 1;
    d += ` Q${fixed(mx + ((mx - width / 2) / length) * 7)} ${fixed(my + ((my - spring) / length) * 7)} ${fixed(bx)} ${fixed(by)}`;
  }
  return `${d} L${width} 0 Z`;
})();

/** The lattice's pattern: pierced hexagons in the stone, the light coming through them. */
function JaliPattern({ id }: { id: string }) {
  const hex = (cx: number, cy: number) => Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
    return `${fixed(cx + 3.3 * Math.cos(angle))} ${fixed(cy + 3.3 * Math.sin(angle))}`;
  }).join(" L");
  return (
    <pattern id={id} width="12" height="20.8" patternUnits="userSpaceOnUse">
      <rect width="12" height="20.8" fill="#9b564c" />
      <path d={`M${hex(6, 5.2)} Z M${hex(0, 15.6)} Z M${hex(12, 15.6)} Z`} fill="#f4dfbf" opacity="0.85" />
    </pattern>
  );
}

function ParasolField({ params, setup, view, live, search, active, frames, art, still, sound, vibrate }: SearchFieldProps<ParasolParams, ParasolOutcome>) {
  const jali = `${useId().replace(/[^a-zA-Z0-9]/gu, "")}jali`;
  const kinds = parasolKinds(params.at);
  const target = setup.targets[0];
  const ending = view.ending;
  const pointed = ending !== null && ending.kind !== "found";
  const spots = useRef<(HTMLButtonElement | null)[]>([]);
  const sways = useRef<(SVGGElement | null)[]>([]);
  const vehicles = useRef<(HTMLSpanElement | null)[]>([]);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };

  // The walkers walk and the traffic moves on the play's clock (a paused play holds them); with less motion, all stand still.
  useEffect(() => {
    if (still) return undefined;
    return frames((ms) => {
      PARASOL_SPOTS.forEach((spot, index) => {
        const place = PARASOL_FIELD[spot];
        if (!place.walk) return;
        const at = parasolPosition(place, ms);
        const button = spots.current[index];
        if (button) button.style.left = `${at.x.toFixed(2)}%`;
        sways.current[index]?.setAttribute("transform", `rotate(${fixed(at.sway)})`);
      });
      VEHICLES.forEach((vehicle, index) => {
        const element = vehicles.current[index];
        if (element) element.style.left = `${vehicleX(vehicle, ms).toFixed(2)}%`;
      });
    });
  }, [frames, still]);
  // An umbrella looked at (by hand or by おまかせ): a soft tap, or the find's chime.
  const looked = view.searched.length;
  useEffect(() => {
    if (!looked) return;
    if (view.searched[looked - 1] === target) {
      play.current.sound(SOUNDS.found);
      play.current.vibrate("clue");
    } else play.current.sound(SOUNDS.look);
  }, [looked]); // each umbrella looked at once

  return (
    <div className="mg-parasol-search" data-ending={ending?.kind} data-art-street={art.street ? true : undefined} onPointerDown={active}>
      <svg className="mg-parasol-search-wall" aria-hidden="true" focusable="false">
        <defs><JaliPattern id={jali} /></defs>
        <rect width="100%" height="100%" fill={`url(#${jali})`} />
      </svg>
      <div className="mg-parasol-search-window">
        {art.street ? <img className="mg-parasol-search-street" src={art.street} alt="" draggable={false} /> : (
          <>
            <Street />
            {VEHICLES.map((vehicle, index) => (
              <span key={vehicle.id} ref={(element) => { vehicles.current[index] = element; }} className="mg-parasol-search-place"
                style={{ left: `${vehicleX(vehicle, 0).toFixed(2)}%`, top: `${vehicle.y}%` }} aria-hidden="true">
                <Vehicle id={vehicle.id} left={vehicle.speed < 0} />
              </span>
            ))}
            <span className="mg-parasol-search-place" style={{ left: `${COW.x}%`, top: `${COW.y}%` }} aria-hidden="true"><Cow /></span>
          </>
        )}
        {PARASOL_SPOTS.map((spot, index) => {
          const place = PARASOL_FIELD[spot];
          const at = parasolPosition(place, 0);
          const searched = view.searched.includes(index);
          const isTarget = index === target;
          const shown = searched || (pointed && isTarget);
          const ring = searched && !isTarget ? "wrong" : shown && isTarget ? (pointed ? "pointed" : "found") : null;
          return (
            <button key={spot} type="button" ref={(element) => { spots.current[index] = element; }} className="mg-parasol-search-spot"
              data-testid={`minigame-spot-${index}`} data-minigame-primary={index === 0 || undefined} data-walker={place.walk ? true : undefined}
              data-searched={searched || undefined} data-shown={shown || undefined} data-target={(shown && isTarget) || undefined}
              aria-disabled={!live || searched || undefined}
              aria-label={`${KINDS[kinds[spot]].labelJa}${searched && isTarget ? "：見つけた" : searched ? "：違った" : ""}`}
              style={{ left: `${at.x.toFixed(2)}%`, top: `${at.y}%`, "--r": place.r } as CSSProperties}
              onClick={() => { if (live && !searched) search(index); }}>
              <Umbrella kind={kinds[spot]} place={place} ring={ring} swayRef={(element) => { sways.current[index] = element; }} />
            </button>
          );
        })}
        <svg className="mg-parasol-search-arch" viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={ARCH} fill="#a8625a" stroke="#7d3f37" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="mg-parasol-search-sill" aria-hidden="true" />
      </div>
    </div>
  );
}

/** The parasol as a search skin: its game, rules, words and field. */
export const parasolSkin: SearchSkin<ParasolParams, ParasolOutcome> = {
  game: parasolGame,
  rules: parasolRules,
  hintJa: "野菜を並べた、古い日傘を押す",
  buttons: [{ id: "ask", labelJa: "どこ？", hintJa: "どの傘か、彼女に教えてもらいます。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // The old parasol shown and ringed (found, or pointed out), before the outcome shows.
  endDelayMs: (_, still) => (still ? 700 : 1400),
  Field: ParasolField,
};
