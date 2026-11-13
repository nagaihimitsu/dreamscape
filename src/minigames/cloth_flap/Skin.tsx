import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapGaugeProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { cueTapEnd, cueTapMoment, type CueTapTuning } from "../engines/cue_tap/engine";
import { useMiniGameKit } from "../host/kit";
import { CLOTH_FIELD, CLOTH_TUNING, clothFlapRulesFor, type ClothFlapOutcome, type ClothFlapParams } from "./rules";
import "./skin.css";

// The flap's field (a cue_tap skin): the view from inside a niche of the stepwell, through its arch. The stairs cross the
// view from the upper left down to the lower right; she comes down them one step at a time, to the gold step in front of
// the niche (the middle) and on. The player's hands hold the folded cloth at the bottom of the niche. Everything sits on a
// stage of a fixed shape (3:4, as large as the field holds; dark stone around it), so a stairs picture's steps stay under
// her feet on every screen. With the use's art (`art.stairs`, `art.walker`) the drawn stairs and figure give way to those
// pictures; a far-wall picture (`art.wall`, e.g. a photo) takes the drawn wall's place only, the stairs drawn over it.
//
// Her walk is the judgement drawn: she stands on each step from cleanEarlyMs before its beat to cleanLateMs after it,
// and steps down to the next in between. So a perfect flap always finds her standing on the gold step, an early one on
// her way down to it (or further up), a late one stepping off it (or further down). In place of the meter, the gauge
// counts her steps: one mark lights as her foot lands on each, the last one gold, lit exactly while a flap is perfect.

type Foot = { x: number; y: number };
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

// In percent of the stage: where her foot is on step k (0 at the top; CLOTH_FIELD.stepsToNiche in front of the niche, the
// middle of the stage). A stairs picture (art.stairs) puts its steps on these points (the art request says so).
const STEP_X = 7.2;
const STEP_Y = 4.5;
const NICHE: Foot = { x: 50, y: 66 };
const footOn = (k: number): Foot => ({ x: NICHE.x + STEP_X * (k - CLOTH_FIELD.stepsToNiche), y: NICHE.y + STEP_Y * (k - CLOTH_FIELD.stepsToNiche) });
/** The last step she stands on (when nothing happens), and the last step drawn. */
const LAST_STEP = CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast;
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

/**
 * Her walk with a tuning (the story's, or Debug's room's edited one): she has started down at the lead's end, takes the
 * approach over her steps to the niche, and stands on each step (k ≥ 1) from cleanEarlyMs before its beat to cleanLateMs
 * after it (the perfect window around the gold one), stepping down to the next in the rest of a step.
 */
function clothWalk(tuning: CueTapTuning) {
  const start = tuning.leadMs;
  const stepMs = tuning.approachMs / CLOTH_FIELD.stepsToNiche;
  const standBefore = tuning.cleanEarlyMs;
  const standAfter = tuning.cleanLateMs;
  // An edited tuning may leave no time between the windows: a step down still takes a few frames.
  const moveMs = Math.max(60, stepMs - standBefore - standAfter);
  /** The beat of step k: she starts down at the beat of step 0, and stands in front of the niche at its beat. */
  const beatOf = (k: number) => start + stepMs * k;
  /** When her foot lands on step k (k ≥ 1). */
  const landingOf = (k: number) => beatOf(k) - standBefore;
  /** Where her foot is `ms` after the start (and how high it lifts on a step down): on the top step, then one step down each beat. */
  const walkerAt = (ms: number): { foot: Foot; lift: number } => {
    const sinceLeaving = ms - beatOf(0) - standAfter;
    if (sinceLeaving <= 0) return { foot: footOn(0), lift: 0 };
    const left = Math.floor(sinceLeaving / stepMs);
    if (left >= LAST_STEP) return { foot: footOn(LAST_STEP), lift: 0 };
    const into = sinceLeaving - left * stepMs;
    if (into >= moveMs) return { foot: footOn(left + 1), lift: 0 };
    const move = easeInOut(into / moveMs);
    const from = footOn(left);
    const to = footOn(left + 1);
    return { foot: { x: from.x + (to.x - from.x) * move, y: from.y + (to.y - from.y) * move }, lift: Math.sin(Math.PI * move) };
  };
  /** How many steps her foot has landed on by `ms` (0 on the top one). */
  const stepsLanded = (ms: number): number => {
    let landed = 0;
    while (landed < LAST_STEP && ms >= landingOf(landed + 1)) landed += 1;
    return landed;
  };
  return { nicheMs: cueTapMoment(tuning), endMs: cueTapEnd(tuning), standAfter, beatOf, landingOf, walkerAt, stepsLanded };
}
type ClothWalk = ReturnType<typeof clothWalk>;

