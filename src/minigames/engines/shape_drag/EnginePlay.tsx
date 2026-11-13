import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type PointerEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { fieldPoint } from "../../host/seed";
import {
  keyStroke, shapeEnds, shapeMeasures, shapeRoll, shapeStart,
  type ShapeClassifier, type ShapeDragRecord, type ShapeDragTuning, type ShapeMeasures, type ShapePoint, type ShapeState, type ShapeStroke,
} from "./engine";
import "./engine.css";

// The shape_drag engine's play (docs/13 2.2): a square board in the middle of the field with the shape on it. One finger
// drags a stroke across the board; the shape stretches under the finger while it drags, and when the finger lifts the
// shape turns a little (the skin's turnDeg). The arrows roll through the centre (Shift: the diagonal clockwise of it).
// At the bottom, one big 「done」 button. Time (the host's clock), a stroke limit or an ending shape (a tear) also ends the
// play. The skin's rules decide the outcome from the strokes; the host shows it and takes its choice.

/** What a skin's board draws: the shape as it looks now (in board offsets from the centre, -0.5 to 0.5). */
export interface ShapeDragView {
  points: readonly ShapePoint[];
  /** The pin while a stroke rolls: its centre (board offsets) and the way it rolls (degrees on the screen: 0 right, 90 down). */
  pin: { x: number; y: number; degrees: number } | null;
  /** The shape's measures (as it looks now). */
  measures: ShapeMeasures;
  /** Strokes so far. */
  strokes: number;
  /** The play's outcome, once decided (the board can show it: a tear's hole). */
  outcome: string | null;
}

/** What a skin's board and backdrop are given. */
export type ShapeDragFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "still" | "seed" | "cast" | "names" | "art"> & { view: ShapeDragView };

/** A skin of shape_drag: its tuning, shapes, rules, words and drawings. */
export interface ShapeDragSkin<Params, Outcome extends string> {
  tuning: ShapeDragTuning;
  classifier: ShapeClassifier<Outcome>;
  rules: MiniGameRules<Params, Outcome, ShapeDragRecord>;
  /** How to play, over the button (not while おまかせ plays). */
  hintJa: string;
  /** The 「done」 button. */
  doneJa: string;
  /** What the button does, read out with it. */
  doneHintJa: string;
  /** In place of the button while おまかせ plays. */
  autoJa: string;
  /** A short warning in place of the hint (「うすくなってきた」), from the shape's measures; null: none. */
  noteJa(measures: ShapeMeasures): string | null;
  /** The sound of a stroke (one of the definition's sounds), or null. */
  strokeSound: string | null;
  /** Behind the board, over the whole field. */
  Backdrop: ComponentType<ShapeDragFieldProps<Params, Outcome>>;
  /** The board and the shape on it (the square board, offsets -0.5 to 0.5 from its centre). */
  Board: ComponentType<ShapeDragFieldProps<Params, Outcome>>;
}

/** A smooth SVG path around the shape's corners (curves through the middles of its sides), in board offsets. */
export function shapePath(points: readonly ShapePoint[]): string {
  if (points.length < 3) return "";
  const at = (value: number) => Number(value.toFixed(4));
  const middle = (index: number) => {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    return `${at((a.x + b.x) / 2)} ${at((a.y + b.y) / 2)}`;
  };
  return `M ${middle(points.length - 1)} ${points.map((point, index) => `Q ${at(point.x)} ${at(point.y)} ${middle(index)}`).join(" ")} Z`;
}

/** How long the shape takes to turn after a stroke, and how long the outcome's shape stays before the host shows it. */
const TURN_MS = 320;
const SETTLE_MS = 650;
/** 「おまかせ」: one stroke's drag, and the wait after it. */
const AUTO_DRAG_MS = 420;
const AUTO_GAP_MS = 380;

const turnPoints = (points: readonly ShapePoint[], degrees: number): ShapePoint[] => {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map((point) => ({ x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }));
};
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const between = (stroke: ShapeStroke, t: number): ShapePoint => ({
  x: stroke.from.x + (stroke.to.x - stroke.from.x) * t, y: stroke.from.y + (stroke.to.y - stroke.from.y) * t,
});

