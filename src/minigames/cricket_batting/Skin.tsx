import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import {
  CRICKET_TUNING, cricketAtBouncer, cricketCounts, cricketPlan, cricketRulesFor, cricketTravel, type CricketOutcome, type CricketParams, type CricketPlan,
  type CricketTuning,
} from "./rules";
import "./skin.css";

// The cricket's field (a cue_tap skin): the batter's view of the pitch over the scene, the bowler small at the far end,
// three stacked bricks behind the bat. She runs up and bowls twice (rules.ts cricketPlan): first a ball that lands on a
// crack and kicks up over the bat and the bricks (the bouncer: Sonia calls it dead; a swing at it skies it high over the
// side), then, after she walks back, her real ball, which changes pace where it bounces (the tag's `ball`). The meter's
// needle follows only the real ball (it waits through the bouncer). With the use's art (`art.pitch`, `art.bowler`) the
// drawn pitch and the heroine's standing picture give way to those pictures.
//
// The host's flow (docs/13 2.6): the field ends the play itself at the moment that tells it (the bat meeting the ball, or
// the bricks falling after a miss or no swing), with the swing's time as the record (the host rates it for ★) and the
// rest of the field's picture as the hold; the juice there, and her face on the field and in the corner follows it.

type Point = { x: number; y: number; size: number };
const mix = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t });
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// The ball's way, in percent of the field (size 1 at the bat): her hand, one bounce on the dusty pitch, the bat, the
// bricks behind it; its shadow on the ground under it. A backdrop picture (art.pitch) keeps the far wicket at about
// (50%, 29%) and the near crease at about 82% from the top (docs: the art request).
const HAND: Point = { x: 53, y: 13, size: 0.3 };
const HAND_GROUND: Point = { x: 50, y: 29, size: 0.3 };
const BOUNCE: Point = { x: 50.5, y: 56, size: 0.6 };
const BAT: Point = { x: 51, y: 74, size: 1 };
const BAT_GROUND: Point = { x: 51, y: 88, size: 1 };
const BRICKS: Point = { x: 50, y: 85, size: 1.12 };
const BRICKS_GROUND: Point = { x: 50, y: 94, size: 1.1 };
const REST: Point = { x: 57, y: 90, size: 1 };
const REST_GROUND: Point = { x: 57, y: 94, size: 1 };
/** The bouncer kicks up off the crack: high over the bat (over the batter's head as it comes), then out of the top of the view. */
const OVER: Point = { x: 53, y: 34, size: 1.45 };
const GONE: Point = { x: 56, y: -18, size: 2 };
/** How far from the bat toward the bricks the ball gets while a late swing is still clean (it still reads as met squarely). */
const CLEAN_DRIFT = 0.15;

/** Where the bouncer and its shadow are at `ms` (null before it leaves her hand and once it is gone over the batter's head). */
function bouncerBall(ms: number, plan: CricketPlan): { ball: Point; ground: Point } | null {
  const { release, bounce, bat, gone } = plan.bouncer;
  if (ms < release - 150 || ms > gone) return null;
  if (ms <= release) return { ball: HAND, ground: HAND_GROUND };
  if (ms <= bounce) {
    const t = (ms - release) / (bounce - release);
    return { ball: mix(HAND, BOUNCE, t), ground: mix(HAND_GROUND, BOUNCE, t) };
  }
  if (ms <= bat) {
    // Off the crack it climbs steeply (faster than it fell): over the bat at the batter's head.
    const t = easeOut((ms - bounce) / (bat - bounce));
    return { ball: mix(BOUNCE, OVER, t), ground: mix(BOUNCE, BAT_GROUND, (ms - bounce) / (bat - bounce)) };
  }
  const t = (ms - bat) / (gone - bat);
  return { ball: mix(OVER, GONE, t), ground: mix(BAT_GROUND, { ...BRICKS_GROUND, y: 99 }, t) };
}

/**
 * Where the real ball and its shadow are `ms` after the start when nothing hits it: in her hand from her second run-up,
 * one bounce, the bat at its arrival, lingering by the plank through the late clean window, the bricks.
 */
