import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { cueTapEnd, cueTapMeter, cueTapZones, type CueTapRecord, type CueTapTuning } from "./engine";
import "./engine.css";

// The cue_tap engine's play (docs/13 2.2): the field a skin draws, a meter whose needle crosses the zone where the thing
// arrives, and one big button at the bottom (a tap on the field and Space or Enter do the same). The host's clock times
// it; the skin's rules decide; the host shows the outcome and takes its choice.

/** What a skin's field draws at a frame. */
export interface CueTapView<Outcome extends string> {
  /** The play's time (the host's clock). */
  ms: number;
  /** The tap's time, once tapped (null: not yet, or the play ended without one). */
  tapMs: CueTapRecord;
  /** The skin's outcome, once decided. */
  outcome: Outcome | null;
  /** When the play ends (the host then shows the outcome), once decided. */
  endAt: number | null;
}

/** What a skin's field is given: the play's props it draws with, and the engine's frames. */
export type CueTapFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
    /** Subscribes `draw` to every frame of the play (the engine's own loop); returns the unsubscribe. */
    frames(draw: (view: CueTapView<Outcome>) => void): () => void;
  };

/** A skin of cue_tap: its timing, its rules (cueTapRules), its words and its field. */
export interface CueTapSkin<Params, Outcome extends string> {
  tuning: CueTapTuning;
  rules: MiniGameRules<Params, Outcome, CueTapRecord>;
  /** How to play, right above the meter (not while おまかせ plays). */
  hintJa: string;
  /** The button (「振る」). */
  actionJa: string;
  /** What the button does, read out with it. */
  actionHintJa: string;
  /** In place of the button while おまかせ plays. */
  autoJa: string;
  /** When the play ends once its outcome is decided (the field shows what happened first). */
  endAt(decided: { outcome: Outcome; tapMs: CueTapRecord }, still: boolean): number;
  Field: ComponentType<CueTapFieldProps<Params, Outcome>>;
}

/** The play of a cue_tap skin. */
export function cueTapPlay<Params, Outcome extends string>(skin: CueTapSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const end = cueTapEnd(skin.tuning);
  const zones = cueTapZones(skin.tuning);
  const span = ([from, to]: [number, number]): CSSProperties => ({ left: `${from * 100}%`, width: `${(to - from) * 100}%` });
  return function CueTapPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const decided = useRef<{ tapMs: CueTapRecord; outcome: Outcome; endAt: number } | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const needle = useRef<HTMLSpanElement>(null);
    const draws = useRef(new Set<(view: CueTapView<Outcome>) => void>());
    const latest = useRef(props);
    latest.current = props;
    const hintId = useId();
    const autoTap = useMemo(() => (auto === null ? undefined : skin.rules.autoRecord(auto, params)), [auto, params]);

    const decide = useCallback((tapMs: CueTapRecord) => {
      if (decided.current) return;
      const result = skin.rules.outcomeOf(tapMs, latest.current.params);
      decided.current = { tapMs, outcome: result, endAt: skin.endAt({ outcome: result, tapMs }, latest.current.still) };
      setOutcome(result);
    }, []);
    const tap = (ms: number) => {
      if (latest.current.auto !== null || decided.current || ms < 0 || ms > end) return;
      decide(ms);
    };

    useEffect(() => {
      let ended = false;
      return clock.onFrame((ms) => {
        if (!decided.current && autoTap !== undefined && autoTap !== null && ms >= autoTap) decide(autoTap);
        if (!decided.current && ms > end) decide(null);
        const done = decided.current;
        if (needle.current) needle.current.style.left = `${cueTapMeter(done?.tapMs ?? ms, skin.tuning) * 100}%`;
        const view: CueTapView<Outcome> = { ms, tapMs: done?.tapMs ?? null, outcome: done?.outcome ?? null, endAt: done?.endAt ?? null };
        for (const draw of draws.current) draw(view);
        if (done && !ended && ms >= done.endAt) {
          ended = true;
          latest.current.end(done.outcome);
        }
      });
    }, [clock, autoTap, decide]);

    const frames = useCallback((draw: (view: CueTapView<Outcome>) => void) => {
      draws.current.add(draw);
      return () => { draws.current.delete(draw); };
    }, []);
    const onPointer = (event: PointerEvent) => {
      if (event.button === 0) tap(clock.at(event.timeStamp));
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!event.repeat) tap(clock.at(event.timeStamp));
    };
    const Field = skin.Field;
    return (
      <div className="mg-engine-cue-tap" onKeyDown={onKey}>
        <div className="mg-cue-tap-field" onPointerDown={onPointer} aria-hidden="true">
          <Field params={params} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate} frames={frames} />
        </div>
        <div className="mg-cue-tap-controls">
          {auto === null && <p className="mg-cue-tap-hint">{skin.hintJa}</p>}
          <div className="mg-cue-tap-meter" aria-hidden="true">
            <span className="mg-cue-tap-meter-near" style={span(zones.near)} />
            <span className="mg-cue-tap-meter-clean" style={span(zones.clean)} />
            <span className="mg-cue-tap-meter-needle" ref={needle} />
          </div>
          {auto !== null ? <p className="mg-cue-tap-auto">{skin.autoJa}</p> : (
            <button type="button" className="primary mg-cue-tap-action" data-testid="minigame-action" data-minigame-primary
              aria-disabled={outcome !== null || undefined} aria-describedby={hintId}
              onPointerDown={onPointer} onClick={() => tap(clock.now())}>{skin.actionJa}</button>
          )}
          <span id={hintId} className="sr-only">{skin.actionHintJa}</span>
        </div>
      </div>
    );
  };
}
