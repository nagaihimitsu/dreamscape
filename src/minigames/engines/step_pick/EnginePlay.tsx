import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { stepPickCounted, stepPickEnding, stepPickStepOf, type StepPickEnding, type StepPickRecord, type StepPickTuning } from "./engine";
import "./engine.css";

// The step_pick engine's play (docs/13 2.2): the skin's field shows the step on show (a price) and the other side's
// patience; three buttons sit at the bottom in thumb reach: the leave button (narrow, left), the push button (the main
// one, in the middle) that moves the steps on, and the take button (right) that takes the step on show. The host's clock
// times the idle limit; the skin's rules decide; the host shows the outcome and takes its choice.

/** What the field shows: the step on show, the counted pushes, when the idle time started, and the ending once there is one. */
export interface StepPickView<Outcome extends string> {
  /** The step on show, from 0. */
  step: number;
  /** The counted pushes so far. */
  pushes: number;
  /** When the latest counted push was (the host's clock); null: none yet. */
  pushedAt: number | null;
  /** When doing nothing started to count (the start, or the latest counted push). */
  activeAt: number;
  /** How many times the take button was pressed while it had nothing to take (each a small reaction); 0: never. */
  denied: number;
  ending: StepPickEnding | null;
  /** The skin's outcome of the ending (before the host takes its fallback when its choice cannot be taken now). */
  outcome: Outcome | null;
}

/** What a skin's field is given: the play's props it draws with, the tuning, the view, and the engine's frames. */
export type StepPickFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "available" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
    tuning: StepPickTuning;
    view: StepPickView<Outcome>;
    /** Subscribes `draw` to every frame of the play (its time on the host's clock); returns the unsubscribe. */
    frames(draw: (ms: number) => void): () => void;
  };

/** A skin of step_pick: its steps, its rules (stepPickRules), its words and its field. */
export interface StepPickSkin<Params, Outcome extends string> {
  tuning: StepPickTuning;
  rules: MiniGameRules<Params, Outcome, StepPickRecord>;
  /** How to play, right above the buttons (not while おまかせ plays). */
  hintJa: string;
  /** The push button (「じっと見る」), and what it does, read out with it. */
  pushJa: string;
  pushHintJa: string;
  /** The take button (「この値段で」), and what it does. */
  takeJa: string;
  takeHintJa: string;
  /** The take button's second line and its name's addition for the step on show (the price: 「₹40」). */
  takeDetailJa?(step: number, available: readonly Outcome[]): string;
  /** The leave button (「やめておく」), and what it does. */
  leaveJa: string;
  leaveHintJa: string;
  /** In place of the buttons while おまかせ plays. */
  autoJa: string;
  /**
   * Whether the take button can take a step now (default: always); false for every step a take there would end as the
   * leave does (a price the player cannot pay, none lower): the button is shown disabled, with `takeClosedJa` in place of
   * the hint; pressed, it shakes a little (and view.denied tells the field).
   */
  takeOpen?(step: number, available: readonly Outcome[]): boolean;
  takeClosedJa?: string;
  /** The top band's short text (read out politely): the step on show, and what the field shows besides. */
  statusJa?(view: StepPickView<Outcome>, available: readonly Outcome[]): string;
  /** How long the field shows the ending before the play ends. */
  endDelayMs(ending: StepPickEnding, still: boolean): number;
  /** A line under the outcome's label (display only; `available` to say what the host will take). */
  detailJa?(outcome: Outcome, available: readonly Outcome[]): string | undefined;
  Field: ComponentType<StepPickFieldProps<Params, Outcome>>;
}

