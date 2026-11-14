import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { rhythmTapPerfect } from "../engines/rhythm_tap/engine";
import { BARAAT_BEATS, BARAAT_BIG_BEATS, BARAAT_GAME, baraatExtraTaps, type BaraatGame, type BaraatOutcome, type BaraatParams } from "./rules";
import "./skin.css";

// The baraat dance's field (a rhythm_tap skin): the procession's street over the scene, warm with the procession's lights;
// the band's drum at the bottom left, right over the lane's ring (one glance holds both), lighting on every beat (the
// count-in's four numbered on its face, the last two beats bigger); Kamla and the heroine dancing to it, a sway one way
// then the other with a dip on each beat; the player's raised hands going up with each tap (clapping along with the
// count-in too); a beat met rings the bangles and bursts over the drum, with a word for how (ぴったり, いいね) and the run
// of beats met from four on; 「テンポが上がる！」 as the band speeds up (her face says it too). With the use's art
// (`art.street`, `art.drummer`, `art.kamla`, `art.heroine`) those pictures take the drawn ones' places (Kamla's falls
// back to the speaker's figure).

/** How long the drum lights (and the dancers dip) on a beat; how long the hands stay up after a tap; a grade's word. */
const BEAT_MS = 140;
const HANDS_MS = 180;
const GRADE_MS = 360;
/** The run of beats met that the field counts aloud (「4コンボ」). */
const RUN_FROM = 4;
/** The procession's lights over the dark street: how many. */
const LIGHTS = 6;
/** Her line as the band speeds up (the heroine's quick reaction). */
const HER_FASTER = "わ、速くなる！";

/** The sounds of a play (definition `sounds`): the drum on every beat; the dancers' bangles on a beat met. */
const SOUNDS = { drum: "drum_beat", hit: "bangles_clink" } as const;

/** One of the player's raised hands (an open palm over a sleeve); the left one is this, mirrored. */
const Hand = () => (
  <svg viewBox="0 0 40 80" aria-hidden="true">
    <rect x="7" y="52" width="26" height="28" rx="4" fill="#f0e6d4" stroke="#3b2f2a" strokeWidth="1.5" />
    <rect x="12" y="34" width="16" height="22" rx="5" fill="#c58b5c" stroke="#3b2f2a" strokeWidth="1.5" />
    <rect x="9" y="20" width="22" height="22" rx="7" fill="#c58b5c" stroke="#3b2f2a" strokeWidth="1.5" />
    {[9.5, 15, 20.5, 26].map((x) => <rect key={x} x={x} y={x === 9.5 || x === 26 ? 9 : 5} width="4.6" height="18" rx="2.3" fill="#c58b5c" stroke="#3b2f2a" strokeWidth="1.2" />)}
    <rect x="1" y="22" width="5" height="15" rx="2.5" fill="#c58b5c" stroke="#3b2f2a" strokeWidth="1.2" transform="rotate(-28 3.5 30)" />
  </svg>
);

