import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { SearchFieldProps, SearchSkin, SearchView } from "../engines/search/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import {
  PARASOL_CHILDREN, PARASOL_CUSTOMERS, PARASOL_PLACES, PARASOL_SPOTS, PARASOL_TUNING, parasolGameFor, parasolRulesFor, parasolTargets,
  type ParasolOutcome, type ParasolParams, type ParasolPlace, type ParasolSpot, type ParasolTuning,
} from "./rules";
import "./skin.css";

// The parasol's field (a search skin): a lattice window of the palace's upper floor (the pierced stone wall round it, a
// cusped arch over it, a sill under it), and through it the old city's street from above: the far pavement with five
// stalls, the road with three people walking to and fro under umbrellas (a cow, an auto-rickshaw and a cycle-rickshaw
// among them), the near pavement under the window with five stalls. Three rounds, the three things the heroine later
// tells the seller she saw: her old parasol (a looked-at umbrella slides aside to show who is under it; hers stays aside
// after), then the customers come to the stalls (one argues with her over the price, its ₹ in a jagged burst; two more
// have their arms up, glad or stretching), then children walk by (one holds the tomato she gave, its green crown on it;
// others a red ball or a red flower). The hints say what to find, never where. The window takes most of the field's height, as wide as the field allows; places are in % of the window, sizes
// in a unit of its width (`--u`). Which stall stands where, what the customers do and what the children hold is shuffled
// by the seed (looks only: her stall is the tag's `at`; the arguing customer is hers, the tomato child the second). With the use's art (`art.street`), that picture in place of the drawn street, cow
// and traffic, as the back layer (the host's mg-photo); the umbrellas, stalls and people are drawn by the game either way,
// as the play layer (mg-play-object: a dark edge and a shadow under them). Each round's find: a ring from it.

/** What an umbrella looks like and what is under it. */
export type ParasolKind =
  | "juice" | "chai" | "fruit" | "bangles" | "spices" | "greens" | "old" | "marigold" | "old_garland" | "new_greens"
  | "black" | "floral" | "white";
interface KindLook {
  /** Its panels, every other one. */
  panels: readonly [string, string];
  rib: string;
  /** Worn: a sewn patch, a frayed edge, a bent rib (the old parasols). */
  worn?: boolean;
  /** Who is under it, seen from above: shoulders, then the head (hair, or a cloth over it). */
  person: readonly [string, string];
  /** The cloth or cart in front of it (none for a walker). */
  stall: string | null;
  /** Its button's name: the colour and the stall or walker under it (what the picture shows), never whose it is. */
  labelJa: string;
  /** The stall, as a customer's place is named (「…の前の客」). */
  stallJa: string;
}
const KINDS: Record<ParasolKind, KindLook> = {
  juice: { panels: ["#c63f2c", "#f1e9dc"], rib: "#7d2a1e", person: ["#3f6ea6", "#2a211c"], stall: "#3f7f55", labelJa: "赤白の縞の傘、ジュースの屋台", stallJa: "ジュースの屋台" },
  chai: { panels: ["#d8c59d", "#ccb68b"], rib: "#8d7752", worn: true, person: ["#f2eee4", "#2a211c"], stall: "#7b5636", labelJa: "古い日傘、チャイの屋台", stallJa: "チャイの屋台" },
  fruit: { panels: ["#2d68ad", "#3a78c0"], rib: "#1d4675", person: ["#7a8c5a", "#e08a2a"], stall: "#8a6440", labelJa: "青い傘、果物の荷車", stallJa: "果物の荷車" },
  bangles: { panels: ["#e9c43a", "#f2d35a"], rib: "#9a7a14", person: ["#9b3f8c", "#2a211c"], stall: "#5b3a6e", labelJa: "黄色い傘、腕輪の店", stallJa: "腕輪の店" },
  spices: { panels: ["#8c4a2f", "#9d5a3a"], rib: "#5a2c18", person: ["#d9c79a", "#2a211c"], stall: "#6e5a3c", labelJa: "茶色の傘、香辛料の店", stallJa: "香辛料の店" },
  greens: { panels: ["#2e9852", "#3aa863"], rib: "#1d6537", person: ["#5c8a3c", "#2a211c"], stall: "#8c6f4b", labelJa: "緑の傘、野菜の店", stallJa: "緑の傘の野菜の店" },
  old: { panels: ["#c4a77b", "#b99c70"], rib: "#7b6340", worn: true, person: ["#b8323a", "#a52b33"], stall: "#56709d", labelJa: "古い日傘、野菜の店", stallJa: "古い日傘の野菜の店" },
  marigold: { panels: ["#e5862a", "#ee983b"], rib: "#9c5414", person: ["#e9d36a", "#2a211c"], stall: "#7a5a3c", labelJa: "橙の傘、花輪の店", stallJa: "花輪の店" },
  old_garland: { panels: ["#c9ad86", "#bda27a"], rib: "#7e6747", worn: true, person: ["#3d7d74", "#2a211c"], stall: "#7d4f6a", labelJa: "古い日傘、花輪の店", stallJa: "古い日傘の花輪の店" },
  new_greens: { panels: ["#f3ecd9", "#e9e0c8"], rib: "#a89a76", person: ["#c25a2a", "#2a211c"], stall: "#4f7a8f", labelJa: "新しい生成りの日傘、野菜の店", stallJa: "新しい日傘の野菜の店" },
  black: { panels: ["#24262b", "#30333a"], rib: "#0f1013", person: ["#c9c2b4", "#2a211c"], stall: null, labelJa: "黒い傘、車道を行く人", stallJa: "" },
  floral: { panels: ["#e48bb0", "#eea7c3"], rib: "#a65476", person: ["#2f8c8a", "#2a211c"], stall: null, labelJa: "花柄の日傘、車道を行く人", stallJa: "" },
  white: { panels: ["#eef1f4", "#dfe4ea"], rib: "#8d96a0", person: ["#6b5b8f", "#2a211c"], stall: null, labelJa: "白い傘、車道を行く人", stallJa: "" },
};
/** The stalls other than hers, shuffled over the stalls' places by the seed (the decoys: two more old parasols, two more vegetable stalls). */
const OTHER_STALLS: readonly ParasolKind[] = ["juice", "chai", "fruit", "bangles", "spices", "greens", "marigold", "old_garland", "new_greens"];
const WALKERS: Readonly<Record<"road_1" | "road_2" | "road_3", ParasolKind>> = { road_1: "black", road_2: "floral", road_3: "white" };

