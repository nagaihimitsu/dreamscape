import { useEffect, useRef, useState } from "react";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { rhythmTapPerfect } from "../engines/rhythm_tap/engine";
import {
  BARAAT_BEATS, BARAAT_BIG_BEATS, BARAAT_COUNT_IN_BEATS, BARAAT_SLOW_BEATS, BARAAT_TUNING, baraatExtraTaps, baraatRules, type BaraatOutcome,
  type BaraatParams,
} from "./rules";
import "./skin.css";

// The baraat dance's field (a rhythm_tap skin): the procession's street over the scene; the band's drum at the bottom
// left, right over the lane's ring (one glance holds both), lighting on every beat (the count-in's four numbered on its
// face, the last two beats bigger); Kamla and the heroine dancing to it, a sway one way then the other with a dip on each
// beat; the player's raised hands going up with each tap; a word over the drum for each beat met (ぴったり, いいね) and the
// run of beats met from four on; 「テンポが上がる！」 as the band speeds up. With the use's art (`art.street`,
// `art.drummer`, `art.kamla`, `art.heroine`) those pictures take the drawn ones' places (Kamla's falls back to the
// speaker's figure).

/** Every drum beat: the count-in, then the beats to dance. */
const DRUM = [...BARAAT_COUNT_IN_BEATS, ...BARAAT_TUNING.beats];
/** The first of the last big beats, among the drum's. */
const BIG_FROM = DRUM.length - BARAAT_BIG_BEATS;
/** When the band speeds up (the first faster beat), and how long it says so. */
const FASTER_AT = BARAAT_TUNING.beats[BARAAT_SLOW_BEATS];
const FASTER_FROM = BARAAT_TUNING.beats[BARAAT_SLOW_BEATS - 1];
/** How long the drum lights (and the dancers dip) on a beat; how long the hands stay up after a tap; a grade's word. */
const BEAT_MS = 140;
const HANDS_MS = 180;
const GRADE_MS = 360;
/** The run of beats met that the field counts aloud (「4コンボ」). */
const RUN_FROM = 4;

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

/** The last drum beat at or before `ms` (its index), or -1. */
const lastBeat = (ms: number) => {
  let index = -1;
  while (index + 1 < DRUM.length && DRUM[index + 1] <= ms) index += 1;
  return index;
};

function BaraatField({ cast, art, sound, frames }: RhythmTapFieldProps<BaraatParams, BaraatOutcome>) {
  const [beat, setBeat] = useState(false);
  const [step, setStep] = useState<"l" | "r">("l");
  const [big, setBig] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [hands, setHands] = useState<"down" | "met" | "off">("down");
  const [grade, setGrade] = useState<{ kind: "perfect" | "good"; run: number; at: number } | null>(null);
  const [faster, setFaster] = useState(false);
  const [outcome, setOutcome] = useState<BaraatOutcome | null>(null);
  const ring = useRef(sound);
  ring.current = sound;

  useEffect(() => {
    let rung = -1;
    let taps = 0;
    let hits = 0;
    let handsAt = Number.NEGATIVE_INFINITY;
    let handsMet = false;
    let gradeAt = Number.NEGATIVE_INFINITY;
    let strays = 0;
    /** The run of beats met with no tap beside them (a missed beat or an extra tap ends it: mashing is no run). */
    let run = 0;
    return frames(({ ms, summary, outcome: decided }) => {
      const playing = summary.ended === null;
      const at = lastBeat(ms);
      // The drum plays on to the end of the play (not after it: the outcome shows).
      if (at > rung && playing) {
        rung = at;
        ring.current(SOUNDS.drum);
      }
      setBeat(at >= 0 && ms - DRUM[at] < BEAT_MS && playing);
      setStep(at % 2 ? "r" : "l");
      setBig(at >= BIG_FROM && playing);
      setCount(at >= 0 && at < BARAAT_COUNT_IN_BEATS.length ? at + 1 : null);
      setFaster(ms >= FASTER_FROM + BEAT_MS && ms < FASTER_AT + 900 && playing);
      // The player's hands: up with each tap, lit when it met the beat; a beat met rings the bangles and shows its grade.
      if (summary.taps > taps) {
        taps = summary.taps;
        handsAt = ms;
        handsMet = summary.hits > hits;
      }
      if (summary.strays > strays || summary.streak === 0) run = 0;
      strays = summary.strays;
      if (summary.hits > hits) {
        run += summary.hits - hits;
        ring.current(SOUNDS.hit);
        const offset = summary.offsets[summary.offsets.length - 1];
        gradeAt = ms;
        setGrade({ kind: offset !== null && rhythmTapPerfect(BARAAT_TUNING, offset) ? "perfect" : "good", run, at: summary.hits });
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
      {art.street && <img className="mg-baraat-dance-backdrop" src={art.street} alt="" draggable={false} />}
      <span className="mg-baraat-dance-dancer mg-baraat-dance-kamla">
        <span>{art.kamla ? <img src={art.kamla} alt="" draggable={false} /> : cast.person}</span>
      </span>
      <span className="mg-baraat-dance-dancer mg-baraat-dance-heroine">
        <span>{art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}</span>
      </span>
      <span className="mg-baraat-dance-hands" data-hands={hands}><span><Hand /></span><span><Hand /></span></span>
      <span className="mg-baraat-dance-drummer">
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

/** The baraat dance as a rhythm_tap skin: its beats, rules, words and field. */
export const baraatSkin: RhythmTapSkin<BaraatParams, BaraatOutcome> = {
  tuning: BARAAT_TUNING,
  rules: baraatRules,
  hintJa: "太鼓が4つ数えたら、印が輪に重なるたびに「踊る」",
  actionJa: "踊る",
  actionHintJa: "太鼓が鳴るたびに押します。最初の4つは数えるだけです。拍の間に何度も押すと、足がもつれます。",
  autoJa: "おまかせで踊っています",
  stop: null,
  countIn: BARAAT_COUNT_IN_BEATS,
  statusJa: (summary) => (summary.came > 0 ? `のこり${BARAAT_BEATS - summary.came}拍` : ""),
  detailJa: (summary) => {
    const extra = baraatExtraTaps(summary);
    return `${BARAAT_BEATS}拍のうち${summary.hits}拍・ぴったり${summary.perfects}拍${extra ? `・余分に${extra}回` : ""}`;
  },
  endDelayMs: (_, still) => (still ? 300 : 600),
  Field: BaraatField,
};
