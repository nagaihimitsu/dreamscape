import { useEffect, useId, useMemo, useRef, type CSSProperties } from "react";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import { shapePath, type ShapeDragFieldProps, type ShapeDragSkin, type ShapeDragView } from "../engines/shape_drag/EnginePlay";
import type { ShapePoint, ShapeRollMark } from "../engines/shape_drag/engine";
import { ROTI_GAME, ROTI_WAYS, rotiNextWay, type RotiGame, type RotiOutcome, type RotiParams } from "./rules";
import "./skin.css";

// The roti's field (a shape_drag skin with a hand, round 3): the work table seen from above, a round wooden board, the
// dough on it and the pin; Harbans looks on from the far corner and turns the dough on his own beat — his hand comes in
// from his corner, grips the dough's edge and turns it a quarter (or, once, only dusts it with flour: the feint). Over the
// dough, an arrow shows the way to roll next (the way of the dough rolled least so far, painted on the dough so it swings
// round with his turn; ties from the seed: looks only, the rules never read it) and its shaft burns down like a fuse while
// the window lasts; with his hand coming it fades, and once a stroke has gone in a window it waits for his turn (the long
// pause takes two). A dotted ring shows how big a good roti is. A stroke presses the dough (a moment's stop, flour where
// the pin lifts, the dough squashed); a stroke into his hand skids (a lopsided push, a shake, 「おっと、手だ」); near a tear
// the dough's edge turns to a dark dotted line. In the hot windows at the end the tava in the corner glows. With the use's
// art (`art.kitchen`, `art.board`, `art.pin`, `art.dough`) those pictures take the place of the drawn ones. The board's
// square is 1 across (offsets -0.5 to 0.5 from its centre); the round board fills it.

type FieldProps = ShapeDragFieldProps<RotiParams, RotiOutcome>;

const PIN_THICKNESS = 0.06;
/** Where the pin rests between strokes: the board's corner, smaller, under the dough. */
const PIN_REST = { x: 0.3, y: 0.39, degrees: -32, scale: 0.55 };
/** The arrow for the next stroke: this long, through the centre. */
const ARROW_LENGTH = 0.42;
/** A stroke's press: a short stop. */
const PRESS_STOP_MS = 50;
/** Harbans's hand comes from his corner (degrees on the screen: up and to the right) and rests on the dough's edge. */
const HAND_FROM_DEG = -50;
const HAND_FAR = 0.66;

/** The order the arrow takes the four ways in when they are rolled alike (from the seed: looks only). */
export function rotiPrefer(seed: number): number[] {
  const random = seededRandom(seed);
  return [...ROTI_WAYS].map((way) => ({ way, at: random() })).sort((a, b) => a.at - b.at).map((item) => item.way);
}

/** The arrow's way on the screen (degrees: 0 right, 90 down): the way of the dough rolled least, turned with the dough. */
export function rotiArrowDegrees(seed: number, view: Pick<ShapeDragView, "rolls" | "turned">): number {
  return (((rotiNextWay(view.rolls, rotiPrefer(seed)) + view.turned) % 360) + 360) % 360;
}

/** How the dough's outline is softened for the drawing: rays round its middle, and how far each radius is averaged. */
const OUTLINE = { rays: 96, reach: 3, passes: 3 } as const;

/**
 * The dough's outline as drawn: its radius round the middle, each averaged with its neighbours (a few degrees either side),
 * so a rolled roti's short flat sides (a pin rolls straight) read as the soft edge of dough, while a box keeps its
 * corners. The drawing only, never the rules (which measure the rolled shape itself). The shape is convex and centred.
 */