/** What a customer does (round 2): hers argues over the price; the others are shuffled by the seed (two with arms up too). */
export type ParasolGesture = "argue" | "ask" | "laugh" | "wave" | "basket" | "cheer" | "stretch";
const GESTURES: Record<ParasolGesture, string> = {
  argue: "両手を振り上げている",
  ask: "指を3本立てて、何か聞いている",
  laugh: "笑っている",
  wave: "片手を振っている",
  basket: "頭にかごを載せている",
  cheer: "喜んで両手を上げている",
  stretch: "伸びをしている",
};
const OTHER_GESTURES: readonly ParasolGesture[] = ["ask", "laugh", "wave", "basket", "cheer", "stretch"];
/** What each child holds (round 3): the second one the tomato she gave; the others shuffled by the seed (two red things too). */
export type ParasolHolding = "kite" | "tomato" | "ball" | "red_ball" | "flower";
const OTHER_HOLDINGS: readonly ParasolHolding[] = ["kite", "ball", "red_ball", "flower"];
const HOLDING_JA: Record<ParasolHolding, string> = {
  kite: "凧を持っている", tomato: "トマトを持っている", ball: "青いボールを持っている", red_ball: "赤いボールを持っている", flower: "赤い花を持っている",
};
/** Each child's shirt, by what they hold. */
const CHILD_BODY: Record<ParasolHolding, string> = { kite: "#6a9ad0", tomato: "#e8b84a", ball: "#c46a8a", red_ball: "#7aa05a", flower: "#9a7ac0" };

/**
 * Where each thing is (x, y in % of the window), its radius (in the window's unit), and, for one that walks, how far it
 * goes either way (% of the width) and its round trip (ms). Rows: the far pavement's stalls (22%), the customers' and
 * children's lane in front of them (37%), the road (52%), the near lane (66%), the near pavement's stalls (82%).
 */
interface Place {
  x: number;
  y: number;
  r: number;
  walk?: { amp: number; periodMs: number; phase: number };
}
const STALL_R = 16;
const ROW = { far: 22, farLane: 37, road: 52, nearLane: 66, near: 82 } as const;
export const PARASOL_FIELD: Record<ParasolSpot, Place> = {
  far_1: { x: 10, y: ROW.far, r: STALL_R },
  far_2: { x: 30, y: ROW.far, r: STALL_R },
  far_3: { x: 50, y: ROW.far, r: STALL_R },
  far_4: { x: 70, y: ROW.far, r: STALL_R },
  far_5: { x: 90, y: ROW.far, r: STALL_R },
  // The walkers stroll to and fro, the middle one against the others, never closer than a button.
  road_1: { x: 18, y: ROW.road, r: 12, walk: { amp: 6, periodMs: 17000, phase: 0 } },
  road_2: { x: 50, y: ROW.road, r: 12, walk: { amp: 6, periodMs: 17000, phase: Math.PI } },
  road_3: { x: 82, y: ROW.road, r: 12, walk: { amp: 6, periodMs: 17000, phase: 0 } },
  near_1: { x: 10, y: ROW.near, r: STALL_R },
  near_2: { x: 30, y: ROW.near, r: STALL_R },
  near_3: { x: 50, y: ROW.near, r: STALL_R },
  near_4: { x: 70, y: ROW.near, r: STALL_R },
  near_5: { x: 90, y: ROW.near, r: STALL_R },
};
/** The customers stand in front of their stalls, at the lane's edge. */
export const PARASOL_CUSTOMER_FIELD: Record<(typeof PARASOL_CUSTOMERS)[number], Place> = {
  far_2: { x: 30, y: ROW.farLane, r: 13 },
  far_3: { x: 50, y: ROW.farLane, r: 13 },
  far_4: { x: 70, y: ROW.farLane, r: 13 },
  near_1: { x: 10, y: ROW.nearLane, r: 13 },
  near_2: { x: 30, y: ROW.nearLane, r: 13 },
  near_3: { x: 50, y: ROW.nearLane, r: 13 },
  near_4: { x: 70, y: ROW.nearLane, r: 13 },
};
/** The children walk slowly along the lanes (9 to 10 seconds one way), each lane's in step (so never closer), apart. */
export const PARASOL_CHILD_FIELD: Record<(typeof PARASOL_CHILDREN)[number], Place> = {
  child_1: { x: 30, y: ROW.farLane, r: 14, walk: { amp: 14, periodMs: 18000, phase: 0 } },
  child_2: { x: 70, y: ROW.farLane, r: 14, walk: { amp: 14, periodMs: 18000, phase: 0 } },
  child_3: { x: 25, y: ROW.nearLane, r: 14, walk: { amp: 8, periodMs: 20000, phase: 1 } },
  child_4: { x: 50, y: ROW.nearLane, r: 14, walk: { amp: 8, periodMs: 20000, phase: 1 } },
  child_5: { x: 75, y: ROW.nearLane, r: 14, walk: { amp: 8, periodMs: 20000, phase: 1 } },
};

