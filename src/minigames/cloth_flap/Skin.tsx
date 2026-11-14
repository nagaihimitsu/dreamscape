import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapGaugeProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { CLOTH_STEPS, CLOTH_TUNING, clothFlapRulesFor, clothPlan, type ClothFlapOutcome, type ClothFlapParams, type ClothMove, type ClothPlan, type ClothPose, type ClothTuning } from "./rules";
import "./skin.css";

// The flap's field (a cue_tap skin): the view from inside a niche of the stepwell, through its arch. The stairs cross the
// view from the upper left down to the lower right; Jasmeet comes down them warily (rules.ts clothPlan: three steady
// steps, a stop while a boy runs past, a freeze in front of the gold step with a foot reached toward it, a step back up,
// bobbing in time, a held bob, a leap onto the gold step). The player's hands hold the folded cloth at the bottom of the
// niche. Everything sits on a stage of a fixed shape (3:4, as large as the field holds; dark stone around it), so a
// stairs picture's steps stay under her feet on every screen. With the use's art (`art.stairs`, `art.walker`) the drawn
// stairs and figure give way to those pictures; a far-wall picture (`art.wall`, e.g. a photo) takes the drawn wall's place
// only, the stairs drawn over it.
//
// Her walk is the judgement drawn: she stands on the gold step exactly through the perfect window. So a perfect flap
// always finds her on it, an early one before (up the stairs, frozen, reaching, bobbing, or in the leap's air), a late one
// stepping off it (she finishes that step, then turns). In place of the meter, the gauge marks the step she is on: one
// mark lights and one footstep rings as her foot lands on each (one goes out as she steps back), the gold one lit exactly
// while a flap is perfect. Each change is told before it: her look along the niches (？), her hands to her chest (…), her
// arms swung back as she bobs; the boy is smaller, in a red cap, quicker, his steps lighter, no mark lights for him.

type Foot = { x: number; y: number };
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

// In percent of the stage: where a foot is on step k (0 at the top; the gold one in front of the niche, the middle of the
// stage). A stairs picture (art.stairs) puts its steps on these points (the art request says so).
const STEP_X = 7.2;
const STEP_Y = 4.5;
const NICHE: Foot = { x: 50, y: 66 };
const footOn = (k: number): Foot => ({ x: NICHE.x + STEP_X * (k - CLOTH_STEPS.gold), y: NICHE.y + STEP_Y * (k - CLOTH_STEPS.gold) });
/** The last step she stands on (when nothing happens), and the last step drawn. */
const LAST_STEP = CLOTH_STEPS.last;
const LAST_DRAWN = LAST_STEP + 2;

/** The stairs' outline (a polygon in percent of the stage): a landing at the top on the left, then step after step down to the right. */
function stairsOutline(): string {
  const half = STEP_X / 2;
  const points: string[] = [`0 ${footOn(0).y}`];
  for (let k = 0; k <= LAST_DRAWN; k += 1) {
    const { x, y } = footOn(k);
    points.push(`${x + half} ${y}`, `${x + half} ${y + STEP_Y}`);
  }
  points.push("100 100", "0 100");
  return points.join(" ");
}
const STAIRS = stairsOutline();

/**
 * The stairs drawn (when the use gives no stairs picture): worn sandstone, each tread's edge catching the light with a
 * shadow under it, the joints of the blocks in the side of the flight.
 */
function DrawnStairs() {
  const half = STEP_X / 2;
  const steps = Array.from({ length: LAST_DRAWN + 1 }, (_, k) => ({ k, ...footOn(k) }));
  return (
    <svg className="mg-cloth-flap-stairs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="mg-cloth-flap-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b39470" />
          <stop offset="0.5" stopColor="#8a6c4c" />
          <stop offset="1" stopColor="#5e4834" />
        </linearGradient>
      </defs>
      <polygon points={STAIRS} fill="url(#mg-cloth-flap-stone)" />
      {steps.map(({ k, x, y }) => (
        <g key={k}>
          {/* The course of stone under the step (across the flight's side), and the shadow the tread's lip casts on it. */}
          <path d={`M0 ${y + STEP_Y} H ${x + half}`} className="mg-cloth-flap-joint" />
          <rect x={k === 0 ? 0 : x - half} y={y + 0.5} width={k === 0 ? x + half : STEP_X} height={1.1} className="mg-cloth-flap-lip-shadow" />
          <path d={`M${k === 0 ? 0 : x - half} ${y} H ${x + half}`} className="mg-cloth-flap-tread" />
        </g>
      ))}
    </svg>
  );
}