export function softOutline(points: readonly ShapePoint[]): ShapePoint[] {
  if (points.length < 3) return [...points];
  const cross = (a: ShapePoint, b: ShapePoint) => a.x * b.y - a.y * b.x;
  let radii = Array.from({ length: OUTLINE.rays }, (_, ray) => {
    const angle = (ray / OUTLINE.rays) * Math.PI * 2;
    const way = { x: Math.cos(angle), y: Math.sin(angle) };
    let far = 0;
    points.forEach((a, index) => {
      const b = points[(index + 1) % points.length];
      const side = { x: b.x - a.x, y: b.y - a.y };
      const denominator = cross(way, side);
      if (Math.abs(denominator) < 1e-12) return;
      const along = cross(a, side) / denominator;
      const at = cross(a, way) / denominator;
      if (along > 0 && at >= -1e-9 && at <= 1 + 1e-9) far = Math.max(far, along);
    });
    return far;
  });
  for (let pass = 0; pass < OUTLINE.passes; pass++) {
    radii = radii.map((_, ray) => {
      let sum = 0;
      for (let step = -OUTLINE.reach; step <= OUTLINE.reach; step++) sum += radii[(ray + step + OUTLINE.rays) % OUTLINE.rays];
      return sum / (OUTLINE.reach * 2 + 1);
    });
  }
  return radii.map((radius, ray) => {
    const angle = (ray / OUTLINE.rays) * Math.PI * 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

/** The tear: a ragged hole in the dough's middle (the story's 「生地の真ん中に、ぽっかり穴」), as large as the dough allows. */
function holePath(points: readonly ShapePoint[]): string {
  const nearest = Math.min(...points.map((point) => Math.hypot(point.x, point.y)));
  const size = Math.min(0.1, nearest * 0.45);
  // A fixed ragged outline (the same every time), scaled to the hole's size.
  const outline = [[-1, -0.1], [-0.7, -0.75], [0.1, -0.85], [0.8, -0.55], [1, 0.15], [0.55, 0.8], [-0.15, 0.7], [-0.75, 0.55]];
  return shapePath(outline.map(([x, y]) => ({ x: x * size, y: y * size * 0.8 })));
}

/** How far (degrees) a stroke may stray from its arrow, either way along it, and still be the arrow's way (Harbans's 「そうだ」). */
const ARROW_FOLLOWED_DEG = 25;

/** Whether the last stroke went the way its arrow showed (either way along it: the pin rolls both ways), on the dough. */
export function rotiFollowedArrow(seed: number, rolls: readonly ShapeRollMark[]): boolean {
  const last = rolls.at(-1);
  if (!last) return false;
  const apart = (((last.degrees - rotiNextWay(rolls.slice(0, -1), rotiPrefer(seed))) % 180) + 180) % 180;
  return Math.min(apart, 180 - apart) <= ARROW_FOLLOWED_DEG;
}

/**
 * The window the play is in (its index), whether a stroke has gone in it already, and whether it has had its strokes (one;
 * two in the long pause): the arrow then waits for his turn.
 */
function windowOf(game: RotiGame, view: Pick<ShapeDragView, "hand" | "rolls">) {
  const index = view.hand?.opening ?? -1;
  const slot = index >= 0 ? game.windows[index] : null;
  const count = slot ? view.rolls.filter((roll) => roll.at >= slot.from && roll.at <= slot.to).length : 0;
  return { index, slot, stroked: count > 0, full: count >= (slot?.kind === "pause" ? 2 : 1) };
}

/** His word as a window of the twist or the climax begins (the long pause, the quick pair, the hot tava), if it has one. */
function slotWord(game: RotiGame, index: number): string | null {
  const slot = game.windows[index];
  if (!slot || (index > 0 && game.windows[index - 1].kind === slot.kind)) return null;
  return slot.kind === "pause" ? "鉄板を見てくる。二回、押せ" : slot.kind === "quick" ? "速くするぞ" : slot.kind === "hot" ? "鉄板が熱い。急げ" : null;
}

/**
 * Harbans's word for the moment (shown, never in the story), and what it is keyed on (a new key shows it afresh). A word
 * stays over the moment after it until something new is said (2026-11-14 playtest: they faded within about a second): a
 * window's word over his hand's visit after it, his 「粉だ」 over the breath after the feint.
 */
export function rotiHarbansWord(game: RotiGame, seed: number, view: ShapeDragView): { key: string; word: string } | null {
  if (view.outcome !== null || view.pin) return null;
  if (view.hand?.phase && view.hand.deg === 0) return { key: `feint${view.hand.visit}`, word: "粉だ" };
  const { index, slot, stroked } = windowOf(game, view);
  // His hand on the dough after a window that had no stroke: that window's word stays (visit v follows window v).
  const closed = index < 0 && view.hand ? view.hand.visit : -1;
  const closedWindow = closed >= 0 ? game.windows[closed] : undefined;
  const closedWord = closedWindow && !view.rolls.some((roll) => roll.at >= closedWindow.from && roll.at <= closedWindow.to) ? slotWord(game, closed) : null;
  if (closedWord) return { key: `slot${closed}`, word: closedWord };
  if (stroked || (index < 0 && view.strokes > 0)) {
    const key = `stroke${view.strokes}`;
    if (view.rolls.at(-1)?.skid) return { key, word: "おっと、手だ" };
    if (game.note(view.measures)) return { key, word: "おっと" };
    return rotiFollowedArrow(seed, view.rolls) ? { key, word: "そうだ" } : null;
  }
  // The breath after the feint, before a stroke: his 「粉だ」 stays.
  if (slot?.kind === "breath" && game.hand.turns[index - 1]?.deg === 0) return { key: `feint${index - 1}`, word: "粉だ" };
  // The twist and the climax, as each begins.
  const word = slot ? slotWord(game, index) : null;
  return word ? { key: `slot${index}`, word } : null;
}

/** The roti's skin built from its game (the story's, or Debug's room's edited numbers: play.ts retune). */
export function rotiSkinFor(game: RotiGame): ShapeDragSkin<RotiParams, RotiOutcome> {
  const { tuning, numbers } = game;
  /** The pin: as long as its strip is wide (what one stroke rolls), and its handles. */
  const pinLength = tuning.band * 2;

  function RotiBackdrop({ art, cast, seed, view, still }: FieldProps) {
    const said = rotiHarbansWord(game, seed, view);
    const { slot } = windowOf(game, view);
    const hot = view.outcome === null && slot?.kind === "hot";
    return (
      <div className="mg-roti-rolling-table" data-art-kitchen={art.kitchen ? true : undefined}>
        {art.kitchen && <img className="mg-roti-rolling-kitchen mg-photo" src={art.kitchen} alt="" draggable={false} />}
        {/* The tava, waiting in the corner: it glows in the hot windows at the end. */}
        <span className="mg-roti-rolling-tava" data-hot={hot || undefined} data-still={still || undefined} data-testid="roti-tava" />
        {/* Harbans (the scene's speaker), looking on from the table's far corner; a word now and then, from his corner
            even where the scene gives no figure (Debug's room: 2026-11-14 playtest, the twist and the climax went unsaid). */}
        {(cast.person || said) && (
          <span className="mg-roti-rolling-harbans" data-figure={cast.person ? true : undefined}>
            {cast.person && <span className="mg-roti-rolling-harbans-figure">{cast.person}</span>}
            {said && <span className="mg-roti-rolling-harbans-word" key={said.key} data-testid="roti-word">{said.word}</span>}
          </span>
        )}
      </div>
    );
  }

  /** The pin, drawn or the use's picture, lying along x (its middle at 0, 0). */
  function Pin({ art }: { art: Readonly<Record<string, string>> }) {
    if (art.pin) return <image href={art.pin} x={-pinLength / 2 - 0.06} y={-PIN_THICKNESS} width={pinLength + 0.12} height={PIN_THICKNESS * 2} preserveAspectRatio="xMidYMid meet" />;
    return (
      <g className="mg-roti-rolling-pin-drawn">
        <rect x={-pinLength / 2 - 0.05} y={-PIN_THICKNESS / 2 + 0.012} width={pinLength + 0.1} height={PIN_THICKNESS} rx={PIN_THICKNESS / 2} className="mg-roti-rolling-pin-shadow" />
        <rect x={-pinLength / 2 - 0.06} y={-PIN_THICKNESS / 3} width={pinLength + 0.12} height={(PIN_THICKNESS * 2) / 3} rx={PIN_THICKNESS / 3} className="mg-roti-rolling-pin-handle" />
        <rect x={-pinLength / 2} y={-PIN_THICKNESS / 2} width={pinLength} height={PIN_THICKNESS} rx={PIN_THICKNESS / 2} className="mg-roti-rolling-pin-body" />
      </g>
    );
  }

  /**
   * Harbans's hand, its fingertips at (0, 0) and the hand and sleeve along +x (away from the dough): a broad hand, fingers
   * together, the thumb below, in a white kurta's sleeve. Its parts are drawn twice, outlined then filled, so the outline
   * goes round the whole hand (no seams between its parts).
   */
  function Hand({ flour }: { flour: boolean }) {
    const parts = (
      <>
        <rect x="0.15" y="-0.062" width="0.32" height="0.124" rx="0.024" className="mg-roti-rolling-sleeve" />
        <rect x="0" y="-0.048" width="0.1" height="0.096" rx="0.036" className="mg-roti-rolling-palm" />
        <rect x="0.055" y="-0.054" width="0.11" height="0.108" rx="0.04" className="mg-roti-rolling-palm" />
        <ellipse cx="0.1" cy="0.058" rx="0.038" ry="0.018" transform="rotate(-28 0.1 0.058)" className="mg-roti-rolling-palm" />
      </>
    );
    return (
      <g className="mg-roti-rolling-hand" data-flour={flour || undefined}>
        <g transform="translate(0.01 0.016)" className="mg-roti-rolling-hand-shadow">{parts}</g>
        <g className="mg-roti-rolling-hand-outline">{parts}</g>
        <g className="mg-roti-rolling-hand-fill">{parts}</g>
        {/* The fingers' lines, the cuff. */}
        {[-0.024, 0, 0.024].map((y) => <line key={y} x1="0.014" y1={y} x2="0.052" y2={y} className="mg-roti-rolling-hand-line" />)}
        <line x1="0.155" y1="-0.06" x2="0.155" y2="0.06" className="mg-roti-rolling-hand-line" />
        {flour && [[-0.02, 0.07], [0.025, 0.09], [-0.045, 0.1], [0.005, 0.125]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="0.009" className="mg-roti-rolling-flour-fall" />)}
      </g>
    );
  }

  function RotiBoard({ art, seed, view, still }: FieldProps) {
    const ids = useId().replace(/:/gu, "");
    const kit = useMiniGameKit();
    const press = useRef<SVGGElement>(null);
    const lift = useRef<SVGCircleElement>(null);
    const hole = useRef<SVGPathElement>(null);
    const handRef = useRef<SVGGElement>(null);
    // Flour on the board: where the specks lie is looks only (from the seed), never the rules.
    const flour = useMemo(() => {
      const random = seededRandom(seed);
      return Array.from({ length: 26 }, () => {
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random()) * 0.44;
        return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, r: 0.004 + random() * 0.008 };
      });
    }, [seed]);
    const live = useRef(kit);
    live.current = kit;
    // A stroke's press: a moment's stop, flour where the pin lifted, the dough squashed; a skid shakes the board.
    const pressed = useRef(0);
    useEffect(() => {
      if (view.strokes <= pressed.current) return;
      pressed.current = view.strokes;
      const { juice } = live.current;
      juice.hitStop(PRESS_STOP_MS);
      juice.burst(lift.current, "dust", 0.7);
      juice.squash(press.current, "press");
      if (view.rolls.at(-1)?.skid) juice.shake("s");
    }, [view.strokes]);
    // The feint: his hand dusts the dough with flour instead of turning it.
    const dusted = useRef(-1);
    const visit = view.hand?.visit ?? -1;
    const feintOn = view.hand?.phase === "on" && view.hand.deg === 0;
    useEffect(() => {
      if (!feintOn || dusted.current === visit) return;
      dusted.current = visit;
      live.current.juice.burst(handRef.current, "dust", 0.9);
    }, [feintOn, visit]);
    // Her reactions in the band (at most one in 1.5 s, the host's rule): she laughs at a skid (her face only), cheers as the
    // tava gets hot, and lights up the first time the dough reaches the dotted ring.
    const skidded = view.rolls.at(-1)?.skid === true;
    useEffect(() => { if (skidded) live.current.react("laugh"); }, [skidded, view.strokes]);
    const cheered = useRef({ hot: false, ring: false });
    const hotWindow = view.outcome === null && windowOf(game, view).slot?.kind === "hot";
    useEffect(() => {
      if (!hotWindow || cheered.current.hot) return;
      cheered.current.hot = true;
      live.current.react("cheer", "あと少し！");
    }, [hotWindow]);
    const ringReached = view.outcome === null && view.measures.span >= numbers.bigSpan && !game.note(view.measures);
    useEffect(() => {
      if (!ringReached || cheered.current.ring) return;
      cheered.current.ring = true;
      live.current.react("surprise", "わ、大きい！");
    }, [ringReached]);
    // The end in the field: a round one sparkles; a hole puffs and shakes the board.
    useEffect(() => {
      const { juice } = live.current;
      if (view.outcome === "round") juice.burst(press.current, "star", 1.2);
      if (view.outcome === "torn") {
        juice.burst(hole.current, "dust", 1);
        juice.shake("s");
      }
    }, [view.outcome]);
    const path = useMemo(() => shapePath(softOutline(view.points)), [view.points]);
    // Thinner dough is paler and lets the board show a little (the hint also says so: not by colour alone).
    const thin = Math.min(1, Math.max(0, (view.measures.area - 1) / (numbers.tearArea - 1)));
    const torn = view.outcome === "torn";
    const warn = view.outcome === null && game.note(view.measures) !== null;
    const hand = view.hand;
    const { full } = windowOf(game, view);
    // The arrow while a window is open and waits for its stroke (the long pause takes another), fading as his hand comes.
    const waiting = full;
    const playing = view.outcome === null && !view.pin && hand?.phase !== "on" && !waiting && (tuning.maxStrokes === null || view.strokes < tuning.maxStrokes);
    const arrow = rotiArrowDegrees(seed, view);
    // The fuse in twentieths (a step a frame would redraw the board every frame for nothing a thumb could see).
    const fuse = hand ? Math.ceil(Math.max(0, Math.min(1, hand.openingLeft)) * 20) / 20 : 1;
    const big = view.measures.span >= numbers.bigSpan;
    const lifted = view.lastStroke ? { x: view.lastStroke.to.x - 0.5, y: view.lastStroke.to.y - 0.5 } : { x: 0, y: 0 };
    // His hand: sliding in from his corner (at once with less motion), then on the dough's edge, going round with it.
    const rest = Math.min(0.4, Math.max(0.12, view.measures.span / 2 - 0.035));
    const handAt = !hand?.phase || view.outcome !== null ? null
      : hand.phase === "coming" ? (still ? rest : HAND_FAR - (HAND_FAR - rest) * (1 - (1 - hand.progress) ** 2)) : rest;
    const shaft = ARROW_LENGTH - 0.05;
    return (
      <svg className="mg-roti-rolling mg-play-object" viewBox="-0.5 -0.5 1 1" data-art-board={art.board ? true : undefined} data-torn={torn || undefined} data-warn={warn || undefined}
        data-hand={hand?.phase ?? undefined}>
        <defs>
          <radialGradient id={`${ids}-wood`} cx="0.42" cy="0.38" r="0.7">
            <stop offset="0" stopColor="#c8955f" />
            <stop offset="0.75" stopColor="#a8723f" />
            <stop offset="1" stopColor="#8a5a31" />
          </radialGradient>
          <radialGradient id={`${ids}-dough`} cx="0.4" cy="0.36" r="0.75">
            <stop offset="0" stopColor="#f6e9cb" />
            <stop offset="0.7" stopColor="#ecd6a8" />
            <stop offset="1" stopColor="#dcbd86" />
          </radialGradient>
          {art.dough && (
            <pattern id={`${ids}-texture`} patternUnits="userSpaceOnUse" x="-0.5" y="-0.5" width="0.5" height="0.5">
              <image href={art.dough} x="0" y="0" width="0.5" height="0.5" preserveAspectRatio="xMidYMid slice" />
            </pattern>
          )}
        </defs>
        {art.board
          ? <image href={art.board} x="-0.5" y="-0.5" width="1" height="1" preserveAspectRatio="xMidYMid meet" />
          : (
            <g className="mg-roti-rolling-board">
              <circle r="0.49" cy="0.012" className="mg-roti-rolling-board-shadow" />
              <circle r="0.49" fill={`url(#${ids}-wood)`} className="mg-roti-rolling-board-face" />
              <circle r="0.455" className="mg-roti-rolling-board-ring" />
            </g>
          )}
        {flour.map((speck, index) => <circle key={`speck-${index}`} cx={speck.x} cy={speck.y} r={speck.r} className="mg-roti-rolling-flour" />)}
        {/* How big a good roti is: reached, it turns gold. */}
        <circle r={numbers.bigSpan / 2} className="mg-roti-rolling-target" data-reached={big || undefined} />
        <g transform={`translate(${PIN_REST.x} ${PIN_REST.y}) rotate(${PIN_REST.degrees}) scale(${PIN_REST.scale})`} opacity={view.pin ? 0 : 1}>
          <Pin art={art} />
        </g>
        <g className="mg-roti-rolling-press" ref={press}>
          <path d={path} className="mg-roti-rolling-dough-shadow" transform="translate(0.006 0.01)" />
          <path d={path} fill={art.dough ? `url(#${ids}-texture)` : `url(#${ids}-dough)`} fillOpacity={1 - thin * 0.22} className="mg-roti-rolling-dough" data-testid="roti-dough" />
        </g>
        {torn && <path ref={hole} d={holePath(view.points)} className="mg-roti-rolling-hole" />}
        {/* Where the pin last lifted (the flour's burst comes from here). */}
        <circle ref={lift} cx={lifted.x} cy={lifted.y} r="0.01" className="mg-roti-rolling-lift" />
        {/* The next stroke's way, its shaft a fuse for the window (and, left alone, a finger rolling along it). */}
        {playing && (
          <g className="mg-roti-rolling-arrow" transform={`rotate(${arrow})`} data-testid="roti-arrow" data-degrees={Math.round(arrow)}
            data-coming={hand?.phase === "coming" || undefined}>
            <line x1={-ARROW_LENGTH / 2} y1="0" x2={ARROW_LENGTH / 2 - 0.05} y2="0" className="mg-roti-rolling-arrow-case" />
            <line x1={-ARROW_LENGTH / 2} y1="0" x2={ARROW_LENGTH / 2 - 0.05} y2="0" className="mg-roti-rolling-arrow-spent" />
            {fuse > 0 && <line x1={-ARROW_LENGTH / 2} y1="0" x2={-ARROW_LENGTH / 2 + shaft * fuse} y2="0" className="mg-roti-rolling-arrow-fuse" data-testid="roti-fuse" />}
            <path d={`M ${ARROW_LENGTH / 2} 0 L ${ARROW_LENGTH / 2 - 0.07} -0.045 L ${ARROW_LENGTH / 2 - 0.07} 0.045 Z`} />
            {view.idle && <circle className="mg-roti-rolling-finger" r="0.045" cx={-ARROW_LENGTH / 2} cy="0" style={{ "--finger-travel": `${ARROW_LENGTH}px` } as CSSProperties} />}
          </g>
        )}
        {/* The window has had its stroke: a faint turning sign, his turn next. */}
        {waiting && view.outcome === null && !view.pin && hand?.phase !== "on" && (
          <g className="mg-roti-rolling-wait" data-testid="roti-wait">
            <path d="M 0.05 -0.03 A 0.058 0.058 0 1 0 0.055 0.025" />
            <path d="M 0.035 -0.055 L 0.062 -0.022 L 0.022 -0.012 Z" className="mg-roti-rolling-wait-head" />
          </g>
        )}
        {/* Harbans's hand: coming from his corner, on the dough's edge, turning it with him (the feint: dusting flour). */}
        {handAt !== null && hand && (
          <g ref={handRef} transform={`rotate(${HAND_FROM_DEG + hand.swing}) translate(${handAt} 0)`} data-testid="roti-hand" data-phase={hand.phase}
            data-feint={hand.deg === 0 || undefined} opacity={hand.phase === "coming" ? 0.55 + 0.45 * hand.progress : 1}>
            <Hand flour={hand.deg === 0 && hand.phase === "on"} />
          </g>
        )}
        {view.pin && (
          <g transform={`translate(${view.pin.x} ${view.pin.y}) rotate(${view.pin.degrees + 90})`} className="mg-roti-rolling-pin" data-skid={view.pin.skid || undefined}>
            <Pin art={art} />
          </g>
        )}
      </svg>
    );
  }

  return {
    tuning,
    classifier: game.shapes,
    rules: game.rules,
    hintJa: "ハルバンスが回す合間に、矢印の向きに一回ずつ",
    doneJa: "できた",
    doneHintJa: "ローティーを伸ばし終えるときに押します。押さなくても、ハルバンスが鉄板に運ぶときに終わります。",
    autoJa: "おまかせで伸ばしています",
    noteJa: (measures) => game.note(measures),
    notReadyJa: "まず生地をなぞって伸ばそう",
    meter: (view) => {
      const { percent, boxy, small } = game.roundness(view.measures);
      const rolled = view.strokes > 0 || view.pin !== null;
      // A box, or a ball barely rolled, is not a round roti however round it measures: the bar does not light, the words say
      // why; one round and big enough to be まん丸 says so (the card's ★3).
      const roundEnough = view.measures.roundness >= numbers.roundness;
      const why = boxy ? "（四角い）" : small && roundEnough ? "（まだ小さい）" : game.perfect(view.measures) ? "（まん丸）" : "";
      return {
        labelJa: "丸さ", value: rolled ? view.measures.roundness : null, mark: numbers.roundness,
        over: rolled && roundEnough && !boxy && !small, textJa: rolled ? `${percent}%${why}` : "—",
      };
    },
    // The card's score (rules.ts rate) says how round: no line of its own.
    strokeSound: "cloth_grab",
    handSounds: { turn: "cloth_flap", skid: "snatch" },
    Backdrop: RotiBackdrop,
    Board: RotiBoard,
  };
}

/** The roti as a shape_drag skin: its tuning, shapes, rules, words and drawings. */
export const rotiSkin = rotiSkinFor(ROTI_GAME);
