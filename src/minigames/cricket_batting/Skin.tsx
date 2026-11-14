import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { cueTapMoment, type CueTapTuning } from "../engines/cue_tap/engine";
import { useMiniGameKit } from "../host/kit";
import { CRICKET_FIELD, CRICKET_TUNING, cricketRulesFor, type CricketOutcome, type CricketParams } from "./rules";
import "./skin.css";

// The cricket's field (a cue_tap skin): the batter's view of the pitch over the scene, the bowler small at the far end, a
// short run-up, one bounce, the ball growing as it comes, three stacked bricks behind the bat. With the use's art
// (`art.pitch`, `art.bowler`) the drawn pitch and the heroine's standing picture give way to those pictures.
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

/**
 * The moments of one ball with a tuning: it leaves her hand, reaches the bat, stays by it as long as a late swing is still
 * clean (cleanLateMs: a phone lands a tap late), reaches the bricks.
 */
type Moments = { release: number; contact: number; cleanUntil: number; bricks: number; approach: number };
const momentsOf = (tuning: CueTapTuning): Moments => {
  const contact = cueTapMoment(tuning);
  const bricks = contact + CRICKET_FIELD.bricksMs;
  return { release: tuning.leadMs, contact, cleanUntil: Math.min(contact + tuning.cleanLateMs, bricks - 60), bricks, approach: tuning.approachMs };
};
/** How far from the bat toward the bricks the ball gets while a late swing is still clean (it still reads as met squarely). */
const CLEAN_DRIFT = 0.15;