/** What stands at each stall for the tag's `at` and the seed: the old parasol at hers, the others shuffled. */
export function parasolKinds(at: ParasolPlace, seed = 0): Record<ParasolSpot, ParasolKind> {
  const random = seededRandom(seed);
  const others = [...OTHER_STALLS];
  for (let index = others.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [others[index], others[swap]] = [others[swap], others[index]];
  }
  const hers = PARASOL_PLACES[at] ?? PARASOL_PLACES.middle;
  return Object.fromEntries(PARASOL_SPOTS.map((spot) => {
    if (spot === hers) return [spot, "old"];
    if (spot in WALKERS) return [spot, WALKERS[spot as keyof typeof WALKERS]];
    return [spot, others.shift()!];
  })) as Record<ParasolSpot, ParasolKind>;
}

/** What each customer does for the tag's `at` and the seed: the one at her stall argues, the others shuffled. */
export function parasolGestures(at: ParasolPlace, seed = 0): ParasolGesture[] {
  const random = seededRandom(seed ^ 0x5bd1e995);
  const others = [...OTHER_GESTURES];
  for (let index = others.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [others[index], others[swap]] = [others[swap], others[index]];
  }
  const hers = parasolTargets({ at })[1];
  return PARASOL_CUSTOMERS.map((_, index) => (index === hers ? "argue" : others.shift()!));
}

/** What each child holds for the seed: the tomato child the tomato, the others shuffled. */
export function parasolHoldings(seed = 0): ParasolHolding[] {
  const random = seededRandom(seed ^ 0x27d4eb2f);
  const others = [...OTHER_HOLDINGS];
  for (let index = others.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [others[index], others[swap]] = [others[swap], others[index]];
  }
  const tomato = parasolTargets({ at: "middle" })[2];
  return PARASOL_CHILDREN.map((_, index) => (index === tomato ? "tomato" : others.shift()!));
}

/** Where a thing is at a time of the play (one that walks goes to and fro; with less motion, it stands at its start). */
export function parasolPosition(place: Place, ms: number): { x: number; y: number; sway: number } {
  if (!place.walk) return { x: place.x, y: place.y, sway: 0 };
  const { amp, periodMs, phase } = place.walk;
  return { x: place.x + amp * Math.sin((2 * Math.PI * ms) / periodMs + phase), y: place.y, sway: 6 * Math.sin(ms / 650 + phase) };
}

/** The road's traffic (looks only): where it starts and its lane (% of the window), its speed (% a second; minus: to the left). */
const VEHICLES = [
  { id: "auto", x: 10, y: 47, speed: 3.2 },
  { id: "cycle", x: 70, y: 58, speed: -2.2 },
] as const;
const vehicleX = (vehicle: (typeof VEHICLES)[number], ms: number) => {
  const span = 116;
  return ((((vehicle.x + 8 + (vehicle.speed * ms) / 1000) % span) + span) % span) - 8;
};
/** The cow, standing in the road between the walkers. */
const COW = { x: 34, y: 57 } as const;

const SOUNDS = { found: "clue_new", look: "ui_tap" } as const;
/** How long the round just over shows its find (or her pointing) over the next round. */
const RECENT_MS = 1200;
const ROUND_WORDS = [
  { hintJa: "野菜を並べた、古い日傘を押す", lookedJa: "見た傘" },
  { hintJa: "値段で揉めている客を押す", lookedJa: "見た人" },
  { hintJa: "トマトをもらった子どもを押す", lookedJa: "見た子" },
] as const;
const RIBS = 8;
const OUTLINE = "#2a211c";
const vertex = (index: number, r: number): [number, number] => {
  const angle = (index / RIBS) * Math.PI * 2 - Math.PI / 2 + Math.PI / RIBS;
  return [r * Math.cos(angle), r * Math.sin(angle)];
};
const fixed = (value: number) => value.toFixed(1);

/** An umbrella from above: eight panels whose edges dip between the ribs, the ribs, the tip, a dark edge; a worn one patched and frayed. */
function Canopy({ kind, r }: { kind: ParasolKind; r: number }) {
  const look = KINDS[kind];
  const panel = (index: number) => {
    const [ax, ay] = vertex(index, r);
    const [bx, by] = vertex(index + 1, r);
    const [cx, cy] = vertex(index + 0.5, 0.84 * r);
    return `M0 0 L${fixed(ax)} ${fixed(ay)} Q${fixed(cx)} ${fixed(cy)} ${fixed(bx)} ${fixed(by)} Z`;
  };
  const edge = Array.from({ length: RIBS }, (_, index) => {
    const [bx, by] = vertex(index + 1, r);
    const [cx, cy] = vertex(index + 0.5, 0.84 * r);
    return `Q${fixed(cx)} ${fixed(cy)} ${fixed(bx)} ${fixed(by)}`;
  }).join(" ");
  const [sx, sy] = vertex(0, r);
  // The worn ones differ in where they were mended: hers on the near side, the others elsewhere.
  const patch = kind === "old" ? 1 : kind === "chai" ? -1 : 0.4;
  return (
    <g>
      {Array.from({ length: RIBS }, (_, index) => (
        <path key={index} d={panel(index)} fill={look.worn && index === 0 ? "#d6c29c" : look.panels[index % 2]} />
      ))}
      {kind === "floral" && Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index + 0.5, r * 0.6);
        return <circle key={index} cx={fixed(x)} cy={fixed(y)} r={fixed(r * 0.12)} fill="#fff4f8" />;
      })}
      {look.worn && (
        <g transform={`rotate(${fixed(patch * 70)})`}>
          {/* A square of darker cloth sewn over one panel, its stitches showing, and a frayed edge on the far side. */}
          <path d={`M${fixed(r * 0.18)} ${fixed(r * 0.16)} L${fixed(r * 0.6)} ${fixed(r * 0.1)} L${fixed(r * 0.64)} ${fixed(r * 0.5)} L${fixed(r * 0.24)} ${fixed(r * 0.54)} Z`}
            fill="#86693f" stroke="#f0e2c4" strokeWidth="0.8" strokeDasharray="1.5 1.2" />
          <path d={`M${fixed(-r * 0.4)} ${fixed(-r * 0.86)} l2 2.6 l1.4 -2 l1.8 2.4 l1.6 -2.2 l1.8 2.6`} fill="none" stroke="#6e5736" strokeWidth="1" />
        </g>
      )}
      {Array.from({ length: RIBS }, (_, index) => {
        const [x, y] = vertex(index, r);
        // A worn one's ribs: one is bent.
        return look.worn && index === 5
          ? <path key={index} d={`M0 0 L${fixed(x * 0.55 + 2.4)} ${fixed(y * 0.55)} L${fixed(x)} ${fixed(y)}`} fill="none" stroke={look.rib} strokeWidth="1" />
          : <line key={index} x1="0" y1="0" x2={fixed(x)} y2={fixed(y)} stroke={look.rib} strokeWidth="0.9" />;
      })}
      <path d={`M${fixed(sx)} ${fixed(sy)} ${edge}`} fill="none" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round" />
      <circle r={fixed(Math.max(1.6, r * 0.09))} fill={look.rib} />
    </g>
  );
}

