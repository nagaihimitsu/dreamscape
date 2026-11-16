import { useId, useMemo, useRef } from "react";
import { shapePath, type ShapeDragFieldProps, type ShapeDragSkin } from "../engines/shape_drag/EnginePlay";
import type { ShapeRollMark } from "../engines/shape_drag/engine";
import { ROTI_WARMUP, type RotiOutcome, type RotiParams } from "./rules";
import { RotiArrow, RotiBoardFace, RotiDough, RotiPinAtRest, RotiPinRolling, RotiTable, softOutline, useRotiEnd, useRotiPress } from "./Skin";

// Practice's field (rules.ts ROTI_WARMUP; 2026-11-16): the same table, board, dough and pin as the real roti's, and only
// the stroke to learn. A smaller ball and an arrow that never burns down: up the board first (a push away), then across
// the way it was rolled; two strokes (the band counts them) and it ends. No Harbans's hand or words, no tava's glow, no
// dotted ring, no meter, no warning and no reactions of hers: nothing of the real play's beat, sizes or lines. A stroke
// presses the dough as in the real play; two that crossed sparkle at the end.

type FieldProps = ShapeDragFieldProps<RotiParams, RotiOutcome>;

/** The arrow's way on the screen (degrees: 0 right, 270 up): up first, then across the way the dough was last rolled. */
export function rotiWarmupArrow(rolls: readonly ShapeRollMark[]): number {
  const last = rolls.at(-1);
  return last ? (last.degrees + 90) % 180 : 270;
}

/** The pin as long as practice's strip is wide (the real one's length). */
const PIN_LENGTH = ROTI_WARMUP.tuning.band * 2;

function WarmupBackdrop({ art, cast, still }: FieldProps) {
  return <RotiTable art={art} person={cast.person} still={still} hot={false} said={null} />;
}

function WarmupBoard({ art, seed, view }: FieldProps) {
  const ids = useId().replace(/:/gu, "");
  const press = useRef<SVGGElement>(null);
  const lift = useRef<SVGCircleElement>(null);
  const hole = useRef<SVGPathElement>(null);
  useRotiPress(view, press, lift);
  useRotiEnd(view.outcome, press, hole);
  const path = useMemo(() => shapePath(softOutline(view.points)), [view.points]);
  const lifted = view.lastStroke ? { x: view.lastStroke.to.x - 0.5, y: view.lastStroke.to.y - 0.5 } : { x: 0, y: 0 };
  const playing = view.outcome === null && !view.pin;
  return (
    <svg className="mg-roti-rolling mg-play-object" viewBox="-0.5 -0.5 1 1" data-art-board={art.board ? true : undefined} data-warmup="true">
      <RotiBoardFace ids={ids} art={art} seed={seed} />
      <RotiPinAtRest art={art} length={PIN_LENGTH} hidden={!!view.pin} />
      <RotiDough ids={ids} art={art} path={path} thin={0} press={press} />
      {/* Where the pin last lifted (the flour's burst comes from here). */}
      <circle ref={lift} cx={lifted.x} cy={lifted.y} r="0.01" className="mg-roti-rolling-lift" />
      {playing && <RotiArrow degrees={rotiWarmupArrow(view.rolls)} fuse={1} idle={view.idle} coming={false} />}
      {view.pin && <RotiPinRolling art={art} length={PIN_LENGTH} pin={view.pin} />}
    </svg>
  );
}

/** Practice's roti as a shape_drag skin: its own tuning, shapes and rules (ROTI_WARMUP), plain words, the shared drawings. */
export const rotiWarmupSkin: ShapeDragSkin<RotiParams, RotiOutcome> = {
  tuning: ROTI_WARMUP.tuning,
  classifier: ROTI_WARMUP.shapes,
  rules: ROTI_WARMUP.rules,
  hintJa: "矢印の向きに、指で生地をなぞって伸ばす",
  doneJa: "できた",
  doneHintJa: "練習を終えるときに押します。押さなくても、二回伸ばすと終わります。",
  autoJa: "おまかせで伸ばしています",
  noteJa: () => null,
  notReadyJa: "まず生地をなぞって伸ばそう",
  strokeSound: "cloth_grab",
  Backdrop: WarmupBackdrop,
  Board: WarmupBoard,
};
