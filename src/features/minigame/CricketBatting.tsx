import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { cricketBatting } from "../../minigames/cricket_batting/definition";
import { playSound } from "../../audio/sound-effects";
import {
  CRICKET_CONTACT_MS, CRICKET_END_MS, CRICKET_RELEASE_MS, CRICKET_TIMING, cricketAutoSwing, cricketMeter, cricketMeterZones, cricketOutcome,
  type CricketOutcome,
} from "../../domain/cricket-batting";


/** What every mini-game's play gets from its frame (MiniGame.tsx). */
export interface MiniGamePlayProps {
  /** 「ミニゲームをおまかせにする」: the game plays itself and ends with `autoOutcome`. */
  auto: boolean;
  autoOutcome: string;
  /** 「演出を短縮する」 or the device's reduced motion: no flashes, shakes or flights; the ball and the meter still move. */
  still: boolean;
  /** The one opposite (a date: the heroine), drawn small at the far end. */
  partner?: ReactNode;
  onDone: (outcome: string) => void;
  /** The play cannot go on (the page was hidden): back to its start button. */
  onAbort: () => void;
}

/** The sounds of a play (registered in content/presentation/sounds.json): the bat meeting the ball, the bricks falling, the six's cheer. */
export const CRICKET_SOUNDS = { hit: "bat_hit", bricks: "bricks_fall", cheer: "applause" } as const;
/** A swing this soon after the play starts is the start button's second tap: ignored. */
const SWING_LIVE_MS = 450;
/** How long the result's label stays before the story goes on. */
const RESULT_MS = 1300;
const LABELS: Readonly<Record<string, string>> = Object.fromEntries(cricketBatting.outcomes.map((outcome) => [outcome.id, outcome.labelJa]));
const BRICKS_MS = CRICKET_CONTACT_MS + CRICKET_TIMING.bricksMs;

