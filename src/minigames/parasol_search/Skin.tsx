import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import type { SearchFieldProps, SearchSkin } from "../engines/search/EnginePlay";
import { PARASOL_PLACES, PARASOL_SPOTS, parasolGame, parasolRules, type ParasolOutcome, type ParasolParams, type ParasolPlace, type ParasolSpot } from "./rules";
import "./skin.css";

// The parasol's field (a search skin): a lattice window of the palace's upper floor (a pierced stone wall, a cusped arch,
// a sill), and through it the old city's street seen from above: the far shops and pavement, the road with a cow, an
// auto-rickshaw and a cycle-rickshaw, the near pavement under the window. Nine round umbrellas, each over a stall or a
// walker; three walk slowly to and fro. A looked-at umbrella slides aside to show who is under it. With the use's art
// (`art.street`), that picture in place of the drawn street, vehicles and cow; the umbrellas and stalls are drawn by the
// game either way.

/** The street view's drawing, in its own units (the window keeps this shape: 3 wide to 4 high). */
const W = 240;
const H = 320;

/** What an umbrella looks like and what is under it. */
export type ParasolKind = "striped" | "chai" | "fruit" | "black" | "floral" | "navy" | "greens" | "old" | "marigold";
interface KindLook {
  /** Its panels, every other one. */
  panels: readonly [string, string];
  rib: string;
  /** Who is under it, seen from above: shoulders, then the head (hair or a cloth over it). */
  person: readonly [string, string];
  /** Its button's name: the colour and the stall or walker under it (what the picture shows), never whose it is. */
  labelJa: string;
}
const KINDS: Record<ParasolKind, KindLook> = {
  striped: { panels: ["#c63f2c", "#f1e9dc"], rib: "#7d2a1e", person: ["#3f6ea6", "#2a211c"], labelJa: "赤白の縞の傘、ジュースの屋台" },
  chai: { panels: ["#d8c59d", "#ccb68b"], rib: "#8d7752", person: ["#f2eee4", "#2a211c"], labelJa: "古い日傘、チャイの屋台" },
  fruit: { panels: ["#2d68ad", "#3a78c0"], rib: "#1d4675", person: ["#7a8c5a", "#e08a2a"], labelJa: "青い傘、果物の荷車" },
  black: { panels: ["#24262b", "#30333a"], rib: "#0f1013", person: ["#c9c2b4", "#2a211c"], labelJa: "黒い傘、車道を行く人" },
  floral: { panels: ["#e48bb0", "#eea7c3"], rib: "#a65476", person: ["#2f8c8a", "#2a211c"], labelJa: "花柄の日傘、歩く人" },
  navy: { panels: ["#2b3a5c", "#34466c"], rib: "#18223a", person: ["#d9cfb8", "#3a2e26"], labelJa: "紺の傘、歩道を行く人" },
  greens: { panels: ["#2e9852", "#3aa863"], rib: "#1d6537", person: ["#5c8a3c", "#2a211c"], labelJa: "緑の傘、野菜の店" },
  old: { panels: ["#c4a77b", "#b99c70"], rib: "#7b6340", person: ["#b8323a", "#a52b33"], labelJa: "古い日傘、野菜の店" },
  marigold: { panels: ["#e5862a", "#ee983b"], rib: "#9c5414", person: ["#e9d36a", "#2a211c"], labelJa: "橙の傘、花輪の店" },
};

