import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type PointerEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { fieldPoint } from "../../host/seed";
import {
  keyStroke, SHAPE_DRAG_IDLE_HINT_MS, shapeEnds, shapeHandSpan, shapeHandWindows, shapeMeasures, shapeOfRecord, shapeRoll, shapeSkids, shapeStart,
  type ShapeClassifier, type ShapeDragRecord, type ShapeDragTuning, type ShapeMeasures, type ShapePoint, type ShapeRollMark, type ShapeState,
  type ShapeStroke,
} from "./engine";
import "./engine.css";

// The shape_drag engine's play (docs/13 2.2): a square board in the middle of the field with the shape on it. One finger
// drags a stroke across the board; the shape stretches under the finger while it drags, and when the finger lifts the
// shape turns a little (the skin's turnDeg) — or, with a hand (round 3), the hand turns it on its own beat and the play
// ends when the hand takes it (a stroke that meets the hand skids). The arrows roll through the centre (Shift: the
// diagonal clockwise of it). At the bottom, the skin's meter (if any), the hint and one big 「done」 button (pressed too
// soon, it says why). A stroke limit, an ending shape (a tear), the hand's end or a time from the first stroke (if the
// skin has one) also ends the play. Left without a stroke for a while, the board is told to show how to roll (`idle`).
// The skin's rules decide the outcome from the strokes, and the play ends at that moment (end with the strokes for the ★,
// the shape settling as the hold); the host shows the finish and the result card and takes its choice.

/** The hand as the board draws it (a skin with a hand): its visit now or next, and the window the play is in. */
export interface ShapeDragHandView {
  /** The visit now or next (its index in the hand's turns; the number of turns once the last has gone). */
  visit: number;
  /** "coming": it shows, not yet on the shape (its comeMs); "on": on the shape (a stroke now skids); null: away. */
  phase: "coming" | "on" | null;
  /** How far through its phase (0 to 1; 0 while away). */
  progress: number;
  /** The visit's turn in degrees (0: a feint, it turns nothing). */
  deg: number;
  /** How far the hand has turned the shape on this visit so far (0 before its turn's moment, `deg` once swung round). */
  swing: number;
  /** The window the play is in (its index in shapeHandWindows) while the hand is away, else -1. */
  opening: number;
  /** How much of that window is left (1 as it opens, 0 as the hand comes). */
  openingLeft: number;
  /** The play's time left until the hand takes the shape (ms). */
  leftMs: number;
}

/** What a skin's board draws: the shape as it looks now (in board offsets from the centre, -0.5 to 0.5). */
export interface ShapeDragView {
  points: readonly ShapePoint[];
  /** The pin while a stroke rolls: its centre (board offsets) and the way it rolls (degrees on the screen: 0 right, 90 down). */
  pin: { x: number; y: number; degrees: number; skid: boolean } | null;
  /** The shape's measures (as it looks now). */
  measures: ShapeMeasures;
  /** Strokes so far. */
  strokes: number;
  /** The play's outcome, once decided (the board can show it: a tear's hole). */
  outcome: string | null;
  /** The last stroke that rolled the shape (board 0 to 1), or null before the first. */
  lastStroke: ShapeStroke | null;
  /** No stroke for a while (from the start or the last stroke) while the play waits for one: the board may show how. */
  idle: boolean;
  /** How far the shape has turned as drawn (degrees clockwise on the screen; mid-turn while it swings round). */
  turned: number;
  /** What each stroke did (its way across the shape, its push, a skid), as the rules keep it. */
  rolls: readonly ShapeRollMark[];
  /** The hand (a skin with one), else null. */
  hand: ShapeDragHandView | null;
}