type Point = { x: number; y: number; size: number };
const mix = (from: Point, to: Point, t: number): Point => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t, size: from.size + (to.size - from.size) * t });
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// The ball's way, in percent of the field (size 1 at the bat): her hand, one bounce on the dusty pitch, the bat, the
// bricks behind it; its shadow on the ground under it.
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
  const s = (ms - CRICKET_RELEASE_MS) / CRICKET_TIMING.flightMs;
  const { bounceAt } = CRICKET_TIMING;
  if (s <= 0) return { ball: HAND, ground: HAND_GROUND };
  if (ms >= BRICKS_MS) return { ball: REST, ground: REST_GROUND };
  let ball: Point;
  let ground: Point;
  if (s <= bounceAt) {
    ball = mix(HAND, BOUNCE, s / bounceAt);
    ground = mix(HAND_GROUND, BOUNCE, s / bounceAt);
  } else if (s <= 1) {
    ball = mix(BOUNCE, BAT, (s - bounceAt) / (1 - bounceAt));
    ground = mix(BOUNCE, BAT_GROUND, (s - bounceAt) / (1 - bounceAt));
  } else {
    const past = clamp01((ms - CRICKET_CONTACT_MS) / CRICKET_TIMING.bricksMs);
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

/** A pointer's or a key's time in performance.now()'s clock (the event's own when the browser gives it). */
function eventTime(stamp: number): number {
  const now = performance.now();
  return stamp > 0 && Math.abs(now - stamp) < 1000 ? stamp : now;
}

/**
 * `cricket_batting`: the batter's view over the scene, the one opposite small at the far end, a short run-up, one bounce,
 * the ball growing as it comes; a meter whose needle crosses the gold zone as the ball reaches the bat; one big 「振る」
 * (a tap on the pitch, Space and Enter swing too). The swing's time gives the outcome (src/domain/cricket-batting.ts).
 */
export function CricketBatting({ auto, autoOutcome, still, partner, onDone, onAbort }: MiniGamePlayProps) {
  const start = useRef(0);
  /** The swing's time from the start (null: none yet) and the outcome, read by the frame loop as soon as they are set. */
  const swingAt = useRef<number | null>(null);
  const decided = useRef<CricketOutcome | null>(null);
  const [outcome, setOutcome] = useState<CricketOutcome | null>(null);
  const [swung, setSwung] = useState(false);
  const [bricksDown, setBricksDown] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const ball = useRef<HTMLSpanElement>(null);
  const shadow = useRef<HTMLSpanElement>(null);
  const needle = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLElement>(null);
  const swingButton = useRef<HTMLButtonElement>(null);
  const latest = useRef({ onDone, onAbort });
  latest.current = { onDone, onAbort };
  const autoSwing = auto ? cricketAutoSwing(autoOutcome as CricketOutcome) : null;

  function decide(ms: number | null) {
    swingAt.current = ms;
    const next = cricketOutcome(ms);
    decided.current = next;
    setOutcome(next);
    if (ms !== null) setSwung(true);
    if (FLIGHTS[next]) playSound(CRICKET_SOUNDS.hit);
  }
  function swing(at: number) {
    if (auto || decided.current || !start.current) return;
    const ms = at - start.current;
    if (ms >= SWING_LIVE_MS && ms <= CRICKET_END_MS) decide(ms);
  }

  useLayoutEffect(() => {
    start.current = performance.now();
    (swingButton.current ?? layer.current)?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    let frame = 0;
    let resultAt: number | null = null;
    let shown = false;
    let fell = false;
    const place = (element: HTMLElement | null, point: Point, hidden: boolean) => {
      if (!element) return;
      element.style.left = `${point.x}%`;
      element.style.top = `${point.y}%`;
      element.style.transform = `translate(-50%, -50%) scale(${point.size})`;
      element.style.opacity = hidden ? "0" : "1";
    };
    const draw = (now: number) => {
      const ms = now - start.current;
      if (!decided.current && autoSwing !== null && ms >= autoSwing) decide(autoSwing);
      if (!decided.current && ms > CRICKET_END_MS) decide(null);
      const end = decided.current;
      const flight = end ? FLIGHTS[end] : undefined;
      const swungAt = swingAt.current;
      let where = bowledBall(ms);
      if (flight && swungAt !== null) {
        const from = bowledBall(swungAt);
        const t = easeOut(clamp01((ms - swungAt) / flight.ms));
        where = { ball: mix(from.ball, flight.to, t), ground: flight.rolls ? mix(from.ground, flight.to, t) : { ...from.ground, size: from.ground.size * (1 - t) } };
      }
      // A ball not hit reaches the bricks behind the bat and knocks them down.
      if (!flight && !fell && ms >= BRICKS_MS) {
        fell = true;
        setBricksDown(true);
        playSound(CRICKET_SOUNDS.bricks);
      }
      // Reduced motion: a hit ball does not fly; it is gone a moment after the bat meets it.
      const gone = still && !!flight && swungAt !== null && ms - swungAt > 120;
      place(ball.current, where.ball, ms < CRICKET_RELEASE_MS - 150 || gone);
      place(shadow.current, where.ground, ms < CRICKET_RELEASE_MS || gone);
      if (needle.current) needle.current.style.left = `${cricketMeter(swungAt ?? ms) * 100}%`;
      if (end && resultAt === null)
        resultAt = flight && swungAt !== null ? swungAt + (still ? 250 : Math.min(flight.ms, 750)) : Math.max(swungAt ?? 0, BRICKS_MS) + 450;
      if (resultAt !== null && !shown && ms >= resultAt) {
        shown = true;
        setResult(LABELS[end!] ?? "");
        if (end === "six") playSound(CRICKET_SOUNDS.cheer);
      }
      if (resultAt !== null && ms >= resultAt + RESULT_MS) {
        latest.current.onDone(end!);
        return;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    // A hidden page stops the frames: the timing cannot be trusted, so the play starts again from its button.
    const hidden = () => { if (document.hidden) latest.current.onAbort(); };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", hidden);
    };
    // One loop for the play; it reads the swing and the outcome through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFieldDown = (event: PointerEvent) => {
    if (event.button === 0) swing(eventTime(event.timeStamp));
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) swing(eventTime(event.timeStamp));
  };
  const zones = cricketMeterZones();
  const span = ([from, to]: [number, number]): CSSProperties => ({ left: `${from * 100}%`, width: `${(to - from) * 100}%` });
  const definition = cricketBatting;
  return (
    <section ref={layer} tabIndex={-1} className="minigame-layer cricket" data-testid="minigame-play" data-still={still || undefined}
      data-outcome={outcome ?? undefined} data-no-advance aria-label="クリケットの打席" onKeyDown={onKey} onClick={(event) => event.stopPropagation()}>
      <div className="cricket-field" onPointerDown={onFieldDown} aria-hidden="true">
        <span className="cricket-pitch" />
        <span className="cricket-crease cricket-crease-far" />
        <span className="cricket-bowler" data-running={!still || undefined}>{partner}</span>
        <span className="cricket-bricks cricket-bricks-far"><span /><span /><span /></span>
        <span className="cricket-shadow" ref={shadow} />
        <span className="cricket-crease cricket-crease-near" />
        <span className="cricket-bricks cricket-bricks-near" data-down={bricksDown || undefined}><span /><span /><span /></span>
        <span className="cricket-ball" ref={ball} />
        <span className="cricket-bat" data-swung={swung || undefined} />
        {result !== null && <p className="minigame-result">{result}</p>}
      </div>
      <p className="sr-only" role="status">{result ?? ""}</p>
      <div className="minigame-controls">
        {!auto && <p className="minigame-hint">{definition.hintJa}</p>}
        <div className="cricket-meter" aria-hidden="true">
          <span className="cricket-meter-near" style={span(zones.near)} />
          <span className="cricket-meter-clean" style={span(zones.clean)} />
          <span className="cricket-meter-needle" ref={needle} />
        </div>
        {auto ? <p className="minigame-auto">おまかせで打っています</p> : (
          <button ref={swingButton} type="button" className="primary minigame-swing" data-testid="minigame-swing" aria-disabled={outcome !== null || undefined}
            aria-describedby="minigame-swing-hint" onPointerDown={(event) => { if (event.button === 0) swing(eventTime(event.timeStamp)); }}
            onClick={() => swing(performance.now())}>振る</button>
        )}
        <span id="minigame-swing-hint" className="sr-only">ボールが来るのに合わせて押します。</span>
      </div>
    </section>
  );
}
