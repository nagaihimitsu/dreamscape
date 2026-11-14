import { useCallback, useEffect, useId, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { MiniGamePlayProps, MiniGameRules } from "../../contract";
import { rhythmTapJudge, rhythmTapOpens, rhythmTapPerfect, type RhythmTapRecord, type RhythmTapSummary, type RhythmTapTuning } from "./engine";
import "./engine.css";

// The rhythm_tap engine's play (docs/13 2.2): the field a skin draws, a lane whose marks slide to a ring at each beat
// (the beats on screen: it plays the same with the sound off; a count-in's beats pass as hollow crosses, not to tap; a
// rest passes as a hollow bar, not to tap either: a feint's looks like a beat's until shortly before; a big beat's mark
// is bigger; a partner's stop rides the lane as a flag), the skin's stop button (if any) away from the big tap button at the bottom
// (a tap on the field and Space or Enter tap too; S stops). The host's clock times it; the engine judges the record as it
// grows; the skin's rules decide, and the play ends at that moment (end with the record for the ★, the field's hold after
// it); the host shows the finish and the result card and takes its choice.

/** What a skin's field draws at a frame. */
export interface RhythmTapView<Outcome extends string> {
  /** The play's time (the host's clock). */
  ms: number;
  /** The play so far: its taps and its stop. */
  record: RhythmTapRecord;
  /** What the record did as of `ms`. */
  summary: RhythmTapSummary;
  /** The skin's outcome, once the play has ended. */
  outcome: Outcome | null;
  /** When the play hands its outcome to the host, once decided. */
  endAt: number | null;
}

/** What a skin's field is given: the play's props it draws with, and the engine's frames. */
export type RhythmTapFieldProps<Params, Outcome extends string> =
  Pick<MiniGamePlayProps<Params, Outcome>, "params" | "still" | "seed" | "cast" | "names" | "art" | "sound" | "vibrate"> & {
    /** Subscribes `draw` to every frame of the play (the engine's own loop); returns the unsubscribe. */
    frames(draw: (view: RhythmTapView<Outcome>) => void): () => void;
  };

/** A skin of rhythm_tap: its beats and timing, its rules (rhythmTapRules), its words and its field. */
export interface RhythmTapSkin<Params, Outcome extends string> {
  tuning: RhythmTapTuning;
  rules: MiniGameRules<Params, Outcome, RhythmTapRecord>;
  /** How to play, above the lane (not while おまかせ plays). */
  hintJa: string;
  /** The big button (「食べる」「踊る」). */
  actionJa: string;
  /** What it does, read out with it. */
  actionHintJa: string;
  /** In place of the buttons while おまかせ plays. */
  autoJa: string;
  /** The stop button (「バス」) and what it does, read out with it; null: no stop. S presses it. */
  stop: { labelJa: string; hintJa: string } | null;
  /** A count-in's beats (not to tap): the lane shows them as hollow crosses coming to the ring. */
  countIn?: readonly number[];
  /**
   * The tuning's rests (not to tap) come on the lane as hollow bars; a feint's mark looks like a beat's until this long
   * before it (its tell: the field shows the same moment). None: a rest's bar from the start.
   */
  restRevealMs?: number;
  /** The beats (by index from 0) whose marks are bigger (a big drum beat, a last word). */
  bigBeats?: readonly number[];
  /**
   * Before this moment a tap is no tap: turned away with the host's light refusal and left out of the record (her breath
   * before her count). None: every tap is recorded (without a count-in, one before the first window is turned away too).
   */
  ignoreBeforeMs?: number;
  /** The partner's stop on the lane: a flag (`flagJa`, a word or two) that meets the ring when they stop; the stop button lights then. */
  partner?: { atMs: number; flagJa: string };
  /** The host's top band as the play goes (「12個目」). */
  statusJa(summary: RhythmTapSummary): string;
  /** The line under the outcome (a count to show; never in the story: docs/13 4.1). */
  detailJa(summary: RhythmTapSummary, outcome: Outcome): string | undefined;
  /** How long the field still shows the end after it is decided (the host's finish runs over it; less with less motion). */
  endDelayMs(outcome: Outcome, still: boolean): number;
  Field: ComponentType<RhythmTapFieldProps<Params, Outcome>>;
}

/** How far ahead the lane shows a beat (its mark enters at the right edge this long before the beat). */
const LANE_AHEAD_MS = 1800;
/** Where the lane's ring is, in percent from the left; a passed mark slides on to the left edge. */
const LANE_RING = 16;
/** How long the ring lights after a hit. */
const LANE_FLASH_MS = 160;
/** How long the stop button lights when the partner stops. */
const PARTNER_LIGHT_MS = 1200;

const isTapKey = (event: KeyboardEvent) => event.key === " " || event.key === "Enter";
const isStopKey = (event: KeyboardEvent) => event.key === "s" || event.key === "S";

/** An open palm (「もう十分」), on the stop button. */
const Palm = () => (
  <svg className="mg-rhythm-tap-palm" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11 4.5a1.5 1.5 0 0 1 3 0V11 5.5a1.5 1.5 0 0 1 3 0V12 8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L4.3 15.3a1.5 1.5 0 0 1 2.3-1.9Z" />
  </svg>
);

/** The play of a rhythm_tap skin. */
export function rhythmTapPlay<Params, Outcome extends string>(skin: RhythmTapSkin<Params, Outcome>): ComponentType<MiniGamePlayProps<Params, Outcome>> {
  const { beats } = skin.tuning;
  const rests = skin.tuning.rests?.at ?? [];
  const big = new Set(skin.bigBeats ?? []);
  const countIn = skin.countIn ?? [];
  const opens = rhythmTapOpens(skin.tuning);
  const laneAt = (beat: number, ms: number) => {
    const ahead = (beat - ms) / LANE_AHEAD_MS;
    return ahead >= 0 ? LANE_RING + ahead * (100 - LANE_RING) : LANE_RING + ahead * (LANE_RING / 0.35);
  };
  const place = (element: HTMLElement | null | undefined, at: number, shown: boolean) => {
    if (!element) return;
    element.style.left = `${at}%`;
    element.style.opacity = shown && at <= 100 && at >= 0 ? "" : "0";
  };
  return function RhythmTapPlay(props: MiniGamePlayProps<Params, Outcome>) {
    const { params, auto, clock, still, seed, cast, names, art, sound, vibrate } = props;
    const taps = useRef<number[]>([]);
    const stopMs = useRef<number | null>(null);
    const decided = useRef<{ outcome: Outcome; endAt: number } | null>(null);
    const [over, setOver] = useState(false);
    const [stopped, setStopped] = useState(false);
    const marks = useRef<(HTMLSpanElement | null)[]>([]);
    const counts = useRef<(HTMLSpanElement | null)[]>([]);
    const restMarks = useRef<(HTMLSpanElement | null)[]>([]);
    const flag = useRef<HTMLSpanElement>(null);
    const ring = useRef<HTMLSpanElement>(null);
    const stopButton = useRef<HTMLButtonElement>(null);
    const actionButton = useRef<HTMLButtonElement>(null);
    const draws = useRef(new Set<(view: RhythmTapView<Outcome>) => void>());
    const latest = useRef(props);
    latest.current = props;
    const hintId = useId();
    const stopHintId = useId();
    const autoPlay = useMemo(() => (auto === null ? null : skin.rules.autoRecord(auto, params)), [auto, params]);

    const playing = () => latest.current.auto === null && !decided.current && stopMs.current === null;
    const tap = (ms: number) => {
      if (!playing() || ms < 0) return;
      if (skin.ignoreBeforeMs !== undefined && ms < skin.ignoreBeforeMs) {
        latest.current.juice.denied(actionButton.current);
        return;
      }
      taps.current.push(ms);
      // Before the first beat's window the tap counts for nothing (rhythmTapJudge). With a count-in it is clapping along
      // (the skin's field shows it); without one, the button turns it away (a press never does nothing at all).
      if (ms < opens && !countIn.length) latest.current.juice.denied(actionButton.current);
    };
    const stop = (ms: number) => {
      if (!skin.stop || !playing() || ms < 0) return;
      stopMs.current = ms;
      setStopped(true);
    };

    useEffect(() => {
      let status = "";
      let flashUntil = -1;
      let flash: "perfect" | "good" = "good";
      let hits = 0;
      return clock.onFrame((ms) => {
        // 「おまかせ」 plays its record as the clock reaches each of its moments.
        if (autoPlay) {
          taps.current = autoPlay.taps.filter((time) => time <= ms);
          stopMs.current = autoPlay.stopMs !== null && autoPlay.stopMs <= ms ? autoPlay.stopMs : null;
        }
        const record: RhythmTapRecord = { taps: taps.current, stopMs: stopMs.current };
        const summary = rhythmTapJudge(record, skin.tuning, ms);
        // The end at the moment it is decided (docs/13 2.6): the host's finish runs over the field's hold (her hand, the
        // cough), and the record goes with it for the ★.
        if (summary.ended && !decided.current) {
          const outcome = skin.rules.outcomeOf(record, latest.current.params);
          const holdMs = skin.endDelayMs(outcome, latest.current.still);
          decided.current = { outcome, endAt: ms + holdMs };
          setOver(true);
          const kept: RhythmTapRecord = { taps: [...record.taps], stopMs: record.stopMs };
          latest.current.end(outcome, skin.detailJa(rhythmTapJudge(kept, skin.tuning), outcome), { record: kept, holdMs });
        }
        const nextStatus = skin.statusJa(summary);
        if (nextStatus !== status) {
          status = nextStatus;
          latest.current.status(status);
        }
        // The lane: each beat's mark slides to the ring; a hit one is gone (the ring lights: gold and thicker right on
        // the beat), a missed one dims and passes. A count-in's crosses and the partner's flag slide the same way.
        if (summary.hits > hits) {
          flashUntil = ms + LANE_FLASH_MS;
          const offset = summary.offsets[summary.offsets.length - 1];
          flash = offset !== null && rhythmTapPerfect(skin.tuning, offset) ? "perfect" : "good";
        }
        hits = summary.hits;
        if (ring.current) ring.current.dataset.flash = ms < flashUntil ? flash : "off";
        beats.forEach((beat, index) => {
          const mark = marks.current[index];
          if (!mark) return;
          const state: "hit" | "miss" | "gone" | "coming" = index < summary.judged.length ? summary.judged[index] : summary.ended ? "gone" : "coming";
          mark.dataset.state = state;
          place(mark, laneAt(beat, ms), state === "miss" || state === "coming");
        });
        countIn.forEach((beat, index) => place(counts.current[index], laneAt(beat, ms), !summary.ended));
        // A rest: a hollow bar (a feint's a beat's mark until its reveal), crossed out when tapped, passing dim when kept.
        rests.forEach((at, index) => {
          const mark = restMarks.current[index];
          if (!mark) return;
          const state = index < summary.rests.length ? summary.rests[index]
            : summary.ended ? "gone" : skin.restRevealMs !== undefined && at - ms > skin.restRevealMs ? "coming" : "rest";
          mark.dataset.state = state;
          place(mark, laneAt(at, ms), state !== "gone");
        });
        if (skin.partner) {
          place(flag.current, laneAt(skin.partner.atMs, ms), !summary.ended);
          const lit = ms >= skin.partner.atMs && ms < skin.partner.atMs + PARTNER_LIGHT_MS && !summary.ended;
          if (stopButton.current) stopButton.current.dataset.partner = lit ? "up" : "";
        }
        const done = decided.current;
        const view: RhythmTapView<Outcome> = { ms, record, summary, outcome: done?.outcome ?? null, endAt: done?.endAt ?? null };
        for (const draw of draws.current) draw(view);
      });
    }, [clock, autoPlay]);

    const frames = useCallback((draw: (view: RhythmTapView<Outcome>) => void) => {
      draws.current.add(draw);
      return () => { draws.current.delete(draw); };
    }, []);
    const onPointer = (event: PointerEvent) => {
      if (event.button === 0) tap(clock.at(event.timeStamp));
    };
    // A click without a pointer before it (a screen reader's, a key's): the pointer's own tap came on pointerdown.
    const onClickTap = (event: MouseEvent) => {
      if (event.detail === 0) tap(clock.now());
    };
    const onKey = (event: KeyboardEvent) => {
      const onStop = (event.target as Element | null)?.closest?.("[data-rhythm-stop]");
      if (isStopKey(event) && skin.stop) {
        event.preventDefault();
        if (!event.repeat) stop(clock.at(event.timeStamp));
        return;
      }
      // Enter or Space on the focused stop button presses it (its click), not the tap.
      if (!isTapKey(event) || onStop) return;
      event.preventDefault();
      if (!event.repeat) tap(clock.at(event.timeStamp));
    };
    // A button's Space clicks on keyup: the key's tap came on keydown (one tap a press).
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " " && !(event.target as Element | null)?.closest?.("[data-rhythm-stop]")) event.preventDefault();
    };
    const Field = skin.Field;
    const idle = over || stopped;
    return (
      <div className="mg-engine-rhythm-tap" onKeyDown={onKey} onKeyUp={onKeyUp}>
        <div className="mg-rhythm-tap-field" onPointerDown={onPointer} aria-hidden="true">
          <Field params={params} still={still} seed={seed} cast={cast} names={names} art={art} sound={sound} vibrate={vibrate} frames={frames} />
        </div>
        <div className="mg-rhythm-tap-controls">
          <div className="mg-rhythm-tap-top" data-stop={(auto === null && !!skin.stop) || undefined}>
            {auto === null && <p className="mg-rhythm-tap-hint">{skin.hintJa}</p>}
            {auto === null && skin.stop && (
              <button ref={stopButton} type="button" className="mg-rhythm-tap-stop" data-testid="minigame-stop" data-rhythm-stop
                aria-disabled={idle || undefined} aria-describedby={stopHintId}
                onClick={(event) => stop(event.detail === 0 ? clock.now() : clock.at(event.timeStamp))}><Palm />{skin.stop.labelJa}</button>
            )}
          </div>
          <div className="mg-rhythm-tap-lane" aria-hidden="true">
            <span className="mg-rhythm-tap-ring" data-flash="off" ref={ring} />
            {countIn.map((beat, index) => (
              <span key={`count-${beat}`} className="mg-rhythm-tap-mark" data-state="count" ref={(element) => { counts.current[index] = element; }} />
            ))}
            {rests.map((at, index) => (
              <span key={`rest-${at}`} className="mg-rhythm-tap-mark" data-rest data-state={skin.restRevealMs === undefined ? "rest" : "coming"}
                ref={(element) => { restMarks.current[index] = element; }} />
            ))}
            {beats.map((beat, index) => (
              <span key={beat} className="mg-rhythm-tap-mark" data-state="coming" data-big={big.has(index) || undefined}
                ref={(element) => { marks.current[index] = element; }} />
            ))}
            {skin.partner && <span className="mg-rhythm-tap-flag" ref={flag}><span>{skin.partner.flagJa}</span></span>}
          </div>
          {auto !== null ? <p className="mg-rhythm-tap-auto">{skin.autoJa}</p> : (
            <button ref={actionButton} type="button" className="primary mg-rhythm-tap-action" data-testid="minigame-action" data-minigame-primary
              aria-disabled={idle || undefined} aria-describedby={hintId}
              onPointerDown={onPointer} onClick={onClickTap}>{skin.actionJa}</button>
          )}
          <span id={hintId} className="sr-only">{skin.actionHintJa}</span>
          {skin.stop && <span id={stopHintId} className="sr-only">{skin.stop.hintJa}</span>}
        </div>
      </div>
    );
  };
}