function bowledBall(ms: number, plan: CricketPlan, cleanLateMs: number): { ball: Point; ground: Point } {
  const { release, bounce, contact, bricks } = plan;
  if (ms <= release) return { ball: HAND, ground: HAND_GROUND };
  if (ms >= bricks) return { ball: REST, ground: REST_GROUND };
  let ball: Point;
  let ground: Point;
  if (ms <= bounce) {
    const t = (ms - release) / (bounce - release);
    ball = mix(HAND, BOUNCE, t);
    ground = mix(HAND_GROUND, BOUNCE, t);
  } else if (ms <= contact) {
    const t = (ms - bounce) / (contact - bounce);
    ball = mix(BOUNCE, BAT, t);
    ground = mix(BOUNCE, BAT_GROUND, t);
  } else {
    // Past the bat: it lingers by the plank through the late clean window (a swing then meets it there: a clean hit
    // looks clean), then runs on into the bricks.
    const cleanUntil = Math.min(contact + cleanLateMs, bricks - 60);
    const past = ms <= cleanUntil ? CLEAN_DRIFT * clamp01((ms - contact) / (cleanUntil - contact))
      : CLEAN_DRIFT + (1 - CLEAN_DRIFT) * clamp01((ms - cleanUntil) / (bricks - cleanUntil));
    ball = mix(BAT, BRICKS, past);
    ground = mix(BAT_GROUND, BRICKS_GROUND, past);
  }
  // The taped ball wobbles a little on its way: drawn the same every time, it changes nothing (the timing is the player's).
  const s = (ms - release) / (contact - release);
  const wobble = Math.sin(s * 9) * 0.9 * (1 - Math.min(1, s) * 0.6);
  return { ball: { ...ball, x: ball.x + wobble }, ground };
}

/** Her feet at the far end (where an edged ball, or one off the still plank, rolls to a stop). */
const HER_FEET: Point = { x: 48, y: 31, size: 0.32 };
/** Where a hit ball goes (from where the bat met it) and in how long: straight back over her head, high over the side, to her feet. */
const FLIGHTS: Partial<Record<CricketOutcome, { to: Point; rolls?: true; ms: number }>> = {
  six: { to: { x: 50, y: -10, size: 0.18 }, ms: 800 },
  over_wall: { to: { x: -14, y: 6, size: 0.3 }, ms: 850 },
  edge: { to: HER_FEET, rolls: true, ms: 1100 },
};

/**
 * A ball let go onto the plank (`letgo plank`): past the bat it runs on to the still plank's blade instead of the bricks,
 * knocks against it as it would have reached them, and rolls slowly back to her feet (「ぼてぼてと転がり」).
 */
const PLANK: Point = { x: 60, y: 79, size: 1.04 };
const PLANK_ROLL_MS = 1300;
function plankBall(ms: number, plan: CricketPlan, cleanLateMs: number): { ball: Point; ground: Point } {
  if (ms <= plan.contact) return bowledBall(ms, plan, cleanLateMs);
  if (ms <= plan.bricks) {
    const t = clamp01((ms - plan.contact) / (plan.bricks - plan.contact));
    return { ball: mix(BAT, PLANK, t), ground: mix(BAT_GROUND, { ...PLANK, y: PLANK.y + 8 }, t) };
  }
  const t = easeOut(clamp01((ms - plan.bricks) / PLANK_ROLL_MS));
  const ball = mix(PLANK, HER_FEET, t);
  return { ball, ground: ball };
}

/** When a swing meets the ball: at once on the real ball; at the bouncer, as it rises past the raised plank (or at once, later). */
const meetsAt = (tapMs: number, plan: CricketPlan) => (cricketAtBouncer(plan, tapMs) ? Math.max(tapMs, plan.bouncer.bat - 80) : tapMs);