/** A person from above: shoulders, a head with the hair parted (or a cloth over it); hers in a red sari, its end over her grey hair. */
function Person({ body, head, r, sari = false, children }: { body: string; head: string; r: number; sari?: boolean; children?: ReactNode }) {
  return (
    <g transform={`scale(${fixed(r / 16)})`}>
      <ellipse cx="0" cy="2" rx="9" ry="5.6" fill={body} stroke={OUTLINE} strokeWidth="0.9" />
      {children}
      <circle cx="0" cy="0" r="4.6" fill={head} stroke={OUTLINE} strokeWidth="0.8" />
      <path d={sari ? "M-3.6 -1.4 Q0 -3.4 3.6 -1.4" : "M0 -4.2 V-0.6"} fill="none" stroke={sari ? "#c9c3ba" : "#6b5a4c"} strokeWidth="0.9" strokeLinecap="round" />
    </g>
  );
}

/** What a stall has out on its cloth in front of the umbrella: two heaps side by side (`side` −1 left, 1 right). */
function WaresSide({ kind, side }: { kind: ParasolKind; side: 1 | -1 }) {
  const heap = (points: readonly (readonly [number, number])[], radius: number, fill: string) => points.map(([dx, dy], index) => (
    <circle key={`${fill}-${index}`} cx={fixed(side * dx)} cy={fixed(dy)} r={radius} fill={fill} />
  ));
  const vegetables = side < 0 ? (
    <g>
      <path d="M-4 -6 v12 M0 -7 v12 M4 -6 v12" stroke="#f3f0e6" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M-4 -9 v3 M0 -10 v3 M4 -9 v3" stroke="#4f9a3a" strokeWidth="2.6" strokeLinecap="round" />
    </g>
  ) : (
    <g>
      {heap([[-3, -5], [2, -5], [-1, -0.6], [3.6, -0.4], [0.6, 3.8]], 2.3, "#d8342c")}
      {heap([[-3, 8], [1, 9], [4, 7]], 1.4, "#5d9a3a")}
    </g>
  );
  const garlands = (
    <g>
      {[-4, 5].map((dy) => Array.from({ length: 9 }, (_, index) => {
        const angle = (index / 9) * Math.PI * 2;
        return <circle key={`${dy}-${index}`} cx={fixed(4.2 * Math.cos(angle))} cy={fixed(dy + 4.2 * Math.sin(angle))} r="1.5" fill={index % 2 ? "#f4b93a" : "#ec7a1f"} />;
      }))}
    </g>
  );
  switch (kind) {
    // Radishes on one side, small tomatoes and okra on the other (hers and the new parasol's alike).
    case "old":
    case "new_greens": return vegetables;
    case "greens":
      // Cauliflowers on one side, aubergines and onions on the other.
      return side < 0 ? (
        <g>
          {heap([[0, -5], [-2, 4], [3, 5]], 4.2, "#5c9a46")}
          {heap([[0, -5], [-2, 4], [3, 5]], 3, "#f2eedf")}
        </g>
      ) : (
        <g>
          {[-4, 0, 4].map((dx) => <ellipse key={dx} cx={dx} cy="-4" rx="1.9" ry="4.6" fill="#5b2d6e" />)}
          {heap([[-3, 7], [1, 8], [4.4, 6.4]], 2, "#b06070")}
        </g>
      );
    case "marigold":
    case "old_garland": return garlands;
    case "chai":
      // The kettle on its stove on one side, little glasses on the other.
      return side < 0 ? (
        <g>
          <circle r="5" fill="#2b2b2b" />
          <circle r="3.6" fill="#b7b9bc" />
          <path d="M3 -2 l3 -3" stroke="#b7b9bc" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      ) : <g>{heap([[-3, -5], [2, -5], [-3, 0], [2, 0], [-0.5, 5]], 1.7, "#e9c98a")}</g>;
    case "juice":
      // A bundle of canes on one side, the crank wheel on the other.
      return side < 0
        ? <path d="M-4 -9 v18 M0 -9 v18 M4 -9 v18" stroke="#9bbf5a" strokeWidth="2.2" strokeLinecap="round" />
        : <circle cx="0" cy="0" r="5.6" fill="none" stroke="#e8e2d4" strokeWidth="1.6" />;
    case "fruit":
      // Bananas on one side, pomegranates and oranges on the other.
      return side < 0 ? (
        <g>{[-4, 0, 4].map((dx) => <path key={dx} d={`M${dx} -8 q3 6 0 13`} fill="none" stroke="#f0cf3c" strokeWidth="2.2" strokeLinecap="round" />)}</g>
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
            <ellipse key={dy} cx="0" cy={dy} rx="4.6" ry="2.4" fill="none" stroke={colour as string} strokeWidth="1.6" />
          ))}
        </g>
      );
    case "spices":
      // Open sacks of ground spice: turmeric, chilli, and a darker one.
      return (
        <g>
          {heap([[0, -5]], 4.4, "#7a5a3a")}
          {heap([[0, -5]], 3.4, side < 0 ? "#e8b52a" : "#c2391f")}
          {heap([[0, 6]], 4.4, "#7a5a3a")}
          {heap([[0, 6]], 3.4, side < 0 ? "#8a4a22" : "#d98a2a")}
        </g>
      );
    default:
      return null;
  }
}