/** Where a walker of `moves` is at `ms`: on a step, or between two (how high the foot lifts: a leap lifts higher). */
function along(moves: readonly ClothMove[], ms: number): { foot: Foot; lift: number; step: number; moving: ClothMove | null } {
  let step = moves[0]?.from ?? 0;
  for (const move of moves) {
    if (ms < move.lift) break;
    if (ms < move.land) {
      const t = easeInOut(clamp01((ms - move.lift) / (move.land - move.lift)));
      const from = footOn(move.from);
      const to = footOn(move.to);
      const height = move.kind === "leap" ? 3.2 : move.kind === "back" ? 0.8 : 1;
      return { foot: { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, lift: height * Math.sin(Math.PI * t), step: move.from, moving: move };
    }
    step = move.to;
  }
  return { foot: footOn(step), lift: 0, step, moving: null };
}

/**
 * Her walk with a tuning (the story's, or Debug's room's edited one), for drawing: where her foot is, the step she is on
 * (the marks), her pose (the tells), how far she crouches as she bobs, when she next stands still, and when she stops.
 */
function clothWalk(tuning: ClothTuning) {
  const plan: ClothPlan = clothPlan(tuning);
  const { moment: nicheMs, end: endMs } = plan.script;
  const onGoldFrom = nicheMs - tuning.cleanEarlyMs;
  const offGoldAt = nicheMs + tuning.cleanLateMs;
  const walkerAt = (ms: number) => along(plan.moves, ms);
  /** The step she is on at `ms` (the one she left, while her foot is in the air). */
  const stepAt = (ms: number) => walkerAt(ms).step;
  /** Her pose at `ms` (the latest of the plan's from that time). */
  const poseAt = (ms: number): ClothPose => {
    let pose: ClothPose = "walk";
    for (const entry of plan.poses) if (ms >= entry.from) pose = entry.pose;
    return pose;
  };
  /** How far she crouches (0 to 1) as she bobs: down and up on each bob, down and held on the last, springing at the leap. */
  const crouchAt = (ms: number): number => {
    const leap = plan.moves.find((move) => move.kind === "leap");
    if (!leap || ms >= leap.lift) return 0;
    const half = tuning.bobMs / 2;
    const [first, second, held] = plan.bobs;
    if (ms >= held - half) return ms >= held ? 1 : Math.sin((Math.PI / 2) * clamp01((ms - (held - half)) / half));
    for (const bob of [first, second]) if (Math.abs(ms - bob) < half) return Math.cos((Math.PI / 2) * ((ms - bob) / half));
    return 0;
  };
  /** Her foot reaching toward the gold step (0 to 1) in the feint. */
  const reachAt = (ms: number): number => {
    const { lift, back } = plan.feint;
    if (ms <= lift || ms >= back) return 0;
    return Math.sin(Math.PI * ((ms - lift) / (back - lift)));
  };
  /** When she next stands still at or after `ms`: at once when she is standing on a step, else as her foot lands. */
  const standsAt = (ms: number): number => walkerAt(ms).moving?.land ?? ms;
  /**
   * When she stops walking: as the cloth spreads in front of her or as she sees it coming (she freezes there); a late flap
   * catches her stepping off the gold step, and she finishes that step before she turns (the story's 「もうくぼみの前の段
   * を離れていた」); without a flap, never (she walks on down to her last step).
   */
  const stopsAt = (outcome: ClothFlapOutcome | null, tapMs: number | null): number =>
    tapMs === null ? Number.POSITIVE_INFINITY : outcome === "late" ? standsAt(tapMs) : tapMs;
  /** Where the boy is at `ms`, or null before he appears and once he has run off the bottom of the stairs. */
  const boyAt = (ms: number): { foot: Foot; lift: number } | null => {
    if (ms < plan.boy[0].lift || ms >= plan.boy[plan.boy.length - 1].land) return null;
    const { foot, lift } = along(plan.boy, ms);
    return { foot, lift };
  };
  return { plan, nicheMs, endMs, onGoldFrom, offGoldAt, walkerAt, stepAt, poseAt, crouchAt, reachAt, standsAt, stopsAt, boyAt };
}
type ClothWalk = ReturnType<typeof clothWalk>;

/** After an early flap: the pigeon in the niche, startled by the cloth, bursts out this long after it. */
const PIGEON_AFTER_MS = 450;
const PIGEON_FLIGHT_MS = 650;
/** Where the pigeon is along its flight (0 to 1) at part `t` of it; with less motion, two still places (no glide). */
const pigeonAlong = (t: number, still: boolean) => (still ? (t < 0.5 ? 0.15 : 0.85) : clamp01(t));
/** The sounds of a play (definition `sounds`): one footstep a landing (its footfall 10 ms in), the cloth, the pigeon. */
const SOUNDS = { step: "footstep", cloth: "cloth_flap", pigeon: "pigeon_flutter" } as const;
/**
 * A footstep as her foot lands on step k: the player counts, and the gold step rings a little higher and louder; the
 * steps on down past the niche fade as she walks away. None once she stops. The boy's steps are lighter and higher.
 */
const footstepLevel = (k: number): { volume: number; rate?: number } =>
  k === CLOTH_STEPS.gold ? { volume: 1, rate: 1.15 } : k < CLOTH_STEPS.gold ? { volume: 0.75 } : { volume: 0.55 };
const BOY_STEP = { volume: 0.32, rate: 1.4 } as const;

/** Her reaction pose once the play is decided (over the walk's tells). */
type Pose = "scream" | "laugh" | "peek";
/**
 * Her reaction once the play is decided: what her figure does and the mark over her head, from when. The first is the
 * moment the field shows the outcome (the play ends there, the host's finish over it).
 */
function reactionOf(outcome: ClothFlapOutcome, tapMs: number | null, walk: ClothWalk): { at: number; react: Pose; turned: boolean; then?: { at: number; react: "scream" } } {
  switch (outcome) {
    case "perfect": return { at: (tapMs ?? 0) + 120, react: "scream", turned: false };
    case "early": return { at: (tapMs ?? 0) + 120, react: "laugh", turned: false, then: { at: (tapMs ?? 0) + PIGEON_AFTER_MS + 120, react: "scream" } };
    // Behind her back: she turns once her foot is down on the step past the niche.
    case "late": return { at: Math.max((tapMs ?? 0) + 160, walk.stopsAt(outcome, tapMs) + 40), react: "scream", turned: true };
    case "frozen": return { at: walk.endMs, react: "peek", turned: true };
  }
}

/**
 * The moment the field shows each outcome (group3 6.4's values): the stop on her, the burst at her (a scream's stars, a
 * turned-back scream's ring, the cloth's dust when she sees it coming), the shake only for the perfect scare; and the
 * heroine's face (she watches the prank from beside the niche). A freeze has nothing to strike.
 */
const IMPACTS: Readonly<Record<ClothFlapOutcome, { stopMs?: number; burst?: { kind: "star" | "ring" | "dust"; size: number; at: "walker" | "cloth" }; shake?: "s"; react: "laugh" | "oops" | "tease" }>> = {
  perfect: { stopMs: 90, burst: { kind: "star", size: 1.1, at: "walker" }, shake: "s", react: "laugh" },
  early: { burst: { kind: "dust", size: 0.9, at: "cloth" }, react: "oops" },
  late: { stopMs: 60, burst: { kind: "ring", size: 0.9, at: "walker" }, react: "laugh" },
  frozen: { react: "tease" },
};

/**
 * The heroine's one word while the play goes on (unvoiced; she watches beside the niche, in on the prank): a whisper as
 * Jasmeet freezes in front of the gold step. Her face shows in the corner with it.
 */
const WAIT_LINE_JA = "まだ……";

/**
 * The one coming down (drawn when the use gives no picture): a young woman side on, walking to the right, in the colours
 * of Jasmeet's standing picture without her dupatta (lent for the pigeon): a cream kurta, blue jeans, long black hair.
 * Her arms tell what she does: swinging as she walks, a hand shading her eyes as she looks along the niches, both hands
 * at her chest as she freezes, swung back as she bobs to leap; up to her face in a scream, a hand at her mouth as she
 * laughs. Her front leg reaches forward in the feint.
 */
function WalkerFigure({ pose, reach }: { pose: Pose | ClothPose | null; reach: boolean }) {
  const arms = pose === "scream" ? "M15 26 Q 8 18, 13 9 M27 26 Q 34 18, 29 9"
    : pose === "laugh" ? "M26 26 Q 33 22, 28 15 M15 26 Q 11 40, 13 52"
      : pose === "wary" ? "M26 26 Q 34 18, 30 10 M15 26 Q 12 40, 14 52"
        : pose === "freeze" ? "M15 27 Q 22 36, 24 30 M27 27 Q 28 36, 23 32"
          : pose === "gather" || pose === "hold" ? "M15 26 Q 6 38, 4 46 M27 26 Q 20 40, 16 48"
            : "M26 26 Q 32 40, 30 52";
  const legs = reach ? "M17 64 L 15 97 M25 64 L 37 90" : "M17 64 L 15 97 M25 64 L 29 97";
  return (
    <svg viewBox="0 0 40 104" className="mg-cloth-flap-walker-figure" aria-hidden="true">
      <path d="M17 10 Q 8 26, 11 48" fill="none" stroke="#1f1a17" strokeWidth="5" strokeLinecap="round" />
      <path d={legs} stroke="#4a6f9a" strokeWidth="6" strokeLinecap="round" />
      <path d={reach ? "M12 99 L 18 99 M35 92 L 41 92" : "M12 99 L 18 99 M27 99 L 34 99"} stroke="#6b4a30" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 22 L 28 22 L 32 70 L 10 70 Z" fill="#efe4cc" stroke="#6b5a45" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={arms} fill="none" stroke="#e4d6b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="21" cy="12" r="8" fill="#b98b6b" />
      <path d="M13 12 Q 14 2, 23 3 Q 29 4, 29 9 Q 22 7, 16 14 Z" fill="#1f1a17" />
      {pose === "scream" && <ellipse cx="26" cy="15.5" rx="1.8" ry="2.4" fill="#4a1f1a" />}
    </svg>
  );
}

/** The boy who runs down past her (drawn by the game in every look): small, a red cap, a teal shirt, running. */
function BoyFigure() {
  return (
    <svg viewBox="0 0 30 64" className="mg-cloth-flap-boy-figure" aria-hidden="true">
      <path d="M11 40 L 6 61 M19 40 L 25 60" stroke="#3b3a36" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M9 21 L 21 21 L 22 42 L 8 42 Z" fill="#2f8f88" stroke="#1d4f4b" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 23 L 3 32 M20 23 L 27 15" stroke="#9c6b4c" strokeWidth="3.6" strokeLinecap="round" />
      <circle cx="15" cy="12" r="6.5" fill="#9c6b4c" />
      <path d="M8.5 11 Q 15 3, 21.5 11 L 27 12 L 8.5 12 Z" fill="#c8352c" stroke="#6e1a14" strokeWidth="1" />
    </svg>
  );
}

/** A grey pigeon, wings up (drawn by the game in every look). */
function Pigeon() {
  return (
    <svg viewBox="0 0 60 40" className="mg-cloth-flap-pigeon-figure" aria-hidden="true">
      <path className="mg-cloth-flap-pigeon-wing" d="M30 22 Q 14 2, 2 6 Q 14 14, 24 26 Z" fill="#9aa0a6" />
      <ellipse cx="32" cy="26" rx="14" ry="8" fill="#7d838a" />
      <circle cx="46" cy="20" r="5.5" fill="#6d737a" />
      <path d="M51 20 L 56 21 L 51 23 Z" fill="#c9a06a" />
      <path className="mg-cloth-flap-pigeon-wing" d="M32 22 Q 44 0, 58 2 Q 46 14, 38 26 Z" fill="#b3b8bd" />
    </svg>
  );
}

/** The dupatta, spread wide between the player's hands: its hem flutters (two shapes in turn; one with less motion). */
function SpreadCloth() {
  return (
    <svg viewBox="0 0 100 44" className="mg-cloth-flap-cloth-spread" preserveAspectRatio="none" aria-hidden="true">
      <path className="mg-cloth-flap-hem-a" d="M3 6 Q 50 -2, 97 6 L 95 30 Q 86 40, 76 33 Q 64 43, 52 35 Q 40 43, 28 34 Q 16 42, 5 31 Z" />
      <path className="mg-cloth-flap-hem-b" d="M3 6 Q 50 -2, 97 6 L 96 33 Q 84 38, 72 35 Q 60 42, 48 34 Q 36 41, 24 35 Q 12 40, 4 29 Z" />
      <path className="mg-cloth-flap-cloth-fold" d="M30 4 Q 26 20, 30 36 M50 2 Q 47 20, 50 38 M70 4 Q 73 20, 70 36" />
    </svg>
  );
}

/** One of the player's hands, holding a corner of the cloth (the right one mirrored). */
function Fist({ side }: { side: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 22" className="mg-cloth-flap-fist" data-side={side} aria-hidden="true">
      <g transform={side === "right" ? "translate(24 0) scale(-1 1)" : undefined} fill="#e9c9a8" stroke="#5a3a24" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M3 9 Q 3 3, 9 3 L 17 3 Q 21 3, 21 7 L 21 14 Q 21 19, 15 19 L 8 19 Q 3 19, 3 14 Z" />
        <path d="M9 3 V 9 M13 3 V 9 M17 3 V 9" fill="none" />
      </g>
    </svg>
  );
}

/** Her steps' marks on the stairs: one on each step down to the gold one in front of the niche, lit up to the step she is on. */
function StepMarks({ on }: { on: number }) {
  return <>{Array.from({ length: CLOTH_STEPS.gold }, (_, index) => {
    const k = index + 1;
    const { x, y } = footOn(k);
    return <span key={k} className="mg-cloth-flap-mark-step" style={{ left: `${x}%`, top: `${y}%` }}
      data-gold={k === CLOTH_STEPS.gold || undefined} data-lit={on >= k || undefined} />;
  })}</>;
}

/** The mark over her head for a tell (before any reaction): ？ as she looks along the niches, … as she freezes. */
const TELL_MARK: Partial<Record<ClothPose, string>> = { wary: "？", freeze: "…" };

/** The flap's skin with a tuning (the story's; Debug's room plays an edited one: play.ts retune). */
export function clothFlapSkinFor(tuning: ClothTuning): CueTapSkin<ClothFlapParams, ClothFlapOutcome> {
  const walk = clothWalk(tuning);
  const { plan } = walk;
  const freezeTell = plan.poses.find((entry) => entry.pose === "freeze")?.from ?? Number.POSITIVE_INFINITY;

  function ClothFlapField({ still, art, sound, vibrate, frames }: CueTapFieldProps<ClothFlapParams, ClothFlapOutcome>) {
    const walker = useRef<HTMLSpanElement>(null);
    const body = useRef<HTMLSpanElement>(null);
    const boy = useRef<HTMLSpanElement>(null);
    const cloth = useRef<HTMLSpanElement>(null);
    const pigeon = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [react, setReact] = useState<Pose | null>(null);
    const [pose, setPose] = useState<ClothPose>("walk");
    const [reach, setReach] = useState(false);
    const [turned, setTurned] = useState(false);
    const [on, setOn] = useState(0);
    const [boyStartled, setBoyStartled] = useState(false);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    useEffect(() => {
      let spread = false;
      let flown = false;
      let struck = false;
      let whispered = false;
      let shown: string | null = null;
      let shownPose: ClothPose = "walk";
      let reaching = false;
      let step = 0;
      let boyStep = -1;
      return frames(({ ms, tapMs, outcome, impactAt }) => {
        const { juice } = live.current.kit;
        if (tapMs !== null && !spread) {
          spread = true;
          setOpen(true);
          live.current.sound(SOUNDS.cloth);
          live.current.vibrate("tap");
          juice.squash(cloth.current, "pop");
          // The boy, if he is running past, jumps at the cloth (and runs on).
          if (walk.boyAt(tapMs)) setBoyStartled(true);
        }
        // She walks until the cloth spreads (she stops there, or a step on when it comes behind her back), or on down to
        // her last step when it never does; each landing rings a footstep (her step back too), none once she has stopped.
        const at = Math.min(ms, walk.stopsAt(outcome, tapMs));
        const now = walk.walkerAt(at);
        if (now.step !== step && !now.moving) {
          live.current.sound(SOUNDS.step, now.step < step ? { volume: 0.5 } : footstepLevel(now.step));
          step = now.step;
          setOn(now.step);
        }
        const nextPose = walk.poseAt(at);
        if (nextPose !== shownPose) {
          shownPose = nextPose;
          setPose(nextPose);
        }
        const nextReach = walk.reachAt(at) > 0.35;
        if (nextReach !== reaching) {
          reaching = nextReach;
          setReach(nextReach);
        }
        // The heroine's whisper as Jasmeet freezes in front of the gold step (once, and not after the play is decided).
        if (!whispered && tapMs === null && ms >= freezeTell) {
          whispered = true;
          live.current.kit.react("tease", WAIT_LINE_JA);
        }
        const reaction = outcome ? reactionOf(outcome, tapMs, walk) : null;
        const shownReact = reaction?.then && ms >= reaction.then.at ? reaction.then.react : reaction && ms >= reaction.at ? reaction.react : null;
        if (shownReact !== shown) {
          shown = shownReact;
          setReact(shownReact);
          setTurned(!!reaction?.turned && !!shownReact);
        }
        const element = walker.current;
        if (element) {
          const reachAhead = still ? 0 : 0.9 * walk.reachAt(at);
          element.style.left = `${now.foot.x + reachAhead}%`;
          element.style.top = `${now.foot.y - (still ? 0 : 1.2 * now.lift)}%`;
        }
        // She crouches as she bobs (with less motion, only as she holds: the tell stays).
        const crouch = walk.crouchAt(at);
        if (body.current) body.current.style.setProperty("--mg-cloth-flap-crouch", String(still ? (crouch >= 1 ? 1 : 0) : crouch));
        // The boy runs down past her and the niche (his own lighter footsteps).
        const boyNow = walk.boyAt(ms);
        const boyElement = boy.current;
        if (boyElement) {
          boyElement.style.opacity = boyNow ? "1" : "0";
          if (boyNow) {
            boyElement.style.left = `${boyNow.foot.x}%`;
            boyElement.style.top = `${boyNow.foot.y - (still ? 0 : 1.6 * boyNow.lift)}%`;
          }
        }
        const boyLanded = walk.plan.boy.filter((move) => ms >= move.land).length;
        if (boyNow && boyLanded !== boyStep) {
          if (boyStep >= 0) live.current.sound(SOUNDS.step, BOY_STEP);
          boyStep = boyLanded;
        }
        // The moment the field shows the outcome (the engine ends the play in this frame): its juice, and her face.
        if (outcome && impactAt !== null && ms >= impactAt && !struck) {
          struck = true;
          const it = IMPACTS[outcome];
          const target = it.burst?.at === "cloth" ? cloth.current : walker.current;
          if (it.stopMs) juice.hitStop(it.stopMs, walker.current);
          if (it.burst) juice.burst(target, it.burst.kind, it.burst.size);
          if (it.shake) juice.shake(it.shake);
          if (outcome === "perfect" || outcome === "late") juice.squash(walker.current, "land");
          live.current.kit.react(it.react);
        }
        // After an early flap, the real pigeon bursts out of the niche and away over the stairs.
        const bird = pigeon.current;
        if (bird) {
          const pigeonAt = outcome === "early" && tapMs !== null ? tapMs + PIGEON_AFTER_MS : null;
          const t = pigeonAt === null ? -1 : (ms - pigeonAt) / PIGEON_FLIGHT_MS;
          if (pigeonAt !== null && t >= 0 && !flown) {
            flown = true;
            live.current.sound(SOUNDS.pigeon);
            juice.burst(bird, "dust", 0.8);
          }
          const flight = pigeonAlong(t, still);
          bird.style.left = `${54 - 40 * flight}%`;
          bird.style.top = `${84 - 70 * flight}%`;
          // Drawn facing right; it flies up to the left.
          bird.style.transform = `translate(-50%, -50%) scale(${-(1.4 - 0.6 * flight)}, ${1.4 - 0.6 * flight})`;
          bird.style.opacity = t >= 0 && t <= 1 ? "1" : "0";
        }
      });
    }, [frames, still]);
    const shownPose = react ?? pose;
    const mark = react ? (react === "scream" ? "！" : react === "laugh" ? "♪" : "？") : TELL_MARK[pose];
    return (
      <div className="mg-cloth-flap" data-art-stairs={art.stairs ? true : undefined} data-art-wall={art.wall && !art.stairs ? true : undefined}
        data-still={still || undefined}>
        <span className="mg-cloth-flap-stage">
          {art.stairs ? <img className="mg-cloth-flap-backdrop mg-photo" src={art.stairs} alt="" draggable={false} />
            : art.wall && <img className="mg-cloth-flap-backdrop mg-photo" src={art.wall} alt="" draggable={false} />}
          <span className="mg-cloth-flap-far-wall"><span /><span /><span /></span>
          {!art.stairs && <DrawnStairs />}
          <StepMarks on={on} />
          <span className="mg-cloth-flap-walker" ref={walker} data-react={react ?? undefined} data-pose={react ? undefined : pose}>
            <span className="mg-cloth-flap-walker-body mg-play-object" ref={body} data-turned={turned || undefined}>
              {art.walker ? <img src={art.walker} alt="" draggable={false} /> : <WalkerFigure pose={shownPose} reach={reach && !react} />}
            </span>
            {mark && <span className="mg-cloth-flap-bubble" data-tell={react ? undefined : pose}>{mark}</span>}
            {react === "scream" && <span className="mg-cloth-flap-shriek" data-turned={turned || undefined}>きゃっ！</span>}
          </span>
          <span className="mg-cloth-flap-boy mg-play-object" ref={boy} data-startled={boyStartled || undefined}><BoyFigure /></span>
          <span className="mg-cloth-flap-arch" />
          <span className="mg-cloth-flap-cloth mg-play-object" ref={cloth} data-open={open || undefined}>
            {open ? <SpreadCloth /> : <span className="mg-cloth-flap-cloth-folded" />}
            <Fist side="left" />
            <Fist side="right" />
          </span>
          <span className="mg-cloth-flap-pigeon mg-play-object" ref={pigeon}><Pigeon /></span>
        </span>
      </div>
    );
  }

  /** The gauge in place of the meter: a mark for each step down to the gold one, lit up to the step she is on (her count). */
  function ClothFlapGauge({ frames }: CueTapGaugeProps<ClothFlapParams, ClothFlapOutcome>) {
    const [on, setOn] = useState(0);
    const [past, setPast] = useState(false);
    useEffect(() => {
      let lit = -1;
      let gone = false;
      return frames(({ ms, tapMs, outcome }) => {
        const at = Math.min(ms, walk.stopsAt(outcome, tapMs));
        const now = walk.walkerAt(at);
        if (!now.moving && now.step !== lit) {
          lit = now.step;
          setOn(now.step);
        }
        // The gold mark glows while she stands on the gold step (the perfect window), then dims as she steps off it.
        const off = at > walk.offGoldAt;
        if (off !== gone) {
          gone = off;
          setPast(off);
        }
      });
    }, [frames]);
    return (
      <div className="mg-cloth-flap-gauge" aria-hidden="true">
        {Array.from({ length: CLOTH_STEPS.gold }, (_, index) => {
          const k = index + 1;
          const gold = k === CLOTH_STEPS.gold;
          return <span key={k} data-gold={gold || undefined} data-lit={on >= k || undefined} data-past={(gold && past) || undefined}>{gold ? "" : k}</span>;
        })}
      </div>
    );
  }

  return {
    tuning: plan.tuning,
    rules: clothFlapRulesFor(tuning),
    hintJa: "金色の段に立った瞬間に「広げる」",
    actionJa: "広げる",
    actionHintJa: "階段を下りてくる人が、くぼみの前の金色の段に立ったときに押します。立ち止まったり、一段戻ったり、跳んだりします。ほかの人にはつられないで。",
    autoJa: "おまかせで広げています",
    // The play ends as she reacts (her scream, her laugh at the cloth, her peering back), the host's finish over it…
    impactAt: ({ outcome, tapMs }) => reactionOf(outcome, tapMs, walk).at,
    // …and the field goes on to show the rest (after an early flap, the pigeon and her scream) before the result card.
    endAt: ({ outcome, tapMs }, still) => {
      const reaction = reactionOf(outcome, tapMs, walk);
      const last = reaction.then?.at ?? reaction.at;
      return last + (still ? 500 : outcome === "early" ? 900 : 850);
    },
    Field: ClothFlapField,
    Gauge: ClothFlapGauge,
  };
}

/** The flap as a cue_tap skin: its timing, rules, words, field and gauge. */
export const clothFlapSkin = clothFlapSkinFor(CLOTH_TUNING);

/** For the tests: where a foot is on a step, her walk with the story's tuning (the plan, where she is, when she stops). */
const STORY_WALK = clothWalk(CLOTH_TUNING);
export const CLOTH_FIELD_POINTS = {
  footOn, NICHE, ...STORY_WALK, pigeonAlong, footstepLevel, clothWalk, LAST_STEP, WAIT_LINE_JA,
  reactionOf: (outcome: ClothFlapOutcome, tapMs: number | null) => reactionOf(outcome, tapMs, STORY_WALK),
} as const;