/** Her run-ups (the bowler's picture): ready at her mark, running in, walking back after the bouncer, running in again. */
type Phase = "ready" | "run1" | "walk" | "run2";
function phaseAt(ms: number, plan: CricketPlan, tuning: CricketTuning): Phase {
  if (ms < tuning.settleMs) return "ready";
  if (ms < plan.bouncer.gone) return "run1";
  if (ms < plan.release - tuning.runUpMs) return "walk";
  return "run2";
}

/** The sounds of a play (definition `sounds`): the bat meeting the ball, the bricks falling, the children's cheer at a six. */
const SOUNDS = { hit: "bat_hit", bricks: "bricks_fall", cheer: "applause" } as const;
/** The children's cheer this long after a six on the play's clock (its 120 ms stop holds the clock: about 150 ms on screen). */
const CHEER_AFTER_MS = 30;
/** A ball knocking against the still plank: the bat's sound, soft and low; the bouncer's bounce off the crack, a tick. */
const PLANK_KNOCK = { volume: 0.4, rate: 0.8 } as const;
const CRACK_TICK = { volume: 0.25, rate: 1.6 } as const;

/**
 * Each outcome's moment of impact (group1 3, group3 6.4): the hit-stop on the ball, the burst, the shake, and her face
 * (the bowler's: a six flies over her head, a pull goes over the wall, an edge rolls to her feet, the bricks fall to her
 * ball, a ball let go by).
 */
const IMPACTS: Readonly<Record<CricketOutcome, { stopMs: number; burst: "star" | "ring" | "dust"; size: number; shake?: "s" | "m"; react: "surprise" | "oops" | "cheer" }>> = {
  six: { stopMs: 120, burst: "star", size: 1.2, shake: "m", react: "surprise" },
  // Wide-eyed, not laughing yet: the story's 「一瞬の静けさ」 comes first.
  over_wall: { stopMs: 90, burst: "ring", size: 1, shake: "s", react: "surprise" },
  edge: { stopMs: 60, burst: "dust", size: 0.8, react: "oops" },
  bowled: { stopMs: 90, burst: "dust", size: 1.3, shake: "s", react: "cheer" },
  no_swing: { stopMs: 60, burst: "dust", size: 1, react: "oops" },
};

/** Sonia's call as the bouncer goes over (on the field, by her side of the children), and the bowler's word (unvoiced). */
const DEAD_CALL_JA = "高い！ 今のはなし";
const SORRY_LINE_JA = "ごめん、もう一球！";

/**
 * The children watching from beside the pitch (they are in the story), dark against the light: the batter's side on the
 * left, the bowler's (Sonia's) on the right. A side cheers with its arms up, hopping (with less motion, arms up only).
 */
type Side = "batter" | "bowler";
const KIDS: Readonly<Record<Side, readonly ("short" | "tail" | "cap")[]>> = { batter: ["short", "tail"], bowler: ["cap", "tail"] };
function Kid({ hair }: { hair: "short" | "tail" | "cap" }) {
  return (
    <svg viewBox="0 0 30 56" className="mg-cricket-batting-kid" aria-hidden="true">
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 40 L 10.5 54.5 M18.5 40 L 19.5 54.5" fill="none" strokeWidth="4.5" />
        <path className="mg-cricket-batting-kid-down" d="M9 26 L 6.5 38 M21 26 L 23.5 38" fill="none" strokeWidth="3.5" />
        <path className="mg-cricket-batting-kid-up" d="M9 25.5 L 4 10 M21 25.5 L 26 10" fill="none" strokeWidth="3.5" />
        <path d="M8 24.5 Q 15 20.5, 22 24.5 L 23 42 L 7 42 Z" strokeWidth="1" />
        <circle cx="15" cy="14" r="6.5" stroke="none" />
        {hair === "tail" && <path d="M20 10.5 Q 26 12, 24.5 20" fill="none" strokeWidth="3" />}
        {hair === "cap" && <path d="M8.2 12.5 Q 15 4.5, 21.8 12.5 L 26 13.5 L 8.2 13.5 Z" strokeWidth="1" />}
      </g>
    </svg>
  );
}