/** Where each umbrella is, its radius, and, for a walker, how far it goes either way and its round trip (ms). */
interface Place {
  x: number;
  y: number;
  r: number;
  walk?: { amp: number; periodMs: number; phase: number };
}
export const PARASOL_FIELD: Record<ParasolSpot, Place> = {
  far_left: { x: 42, y: 58, r: 22 },
  far_middle: { x: 120, y: 54, r: 20 },
  far_right: { x: 198, y: 58, r: 22 },
  road_upper: { x: 128, y: 118, r: 15, walk: { amp: 58, periodMs: 19000, phase: 0 } },
  road_lower: { x: 108, y: 160, r: 15, walk: { amp: 54, periodMs: 24000, phase: Math.PI } },
  near_walk: { x: 122, y: 206, r: 16, walk: { amp: 66, periodMs: 21000, phase: Math.PI / 2 } },
  near_left: { x: 44, y: 264, r: 27 },
  near_middle: { x: 122, y: 268, r: 28 },
  near_right: { x: 198, y: 262, r: 27 },
};
/** The street with the old parasol in the middle of the near pavement; `at` swaps it with the stall there. */
const STREET: Record<ParasolSpot, ParasolKind> = {
  far_left: "striped", far_middle: "chai", far_right: "fruit",
  road_upper: "black", road_lower: "floral", near_walk: "navy",
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

/** The road's traffic (looks only): where it starts, its lane and its speed (units a second; minus: to the left). */
const VEHICLES = [
  { id: "auto", x: 30, y: 104, speed: 9 },
  { id: "cycle", x: 170, y: 176, speed: -6 },
] as const;
const vehicleX = (vehicle: (typeof VEHICLES)[number], ms: number) => {
  const span = W + 60;
  return ((((vehicle.x + 30 + (vehicle.speed * ms) / 1000) % span) + span) % span) - 30;
};

const SOUNDS = { found: "clue_new", look: "ui_tap" } as const;
const RIBS = 8;
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
    const mid = ((index + 0.5) / RIBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / RIBS;
    return `M0 0 L${fixed(ax)} ${fixed(ay)} Q${fixed(0.84 * r * Math.cos(mid))} ${fixed(0.84 * r * Math.sin(mid))} ${fixed(bx)} ${fixed(by)} Z`;
  };
  return (
    <g className="mg-parasol-search-canopy-cloth">
      {Array.from({ length: RIBS }, (_, index) => (
        <path key={index} d={panel(index)} fill={kind === "old" && index === 0 ? "#d2bb91" : look.panels[index % 2]} />
      ))}
      {kind === "floral" && Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index + 0.5, r * 0.6);
        return <circle key={index} cx={fixed(x)} cy={fixed(y)} r={r * 0.11} fill="#fff4f8" />;
      })}
      {kind === "old" && (
        <g>
          {/* A square of darker cloth sewn over one panel, its stitches showing. */}
          <path d={`M${fixed(r * 0.2)} ${fixed(r * 0.18)} L${fixed(r * 0.56)} ${fixed(r * 0.12)} L${fixed(r * 0.6)} ${fixed(r * 0.46)} L${fixed(r * 0.26)} ${fixed(r * 0.5)} Z`}
            fill="#8b7049" stroke="#f0e2c4" strokeWidth="0.7" strokeDasharray="1.4 1.2" />
          {/* A frayed edge on the far side. */}
          <path d={`M${fixed(-r * 0.36)} ${fixed(-r * 0.86)} l2 2.6 l1.4 -2 l1.8 2.4 l1.6 -2.2 l1.8 2.6`} fill="none" stroke="#7b6340" strokeWidth="0.9" />
        </g>
      )}
      {Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index, r);
        // The old one's ribs: one is bent.
        return kind === "old" && index === 5
          ? <path key={index} d={`M0 0 L${fixed(x * 0.55 + 2.4)} ${fixed(y * 0.55)} L${fixed(x)} ${fixed(y)}`} fill="none" stroke={look.rib} strokeWidth="1" />
          : <line key={index} x1="0" y1="0" x2={fixed(x)} y2={fixed(y)} stroke={look.rib} strokeWidth="0.9" />;
      })}
      <circle r={Math.max(1.6, r * 0.09)} fill={look.rib} />
    </g>
  );
}

/** Who is under an umbrella, from above: shoulders and a head (the old parasol's seller in a red sari, its end over her head). */
function Person({ kind, r }: { kind: ParasolKind; r: number }) {
  const [body, head] = KINDS[kind].person;
  const size = Math.min(1, r / 24);
  return (
    <g transform={`scale(${fixed(size)})`}>
      <ellipse cx="0" cy="2" rx="9" ry="6" fill={body} />
      <circle cx="0" cy="0" r="4.6" fill={head} />
      {kind === "old" && <path d="M-3.6 -1.4 Q0 -3.4 3.6 -1.4" fill="none" stroke="#c9c3ba" strokeWidth="1" />}
    </g>
  );
}