/** A skin's meter over the hint (「丸さ 72%」): a bar from 0 to 1 with a mark, and its words. */
export interface ShapeDragMeter {
  labelJa: string;
  /** 0 to 1; null: nothing to show yet (the bar is empty, the words say so). */
  value: number | null;
  /** Where the bar's mark stands (0 to 1). */
  mark: number;
  /** Whether it counts as past the mark (the bar lights): the value past it, unless something else holds it back. */
  over: boolean;
  textJa: string;
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
  /** A short warning in place of the hint (「うすくなってきた」), from the view (its measures, the hand); null: none. */
  noteJa(measures: ShapeMeasures, view: ShapeDragView): string | null;
  /** In place of the hint for a moment when 「done」 is pressed before it works (「まず生地をなぞって伸ばそう」). */
  notReadyJa: string;
  /** A meter over the hint (a measure the outcome reads), from the view; none: no meter. */
  meter?(view: ShapeDragView): ShapeDragMeter;
  /** The line under the outcome (a measure to show; never in the story: docs/13 4.1). */
  detailJa?(measures: ShapeMeasures, outcome: Outcome): string | undefined;
  /** The sound of a stroke (one of the definition's sounds), or null. */
  strokeSound: string | null;
  /** With a hand: the sound as it turns the shape (a feint makes none), and a stroke's skid (with a short buzz). */
  handSounds?: { turn: string | null; skid: string | null };
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

/** The hand as it is at `ms` (a tuning with a hand). */
export function shapeHandView(hand: NonNullable<ShapeDragTuning["hand"]>, ms: number): ShapeDragHandView {
  const windows = shapeHandWindows(hand);
  const leftMs = Math.max(0, hand.endMs - ms);
  const open = windows.findIndex((item) => ms >= item.from && ms < item.to);
  // The next visit: the first whose touch has not ended.
  let visit = 0;
  while (visit < hand.turns.length && shapeHandSpan(hand, visit).to < ms) visit++;
  const deg = hand.turns[visit]?.deg ?? 0;
  const base = { visit, deg, swing: 0, leftMs, opening: -1, openingLeft: 0 };
  if (visit < hand.turns.length) {
    const span = shapeHandSpan(hand, visit);
    if (ms >= span.from) return { ...base, phase: "on", progress: Math.min(1, (ms - span.from) / Math.max(1, span.to - span.from)) };
    if (ms >= span.from - hand.comeMs) {
      const coming = { ...base, phase: "coming" as const, progress: Math.min(1, (ms - (span.from - hand.comeMs)) / Math.max(1, hand.comeMs)) };
      return open >= 0 ? { ...coming, opening: open, openingLeft: (windows[open].to - ms) / Math.max(1, windows[open].to - windows[open].from) } : coming;
    }
  }
  if (open < 0) return { ...base, phase: null, progress: 0 };
  return { ...base, phase: null, progress: 0, opening: open, openingLeft: (windows[open].to - ms) / Math.max(1, windows[open].to - windows[open].from) };
}

/** How long the shape takes to turn after a stroke, and how long the outcome's shape stays before the host shows it. */
const TURN_MS = 320;
const SETTLE_MS = 650;
/** How long the hint says why 「done」 does not work yet. */
const NOT_READY_MS = 1600;
/** 「おまかせ」: one stroke's drag, and the wait after it (a record without times). */
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
  const hand = tuning.hand;
  return function ShapeDragPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art } = props;
    const latest = useRef(props);
    latest.current = props;
    const board = useRef<HTMLDivElement>(null);
    const doneButton = useRef<HTMLButtonElement>(null);
    const hintId = useId();
    /** The committed shape (the record rolled, with the hand's turns up to now) and strokes (the record the rules read). */
    const shape = useRef<ShapeState>(shapeStart(tuning));
    const record = useRef<ShapeStroke[]>([]);
    /** The stroke the finger (or おまかせ) is rolling now, from when it went down. */
    const rolling = useRef<{ pointer: number | null; stroke: ShapeStroke; downMs: number } | null>(null);
    /** The last turn (after a stroke, or the hand's): when it was and how far, for its swing. */
    const turnedAt = useRef<{ ms: number; deg: number; length: number } | null>(null);
    /** The hand's turns taken into the shape so far. */
    const handTurns = useRef(0);
    const decided = useRef<{ outcome: Outcome; endAt: number } | null>(null);
    const [view, setView] = useState<ShapeDragView>(() => {
      const start = shapeStart(tuning);
      return {
        points: start.points, pin: null, measures: shapeMeasures(start, tuning), strokes: 0, outcome: null, lastStroke: null, idle: false,
        turned: 0, rolls: [], hand: hand ? shapeHandView(hand, 0) : null,
      };
    });
    const [strokes, setStrokes] = useState(0);
    const [notReady, setNotReady] = useState(false);
    /** When the last stroke rolled the shape (the play's time; 0 before the first). */
    const strokedAt = useRef(0);
    const autoRecord = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);

    const finish = useCallback(() => {
      if (decided.current) return;
      rolling.current = null;
      const outcome = skin.rules.outcomeOf(record.current, latest.current.params);
      const holdMs = latest.current.still ? SETTLE_MS / 2 : SETTLE_MS;
      decided.current = { outcome, endAt: clock.now() + holdMs };
      // The end at the moment it is decided (docs/13 2.6): the record for the ★, the shape's settling as the hold.
      const strokes = [...record.current];
      latest.current.end(outcome, skin.detailJa?.(shapeMeasures(shapeOfRecord(strokes, tuning, classifier), tuning), outcome), { record: strokes, holdMs });
    }, [clock]);
    // A time limit (if the skin has one) runs from the first stroke: before it, nothing has been rolled to end. A hand's
    // end runs from the start.
    const timer = useRef<{ cancel: () => void; startedAt: number } | null>(null);
    useEffect(() => () => timer.current?.cancel(), []);
    useEffect(() => (hand ? clock.after(hand.endMs, finish) : undefined), [clock, finish]);
    /** The hand's turns that have come by `ms` (the shape rolled again with them): the last one swings the drawing round. */
    const takeTurns = useCallback((ms: number) => {
      if (!hand) return;
      const passed = hand.turns.filter((item) => item.at <= Math.min(ms, hand.endMs)).length;
      if (passed <= handTurns.current) return;
      const last = hand.turns[passed - 1];
      handTurns.current = passed;
      shape.current = shapeOfRecord(record.current, tuning, classifier, ms);
      if (!last.deg) return;
      turnedAt.current = { ms: last.at, deg: last.deg, length: Math.max(1, Math.min(TURN_MS, hand.stayMs)) };
      if (skin.handSounds?.turn) latest.current.sound(skin.handSounds.turn, { volume: 0.6 });
    }, []);

    /** Rolls a stroke into the shape (a tap or a stroke beside the shape changes nothing and is not counted). */
    const commit = useCallback((stroke: ShapeStroke) => {
      if (decided.current) return;
      rolling.current = null;
      const now = clock.now();
      takeTurns(now);
      const strokes = [...record.current, stroke];
      // The record rolled again (with the hand's turns up to now): the play draws exactly what the rules read.
      const next = hand ? shapeOfRecord(strokes, tuning, classifier, now) : shapeRoll(shape.current, stroke, tuning);
      if (next.strokes === shape.current.strokes) return;
      shape.current = next;
      record.current = strokes;
      if (!hand) turnedAt.current = { ms: now, deg: tuning.turnDeg, length: TURN_MS };
      strokedAt.current = now;
      if (tuning.timeMs !== null && !timer.current) timer.current = { cancel: clock.after(tuning.timeMs, finish), startedAt: now };
      setStrokes(next.strokes);
      setNotReady(false);
      if (skin.strokeSound) latest.current.sound(skin.strokeSound);
      if (next.rolls.at(-1)?.skid) {
        if (skin.handSounds?.skid) latest.current.sound(skin.handSounds.skid);
        latest.current.vibrate("hit");
      }
      const measures = shapeMeasures(next, tuning);
      if (shapeEnds(measures, classifier)) {
        latest.current.vibrate("shake");
        finish();
      } else if (tuning.maxStrokes !== null && next.strokes >= tuning.maxStrokes) finish();
    }, [clock, finish, takeTurns]);

    // 「おまかせ」: rolls the skin's record for its outcome, one stroke at a time (at its own times, when it has them), then finishes.
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
        const timed = typeof stroke.downMs === "number" && typeof stroke.upMs === "number";
        const startedAt = timed ? stroke.downMs! : clock.now();
        const dragMs = timed ? Math.max(1, stroke.upMs! - stroke.downMs!) : latest.current.still ? AUTO_DRAG_MS / 2 : AUTO_DRAG_MS;
        rolling.current = { pointer: null, stroke: { from: stroke.from, to: stroke.from }, downMs: startedAt };
        const stop = clock.onFrame((ms) => {
          const t = Math.min(1, (ms - startedAt) / dragMs);
          if (rolling.current) rolling.current = { ...rolling.current, stroke: { from: stroke.from, to: between(stroke, t) } };
          if (t < 1) return;
          stop();
          commit(stroke);
          cancel = wait();
        });
        cancel = stop;
      };
      // The next stroke: at its time (a timed record), else after a short gap.
      const wait = () => {
        const stroke = autoRecord[index];
        if (stroke && typeof stroke.downMs === "number") return clock.after(Math.max(0, stroke.downMs - clock.now()), next);
        return clock.after(latest.current.still ? AUTO_GAP_MS / 2 : AUTO_GAP_MS, next);
      };
      cancel = autoRecord[0] && typeof autoRecord[0].downMs === "number" ? wait() : clock.after(AUTO_GAP_MS, next);
      return () => cancel();
    }, [clock, autoRecord, commit, finish]);

    // Each frame: the hand's turns as they come, the shape as it looks (stretching under the stroke, or turning after it),
    // the status, the end.
    useEffect(() => {
      let shown = "";
      return clock.onFrame((ms) => {
        const done = decided.current;
        if (hand && !done) {
          takeTurns(ms);
          if (ms >= hand.endMs) finish();
        }
        const roll = rolling.current;
        let points: readonly ShapePoint[] = shape.current.points;
        let turned = shape.current.turned;
        let pin: ShapeDragView["pin"] = null;
        let measured = shape.current;
        if (roll && !done) {
          const skid = shapeSkids({ ...roll.stroke, downMs: roll.downMs, upMs: ms }, hand);
          const preview = shapeRoll(shape.current, roll.stroke, tuning, { turned: false, skid });
          points = preview.points;
          measured = preview;
          const dx = roll.stroke.to.x - roll.stroke.from.x;
          const dy = roll.stroke.to.y - roll.stroke.from.y;
          pin = { x: roll.stroke.to.x - 0.5, y: roll.stroke.to.y - 0.5, degrees: Math.hypot(dx, dy) > 0.01 ? (Math.atan2(dy, dx) * 180) / Math.PI : 270, skid };
        }
        let back = 0;
        if (turnedAt.current !== null) {
          const t = latest.current.still ? 1 : Math.min(1, (ms - turnedAt.current.ms) / turnedAt.current.length);
          if (t < 1) {
            back = -turnedAt.current.deg * (1 - easeOut(t));
            if (!roll) points = turnPoints(points, back);
            turned += back;
          } else turnedAt.current = null;
        }
        const idle = !done && !roll && latest.current.auto === null && ms - strokedAt.current >= SHAPE_DRAG_IDLE_HINT_MS;
        const lastStroke = record.current[record.current.length - 1] ?? null;
        let handView = hand ? shapeHandView(hand, ms) : null;
        // The hand goes round with the shape it turns (from its turn's moment).
        if (handView?.phase === "on" && hand && ms >= hand.turns[handView.visit].at) handView = { ...handView, swing: handView.deg + back };
        setView((current) => (current.points === points && current.pin === pin && current.outcome === (done?.outcome ?? null)
          && current.idle === idle && current.lastStroke === lastStroke && current.turned === turned && sameHand(current.hand, handView) ? current
          : {
            points, pin, measures: shapeMeasures(measured, tuning), strokes: shape.current.strokes, outcome: done?.outcome ?? null, lastStroke, idle,
            turned, rolls: shape.current.rolls, hand: handView,
          }));
        // The strokes left (a stroke limit), else the seconds left (a hand's end, or a time limit from the first stroke).
        const since = timer.current ? ms - timer.current.startedAt : 0;
        const text = tuning.maxStrokes !== null ? `のこり${Math.max(0, tuning.maxStrokes - shape.current.strokes)}回`
          : hand && !done ? `のこり${Math.max(0, Math.ceil((hand.endMs - ms) / 1000))}秒`
            : tuning.timeMs !== null && !done ? `のこり${Math.max(0, Math.ceil((tuning.timeMs - since) / 1000))}秒` : shown;
        if (text !== shown) {
          shown = text;
          latest.current.status(text);
        }
      });
    }, [clock, finish, takeTurns]);

    const playing = () => latest.current.auto === null && !decided.current;
    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
      if (!playing() || event.button !== 0 || !event.isPrimary || rolling.current || !board.current) return;
      const at = fieldPoint(event, board.current);
      rolling.current = { pointer: event.pointerId, stroke: { from: at, to: at }, downMs: clock.at(event.timeStamp) };
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
      const stroke: ShapeStroke = { from: roll.stroke.from, to: fieldPoint(event, board.current) };
      commit(hand ? { ...stroke, downMs: roll.downMs, upMs: Math.max(roll.downMs, clock.at(event.timeStamp)) } : stroke);
    };
    const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
      if (rolling.current?.pointer === event.pointerId) rolling.current = null;
    };
    const onKey = (event: KeyboardEvent) => {
      const stroke = keyStroke(event.key, event.shiftKey, tuning, hand ? clock.at(event.timeStamp) : undefined);
      if (!stroke) return;
      event.preventDefault();
      if (!playing() || event.repeat || rolling.current) return;
      commit(stroke);
    };
    const onDone = () => {
      if (!playing()) return;
      if (strokes >= tuning.minStrokesToFinish) finish();
      // Pressed too soon: turned away (the host's refusal), and the hint says why for a moment.
      else {
        latest.current.juice.denied(doneButton.current);
        setNotReady(true);
        clock.after(NOT_READY_MS, () => setNotReady(false));
      }
    };
    const ready = strokes >= tuning.minStrokesToFinish;
    // Near the end of the shape's way (a tear) or the hand's: the skin's word in place of how to play; 「done」 too soon: why not yet.
    const note = view.outcome !== null ? null : notReady ? skin.notReadyJa : skin.noteJa(view.measures, view);
    const meter = skin.meter?.(view);
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
          {meter && (
            <div className="mg-shape-drag-meter" data-testid="minigame-meter">
              <span className="mg-shape-drag-meter-label">{meter.labelJa}</span>
              <span className="mg-shape-drag-meter-bar" aria-hidden="true">
                <span className="mg-shape-drag-meter-fill" data-over={meter.over || undefined}
                  style={{ width: `${Math.round(Math.min(1, Math.max(0, meter.value ?? 0)) * 100)}%` }} />
                <span className="mg-shape-drag-meter-mark" style={{ left: `${Math.round(meter.mark * 100)}%` }} />
              </span>
              <span className="mg-shape-drag-meter-text">{meter.textJa}</span>
            </div>
          )}
          {auto === null && <p className="mg-shape-drag-hint" aria-live="polite" data-note={note ? true : undefined}>{note ?? skin.hintJa}</p>}
          {auto !== null ? <p className="mg-shape-drag-auto">{skin.autoJa}</p> : (
            <button ref={doneButton} type="button" className="primary mg-shape-drag-done" data-testid="minigame-action" data-minigame-primary
              aria-disabled={!ready || view.outcome !== null || undefined} aria-describedby={hintId} onClick={onDone}>{skin.doneJa}</button>
          )}
          <span id={hintId} className="sr-only">{skin.doneHintJa}</span>
        </div>
      </div>
    );
  };
}

/** Whether two hand views draw the same (the fuse and the hand's slide in twentieths: finer redraws the board for nothing a thumb sees). */
function sameHand(a: ShapeDragHandView | null, b: ShapeDragHandView | null): boolean {
  if (a === null || b === null) return a === b;
  return a.visit === b.visit && a.phase === b.phase && Math.round(a.progress * 20) === Math.round(b.progress * 20) && a.opening === b.opening && a.swing === b.swing
    && Math.ceil(a.openingLeft * 20) === Math.ceil(b.openingLeft * 20) && Math.ceil(a.leftMs / 1000) === Math.ceil(b.leftMs / 1000);
}