/** Where the ball and its shadow are `ms` after the start when nothing hits it. */
function bowledBall(ms: number, moments: Moments): { ball: Point; ground: Point } {
  const s = (ms - moments.release) / moments.approach;
  const { bounceAt } = CRICKET_FIELD;
  if (s <= 0) return { ball: HAND, ground: HAND_GROUND };
  if (ms >= moments.bricks) return { ball: REST, ground: REST_GROUND };
  let ball: Point;
  let ground: Point;
  if (s <= bounceAt) {
    ball = mix(HAND, BOUNCE, s / bounceAt);
    ground = mix(HAND_GROUND, BOUNCE, s / bounceAt);
  } else if (s <= 1) {
    ball = mix(BOUNCE, BAT, (s - bounceAt) / (1 - bounceAt));
    ground = mix(BOUNCE, BAT_GROUND, (s - bounceAt) / (1 - bounceAt));
  } else {
    // Past the bat: it lingers by the plank through the late clean window (a swing then meets it there: a clean hit
    // looks clean), then runs on into the bricks.
    const clean = moments.cleanUntil - moments.contact;
    const past = ms <= moments.cleanUntil ? CLEAN_DRIFT * clamp01((ms - moments.contact) / clean)
      : CLEAN_DRIFT + (1 - CLEAN_DRIFT) * clamp01((ms - moments.cleanUntil) / (moments.bricks - moments.cleanUntil));
    ball = mix(BAT, BRICKS, past);
    ground = mix(BAT_GROUND, BRICKS_GROUND, past);
  }
  // The taped ball wobbles a little on its way: drawn the same every time, it changes nothing (the timing is the player's).
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
function plankBall(ms: number, moments: Moments): { ball: Point; ground: Point } {
  if (ms <= moments.contact) return bowledBall(ms, moments);
  if (ms <= moments.bricks) {
    const t = clamp01((ms - moments.contact) / (moments.bricks - moments.contact));
    return { ball: mix(BAT, PLANK, t), ground: mix(BAT_GROUND, { ...PLANK, y: PLANK.y + 8 }, t) };
  }
  const t = easeOut(clamp01((ms - moments.bricks) / PLANK_ROLL_MS));
  const ball = mix(PLANK, HER_FEET, t);
  return { ball, ground: ball };
}

/** The sounds of a play (definition `sounds`): the bat meeting the ball, the bricks falling, the children's cheer at a six. */
const SOUNDS = { hit: "bat_hit", bricks: "bricks_fall", cheer: "applause" } as const;
/** The children's cheer this long after a six on the play's clock (its 120 ms stop holds the clock: about 150 ms on screen). */
const CHEER_AFTER_MS = 30;
/** A ball knocking against the still plank: the bat's sound, soft and low. */
const PLANK_KNOCK = { volume: 0.4, rate: 0.8 } as const;

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
export function cricketSkinFor(tuning: CueTapTuning): CueTapSkin<CricketParams, CricketOutcome> {
  const moments = momentsOf(tuning);
  const runUp: CSSProperties = {
    ["--mg-cricket-batting-settle" as string]: `${Math.max(0, moments.release - CRICKET_FIELD.runUpMs)}ms`,
    ["--mg-cricket-batting-release" as string]: `${moments.release}ms`,
  };

  function CricketField({ params, cast, still, art, sound, vibrate, frames }: CueTapFieldProps<CricketParams, CricketOutcome>) {
    const ball = useRef<HTMLSpanElement>(null);
    const shadow = useRef<HTMLSpanElement>(null);
    const bricks = useRef<HTMLSpanElement>(null);
    const bat = useRef<HTMLSpanElement>(null);
    const [swung, setSwung] = useState(false);
    const [bricksDown, setBricksDown] = useState(false);
    const [cheer, setCheer] = useState<Side | null>(null);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    const ontoPlank = params.letgo === "plank";
    useEffect(() => {
      let hit = false;
      let fell = false;
      let knocked = false;
      let swing = false;
      let ended = false;
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
        const flight = outcome ? FLIGHTS[outcome] : undefined;
        // A ball let go onto the plank runs on to it (until a swing has missed it before: then it goes into the bricks).
        const plank = ontoPlank && outcome !== "bowled";
        const route = plank ? plankBall : bowledBall;
        if (tapMs !== null && !swing && outcome !== "no_swing") {
          swing = true;
          setSwung(true);
          // A swing that meets nothing: the plank's quick whiff.
          if (!flight) live.current.kit.juice.squash(bat.current, "press");
        }
        let where = route(ms, moments);
        if (flight && tapMs !== null) {
          const from = route(tapMs, moments);
          const t = easeOut(clamp01((ms - tapMs) / flight.ms));
          where = { ball: mix(from.ball, flight.to, t), ground: flight.rolls ? mix(from.ground, flight.to, t) : { ...from.ground, size: from.ground.size * (1 - t) } };
        }
        // Less motion: a hit ball does not fly (it is gone a moment after the bat meets it); off the plank it is at her
        // feet a moment after the knock.
        const gone = still && !!flight && tapMs !== null && ms - tapMs > 120;
        if (still && plank && !flight && ms > moments.bricks) where = ms - moments.bricks > 400 ? { ball: HER_FEET, ground: HER_FEET } : { ball: PLANK, ground: PLANK };
        place(ball.current, where.ball, ms < moments.release - 150 || gone);
        place(shadow.current, where.ground, ms < moments.release || gone);
        if (flight && outcome && !hit) {
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
        if (!flight && !plank && !fell && ms >= moments.bricks) {
          fell = true;
          setBricksDown(true);
          setCheer("bowler");
          live.current.sound(SOUNDS.bricks);
          strike("bowled", bricks.current);
        }
        // …or, let go onto the plank, knocks against it and rolls away to her feet.
        if (!flight && plank && !knocked && ms >= moments.bricks) {
          knocked = true;
          live.current.sound(SOUNDS.hit, PLANK_KNOCK);
          live.current.kit.juice.burst(ball.current, "dust", 0.7);
          live.current.kit.juice.squash(bat.current, "press");
          live.current.vibrate("tap");
        }
        // The end, at the moment that tells it (the bat meeting the ball; the bricks falling or the knock on the plank, or
        // no swing once its window is over): her face, and the swing's time for the ★, the rest of the picture held (off
        // the plank, until the ball has rolled to her feet).
        if (ended || !outcome || endAt === null || (!flight && !(plank ? knocked : fell))) return;
        ended = true;
        const until = !flight && plank ? Math.max(endAt, moments.bricks + (still ? 600 : PLANK_ROLL_MS) + 150) : endAt;
        live.current.kit.react(IMPACTS[outcome].react);
        live.current.kit.end(outcome, undefined, { record: tapMs, holdMs: Math.max(0, until - ms) });
      });
    }, [frames, still, ontoPlank]);
    return (
      <div className="mg-cricket-batting" data-art-pitch={art.pitch ? true : undefined} data-still={still || undefined} style={runUp}>
        {art.pitch && <img className="mg-cricket-batting-backdrop mg-photo" src={art.pitch} alt="" draggable={false} />}
        <span className="mg-cricket-batting-pitch" />
        {(["batter", "bowler"] as const).map((side) => (
          <span key={side} className="mg-cricket-batting-kids" data-side={side} data-cheer={cheer === side || undefined}>
            {KIDS[side].map((hair, index) => <Kid key={index} hair={hair} />)}
          </span>
        ))}
        <span className="mg-cricket-batting-crease mg-cricket-batting-crease-far" />
        <span className="mg-cricket-batting-bowler mg-play-object" data-running={!still || undefined}>
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
    tuning,
    rules: cricketRulesFor(tuning),
    hintJa: "針が金色の所に来たら「振る」",
    actionJa: "振る",
    actionHintJa: "ボールが来るのに合わせて押します。",
    autoJa: "おまかせで打っています",
    // The hit ball's flight (or a moment, with less motion), or the bricks falling, before the outcome shows.
    endAt: ({ outcome, tapMs }, still) => {
      const flight = FLIGHTS[outcome];
      return flight && tapMs !== null ? tapMs + (still ? 250 : Math.min(flight.ms, 750)) : Math.max(tapMs ?? 0, moments.bricks) + 450;
    },
    Field: CricketField,
  };
}

/** The cricket as a cue_tap skin: its timing, rules, words and field. */
export const cricketSkin = cricketSkinFor(CRICKET_TUNING);