/** What a stall has out beside its umbrella (toward the road; `side` −1 up, 1 down), and nothing for a walker. */
function Goods({ kind, r, side }: { kind: ParasolKind; r: number; side: 1 | -1 }) {
  const near = side === -1 ? -r - 15 : r - 4;
  const band = (fill: string) => <rect x={-r * 0.95} y={near} width={r * 1.9} height="19" rx="2" fill={fill} />;
  const dots = (points: readonly (readonly [number, number])[], radius: number, fill: string) => points.map(([x, y], index) => (
    <circle key={`${fill}-${index}`} cx={fixed(x)} cy={fixed(near + y)} r={radius} fill={fill} />
  ));
  switch (kind) {
    case "old":
      // Her cloth: radishes, carrots, okra and small tomatoes in heaps.
      return (
        <g>
          {band("#56709d")}
          <path d={`M${-r * 0.8} ${near + 5} h11 M${-r * 0.8 + 1} ${near + 9} h11 M${-r * 0.8 + 2} ${near + 13} h11`} stroke="#f3f0e6" strokeWidth="2.4" strokeLinecap="round" />
          <path d={`M${-r * 0.8 - 3} ${near + 5} h3 M${-r * 0.8 - 2} ${near + 9} h3 M${-r * 0.8 - 1} ${near + 13} h3`} stroke="#4f9a3a" strokeWidth="2.4" strokeLinecap="round" />
          <path d={`M${-r * 0.2} ${near + 5} l6 1.5 M${-r * 0.2} ${near + 9} l6 1 M${-r * 0.2 + 1} ${near + 13} l6 0.5`} stroke="#e47a25" strokeWidth="1.8" strokeLinecap="round" />
          {dots([[r * 0.4, 6], [r * 0.4 + 4.4, 6.6], [r * 0.4 + 2, 10.4], [r * 0.4 + 6.4, 10.6], [r * 0.4 + 4, 14]], 2.2, "#d8342c")}
          {dots([[r * 0.78, 6], [r * 0.78, 10], [r * 0.78 - 2, 14]], 1.3, "#5d9a3a")}
        </g>
      );
    case "greens":
      // Cauliflowers, aubergines and onions.
      return (
        <g>
          {band("#8c6f4b")}
          {dots([[-r * 0.66, 9.5], [-r * 0.32, 9], [-r * 0.5, 15]], 4, "#5c9a46")}
          {dots([[-r * 0.66, 9.5], [-r * 0.32, 9], [-r * 0.5, 15]], 2.9, "#f2eedf")}
          {[0, 1, 2].map((index) => <ellipse key={index} cx={r * 0.12 + index * 5} cy={near + 9.5} rx="2" ry="4.6" fill="#5b2d6e" />)}
          {dots([[r * 0.66, 6], [r * 0.66 + 4, 9], [r * 0.66, 12], [r * 0.66 + 4, 15]], 2, "#b06070")}
        </g>
      );
    case "marigold":
      // Garlands of orange and yellow flowers laid out in loops.
      return (
        <g>
          {band("#7a5a3c")}
          {[-0.55, 0, 0.55].map((offset, loop) => Array.from({ length: 10 }, (_, index) => {
            const angle = (index / 10) * Math.PI * 2;
            return <circle key={`${loop}-${index}`} cx={fixed(r * offset + 6 * Math.cos(angle))} cy={fixed(near + 9.5 + 6 * Math.sin(angle))} r="1.7" fill={index % 2 ? "#f4b93a" : "#ec7a1f"} />;
          }))}
        </g>
      );
    case "chai":
      // A small table: the kettle, the stove, the little glasses.
      return (
        <g>
          {band("#7b5636")}
          <circle cx={-r * 0.45} cy={near + 9.5} r="5" fill="#2b2b2b" />
          <circle cx={-r * 0.45} cy={near + 9.5} r="3.6" fill="#b7b9bc" />
          <path d={`M${-r * 0.45 + 3.4} ${near + 8} l4 -2.4`} stroke="#b7b9bc" strokeWidth="1.4" strokeLinecap="round" />
          {dots([[r * 0.1, 6], [r * 0.3, 6], [r * 0.5, 6], [r * 0.2, 12], [r * 0.4, 12]], 1.6, "#e9c98a")}
        </g>
      );
    case "striped":
      // A juice cart: its crank wheel and a bundle of canes.
      return (
        <g>
          {band("#3f7f55")}
          <circle cx={-r * 0.45} cy={near + 9.5} r="6" fill="none" stroke="#e8e2d4" strokeWidth="1.6" />
          <path d={`M${r * 0.05} ${near + 5} h${r * 0.8} M${r * 0.05} ${near + 9} h${r * 0.8} M${r * 0.05} ${near + 13} h${r * 0.8}`} stroke="#9bbf5a" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    case "fruit":
      // A fruit cart: bananas, pomegranates, oranges.
      return (
        <g>
          {band("#8a6440")}
          {[0, 1, 2].map((index) => <path key={index} d={`M${-r * 0.8 + index * 4} ${near + 5} q3 6 7 8`} fill="none" stroke="#f0cf3c" strokeWidth="2.2" strokeLinecap="round" />)}
          {dots([[0, 8], [4.4, 8], [2.2, 12.4]], 2.4, "#b3243a")}
          {dots([[r * 0.55, 7], [r * 0.55 + 4.6, 8], [r * 0.55 + 2, 12.4]], 2.4, "#ef8f22")}
        </g>
      );
    default:
      return null;
  }
}

/** The street from above, without its umbrellas: the far shops and pavement, the road, the near pavement. */
function Street() {
  const shops = ["#c97b6b", "#d9a865", "#a86b5a", "#cf8f6f", "#b9845a", "#c9746a"];
  return (
    <g>
      <rect width={W} height={H} fill="#dcb2a2" />
      {shops.map((fill, index) => (
        <g key={index}>
          <rect x={index * 40} y="0" width="40" height="24" fill={fill} />
          <rect x={index * 40 + 12} y="6" width="16" height="12" fill="#3b2a24" />
          <rect x={index * 40 + 2} y="18" width="36" height="7" fill={index % 2 ? "#e9d9b5" : "#3f7f8c"} />
          <path d={`M${index * 40 + 2} 21.5 h36`} stroke={index % 2 ? "#c9573c" : "#e9d9b5"} strokeWidth="1.2" strokeDasharray="3 3" />
        </g>
      ))}
      <rect y="25" width={W} height="65" fill="#d6bea5" />
      {[45, 65].map((y) => <path key={y} d={`M0 ${y} H${W}`} stroke="#c9ae94" strokeWidth="0.6" />)}
      <rect y="90" width={W} height="4" fill="#a8927d" />
      <rect y="94" width={W} height="90" fill="#6f675f" />
      <ellipse cx="60" cy="130" rx="40" ry="10" fill="#7c7369" opacity="0.6" />
      <ellipse cx="180" cy="168" rx="46" ry="9" fill="#7c7369" opacity="0.5" />
      <path d="M0 112 H240 M0 166 H240" stroke="#635b54" strokeWidth="1.2" strokeDasharray="10 8" opacity="0.7" />
      <rect y="184" width={W} height="4" fill="#a8927d" />
      {[220, 252, 284].map((y) => <path key={y} d={`M0 ${y} H${W}`} stroke="#cc9e8e" strokeWidth="0.6" />)}
      {[30, 90, 150, 210].map((x) => <path key={x} d={`M${x} 188 V${H}`} stroke="#cc9e8e" strokeWidth="0.6" />)}
      {/* A cow standing in the road, facing left. */}
      <g transform="translate(212 146)">
        <ellipse cx="2" cy="1.5" rx="13" ry="6" fill="rgba(0,0,0,0.22)" />
        <ellipse cx="0" cy="0" rx="12" ry="6.4" fill="#efe6d6" />
        <ellipse cx="-4" cy="-0.5" rx="3.4" ry="4" fill="#d9ccb6" />
        <ellipse cx="-15" cy="0" rx="4.2" ry="3.2" fill="#e6dccb" />
        <path d="M-16 -3 l-2 -3.4 M-16 3 l-2 3.4" stroke="#6b5a48" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M12 0 q4 1 5 4" fill="none" stroke="#bfb19a" strokeWidth="1" />
      </g>
    </g>
  );
}

/** The road's traffic from above: an auto-rickshaw (green, its yellow roof) and a cycle-rickshaw (its hood, the rider). */
function Vehicle({ id }: { id: (typeof VEHICLES)[number]["id"] }) {
  return id === "auto" ? (
    <g>
      <rect x="-12" y="-6" width="26" height="14" rx="3" fill="rgba(0,0,0,0.25)" />
      <rect x="-13" y="-7" width="26" height="14" rx="3" fill="#2f7a3c" />
      <rect x="-12" y="-6.5" width="17" height="13" rx="2.5" fill="#e8c13a" />
      <circle cx="11" cy="0" r="1.6" fill="#1b1b1b" />
    </g>
  ) : (
    <g>
      <rect x="-9" y="-6" width="20" height="13" rx="2" fill="rgba(0,0,0,0.22)" />
      <path d="M-10 -6 H10 M-10 6 H10" stroke="#2a2a2a" strokeWidth="1.2" />
      <rect x="2" y="-6" width="9" height="12" rx="3" fill="#8b2c2c" />
      <circle cx="-6" cy="0" r="3.2" fill="#2a211c" />
      <ellipse cx="-6" cy="0" rx="2" ry="4.4" fill="#d2c3a2" opacity="0.8" />
    </g>
  );
}

/** The lattice's pattern: pierced hexagons in the stone, the light coming through them. */
function JaliPattern({ id, stone }: { id: string; stone: string }) {
  const hex = (cx: number, cy: number) => Array.from({ length: 6 }, (_, index) => {
    const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
    return `${fixed(cx + 3.3 * Math.cos(angle))} ${fixed(cy + 3.3 * Math.sin(angle))}`;
  }).join(" L");
  return (
    <pattern id={id} width="12" height="20.8" patternUnits="userSpaceOnUse">
      <rect width="12" height="20.8" fill={stone} />
      <path d={`M${hex(6, 5.2)} Z M${hex(0, 15.6)} Z M${hex(12, 15.6)} Z`} fill="#f4dfbf" opacity="0.85" />
    </pattern>
  );
}

/** The window's cusped arch: the stone over the top corners, its edge a row of lobes. */
const SPRING = 56;
const APEX = 4;
const ARCH = (() => {
  const lobes = 8;
  const point = (theta: number): [number, number] => [W / 2 + (W / 2) * Math.cos(theta), SPRING - (SPRING - APEX) * Math.sin(theta)];
  let d = `M0 0 L0 ${SPRING}`;
  for (let lobe = 0; lobe < lobes; lobe += 1) {
    const [ax, ay] = point(Math.PI - (lobe * Math.PI) / lobes);
    const [bx, by] = point(Math.PI - ((lobe + 1) * Math.PI) / lobes);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const length = Math.hypot(mx - W / 2, my - SPRING) || 1;
    const push = 7;
    d += ` Q${fixed(mx + ((mx - W / 2) / length) * push)} ${fixed(my + ((my - SPRING) / length) * push)} ${fixed(bx)} ${fixed(by)}`;
  }
  return `${d} L${W} 0 Z`;
})();

function ParasolField({ params, setup, view, live, search, active, frames, art, still, sound, vibrate }: SearchFieldProps<ParasolParams, ParasolOutcome>) {
  const ids = useId().replace(/[^a-zA-Z0-9]/gu, "");
  const kinds = parasolKinds(params.at);
  const target = setup.targets[0];
  const ending = view.ending;
  const pointed = ending !== null && ending.kind !== "found";
  const spots = useRef<(SVGGElement | null)[]>([]);
  const sways = useRef<(SVGGElement | null)[]>([]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const vehicles = useRef<(SVGGElement | null)[]>([]);
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
        spots.current[index]?.setAttribute("transform", `translate(${fixed(at.x)} ${fixed(at.y)})`);
        sways.current[index]?.setAttribute("transform", `rotate(${fixed(at.sway)})`);
        const button = buttons.current[index];
        if (button) button.style.left = `${((at.x / W) * 100).toFixed(2)}%`;
      });
      VEHICLES.forEach((vehicle, index) => vehicles.current[index]?.setAttribute("transform", `translate(${fixed(vehicleX(vehicle, ms))} ${vehicle.y})`));
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

  const umbrella = (spot: ParasolSpot, index: number): ReactNode => {
    const place = PARASOL_FIELD[spot];
    const kind = kinds[spot];
    const at = parasolPosition(place, 0);
    const searched = view.searched.includes(index);
    const shown = searched || (pointed && index === target);
    return (
      <g key={spot} ref={(element) => { spots.current[index] = element; }} transform={`translate(${fixed(at.x)} ${fixed(at.y)})`}
        className="mg-parasol-search-umbrella" data-searched={searched || undefined} data-shown={shown || undefined}
        data-target={(shown && index === target) || undefined}>
        <ellipse cx="3" cy="4" rx={place.r} ry={place.r * 0.92} fill="rgba(30,20,15,0.28)" />
        {!place.walk && <Goods kind={kind} r={place.r} side={place.y > H / 2 ? -1 : 1} />}
        <Person kind={kind} r={place.r} />
        <g ref={(element) => { sways.current[index] = element; }} transform={`rotate(${fixed(at.sway)})`}>
          <g className="mg-parasol-search-canopy"><Canopy kind={kind} r={place.r} /></g>
        </g>
        {searched && index !== target && <circle className="mg-parasol-search-ring-wrong" r={place.r + 4} />}
        {shown && index === target && <circle className={pointed ? "mg-parasol-search-ring-pointed" : "mg-parasol-search-ring-found"} r={place.r + 5} />}
      </g>
    );
  };
  return (
    <div className="mg-parasol-search" data-ending={ending?.kind} data-art-street={art.street ? true : undefined} onPointerDown={active}>
      <svg className="mg-parasol-search-wall" aria-hidden="true" focusable="false">
        <defs><JaliPattern id={`${ids}w`} stone="#9b564c" /></defs>
        <rect width="100%" height="100%" fill={`url(#${ids}w)`} />
      </svg>
      <div className="mg-parasol-search-window">
        {art.street && <img className="mg-parasol-search-street-art" src={art.street} alt="" draggable={false} />}
        <svg className="mg-parasol-search-view" viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          <defs><JaliPattern id={`${ids}a`} stone="#a8625a" /></defs>
          {!art.street && <Street />}
          {!art.street && VEHICLES.map((vehicle, index) => (
            <g key={vehicle.id} ref={(element) => { vehicles.current[index] = element; }} transform={`translate(${fixed(vehicleX(vehicle, 0))} ${vehicle.y})`}>
              <g transform={vehicle.speed < 0 ? "scale(-1 1)" : undefined}><Vehicle id={vehicle.id} /></g>
            </g>
          ))}
          {PARASOL_SPOTS.map(umbrella)}
          <path d={ARCH} fill={`url(#${ids}a)`} stroke="#7d3f37" strokeWidth="2.4" />
        </svg>
        {PARASOL_SPOTS.map((spot, index) => {
          const place = PARASOL_FIELD[spot];
          const at = parasolPosition(place, 0);
          const searched = view.searched.includes(index);
          const found = searched && index === target;
          return (
            <button key={spot} type="button" ref={(element) => { buttons.current[index] = element; }} className="mg-parasol-search-spot"
              data-testid={`minigame-spot-${index}`} data-minigame-primary={index === 0 || undefined} aria-disabled={!live || searched || undefined}
              aria-label={`${KINDS[kinds[spot]].labelJa}${found ? "：見つけた" : searched ? "：違った" : ""}`}
              style={{ left: `${((at.x / W) * 100).toFixed(2)}%`, top: `${((at.y / H) * 100).toFixed(2)}%`, "--spot-r": place.r } as CSSProperties}
              onClick={() => { if (live && !searched) search(index); }} />
          );
        })}
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
