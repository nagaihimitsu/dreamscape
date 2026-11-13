import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { stepPickEnd, stepPickEnding, stepPickStepAt, type StepPickEnding, type StepPickRecord, type StepPickTuning } from "./engine";
import "./engine.css";

// The step_pick engine's play (docs/13 2.2): the skin's field shows the step on show (a price, an offer), and two buttons
// sit at the bottom in thumb reach: the main one takes the step on show (Space and Enter too), the other leaves. The
// host's clock times it; the skin's rules decide; the host shows the outcome and takes its choice.

/** What the field shows: the step on show (frozen once the play is decided) and the ending once there is one. */
export interface StepPickView<Outcome extends string> {
  /** The step on show, from 0 (the number of steps once they have all passed). */
  step: number;
  ending: StepPickEnding | null;
  /** The skin's outcome of the ending (before the host takes its fallback when its choice cannot be taken now). */
  outcome: Outcome | null;
}

/** What a skin's field is given: the play's props it draws with, the view, and the engine's frames. */
export type StepPickFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "available" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
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
  /** The main button (「この値段で」), and what it does, read out with it. */
  takeJa: string;
  takeHintJa: string;
  /** The other button (「やめておく」), and what it does. */
  leaveJa: string;
  leaveHintJa: string;
  /** In place of the buttons while おまかせ plays. */
  autoJa: string;
  /**
   * Whether the main button can take a step now (default: always); false for every step a take there would end as the leave
   * does (a price the player cannot pay, none lower): the button is shown disabled, with `takeClosedJa` in place of the hint.
   */
  takeOpen?(step: number, available: readonly Outcome[]): boolean;
  takeClosedJa?: string;
  /** How long the field shows the ending before the play ends. */
  endDelayMs(ending: StepPickEnding, still: boolean): number;
  Field: ComponentType<StepPickFieldProps<Params, Outcome>>;
}

/** The play of a step_pick skin. */
export function stepPickPlay<Params, Outcome extends string>(skin: StepPickSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const end = stepPickEnd(skin.tuning);
  return function StepPickPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, available, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const [view, setView] = useState<StepPickView<Outcome>>({ step: 0, ending: null, outcome: null });
    const decided = useRef<{ endAt: number; outcome: Outcome } | null>(null);
    const draws = useRef(new Set<(ms: number) => void>());
    const latest = useRef(props);
    latest.current = props;
    const hintId = useId();
    const autoRecord = useMemo(() => (auto === null ? undefined : skin.rules.autoRecord(auto, params)), [auto, params]);

    const decide = useCallback((record: StepPickRecord, ms: number) => {
      if (decided.current) return;
      const ending = stepPickEnding(record, skin.tuning);
      const outcome = skin.rules.outcomeOf(record, latest.current.params);
      decided.current = { outcome, endAt: ms + skin.endDelayMs(ending, latest.current.still) };
      setView({ step: ending.kind === "take" ? ending.step : stepPickStepAt(ms, skin.tuning), ending, outcome });
    }, []);
    const takeOpen = (step: number) => skin.takeOpen?.(step, latest.current.available) ?? true;
    const act = (kind: "take" | "leave", ms: number) => {
      if (latest.current.auto !== null || decided.current || ms < 0 || ms >= end) return;
      if (kind === "take" && !takeOpen(stepPickStepAt(ms, skin.tuning))) return;
      decide({ kind, ms }, ms);
    };

    useEffect(() => {
      let ended = false;
      let shown = 0;
      return clock.onFrame((ms) => {
        if (!decided.current) {
          if (autoRecord && ms >= autoRecord.ms) decide(autoRecord, autoRecord.ms);
          else if (ms >= end) decide(null, ms);
        }
        if (!decided.current) {
          const step = stepPickStepAt(ms, skin.tuning);
          if (step !== shown) {
            shown = step;
            setView((current) => ({ ...current, step }));
          }
        }
        for (const draw of draws.current) draw(ms);
        const done = decided.current;
        if (done && !ended && ms >= done.endAt) {
          ended = true;
          latest.current.end(done.outcome);
        }
      });
    }, [clock, autoRecord, decide]);

    const frames = useCallback((draw: (ms: number) => void) => {
      draws.current.add(draw);
      return () => { draws.current.delete(draw); };
    }, []);
    const leaveButton = useRef<HTMLButtonElement>(null);
    const onKey = (event: KeyboardEvent) => {
      // Space and Enter take the step on show; on the leave button they press it (its own click).
      if ((event.key !== " " && event.key !== "Enter") || event.target === leaveButton.current) return;
      event.preventDefault();
      if (!event.repeat) act("take", clock.at(event.timeStamp));
    };
    const live = auto === null && view.ending === null;
    const canTake = live && takeOpen(view.step);
    const Field = skin.Field;
    return (
      <div className="mg-engine-step-pick" onKeyDown={onKey}>
        <div className="mg-step-pick-field" aria-hidden="true">
          <Field params={params} available={available} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate}
            view={view} frames={frames} />
        </div>
        <div className="mg-step-pick-controls">
          {auto === null && <p className="mg-step-pick-hint">{live && !canTake && skin.takeClosedJa ? skin.takeClosedJa : skin.hintJa}</p>}
          {auto !== null ? <p className="mg-step-pick-auto">{skin.autoJa}</p> : (
            <div className="mg-step-pick-buttons">
              {/* The main button first (the focus starts there; Tab goes on to the leave button), drawn on the right (engine.css). */}
              <button type="button" className="primary mg-step-pick-take" data-testid="minigame-action" data-minigame-primary
                aria-disabled={!canTake || undefined} aria-describedby={`${hintId}-take`}
                // The step the player saw as they pressed (the click comes after the finger lifts; a key's press comes as a click).
                onPointerDown={(event) => { if (event.button === 0) act("take", clock.at(event.timeStamp)); }}
                onClick={(event) => act("take", clock.at(event.timeStamp))}>{skin.takeJa}</button>
              <button ref={leaveButton} type="button" className="secondary mg-step-pick-leave" data-testid="minigame-leave"
                aria-disabled={!live || undefined} aria-describedby={`${hintId}-leave`}
                onClick={(event) => act("leave", clock.at(event.timeStamp))}>{skin.leaveJa}</button>
              <span id={`${hintId}-leave`} className="sr-only">{skin.leaveHintJa}</span>
              <span id={`${hintId}-take`} className="sr-only">{skin.takeHintJa}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
}
