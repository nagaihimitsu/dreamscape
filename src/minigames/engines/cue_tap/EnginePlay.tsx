import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { cueTapCounts, cueTapEnd, cueTapMeter, cueTapZones, type CueTapRecord, type CueTapTuning } from "./engine";
import "./engine.css";

// The cue_tap engine's play (docs/13 2.2): the field a skin draws, a meter whose needle crosses the zone where the thing
// arrives (or the skin's own gauge), and one big button at the bottom (a tap on the field and Space or Enter do the same).
// The host's clock times it; the skin's rules decide; the host shows the outcome and takes its choice. A tap before the
// thing starts coming does not count (the player can still tap): it is turned away with the host's light refusal, never
// taken. The play ends (the host's finish, then its result card) at the moment the field shows the outcome (the skin's
// impactAt: the catch, the scream, the voices meeting), with the tap as the record (★) and the rest of the field's picture
// as the hold.

/** What a skin's field draws at a frame. */
export interface CueTapView<Outcome extends string> {
  /** The play's time (the host's clock). */
  ms: number;
  /** The tap's time, once tapped (null: not yet, or the play ended without one). */
  tapMs: CueTapRecord;
  /** The skin's outcome, once decided. */
  outcome: Outcome | null;
  /** When the field shows the outcome (its moment of impact; the engine ends the play then), once decided. */
  impactAt: number | null;
  /** When the field has shown all of it (the end of the host's hold), once decided. */
  endAt: number | null;
}

/** What a skin's field is given: the play's props it draws with, and the engine's frames (the host's kit: useMiniGameKit). */
export type CueTapFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
    /** Subscribes `draw` to every frame of the play (the engine's own loop); returns the unsubscribe. */
    frames(draw: (view: CueTapView<Outcome>) => void): () => void;
  };

/** What a skin's gauge is given (it stands where the meter would). */
export type CueTapGaugeProps<Params, Outcome extends string> = Pick<CueTapFieldProps<Params, Outcome>, "still" | "frames">;

/** A play's decision: its outcome and its tap. */
export type CueTapDecided<Outcome extends string> = { outcome: Outcome; tapMs: CueTapRecord };

/** A skin of cue_tap: its timing, its rules (cueTapRules), its words and its field. */
export interface CueTapSkin<Params, Outcome extends string> {
  tuning: CueTapTuning;
  rules: MiniGameRules<Params, Outcome, CueTapRecord>;
  /** How to play, right above the meter (not while おまかせ plays); the same words as the definition's hintJa. */
  hintJa: string;
  /** The button (「振る」). */
  actionJa: string;
  /** What the button does, read out with it. */
  actionHintJa: string;
  /** In place of the button while おまかせ plays. */
  autoJa: string;
  /** When the field has shown what happened, once the outcome is decided (the end of the host's hold). */
  endAt(decided: CueTapDecided<Outcome>, still: boolean): number;
  /**
   * When the field shows the outcome (the catch, the scream): the engine ends the play then, the host's finish over it.
   * Without it, the engine ends the play at endAt (a skin that ends it itself from its field, as the cricket does, ends it
   * first; the first end counts).
   */
  impactAt?(decided: CueTapDecided<Outcome>, still: boolean): number;
  Field: ComponentType<CueTapFieldProps<Params, Outcome>>;
  /** In place of the meter: the skin's own gauge of the coming moment (the flap's steps). Without it, the meter. */
  Gauge?: ComponentType<CueTapGaugeProps<Params, Outcome>>;
}