/** Which way a stall's cloth lies from its umbrella: toward the road (down across the road from the far pavement, up from the near). */
const frontOf = (place: Place) => (place.y < ROW.road ? 1 : -1);

/** One umbrella with who is under it and its stall's cloth in front, in its own drawing (units of the window; the button sizes it). */
function Umbrella({ kind, place, ring, swayRef }: { kind: ParasolKind; place: Place; ring: Ring; swayRef?: (element: SVGGElement | null) => void }) {
  const { r } = place;
  const reach = r * 2.4;
  const look = KINDS[kind];
  const at = parasolPosition(place, 0);
  const front = frontOf(place);
  const scale = (0.62 * r) / 16;
  return (
    <svg className="mg-parasol-search-unit" viewBox={`${-reach} ${-reach} ${reach * 2} ${reach * 2}`} style={{ "--reach": reach } as CSSProperties}
      aria-hidden="true" focusable="false">
      {look.stall && (
        <g transform={`translate(0 ${fixed(front * r * 1.05)})`}>
          <rect x={fixed(-r * 1.15)} y={fixed(-r * 0.5)} width={fixed(r * 2.3)} height={fixed(r)} rx="2" fill={look.stall} stroke={OUTLINE} strokeWidth="0.8" />
          <g transform={`translate(${fixed(-r * 0.55)} 0) scale(${fixed(scale)})`}><WaresSide kind={kind} side={-1} /></g>
          <g transform={`translate(${fixed(r * 0.55)} 0) scale(${fixed(scale)})`}><WaresSide kind={kind} side={1} /></g>
        </g>
      )}
      {/* The shadow straight under it (the sun is high), then who is under it. */}
      <ellipse cx="0" cy={fixed(r * 0.2)} rx={fixed(r * 1.02)} ry={fixed(r * 0.94)} fill="rgba(30,20,15,0.32)" />
      <Person body={look.person[0]} head={look.person[1]} r={r} sari={kind === "old"} />
      <g ref={swayRef} transform={`rotate(${fixed(at.sway)})`}>
        <g className="mg-parasol-search-canopy"><Canopy kind={kind} r={r} /></g>
      </g>
      <RingMark ring={ring} r={r} />
    </svg>
  );
}

type Ring = "wrong" | "found" | "pointed" | null;
function RingMark({ ring, r }: { ring: Ring; r: number }) {
  if (ring === "wrong") return <circle className="mg-parasol-search-ring-wrong" r={r + 3} />;
  if (ring === "found") return <circle className="mg-parasol-search-ring-found" r={r + 4} />;
  if (ring === "pointed") return <circle className="mg-parasol-search-ring-pointed" r={r + 4} />;
  return null;
}