/** The play of a shape_drag skin. */
export function shapeDragPlay<Params, Outcome extends string>(skin: ShapeDragSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const { tuning, classifier } = skin;
  return function ShapeDragPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art } = props;
    const latest = useRef(props);
    latest.current = props;
    const board = useRef<HTMLDivElement>(null);
    const hintId = useId();
    /** The committed shape and strokes (the record the rules read). */
    const shape = useRef<ShapeState>(shapeStart(tuning));
    const record = useRef<ShapeStroke[]>([]);
    /** The stroke the finger (or おまかせ) is rolling now. */
    const rolling = useRef<{ pointer: number | null; stroke: ShapeStroke } | null>(null);
    /** The turn after the last stroke: when it started. */
    const turnedAt = useRef<number | null>(null);
    const decided = useRef<{ outcome: Outcome; endAt: number } | null>(null);
    const [view, setView] = useState<ShapeDragView>(() => {
      const start = shapeStart(tuning);
      return { points: start.points, pin: null, measures: shapeMeasures(start, tuning), strokes: 0, outcome: null };
    });
    const [strokes, setStrokes] = useState(0);
    const autoRecord = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);

    const finish = useCallback(() => {
      if (decided.current) return;
      rolling.current = null;
      const outcome = skin.rules.outcomeOf(record.current, latest.current.params);
      decided.current = { outcome, endAt: clock.now() + (latest.current.still ? SETTLE_MS / 2 : SETTLE_MS) };
    }, [clock]);

    /** Rolls a stroke into the shape (a tap or a stroke beside the shape changes nothing and is not counted). */
    const commit = useCallback((stroke: ShapeStroke) => {
      if (decided.current) return;
      rolling.current = null;
      const next = shapeRoll(shape.current, stroke, tuning);
      if (next === shape.current) return;
      shape.current = next;
      record.current = [...record.current, stroke];
      turnedAt.current = clock.now();
      setStrokes(next.strokes);
      if (skin.strokeSound) latest.current.sound(skin.strokeSound);
      const measures = shapeMeasures(next, tuning);
      if (shapeEnds(measures, classifier)) {
        latest.current.vibrate("shake");
        finish();
      } else if (tuning.maxStrokes !== null && next.strokes >= tuning.maxStrokes) finish();
    }, [clock, finish]);

    // The play's time, and its end.
    useEffect(() => clock.after(tuning.timeMs, finish), [clock, finish]);

    // 「おまかせ」: rolls the skin's record for its outcome, one stroke at a time, then finishes.
    useEffect(() => {
      if (!autoRecord) return;
      let index = 0;
      let cancel = () => undefined as void;
      const next = () => {
        if (decided.current) return;
        const stroke = autoRecord[index];
        if (!stroke) {
          finish();
          return;
        }
        index++;
        const startedAt = clock.now();
        rolling.current = { pointer: null, stroke: { from: stroke.from, to: stroke.from } };
        const stop = clock.onFrame((ms) => {
          const t = Math.min(1, (ms - startedAt) / (latest.current.still ? AUTO_DRAG_MS / 2 : AUTO_DRAG_MS));
          if (rolling.current) rolling.current = { pointer: null, stroke: { from: stroke.from, to: between(stroke, t) } };
          if (t < 1) return;
          stop();
          commit(stroke);
          cancel = clock.after(latest.current.still ? AUTO_GAP_MS / 2 : AUTO_GAP_MS, next);
        });
        cancel = stop;
      };
      cancel = clock.after(AUTO_GAP_MS, next);
      return () => cancel();
    }, [clock, autoRecord, commit, finish]);

    // Each frame: the shape as it looks (stretching under the stroke, or turning after it), the status, the end.
    useEffect(() => {
      let ended = false;
      let shown = "";
      return clock.onFrame((ms) => {
        const done = decided.current;
        const roll = rolling.current;
        let points: readonly ShapePoint[] = shape.current.points;
        let pin: ShapeDragView["pin"] = null;
        let measured = shape.current;
        if (roll && !done) {
          const preview = shapeRoll(shape.current, roll.stroke, tuning, { turned: false });
          points = preview.points;
          measured = preview;
          const dx = roll.stroke.to.x - roll.stroke.from.x;
          const dy = roll.stroke.to.y - roll.stroke.from.y;
          pin = { x: roll.stroke.to.x - 0.5, y: roll.stroke.to.y - 0.5, degrees: Math.hypot(dx, dy) > 0.01 ? (Math.atan2(dy, dx) * 180) / Math.PI : 270 };
        } else if (turnedAt.current !== null) {
          const t = latest.current.still ? 1 : Math.min(1, (ms - turnedAt.current) / TURN_MS);
          if (t < 1) points = turnPoints(points, -tuning.turnDeg * (1 - easeOut(t)));
          else turnedAt.current = null;
        }
        setView((current) => (current.points === points && current.pin === pin && current.outcome === (done?.outcome ?? null) ? current
          : { points, pin, measures: shapeMeasures(measured, tuning), strokes: shape.current.strokes, outcome: done?.outcome ?? null }));
        if (!done) {
          const left = Math.max(0, Math.ceil((tuning.timeMs - ms) / 1000));
          const text = `のこり${left}秒`;
          if (text !== shown) {
            shown = text;
            latest.current.status(text);
          }
        }
        if (done && !ended && ms >= done.endAt) {
          ended = true;
          latest.current.end(done.outcome);
        }
      });
    }, [clock]);

    const playing = () => latest.current.auto === null && !decided.current;
    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (!playing() || event.button !== 0 || !event.isPrimary || rolling.current || !board.current) return;
      const at = fieldPoint(event, board.current);
      rolling.current = { pointer: event.pointerId, stroke: { from: at, to: at } };
      board.current.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
      const roll = rolling.current;
      if (!roll || roll.pointer !== event.pointerId || !board.current || decided.current) return;
      rolling.current = { ...roll, stroke: { from: roll.stroke.from, to: fieldPoint(event, board.current) } };
    };
    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
      const roll = rolling.current;
      if (!roll || roll.pointer !== event.pointerId || !board.current) return;
      commit({ from: roll.stroke.from, to: fieldPoint(event, board.current) });
    };
    const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
      if (rolling.current?.pointer === event.pointerId) rolling.current = null;
    };
    const onKey = (event: KeyboardEvent) => {
      const stroke = keyStroke(event.key, event.shiftKey, tuning);
      if (!stroke) return;
      event.preventDefault();
      if (!playing() || event.repeat || rolling.current) return;
      commit(stroke);
    };
    const onDone = () => {
      if (playing() && strokes >= tuning.minStrokesToFinish) finish();
    };
    const ready = strokes >= tuning.minStrokesToFinish;
    // Near the end of the shape's way (a tear): the skin's word in place of how to play.
    const note = view.outcome === null ? skin.noteJa(view.measures) : null;
    const fieldProps = { params, still, seed, cast, names, art, view };
    const { Backdrop, Board } = skin;
    return (
      <div className="mg-engine-shape-drag" onKeyDown={onKey}>
        <div className="mg-shape-drag-field">
          <div className="mg-shape-drag-backdrop" aria-hidden="true"><Backdrop {...fieldProps} /></div>
          <div className="mg-shape-drag-board" ref={board} aria-hidden="true" data-rolling={view.pin ? true : undefined}
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
            onLostPointerCapture={onPointerCancel}>
            <Board {...fieldProps} />
          </div>
        </div>
        <div className="mg-shape-drag-controls">
          {auto === null && <p className="mg-shape-drag-hint" aria-live="polite" data-note={note ? true : undefined}>{note ?? skin.hintJa}</p>}
          {auto !== null ? <p className="mg-shape-drag-auto">{skin.autoJa}</p> : (
            <button type="button" className="primary mg-shape-drag-done" data-testid="minigame-action" data-minigame-primary
              aria-disabled={!ready || view.outcome !== null || undefined} aria-describedby={hintId} onClick={onDone}>{skin.doneJa}</button>
          )}
          <span id={hintId} className="sr-only">{skin.doneHintJa}</span>
        </div>
      </div>
    );
  };
}