/** The dance's skin built from its game (the story's, or Debug's room's edited numbers: play.ts retune). */
export function baraatSkinFor(game: BaraatGame): RhythmTapSkin<BaraatParams, BaraatOutcome> {
  const { tuning, countIn, numbers } = game;
  /** Every drum beat: the count-in, then the beats to dance. */
  const drum = [...countIn, ...tuning.beats];
  /** The first of the last big beats, among the drum's. */
  const bigFrom = drum.length - BARAAT_BIG_BEATS;
  /** When the band speeds up (from the last slower beat to just after the first faster one). */
  const slow = Math.min(BARAAT_BEATS - 1, Math.max(1, Math.round(numbers.slowBeats)));
  const fasterFrom = tuning.beats[slow - 1];
  const fasterUntil = tuning.beats[slow] + 900;
  /** The last drum beat at or before `ms` (its index), or -1. */
  const lastBeat = (ms: number) => {
    let index = -1;
    while (index + 1 < drum.length && drum[index + 1] <= ms) index += 1;
    return index;
  };

  function BaraatField({ cast, art, seed, sound, vibrate, frames }: RhythmTapFieldProps<BaraatParams, BaraatOutcome>) {
    const [beat, setBeat] = useState(false);
    const [step, setStep] = useState<"l" | "r">("l");
    const [big, setBig] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [hands, setHands] = useState<"down" | "met" | "off">("down");
    const [grade, setGrade] = useState<{ kind: "perfect" | "good"; run: number; at: number } | null>(null);
    const [faster, setFaster] = useState(false);
    const [outcome, setOutcome] = useState<BaraatOutcome | null>(null);
    const drumFace = useRef<HTMLSpanElement>(null);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    // The procession's lights: where they hang and how they twinkle is looks only (from the seed).
    const lights = useMemo(() => {
      const random = seededRandom(seed);
      return Array.from({ length: LIGHTS }, (_, index) => ({
        x: 6 + (index / (LIGHTS - 1)) * 88 + (random() - 0.5) * 10,
        y: 8 + random() * 34,
        size: 26 + random() * 34,
        delay: Math.round(random() * 1600),
      }));
    }, [seed]);

    useEffect(() => {
      let rung = -1;
      let taps = 0;
      let hits = 0;
      let handsAt = Number.NEGATIVE_INFINITY;
      let handsMet = false;
      let gradeAt = Number.NEGATIVE_INFINITY;
      let strays = 0;
      let warned = false;
      /** The run of beats met with no tap beside them (a missed beat or an extra tap ends it: mashing is no run). */
      let run = 0;
      return frames(({ ms, record, summary, outcome: decided }) => {
        const { juice } = live.current.kit;
        const playing = summary.ended === null;
        const at = lastBeat(ms);
        // The drum plays on to the end of the play (not after it: the outcome shows).
        if (at > rung && playing) {
          rung = at;
          live.current.sound(SOUNDS.drum);
        }
        setBeat(at >= 0 && ms - drum[at] < BEAT_MS && playing);
        setStep(at % 2 ? "r" : "l");
        setBig(at >= bigFrom && playing);
        setCount(at >= 0 && at < countIn.length ? at + 1 : null);
        setFaster(ms >= fasterFrom + BEAT_MS && ms < fasterUntil && playing);
        if (!warned && ms >= fasterFrom + BEAT_MS && playing) {
          warned = true;
          live.current.kit.react("surprise", HER_FASTER);
        }
        // The player's hands: up with each tap (the count-in's clapping too), lit when it met a beat.
        if (record.taps.length > taps) {
          taps = record.taps.length;
          handsAt = ms;
          handsMet = summary.hits > hits;
        }
        if (summary.strays > strays || summary.streak === 0) run = 0;
        strays = summary.strays;
        // A beat met: the bangles, a burst over the drum (a star right on it) and the drum pressed; the last big ones shake.
        if (summary.hits > hits) {
          run += summary.hits - hits;
          live.current.sound(SOUNDS.hit);
          const offset = summary.offsets[summary.offsets.length - 1];
          const kind = offset !== null && rhythmTapPerfect(tuning, offset) ? "perfect" : "good";
          gradeAt = ms;
          setGrade({ kind, run, at: summary.hits });
          juice.burst(drumFace.current, kind === "perfect" ? "star" : "ring", kind === "perfect" ? 0.9 : 0.7);
          juice.squash(drumFace.current, "press");
          const index = summary.judged.length - 1;
          if (index >= BARAAT_BEATS - BARAAT_BIG_BEATS) {
            juice.shake(index === BARAAT_BEATS - 1 ? "m" : "s");
            live.current.vibrate("hit");
          }
        }
        hits = summary.hits;
        if (ms - gradeAt >= GRADE_MS) setGrade(null);
        setHands(ms - handsAt < HANDS_MS ? (handsMet ? "met" : "off") : "down");
        setOutcome(decided);
      });
    }, [frames]);

    return (
      <div className="mg-baraat-dance" data-art-street={art.street ? true : undefined} data-beat={beat || undefined} data-step={step}
        data-big={big || undefined} data-outcome={outcome ?? undefined}>
        {art.street && <img className="mg-baraat-dance-backdrop mg-photo" src={art.street} alt="" draggable={false} />}
        <span className="mg-baraat-dance-lights" aria-hidden="true">
          {lights.map((light, index) => (
            <span key={index} style={{ left: `${light.x}%`, top: `${light.y}%`, width: light.size, height: light.size, "--mg-baraat-dance-twinkle": `${light.delay}ms` } as CSSProperties} />
          ))}
        </span>
        <span className="mg-baraat-dance-dancer mg-baraat-dance-kamla mg-play-object">
          <span>{art.kamla ? <img src={art.kamla} alt="" draggable={false} /> : cast.person}</span>
        </span>
        <span className="mg-baraat-dance-dancer mg-baraat-dance-heroine mg-play-object">
          <span>{art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}</span>
        </span>
        <span className="mg-baraat-dance-hands" data-hands={hands}><span><Hand /></span><span><Hand /></span></span>
        <span className="mg-baraat-dance-drummer mg-play-object" ref={drumFace}>
          {art.drummer ? <img src={art.drummer} alt="" draggable={false} /> : <span className="mg-baraat-dance-drum"><span /></span>}
          {count !== null && <span className="mg-baraat-dance-count" key={count}>{count}</span>}
        </span>
        {grade && (
          <span className="mg-baraat-dance-grade" data-kind={grade.kind} key={grade.at}>
            {grade.kind === "perfect" ? "ぴったり" : "いいね"}
            {grade.run >= RUN_FROM && <small>{grade.run}コンボ</small>}
          </span>
        )}
        {faster && <span className="mg-baraat-dance-faster">テンポが上がる！</span>}
      </div>
    );
  }

  return {
    tuning,
    rules: game.rules,
    hintJa: "太鼓が4つ数えたら、印が輪に重なるたびに「踊る」",
    actionJa: "踊る",
    actionHintJa: "太鼓が鳴るたびに押します。最初の4つは数えるだけです。拍の間に何度も押すと、足がもつれます。",
    autoJa: "おまかせで踊っています",
    stop: null,
    countIn,
    statusJa: (summary) => (summary.came > 0 ? `のこり${BARAAT_BEATS - summary.came}拍` : ""),
    // Under the card's score (rules.ts): the extra taps, when there were any (why a dance with every beat met stumbled).
    detailJa: (summary) => {
      const extra = baraatExtraTaps(summary);
      return extra ? `余分に押した ${extra}回` : undefined;
    },
    endDelayMs: (_, still) => (still ? 300 : 600),
    Field: BaraatField,
  };
}

/** The baraat dance as a rhythm_tap skin: its beats, rules, words and field. */
export const baraatSkin = baraatSkinFor(BARAAT_GAME);