/** A customer at a stall, from above, by what they do (their marks drawn plainly: an argument's jagged burst, a laugh's notes). */
function Customer({ gesture, place, ring }: { gesture: ParasolGesture; place: Place; ring: Ring }) {
  const { r } = place;
  const reach = r * 2.4;
  // They face the stall: up from the far lane's edge toward the far pavement, down toward the near one.
  const face = place.y < ROW.road ? -1 : 1;
  const arms: Record<ParasolGesture, ReactNode> = {
    argue: <path d={`M-8 ${2 * face} l-5 ${7 * face} M8 ${2 * face} l5 ${7 * face}`} stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />,
    // An arm out to the stall, three fingers up at its end.
    ask: <path d={`M5 ${2 * face} l3 ${7 * face} m-1.6 0 v${fixed(2.4 * face)} m1.6 ${fixed(-2.4 * face)} v${fixed(2.6 * face)} m1.6 ${fixed(-2.6 * face)} v${fixed(2.4 * face)}`}
      stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />,
    laugh: null,
    wave: <path d={`M8 0 l7 ${-5 * face}`} stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />,
    basket: null,
    // Both arms up as well, wide apart (glad), or close together over the head (stretching): no ₹ burst.
    cheer: <path d={`M-8 ${1 * face} l-7 ${4 * face} M8 ${1 * face} l7 ${4 * face}`} stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />,
    stretch: <path d={`M-3 ${3 * face} l-1 ${9 * face} M3 ${3 * face} l1 ${9 * face}`} stroke={OUTLINE} strokeWidth="2.4" strokeLinecap="round" />,
  };
  const colours: Record<ParasolGesture, [string, string]> = {
    argue: ["#d0a03a", "#2a211c"], ask: ["#4f6fa8", "#2a211c"], laugh: ["#a8486a", "#2a211c"], wave: ["#5f8f5a", "#2a211c"], basket: ["#e2dccb", "#2a211c"],
    cheer: ["#c8642a", "#2a211c"], stretch: ["#7a6aa8", "#2a211c"],
  };
  const mark = gesture === "argue" ? (
    <g transform={`translate(0 ${fixed(face * r * 1.4)})`}>
      <path d="M-9 0 L-5 -3 L-6 -8 L-1 -5 L2 -9 L4 -4 L9 -5 L6 0 L9 4 L4 4 L2 9 L-1 5 L-6 8 L-5 3 Z" fill="#fff4dc" stroke="#b2241f" strokeWidth="1.2" />
      <text y="2.6" textAnchor="middle" fontSize="7.4" fontWeight="700" fill="#b2241f">₹!</text>
    </g>
  ) : gesture === "ask" ? (
    <g transform={`translate(${fixed(r * 1.3)} ${fixed(-r * 0.9)})`}>
      <ellipse rx="6" ry="4.6" fill="#fffaf1" stroke={OUTLINE} strokeWidth="0.9" />
      <text y="2.4" textAnchor="middle" fontSize="6.4" fontWeight="700" fill={OUTLINE}>?</text>
    </g>
  ) : gesture === "laugh" ? (
    <g transform={`translate(${fixed(r * 1.3)} ${fixed(-r * 0.9)})`}>
      <ellipse rx="6" ry="4.6" fill="#fffaf1" stroke={OUTLINE} strokeWidth="0.9" />
      <text y="2.4" textAnchor="middle" fontSize="6.4" fontWeight="700" fill="#a8486a">♪</text>
    </g>
  ) : gesture === "basket" ? <circle r="6.4" fill="#c99a5a" stroke={OUTLINE} strokeWidth="1" strokeDasharray="2 1.2" /> : gesture === "cheer" ? (
    // Glad: two small yellow sparkles by the head.
    <g fill="#f2c230" stroke={OUTLINE} strokeWidth="0.6">
      {[-1, 1].map((side) => (
        <path key={side} transform={`translate(${fixed(side * r * 0.9)} ${fixed(-face * r * 0.9)})`} d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" />
      ))}
    </g>
  ) : null;
  return (
    <svg className="mg-parasol-search-unit" viewBox={`${-reach} ${-reach} ${reach * 2} ${reach * 2}`} style={{ "--reach": reach } as CSSProperties}
      aria-hidden="true" focusable="false">
      <ellipse cx="0" cy={fixed(r * 0.25)} rx={fixed(r * 0.9)} ry={fixed(r * 0.6)} fill="rgba(30,20,15,0.3)" />
      <Person body={colours[gesture][0]} head={colours[gesture][1]} r={r * 1.3}>{arms[gesture]}</Person>
      {gesture === "basket" && <g transform={`scale(${fixed((r * 1.3) / 16)})`}>{mark}</g>}
      {gesture !== "basket" && mark}
      <RingMark ring={ring} r={r * 1.25} />
    </svg>
  );
}

/** A child walking by, from above, with what they hold out in front (a tomato's green crown, a kite's tail, a ball's stripe, a flower's stem). */
function Child({ holding, place, ring }: { holding: ParasolHolding; place: Place; ring: Ring }) {
  const { r } = place;
  const reach = r * 2.6;
  const held = holding === "tomato" ? (
    <g transform="translate(0 -11)">
      <circle r="4.4" fill="#d8342c" stroke={OUTLINE} strokeWidth="0.9" />
      <path d="M0 -4.4 l1.4 2 l2 -0.6 l-1 1.8 l1.6 1.4 l-2.4 0 l-1.6 1.4 l-1.6 -1.4 l-2.4 0 l1.6 -1.4 l-1 -1.8 l2 0.6 Z" fill="#4f9a3a" />
    </g>
  ) : holding === "kite" ? (
    <g transform="translate(0 -12)">
      <path d="M0 -6 L5 0 L0 6 L-5 0 Z" fill="#f2c230" stroke={OUTLINE} strokeWidth="0.9" />
      <path d="M0 6 q3 4 0 7 q-3 3 0 6" fill="none" stroke={OUTLINE} strokeWidth="0.8" />
    </g>
  ) : holding === "flower" ? (
    <g transform="translate(0 -11)">
      <path d="M0 2 q1 5 -1 8" fill="none" stroke="#4f9a3a" strokeWidth="1.2" />
      {[0, 1, 2, 3, 4].map((petal) => {
        const angle = (petal / 5) * Math.PI * 2 - Math.PI / 2;
        return <circle key={petal} cx={fixed(2.6 * Math.cos(angle))} cy={fixed(2.6 * Math.sin(angle))} r="2" fill="#d8342c" stroke={OUTLINE} strokeWidth="0.5" />;
      })}
      <circle r="1.4" fill="#f2c230" />
    </g>
  ) : (
    <g transform="translate(0 -11)">
      <circle r="4.4" fill={holding === "red_ball" ? "#d8342c" : "#2f6fc0"} stroke={OUTLINE} strokeWidth="0.9" />
      <path d="M-4.2 -1 Q0 1.6 4.2 -1" fill="none" stroke="#fffaf1" strokeWidth="1.2" />
    </g>
  );
  return (
    <svg className="mg-parasol-search-unit" viewBox={`${-reach} ${-reach} ${reach * 2} ${reach * 2}`} style={{ "--reach": reach } as CSSProperties}
      aria-hidden="true" focusable="false">
      <ellipse cx="0" cy={fixed(r * 0.25)} rx={fixed(r * 0.8)} ry={fixed(r * 0.55)} fill="rgba(30,20,15,0.3)" />
      <Person body={CHILD_BODY[holding]} head="#2a211c" r={r * 1.1}>
        <path d="M-6 -1 l4 -5 M6 -1 l-4 -5" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />
      </Person>
      <g transform={`scale(${fixed((r * 1.1) / 16)})`}>{held}</g>
      <RingMark ring={ring} r={r * 1.5} />
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
          <rect x={index * 40} y="0" width="40" height="9" fill={fill} />
          <rect x={index * 40 + 12} y="1.5" width="16" height="5" fill="#3b2a24" />
          <rect x={index * 40 + 2} y="6" width="36" height="3" fill={index % 2 ? "#e9d9b5" : "#3f7f8c"} />
        </g>
      ))}
      <rect y="9" width="240" height="34" fill="#d6bea5" />
      {[20, 32].map((y) => <path key={y} d={`M0 ${y} H240`} stroke="#c9ae94" {...line} />)}
      <rect y="43" width="240" height="1.5" fill="#a8927d" />
      <rect y="44.5" width="240" height="17" fill="#6f675f" />
      <ellipse cx="60" cy="49" rx="44" ry="3" fill="#7c7369" opacity="0.6" />
      <ellipse cx="180" cy="57" rx="50" ry="3" fill="#7c7369" opacity="0.5" />
      <path d="M0 53 H240" stroke="#8a8178" strokeDasharray="10 8" {...line} />
      <rect y="61.5" width="240" height="1.5" fill="#a8927d" />
      {[72, 92].map((y) => <path key={y} d={`M0 ${y} H240`} stroke="#cc9e8e" {...line} />)}
      {[34, 94, 154, 214].map((x) => <path key={x} d={`M${x} 63 V100`} stroke="#cc9e8e" {...line} />)}
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