/** The play of a step_pick skin. */
export function stepPickPlay<Params, Outcome extends string>(skin: StepPickSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const { tuning } = skin;
  return function StepPickPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, available, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const [view, setView] = useState<StepPickView<Outcome>>({ step: 0, pushes: 0, pushedAt: null, activeAt: 0, denied: 0, ending: null, outcome: null });
    const pushes = useRef<number[]>([]);
    const decided = useRef<{ outcome: Outcome } | null>(null);
    const draws = useRef(new Set<(ms: number) => void>());
    const latest = useRef(props);
    latest.current = props;
    const latestView = useRef(view);
    latestView.current = view;
    const hintId = useId();
    const autoRecord = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);

    // The end at the moment it is decided (docs/13 2.6): the host's finish runs over the field's hold (the stamp, his
    // turning away), with the record for the rules.
    const decide = useCallback((record: StepPickRecord) => {
      if (decided.current) return;
      const ending = stepPickEnding(record, tuning);
      const kept: StepPickRecord = { pushes: [...record.pushes], end: record.end ? { ...record.end } : null };
      const outcome = skin.rules.outcomeOf(kept, latest.current.params);
      decided.current = { outcome };
      setView((current) => ({ ...current, ending, outcome }));
      latest.current.end(outcome, skin.detailJa?.(outcome, latest.current.available),
        { record: kept, holdMs: skin.endDelayMs(ending, latest.current.still) });
    }, []);
    const takeOpen = (step: number) => skin.takeOpen?.(step, latest.current.available) ?? true;
    /** A press of the push button: counted unless it comes within the push gap of the last counted one. */
    const push = useCallback((ms: number) => {
      if (decided.current) return;
      const counted = stepPickCounted([...pushes.current, ms], tuning);
      if (counted.length === pushes.current.length) return;
      pushes.current = counted;
      const record: StepPickRecord = { pushes: counted, end: null };
      setView((current) => ({ ...current, step: stepPickStepOf(counted.length, tuning), pushes: counted.length, pushedAt: ms, activeAt: ms }));
      if (stepPickEnding(record, tuning).kind === "out") decide(record);
    }, [decide]);
    const finish = useCallback((kind: "take" | "leave", ms: number) => {
      if (decided.current) return;
      decide({ pushes: pushes.current, end: { kind, ms } });
    }, [decide]);

    useEffect(() => {
      let autoIndex = 0;
      let shown: string | null = null;
      return clock.onFrame((ms) => {
        if (!decided.current) {
          if (autoRecord) {
            // おまかせ presses as its record says: its pushes, then its take or leave (or it lets the play run out).
            while (autoIndex < autoRecord.pushes.length && ms >= autoRecord.pushes[autoIndex]) push(autoRecord.pushes[autoIndex++]);
            if (autoIndex >= autoRecord.pushes.length && autoRecord.end && ms >= autoRecord.end.ms) finish(autoRecord.end.kind, autoRecord.end.ms);
            else if (!autoRecord.end && autoIndex >= autoRecord.pushes.length && ms - latestView.current.activeAt >= tuning.idleMs) decide(autoRecord);
          } else if (ms - latestView.current.activeAt >= tuning.idleMs) decide({ pushes: pushes.current, end: null });
        }
        if (skin.statusJa) {
          const text = skin.statusJa(latestView.current, latest.current.available);
          if (text !== shown) {
            shown = text;
            latest.current.status(text);
          }
        }
        for (const draw of draws.current) draw(ms);
      });
    }, [clock, autoRecord, decide, push, finish]);

    const frames = useCallback((draw: (ms: number) => void) => {
      draws.current.add(draw);
      return () => { draws.current.delete(draw); };
    }, []);
    const live = auto === null && view.ending === null;
    const canTake = live && takeOpen(view.step);
    const detail = skin.takeDetailJa?.(view.step, available);
    const takeButton = useRef<HTMLButtonElement>(null);
    const onTake = (timeStamp: number) => {
      if (!live) return;
      const ms = clock.at(timeStamp);
      if (takeOpen(view.step)) {
        finish("take", ms);
        return;
      }
      // Nothing to take: the host's refusal (a small wiggle and its sound); the field may say why (the hint says it too).
      latest.current.juice.denied(takeButton.current);
      setView((current) => ({ ...current, denied: current.denied + 1 }));
    };
    const Field = skin.Field;
    return (
      <div className="mg-engine-step-pick">
        <div className="mg-step-pick-field" aria-hidden="true">
          <Field params={params} available={available} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate}
            tuning={tuning} view={view} frames={frames} />
        </div>
        <div className="mg-step-pick-controls">
          {auto === null && <p className="mg-step-pick-hint">{live && !canTake && skin.takeClosedJa ? skin.takeClosedJa : skin.hintJa}</p>}
          {auto !== null ? <p className="mg-step-pick-auto">{skin.autoJa}</p> : (
            <div className="mg-step-pick-buttons">
              {/* The push button first (the focus starts there; Tab goes on to the take and the leave button). */}
              <button type="button" className="primary mg-step-pick-push" data-testid="minigame-action" data-minigame-primary
                aria-disabled={!live || undefined} aria-describedby={`${hintId}-push`}
                onClick={(event) => { if (live) push(clock.at(event.timeStamp)); }}>{skin.pushJa}</button>
              <button ref={takeButton} type="button" className="primary mg-step-pick-take" data-testid="minigame-take"
                aria-disabled={!canTake || undefined} aria-describedby={`${hintId}-take`}
                aria-label={detail ? `${skin.takeJa}（${detail}）` : undefined}
                onClick={(event) => onTake(event.timeStamp)}>
                <span>{skin.takeJa}</span>
                {detail && <small className="mg-step-pick-take-detail">{detail}</small>}
              </button>
              <button type="button" className="secondary mg-step-pick-leave" data-testid="minigame-leave"
                aria-disabled={!live || undefined} aria-describedby={`${hintId}-leave`}
                onClick={(event) => { if (live) finish("leave", clock.at(event.timeStamp)); }}>{skin.leaveJa}</button>
              <span id={`${hintId}-push`} className="sr-only">{skin.pushHintJa}</span>
              <span id={`${hintId}-take`} className="sr-only">{skin.takeHintJa}</span>
              <span id={`${hintId}-leave`} className="sr-only">{skin.leaveHintJa}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
}