/** After an early flap: the pigeon in the niche, startled by the cloth, bursts out this long after it. */
const PIGEON_AFTER_MS = 450;
const PIGEON_FLIGHT_MS = 650;
/** Where the pigeon is along its flight (0 to 1) at part `t` of it; with less motion, two still places (no glide). */
const pigeonAlong = (t: number, still: boolean) => (still ? (t < 0.5 ? 0.15 : 0.85) : clamp01(t));
/**
 * The footsteps sound (four footfalls about a step apart, the first 20 ms in) rings as her foot lands on the first step
 * and again on the gold one: the player can count four, and the next is it.
 */
const footstepsAt = (walk: ClothWalk) => [walk.landingOf(1) - 20, walk.landingOf(CLOTH_FIELD.stepsToNiche) - 20];
/** The sounds of a play (definition `sounds`). */
const SOUNDS = { steps: "travel_walk", cloth: "cloth_flap", pigeon: "pigeon_flutter" } as const;

type Pose = "scream" | "laugh" | "peek";
/**
 * Her reaction once the play is decided: what her figure does and the mark over her head, from when. The first is the
 * moment the field shows the outcome (the play ends there, the host's finish over it).
 */
function reactionOf(outcome: ClothFlapOutcome, tapMs: number | null, endMs: number): { at: number; react: Pose; turned: boolean; then?: { at: number; react: "scream" } } {
  switch (outcome) {
    case "perfect": return { at: (tapMs ?? 0) + 120, react: "scream", turned: false };
    case "early": return { at: (tapMs ?? 0) + 120, react: "laugh", turned: false, then: { at: (tapMs ?? 0) + PIGEON_AFTER_MS + 120, react: "scream" } };
    case "late": return { at: (tapMs ?? 0) + 160, react: "scream", turned: true };
    case "frozen": return { at: endMs, react: "peek", turned: true };
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
 * The one coming down (drawn when the use gives no picture): a young woman side on, walking to the right, in the colours
 * of Jasmeet's standing picture without her dupatta (lent for the pigeon): a cream kurta, blue jeans, long black hair.
 * Her arms tell her reaction: swinging as she walks, hands up to her face in a scream, a hand at her mouth as she laughs.
 */
function WalkerFigure({ pose }: { pose: Pose | null }) {
  const arms = pose === "scream" ? "M15 26 Q 8 18, 13 9 M27 26 Q 34 18, 29 9"
    : pose === "laugh" ? "M26 26 Q 33 22, 28 15 M15 26 Q 11 40, 13 52"
      : "M26 26 Q 32 40, 30 52";
  return (
    <svg viewBox="0 0 40 104" className="mg-cloth-flap-walker-figure" aria-hidden="true">
      <path d="M17 10 Q 8 26, 11 48" fill="none" stroke="#1f1a17" strokeWidth="5" strokeLinecap="round" />
      <path d="M17 64 L 15 97 M25 64 L 29 97" stroke="#4a6f9a" strokeWidth="6" strokeLinecap="round" />
      <path d="M12 99 L 18 99 M27 99 L 34 99" stroke="#6b4a30" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 22 L 28 22 L 32 70 L 10 70 Z" fill="#efe4cc" stroke="#6b5a45" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={arms} fill="none" stroke="#e4d6b8" strokeWidth="5" strokeLinecap="round" />
      <circle cx="21" cy="12" r="8" fill="#b98b6b" />
      <path d="M13 12 Q 14 2, 23 3 Q 29 4, 29 9 Q 22 7, 16 14 Z" fill="#1f1a17" />
      {pose === "scream" && <ellipse cx="26" cy="15.5" rx="1.8" ry="2.4" fill="#4a1f1a" />}
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

/** Her steps' marks on the stairs: one on each step down to the gold one in front of the niche, lit as her foot lands. */
function StepMarks({ landed }: { landed: number }) {
  return <>{Array.from({ length: CLOTH_FIELD.stepsToNiche }, (_, index) => {
    const k = index + 1;
    const { x, y } = footOn(k);
    return <span key={k} className="mg-cloth-flap-mark-step" style={{ left: `${x}%`, top: `${y}%` }}
      data-gold={k === CLOTH_FIELD.stepsToNiche || undefined} data-lit={landed >= k || undefined} />;
  })}</>;
}


/** The flap's skin with a tuning (the story's; Debug's room plays an edited one: play.ts retune). */
export function clothFlapSkinFor(tuning: CueTapTuning): CueTapSkin<ClothFlapParams, ClothFlapOutcome> {
  const walk = clothWalk(tuning);
  const footsteps = footstepsAt(walk);

  function ClothFlapField({ still, art, sound, vibrate, frames }: CueTapFieldProps<ClothFlapParams, ClothFlapOutcome>) {
    const walker = useRef<HTMLSpanElement>(null);
    const cloth = useRef<HTMLSpanElement>(null);
    const pigeon = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [react, setReact] = useState<Pose | null>(null);
    const [turned, setTurned] = useState(false);
    const [landed, setLanded] = useState(0);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    useEffect(() => {
      let rung = 0;
      let spread = false;
      let flown = false;
      let struck = false;
      let shown: string | null = null;
      let lit = 0;
      return frames(({ ms, tapMs, outcome, impactAt }) => {
        const { juice } = live.current.kit;
        // Her footsteps, while nothing has happened yet.
        while (!outcome && rung < footsteps.length && ms >= footsteps[rung]) {
          rung += 1;
          live.current.sound(SOUNDS.steps);
        }
        if (tapMs !== null && !spread) {
          spread = true;
          setOpen(true);
          live.current.sound(SOUNDS.cloth);
          live.current.vibrate("tap");
          juice.squash(cloth.current, "pop");
        }
        // She walks until the cloth spreads (she stops where she is), or on down to her last step when it never does.
        const at = tapMs !== null ? Math.min(ms, tapMs) : ms;
        const steps = walk.stepsLanded(at);
        if (steps !== lit) {
          lit = steps;
          setLanded(steps);
        }
        const { foot, lift } = walk.walkerAt(at);
        const reaction = outcome ? reactionOf(outcome, tapMs, walk.endMs) : null;
        const now = reaction?.then && ms >= reaction.then.at ? reaction.then.react : reaction && ms >= reaction.at ? reaction.react : null;
        if (now !== shown) {
          shown = now;
          setReact(now);
          setTurned(!!reaction?.turned && !!now);
        }
        const element = walker.current;
        if (element) {
          element.style.left = `${foot.x}%`;
          element.style.top = `${foot.y - (still ? 0 : 1.2 * lift)}%`;
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
          const along = pigeonAlong(t, still);
          bird.style.left = `${54 - 40 * along}%`;
          bird.style.top = `${84 - 70 * along}%`;
          // Drawn facing right; it flies up to the left.
          bird.style.transform = `translate(-50%, -50%) scale(${-(1.4 - 0.6 * along)}, ${1.4 - 0.6 * along})`;
          bird.style.opacity = t >= 0 && t <= 1 ? "1" : "0";
        }
      });
    }, [frames, still]);
    return (
      <div className="mg-cloth-flap" data-art-stairs={art.stairs ? true : undefined} data-art-wall={art.wall && !art.stairs ? true : undefined}
        data-still={still || undefined}>
        <span className="mg-cloth-flap-stage">
          {art.stairs ? <img className="mg-cloth-flap-backdrop mg-photo" src={art.stairs} alt="" draggable={false} />
            : art.wall && <img className="mg-cloth-flap-backdrop mg-photo" src={art.wall} alt="" draggable={false} />}
          <span className="mg-cloth-flap-far-wall"><span /><span /><span /></span>
          {!art.stairs && <DrawnStairs />}
          <StepMarks landed={landed} />
          <span className="mg-cloth-flap-walker" ref={walker} data-react={react ?? undefined}>
            <span className="mg-cloth-flap-walker-body mg-play-object" data-turned={turned || undefined}>
              {art.walker ? <img src={art.walker} alt="" draggable={false} /> : <WalkerFigure pose={react} />}
            </span>
            {react && <span className="mg-cloth-flap-bubble">{react === "scream" ? "！" : react === "laugh" ? "♪" : "？"}</span>}
            {react === "scream" && <span className="mg-cloth-flap-shriek" data-turned={turned || undefined}>きゃっ！</span>}
          </span>
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

  /** The gauge in place of the meter: a mark for each step down to the gold one, lit as her foot lands on it (her count). */
  function ClothFlapGauge({ frames }: CueTapGaugeProps<ClothFlapParams, ClothFlapOutcome>) {
    const [landed, setLanded] = useState(0);
    const [past, setPast] = useState(false);
    useEffect(() => {
      let lit = -1;
      let gone = false;
      return frames(({ ms, tapMs }) => {
        const at = tapMs !== null ? Math.min(ms, tapMs) : ms;
        const steps = walk.stepsLanded(at);
        if (steps !== lit) {
          lit = steps;
          setLanded(steps);
        }
        // The gold mark glows while she stands on the gold step (the perfect window), then dims as she steps off it.
        const off = at > walk.nicheMs + walk.standAfter;
        if (off !== gone) {
          gone = off;
          setPast(off);
        }
      });
    }, [frames]);
    return (
      <div className="mg-cloth-flap-gauge" aria-hidden="true">
        {Array.from({ length: CLOTH_FIELD.stepsToNiche }, (_, index) => {
          const k = index + 1;
          const gold = k === CLOTH_FIELD.stepsToNiche;
          return <span key={k} data-gold={gold || undefined} data-lit={landed >= k || undefined} data-past={(gold && past) || undefined}>{gold ? "" : k}</span>;
        })}
      </div>
    );
  }

  return {
    tuning,
    rules: clothFlapRulesFor(tuning),
    hintJa: "金色の段に足が着く瞬間に「広げる」",
    actionJa: "広げる",
    actionHintJa: "階段を下りてくる人の足音に合わせて、くぼみの前の金色の段に足が着くときに押します。",
    autoJa: "おまかせで広げています",
    // The play ends as she reacts (her scream, her laugh at the cloth, her peering back), the host's finish over it…
    impactAt: ({ outcome, tapMs }) => reactionOf(outcome, tapMs, walk.endMs).at,
    // …and the field goes on to show the rest (after an early flap, the pigeon and her scream) before the result card.
    endAt: ({ outcome, tapMs }, still) => {
      const reaction = reactionOf(outcome, tapMs, walk.endMs);
      const last = reaction.then?.at ?? reaction.at;
      return last + (still ? 500 : outcome === "early" ? 900 : 850);
    },
    Field: ClothFlapField,
    Gauge: ClothFlapGauge,
  };
}

/** The flap as a cue_tap skin: its timing, rules, words, field and gauge. */
export const clothFlapSkin = clothFlapSkinFor(CLOTH_TUNING);

/** For the tests: where her foot is on a step, when it lands and leaves, and how many steps it has landed on (the story's tuning). */
export const CLOTH_FIELD_POINTS = { footOn, NICHE, ...clothWalk(CLOTH_TUNING), pigeonAlong, reactionOf, clothWalk, LAST_STEP } as const;
