import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { CRICKET_BRICKS_MS, CRICKET_CONTACT_MS, CRICKET_FIELD, CRICKET_RELEASE_MS, CRICKET_TUNING, cricketRules, type CricketOutcome, type CricketParams } from "./rules";
import "./skin.css";

// The cricket's field (a cue_tap skin): the batter's view of the pitch over the scene, the bowler small at the far end, a
// short run-up, one bounce, the ball growing as it comes, three stacked bricks behind the bat. With the use's art
// (`art.pitch`, `art.bowler`) the drawn pitch and the heroine's standing picture give way to those pictures.

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

/** Where the ball and its shadow are `ms` after the start when nothing hits it. */
function bowledBall(ms: number): { ball: Point; ground: Point } {
  const s = (ms - CRICKET_RELEASE_MS) / CRICKET_TUNING.approachMs;
  const { bounceAt } = CRICKET_FIELD;
  if (s <= 0) return { ball: HAND, ground: HAND_GROUND };
  if (ms >= CRICKET_BRICKS_MS) return { ball: REST, ground: REST_GROUND };
  let ball: Point;
  let ground: Point;
  if (s <= bounceAt) {
    ball = mix(HAND, BOUNCE, s / bounceAt);
    ground = mix(HAND_GROUND, BOUNCE, s / bounceAt);
  } else if (s <= 1) {
    ball = mix(BOUNCE, BAT, (s - bounceAt) / (1 - bounceAt));
    ground = mix(BOUNCE, BAT_GROUND, (s - bounceAt) / (1 - bounceAt));
  } else {
    const past = clamp01((ms - CRICKET_CONTACT_MS) / CRICKET_FIELD.bricksMs);
    ball = mix(BAT, BRICKS, past);
    ground = mix(BAT_GROUND, BRICKS_GROUND, past);
  }
  // The taped ball wobbles a little on its way: drawn the same every time, it changes nothing (the timing is the player's).
  const wobble = Math.sin(s * 9) * 0.9 * (1 - Math.min(1, s) * 0.6);
  return { ball: { ...ball, x: ball.x + wobble }, ground };
}

/** Where a hit ball goes (from where the bat met it) and in how long: straight back over her head, high over the side, to her feet. */
const FLIGHTS: Partial<Record<CricketOutcome, { to: Point; rolls?: true; ms: number }>> = {
  six: { to: { x: 50, y: -10, size: 0.18 }, ms: 800 },
  over_wall: { to: { x: -14, y: 6, size: 0.3 }, ms: 850 },
  edge: { to: { x: 48, y: 31, size: 0.32 }, rolls: true, ms: 1100 },
};

/** The sounds of a play (definition `sounds`): the bat meeting the ball, the bricks falling, the six's cheer. */
const SOUNDS = { hit: "bat_hit", bricks: "bricks_fall", cheer: "applause" } as const;

function CricketField({ cast, still, art, sound, frames }: CueTapFieldProps<CricketParams, CricketOutcome>) {
  const ball = useRef<HTMLSpanElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const [swung, setSwung] = useState(false);
  const [bricksDown, setBricksDown] = useState(false);
  const play = useRef(sound);
  play.current = sound;
  useEffect(() => {
    let hit = false;
    let fell = false;
    let cheered = false;
    let swing = false;
    const place = (element: HTMLElement | null, point: Point, hidden: boolean) => {
      if (!element) return;
      element.style.left = `${point.x}%`;
      element.style.top = `${point.y}%`;
      element.style.transform = `translate(-50%, -50%) scale(${point.size})`;
      element.style.opacity = hidden ? "0" : "1";
    };
    return frames(({ ms, tapMs, outcome, endAt }) => {
      const flight = outcome ? FLIGHTS[outcome] : undefined;
      if (tapMs !== null && !swing) {
        swing = true;
        setSwung(true);
      }
      if (flight && !hit) {
        hit = true;
        play.current(SOUNDS.hit);
      }
      let where = bowledBall(ms);
      if (flight && tapMs !== null) {
        const from = bowledBall(tapMs);
        const t = easeOut(clamp01((ms - tapMs) / flight.ms));
        where = { ball: mix(from.ball, flight.to, t), ground: flight.rolls ? mix(from.ground, flight.to, t) : { ...from.ground, size: from.ground.size * (1 - t) } };
      }
      // A ball not hit reaches the bricks behind the bat and knocks them down.
      if (!flight && !fell && ms >= CRICKET_BRICKS_MS) {
        fell = true;
        setBricksDown(true);
        play.current(SOUNDS.bricks);
      }
      // Less motion: a hit ball does not fly; it is gone a moment after the bat meets it.
      const gone = still && !!flight && tapMs !== null && ms - tapMs > 120;
      place(ball.current, where.ball, ms < CRICKET_RELEASE_MS - 150 || gone);
      place(shadow.current, where.ground, ms < CRICKET_RELEASE_MS || gone);
      if (outcome === "six" && endAt !== null && ms >= endAt && !cheered) {
        cheered = true;
        play.current(SOUNDS.cheer);
      }
    });
  }, [frames, still]);
  return (
    <div className="mg-cricket-batting" data-art-pitch={art.pitch ? true : undefined}>
      {art.pitch && <img className="mg-cricket-batting-backdrop" src={art.pitch} alt="" draggable={false} />}
      <span className="mg-cricket-batting-pitch" />
      <span className="mg-cricket-batting-crease mg-cricket-batting-crease-far" />
      <span className="mg-cricket-batting-bowler" data-running={!still || undefined}>
        {art.bowler ? <img src={art.bowler} alt="" draggable={false} /> : cast.heroine}
      </span>
      <span className="mg-cricket-batting-bricks mg-cricket-batting-bricks-far"><span /><span /><span /></span>
      <span className="mg-cricket-batting-shadow" ref={shadow} />
      <span className="mg-cricket-batting-crease mg-cricket-batting-crease-near" />
      <span className="mg-cricket-batting-bricks mg-cricket-batting-bricks-near" data-down={bricksDown || undefined}><span /><span /><span /></span>
      <span className="mg-cricket-batting-ball" ref={ball} />
      <span className="mg-cricket-batting-bat" data-swung={swung || undefined} />
    </div>
  );
}

/** The cricket as a cue_tap skin: its timing, rules, words and field. */
export const cricketSkin: CueTapSkin<CricketParams, CricketOutcome> = {
  tuning: CRICKET_TUNING,
  rules: cricketRules,
  hintJa: "針が金色の所に来たら「振る」",
  actionJa: "振る",
  actionHintJa: "ボールが来るのに合わせて押します。",
  autoJa: "おまかせで打っています",
  // The hit ball's flight (or a moment, with less motion), or the bricks falling, before the outcome shows.
  endAt: ({ outcome, tapMs }, still) => {
    const flight = FLIGHTS[outcome];
    return flight && tapMs !== null ? tapMs + (still ? 250 : Math.min(flight.ms, 750)) : Math.max(tapMs ?? 0, CRICKET_BRICKS_MS) + 450;
  },
  Field: CricketField,
};