/** The cricket's skin with a tuning (the story's; Debug's room plays an edited one: play.ts retune). */
export function cricketSkinFor(tuning: CricketTuning): CueTapSkin<CricketParams, CricketOutcome> {
  const plans = { quick: cricketPlan(tuning, "quick"), slower: cricketPlan(tuning, "slower") };
  const planOf = (params: CricketParams) => plans[params.ball ?? "quick"];
  const pace: CSSProperties = {
    ["--mg-cricket-batting-run" as string]: `${tuning.runUpMs}ms`,
    ["--mg-cricket-batting-walk" as string]: `${tuning.walkBackMs}ms`,
  };

  function CricketField({ params, cast, still, art, sound, vibrate, frames }: CueTapFieldProps<CricketParams, CricketOutcome>) {
    const ball = useRef<HTMLSpanElement>(null);
    const shadow = useRef<HTMLSpanElement>(null);
    const bricks = useRef<HTMLSpanElement>(null);
    const bat = useRef<HTMLSpanElement>(null);
    const [swung, setSwung] = useState(false);
    const [bricksDown, setBricksDown] = useState(false);
    const [cheer, setCheer] = useState<Side | null>(null);
    const [phase, setPhase] = useState<Phase>("ready");
    const [called, setCalled] = useState(false);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    const ontoPlank = params.letgo === "plank";
    const plan = planOf(params);
    useEffect(() => {
      let hit = false;
      let fell = false;
      let knocked = false;
      let swing = false;
      let ended = false;
      let ticked = false;
      let dead = false;
      let uncalled = false;
      let shownPhase: Phase = "ready";
      let cheerAt: number | null = null;
      const place = (element: HTMLElement | null, point: Point, hidden: boolean) => {
        if (!element) return;
        element.style.left = `${point.x}%`;
        element.style.top = `${point.y}%`;
        element.style.transform = `translate(-50%, -50%) scale(${point.size})`;
        element.style.opacity = hidden ? "0" : "1";
      };
      /** A moment of impact: the ball met (or the bricks hit), with the outcome's juice. */
      const strike = (outcome: CricketOutcome, target: Element | null) => {
        const { juice } = live.current.kit;
        const it = IMPACTS[outcome];
        juice.hitStop(it.stopMs, target);
        juice.burst(target, it.burst, it.size);
        if (it.shake) juice.shake(it.shake);
        if (outcome === "six" || outcome === "over_wall") juice.squash(target, "land");
        live.current.vibrate(outcome === "edge" ? "tap" : "hit");
      };
      return frames(({ ms, tapMs, outcome, endAt }) => {
        // A swing at the bouncer ends the play there: she stays at the crease, watching it go over the wall.
        const nextPhase = tapMs !== null && cricketAtBouncer(plan, tapMs) ? "run1" : phaseAt(ms, plan, tuning);
        if (nextPhase !== shownPhase) {
          shownPhase = nextPhase;
          setPhase(nextPhase);
        }
        const atBouncer = tapMs !== null && cricketAtBouncer(plan, tapMs);
        const flight = outcome ? FLIGHTS[outcome] : undefined;
        // A ball let go onto the plank runs on to it (until a swing has missed it before: then it goes into the bricks).
        const plank = ontoPlank && outcome !== "bowled";
        const route = plank ? plankBall : bowledBall;
        if (tapMs !== null && !swing && outcome !== "no_swing") {
          swing = true;
          setSwung(true);
          // A swing that meets nothing (yet): the plank's quick whiff.
          if (!flight || (atBouncer && meetsAt(tapMs, plan) > tapMs)) live.current.kit.juice.squash(bat.current, "press");
        }
        const meet = tapMs === null ? null : meetsAt(tapMs, plan);
        // The bouncer, then the real ball (hidden until her second run-up brings it to her hand).
        const bouncer = bouncerBall(ms, plan);
        let where = bouncer ?? route(ms, plan, tuning.cleanLateMs);
        let hidden = !bouncer && ms < plan.release - 150;
        if (flight && meet !== null && ms >= meet) {
          const from = atBouncer ? bouncerBall(meet, plan) ?? { ball: OVER, ground: BAT_GROUND } : route(meet, plan, tuning.cleanLateMs);
          const t = easeOut(clamp01((ms - meet) / flight.ms));
          where = { ball: mix(from.ball, flight.to, t), ground: flight.rolls ? mix(from.ground, flight.to, t) : { ...from.ground, size: from.ground.size * (1 - t) } };
          hidden = false;
        }
        // Less motion: a hit ball does not fly (it is gone a moment after the bat meets it); off the plank it is at her
        // feet a moment after the knock.
        const gone = still && !!flight && meet !== null && ms - meet > 120;
        if (still && plank && !flight && ms > plan.bricks) where = ms - plan.bricks > 400 ? { ball: HER_FEET, ground: HER_FEET } : { ball: PLANK, ground: PLANK };
        place(ball.current, where.ball, hidden || gone);
        place(shadow.current, where.ground, hidden || gone || ms < plan.bouncer.release || (!bouncer && ms < plan.release));
        // The bouncer's tick off the crack, then (no swing at it) Sonia's call and her sorry.
        if (!ticked && ms >= plan.bouncer.bounce) {
          ticked = true;
          live.current.sound(SOUNDS.hit, CRACK_TICK);
          // A puff of dust off the crack: the kick is seen, not only heard.
          live.current.kit.juice.burst(ball.current, "dust", 0.6);
        }
        if (!dead && tapMs === null && ms >= plan.bouncer.reach + 80) {
          dead = true;
          setCalled(true);
          live.current.kit.react("oops", SORRY_LINE_JA);
        }
        if (dead && !uncalled && ms >= plan.release - tuning.runUpMs) {
          uncalled = true;
          setCalled(false);
        }
        if (flight && outcome && meet !== null && ms >= meet && !hit) {
          hit = true;
          live.current.sound(SOUNDS.hit);
          strike(outcome, ball.current);
          // A six: the batter's side of the children jumps up, their cheer just after the bat's crack.
          if (outcome === "six") {
            setCheer("batter");
            cheerAt = ms + CHEER_AFTER_MS;
          }
        }
        if (cheerAt !== null && ms >= cheerAt) {
          cheerAt = null;
          live.current.sound(SOUNDS.cheer, { volume: 0.6 });
        }
        // A ball not hit reaches the bricks behind the bat and knocks them down (the bowler's side cheers)…
        if (!flight && !plank && !fell && ms >= plan.bricks) {
          fell = true;
          setBricksDown(true);
          setCheer("bowler");
          live.current.sound(SOUNDS.bricks);
          strike("bowled", bricks.current);
        }
        // …or, let go onto the plank, knocks against it and rolls away to her feet.
        if (!flight && plank && !knocked && ms >= plan.bricks) {
          knocked = true;
          live.current.sound(SOUNDS.hit, PLANK_KNOCK);
          live.current.kit.juice.burst(ball.current, "dust", 0.7);
          live.current.kit.juice.squash(bat.current, "press");
          live.current.vibrate("tap");
        }
        // The end, at the moment that tells it (the bat meeting the ball; the bricks falling or the knock on the plank, or
        // no swing once its window is over): her face, and the swing's time for the ★, the rest of the picture held (off
        // the plank, until the ball has rolled to her feet).
        if (ended || !outcome || endAt === null || (flight ? !hit : !(plank ? knocked : fell))) return;
        ended = true;
        const until = !flight && plank ? Math.max(endAt, plan.bricks + (still ? 600 : PLANK_ROLL_MS) + 150) : endAt;
        live.current.kit.react(IMPACTS[outcome].react);
        live.current.kit.end(outcome, undefined, { record: tapMs, holdMs: Math.max(0, until - ms) });
      });
    }, [frames, still, ontoPlank, plan]);
    return (
      <div className="mg-cricket-batting" data-art-pitch={art.pitch ? true : undefined} data-still={still || undefined} style={pace}>
        {art.pitch && <img className="mg-cricket-batting-backdrop mg-photo" src={art.pitch} alt="" draggable={false} />}
        <span className="mg-cricket-batting-pitch" />
        {(["batter", "bowler"] as const).map((side) => (
          <span key={side} className="mg-cricket-batting-kids" data-side={side} data-cheer={cheer === side || undefined}>
            {KIDS[side].map((hair, index) => <Kid key={index} hair={hair} />)}
          </span>
        ))}
        {called && <span className="mg-cricket-batting-call">{DEAD_CALL_JA}</span>}
        <span className="mg-cricket-batting-crease mg-cricket-batting-crease-far" />
        {/* Keyed by her run-up: each one plays its run from the start. */}
        <span key={phase} className="mg-cricket-batting-bowler mg-play-object" data-phase={phase}>
          {art.bowler ? <img src={art.bowler} alt="" draggable={false} /> : cast.heroine}
        </span>
        <span className="mg-cricket-batting-bricks mg-cricket-batting-bricks-far"><span /><span /><span /></span>
        <span className="mg-cricket-batting-shadow" ref={shadow} />
        <span className="mg-cricket-batting-crease mg-cricket-batting-crease-near" />
        <span ref={bricks} className="mg-cricket-batting-bricks mg-cricket-batting-bricks-near mg-play-object" data-down={bricksDown || undefined}><span /><span /><span /></span>
        <span className="mg-cricket-batting-ball mg-play-object" ref={ball} />
        <span ref={bat} className="mg-cricket-batting-bat mg-play-object" data-swung={swung || undefined} />
      </div>
    );
  }

  return {
    tuning: (params) => planOf(params).tuning,
    rules: cricketRulesFor(tuning),
    hintJa: "針が金色に来たら「振る」（高い球は見送る）",
    actionJa: "振る",
    actionHintJa: "ボールが板に届くのに合わせて押します。高く跳ね上がる球は見送ります。弾んだところで速さが変わります。",
    autoJa: "おまかせで打っています",
    // The needle follows only the real ball (it waits through the bouncer), at its pace before and after the bounce.
    progress: (ms, params) => {
      const plan = planOf(params);
      return cricketTravel(plan, ms) / cricketTravel(plan, plan.script.end);
    },
    counts: (ms, params) => cricketCounts(planOf(params), ms),
    // The hit ball's flight (or a moment, with less motion), or the bricks falling, before the outcome shows.
    endAt: ({ outcome, tapMs }, still, params) => {
      const plan = planOf(params);
      const flight = FLIGHTS[outcome];
      if (flight && tapMs !== null) return meetsAt(tapMs, plan) + (still ? 250 : Math.min(flight.ms, 750));
      return Math.max(tapMs ?? 0, plan.bricks) + 450;
    },
    Field: CricketField,
  };
}

/** The cricket as a cue_tap skin: its timing, rules, words and field. */
export const cricketSkin = cricketSkinFor(CRICKET_TUNING);

/** For the tests: where the bouncer and the real ball are, her run-up's phase, when a swing meets the ball (the story's tuning). */
const STORY_PLANS = { quick: cricketPlan(CRICKET_TUNING, "quick"), slower: cricketPlan(CRICKET_TUNING, "slower") };
export const CRICKET_FIELD_POINTS = {
  plans: STORY_PLANS,
  bouncerBall: (ms: number, ball: "quick" | "slower" = "quick") => bouncerBall(ms, STORY_PLANS[ball]),
  bowledBall: (ms: number, ball: "quick" | "slower" = "quick") => bowledBall(ms, STORY_PLANS[ball], CRICKET_TUNING.cleanLateMs),
  phaseAt: (ms: number) => phaseAt(ms, STORY_PLANS.quick, CRICKET_TUNING),
  meetsAt: (tapMs: number) => meetsAt(tapMs, STORY_PLANS.quick),
  HAND, BOUNCE, BAT, OVER, DEAD_CALL_JA, SORRY_LINE_JA,
} as const;