/** The top band: the round, and how many wrong ones were looked at in it (its thing, last in the list once found, not counted). */
function status(view: SearchView): string {
  const round = Math.min(view.round, ROUND_WORDS.length - 1);
  const looked = view.searched.length - (view.done[round]?.found ? 1 : 0);
  return `${round + 1}/${view.total}　${ROUND_WORDS[round].lookedJa} ${looked}`;
}

function ParasolField({ params, setup, view, live, search, active, frames, art, seed, still, sound, vibrate }: SearchFieldProps<ParasolParams, ParasolOutcome>) {
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const jali = `${useId().replace(/[^a-zA-Z0-9]/gu, "")}jali`;
  const kinds = useMemo(() => parasolKinds(params.at, seed), [params.at, seed]);
  const gestures = useMemo(() => parasolGestures(params.at, seed), [params.at, seed]);
  const holdings = useMemo(() => parasolHoldings(seed), [seed]);
  const targets = setup.rounds.map((round) => round.targets[0]);
  const round = view.round;
  const ending = view.ending;
  const walkers = useRef(new Map<string, HTMLElement | null>());
  const sways = useRef(new Map<string, SVGGElement | null>());
  const vehicles = useRef<(HTMLSpanElement | null)[]>([]);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  // The round just over, for a moment over the next: its find, or her pointing at it.
  const [recent, setRecent] = useState<{ round: number; found: boolean; at: number } | null>(null);
  const fieldRef = useRef<HTMLDivElement>(null);

  // Whatever walks walks on the play's clock (a paused play holds it); with less motion, all stand still.
  useEffect(() => {
    if (still) return undefined;
    const walking = [
      ...PARASOL_SPOTS.filter((spot) => PARASOL_FIELD[spot].walk).map((spot) => [spot, PARASOL_FIELD[spot]] as const),
      ...PARASOL_CHILDREN.map((child) => [child, PARASOL_CHILD_FIELD[child]] as const),
    ];
    return frames((ms) => {
      for (const [id, place] of walking) {
        const at = parasolPosition(place, ms);
        const element = walkers.current.get(id);
        if (element) element.style.left = `${at.x.toFixed(2)}%`;
        sways.current.get(id)?.setAttribute("transform", `rotate(${fixed(at.sway)})`);
      }
      VEHICLES.forEach((vehicle, index) => {
        const element = vehicles.current[index];
        if (element) element.style.left = `${vehicleX(vehicle, ms).toFixed(2)}%`;
      });
    });
  }, [frames, still]);
  // A look (by hand or by おまかせ): a soft tap; a find, the chime.
  const roundsOver = useRef(0);
  useEffect(() => {
    const last = view.last;
    const over = view.done.length > roundsOver.current;
    roundsOver.current = view.done.length;
    if (!last || !("spot" in last.action)) return;
    if (over && view.done[view.done.length - 1].found) {
      play.current.sound(SOUNDS.found);
      play.current.vibrate("clue");
      // A ring from the thing found (the last round's find ends the play: the host's finish comes over it).
      const found = fieldRef.current?.querySelector(`[data-found-of="${view.done.length - 1}"]`) ?? null;
      kitRef.current.juice.burst(found, "ring");
    } else play.current.sound(SOUNDS.look);
  }, [view.last]); // each action once
  // A round over: its find (or her pointing) shown a moment over the next round.
  useEffect(() => {
    const count = view.done.length;
    if (!count || !view.last) return undefined;
    const at = view.last.at;
    setRecent({ round: count - 1, found: view.done[count - 1].found, at });
    // The next round's first place takes the focus when the pressed place went with the round (its buttons are new).
    // The page is read through the field's own node (ownerDocument), not the global: skins stay free of page globals
    // (story-validation-cache.test.ts), since the story validator loads them through their definitions.
    const field = fieldRef.current;
    const page = field?.ownerDocument;
    if (count < setup.rounds.length && field && page && (!page.activeElement || page.activeElement === page.body))
      field.querySelector<HTMLElement>("[data-first]")?.focus({ preventScroll: true });
    return frames((ms) => { if (ms - at >= RECENT_MS) setRecent((current) => (current?.at === at ? null : current)); });
  }, [view.done.length]); // each round over once

  /** A wrong one looked at in the round on show. */
  const wrongLook = (roundIndex: number, index: number) => roundIndex === round && index !== targets[roundIndex] && view.searched.includes(index);
  // A thing's ring: a wrong look in the round on show; the find or her pointing, for the round just over or at the end.
  const ringOf = (roundIndex: number, index: number): Ring => {
    if (wrongLook(roundIndex, index)) return "wrong";
    const over = view.done[roundIndex];
    const showing = (recent?.round === roundIndex) || (ending !== null && roundIndex === view.done.length - 1);
    if (over && showing && index === targets[roundIndex]) return over.found ? "found" : "pointed";
    return null;
  };
  /** A thing of a round: a button while its round is on show (the last stays one at the end), else a drawing only. */
  const thing = (roundIndex: number, index: number, labelJa: string, place: Place, id: string, drawing: ReactNode, shown = false) => {
    const searched = wrongLook(roundIndex, index);
    const interactive = roundIndex === round;
    const at = parasolPosition(place, 0);
    const style = { left: `${at.x.toFixed(2)}%`, top: `${at.y}%`, "--r": place.r } as CSSProperties;
    const ref = (element: HTMLElement | null) => { if (place.walk) walkers.current.set(id, element); };
    const marks = {
      "data-walker": place.walk ? true : undefined, "data-searched": searched || undefined, "data-shown": shown || undefined,
      "data-found-of": index === targets[roundIndex] ? roundIndex : undefined,
    };
    if (!interactive) return <span key={id} ref={ref} className="mg-parasol-search-spot mg-play-object" {...marks} style={style} aria-hidden="true">{drawing}</span>;
    return (
      <button key={id} type="button" ref={ref} className="mg-parasol-search-spot mg-play-object" data-testid={`minigame-spot-${index}`}
        data-first={index === 0 || undefined} {...marks}
        aria-disabled={!live || searched || undefined} aria-label={`${labelJa}${searched ? "：違った" : ""}`} style={style}
        onClick={(event) => {
          if (live && !searched) search(index);
          // One looked at already: a small refusal, never a dead tap.
          else if (live) kit.juice.denied(event.currentTarget);
        }}>
        {drawing}
      </button>
    );
  };

  // Her stall stays shown once round 1 is over (the parasol aside: her, in her red sari, at her vegetables).
  const herStall = targets[0];
  // The customers while round 2 is on show; after it, a moment more for hers only (the find, or her pointing at it).
  const customerShown = (index: number) => round === 1 || (recent?.round === 1 && index === targets[1]);
  const childrenShown = round >= 2;
  return (
    <div className="mg-parasol-search" ref={fieldRef} data-round={Math.min(round, setup.rounds.length - 1) + 1} data-ending={ending?.kind}
      data-art-street={art.street ? true : undefined} onPointerDown={active}>
      <svg className="mg-parasol-search-wall" aria-hidden="true" focusable="false">
        <defs><JaliPattern id={jali} /></defs>
        <rect width="100%" height="100%" fill={`url(#${jali})`} />
      </svg>
      <div className="mg-parasol-search-window">
        {art.street ? <img className="mg-parasol-search-street mg-photo" src={art.street} alt="" draggable={false} /> : (
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
          const kind = kinds[spot];
          const place = PARASOL_FIELD[spot];
          const shown = (round === 0 && view.searched.includes(index)) || (view.done.length > 0 && index === herStall);
          const drawing = <Umbrella kind={kind} place={place} ring={ringOf(0, index)} swayRef={(element) => { sways.current.set(spot, element); }} />;
          return thing(0, index, KINDS[kind].labelJa, place, spot, drawing, shown);
        })}
        {PARASOL_CUSTOMERS.map((stall, index) => {
          if (!customerShown(index)) return null;
          const place = PARASOL_CUSTOMER_FIELD[stall];
          const gesture = gestures[index];
          const labelJa = `${KINDS[kinds[stall]].stallJa}の前の客、${GESTURES[gesture]}`;
          return thing(1, index, labelJa, place, `customer-${stall}`, <Customer gesture={gesture} place={place} ring={ringOf(1, index)} />);
        })}
        {childrenShown && PARASOL_CHILDREN.map((child, index) => {
          const place = PARASOL_CHILD_FIELD[child];
          const holding = holdings[index];
          return thing(2, index, `通りを行く子ども、${HOLDING_JA[holding]}`, place, child, <Child holding={holding} place={place} ring={ringOf(2, index)} />);
        })}
        <svg className="mg-parasol-search-arch" viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path d={ARCH} fill="#a8625a" stroke="#7d3f37" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="mg-parasol-search-sill" aria-hidden="true" />
      </div>
    </div>
  );
}

/** The parasol as a search skin for a tuning (Debug's room retunes it): its game, rules, words and field. */
export const parasolSkinFor = (tuning: ParasolTuning): SearchSkin<ParasolParams, ParasolOutcome> => ({
  game: parasolGameFor(tuning),
  rules: parasolRulesFor(tuning),
  hintJa: (view) => ROUND_WORDS[Math.min(view.round, ROUND_WORDS.length - 1)].hintJa,
  buttons: [{ id: "ask", labelJa: "どこ？", hintJa: "いま探しているものがどこか、彼女に指さしてもらいます。", tone: "secondary" }],
  autoJa: "おまかせで探しています",
  // The child found and ringed (or pointed out), before the outcome shows.
  endDelayMs: (_, still) => (still ? 700 : 1400),
  statusJa: (view) => status(view),
  Field: ParasolField,
});
export const parasolSkin = parasolSkinFor(PARASOL_TUNING);