/** The play of a cue_tap skin. */
export function cueTapPlay<Params, Outcome extends string>(skin: CueTapSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const end = cueTapEnd(skin.tuning);
  const zones = cueTapZones(skin.tuning);
  const span = ([from, to]: [number, number]): CSSProperties => ({ left: `${from * 100}%`, width: `${(to - from) * 100}%` });
  return function CueTapPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const decided = useRef<{ tapMs: CueTapRecord; outcome: Outcome; impactAt: number; endAt: number } | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);
    const needle = useRef<HTMLSpanElement>(null);
    const button = useRef<HTMLButtonElement>(null);
    const draws = useRef(new Set<(view: CueTapView<Outcome>) => void>());
    const latest = useRef(props);
    latest.current = props;
    const hintId = useId();
    const autoTap = useMemo(() => (auto === null ? undefined : skin.rules.autoRecord(auto, params)), [auto, params]);

    // A press on the button gives a pointerdown and then a click: the pointerdown taps; the click taps only when no
    // pointer pressed it (a screen reader's activation). Otherwise a press turned away as too soon could tap on release.
    const pointerPress = useRef(false);

    const decide = useCallback((tapMs: CueTapRecord) => {
      if (decided.current) return;
      const { still: less, params: current } = latest.current;
      const result = skin.rules.outcomeOf(tapMs, current);
      const endAt = skin.endAt({ outcome: result, tapMs }, less);
      const impactAt = Math.min(endAt, skin.impactAt?.({ outcome: result, tapMs }, less) ?? endAt);
      decided.current = { tapMs, outcome: result, impactAt, endAt };
      setOutcome(result);
      // The field still shows what the tap did: the real play's one try is spent (no leaving it now).
      latest.current.decided();
    }, []);
    // A tap before the thing starts coming is turned away: it decides nothing, and the next tap still counts. The host's
    // light refusal (a small wiggle of the button and its sound) says so; never a penalty.
    const tap = (ms: number) => {
      if (latest.current.auto !== null || decided.current || ms > end) return;
      if (!cueTapCounts(ms, skin.tuning)) {
        latest.current.juice.denied(button.current);
        return;
      }
      decide(ms);
    };

    useEffect(() => {
      let ended = false;
      return clock.onFrame((ms) => {
        if (!decided.current && autoTap !== undefined && autoTap !== null && ms >= autoTap) decide(autoTap);
        if (!decided.current && ms > end) decide(null);
        const done = decided.current;
        if (needle.current) needle.current.style.left = `${cueTapMeter(done?.tapMs ?? ms, skin.tuning) * 100}%`;
        const view: CueTapView<Outcome> = {
          ms, tapMs: done?.tapMs ?? null, outcome: done?.outcome ?? null, impactAt: done?.impactAt ?? null, endAt: done?.endAt ?? null,
        };
        for (const draw of draws.current) draw(view);
        // The field shows the outcome now (its juice drawn above, in the same frame): the host's finish, the rest of the
        // field's picture held, then its result card (★ from the tap).
        if (done && !ended && ms >= done.impactAt) {
          ended = true;
          latest.current.end(done.outcome, undefined, { record: done.tapMs, holdMs: Math.max(0, done.endAt - ms) });
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
    const { Field, Gauge } = skin;
    return (
      <div className="mg-engine-cue-tap" onKeyDown={onKey}>
        <div className="mg-cue-tap-field" onPointerDown={onPointer} aria-hidden="true">
          <Field params={params} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate} frames={frames} />
        </div>
        <div className="mg-cue-tap-controls">
          {auto === null && <p className="mg-cue-tap-hint">{skin.hintJa}</p>}
          {Gauge ? <Gauge still={still} frames={frames} /> : (
            <div className="mg-cue-tap-meter" aria-hidden="true">
              <span className="mg-cue-tap-meter-near" style={span(zones.near)} />
              <span className="mg-cue-tap-meter-clean" style={span(zones.clean)} />
              <span className="mg-cue-tap-meter-needle" ref={needle} />
            </div>
          )}
          {auto !== null ? <p className="mg-cue-tap-auto">{skin.autoJa}</p> : (
            <button type="button" ref={button} className="primary mg-cue-tap-action" data-testid="minigame-action" data-minigame-primary
              aria-disabled={outcome !== null || undefined} aria-describedby={hintId}
              onPointerDown={(event) => {
                if (event.button === 0) pointerPress.current = true;
                onPointer(event);
              }}
              onPointerCancel={() => { pointerPress.current = false; }}
              onClick={(event) => {
                if (pointerPress.current) pointerPress.current = false;
                else tap(clock.at(event.timeStamp));
              }}>{skin.actionJa}</button>
          )}
          <span id={hintId} className="sr-only">{skin.actionHintJa}</span>
        </div>
      </div>
    );
  };
}
