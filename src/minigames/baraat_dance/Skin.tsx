import { useEffect, useRef, useState } from "react";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { BARAAT_BEATS, BARAAT_COUNT_IN_BEATS, BARAAT_TUNING, baraatRules, type BaraatOutcome, type BaraatParams } from "./rules";
import "./skin.css";

// The baraat dance's field (a rhythm_tap skin): the procession's street over the scene, the band's drum at the top
// lighting on every beat (the count-in's four numbered), Kamla on the left and the heroine on the right bobbing to it,
// the player's raised hands at the bottom going up with each tap. With the use's art (`art.street`, `art.drummer`,
// `art.kamla`, `art.heroine`) those pictures take the drawn ones' places (Kamla's falls back to the speaker's figure).

/** Every drum beat: the count-in, then the beats to dance. */
const DRUM = [...BARAAT_COUNT_IN_BEATS, ...BARAAT_TUNING.beats];
/** How long the drum lights (and the dancers dip) on a beat; how long the hands stay up after a tap. */
const BEAT_MS = 140;
const HANDS_MS = 180;

/** The sound of a play (definition `sounds`): the drum, on every beat. */
const SOUNDS = { drum: "drum_beat" } as const;

/** The last drum beat at or before `ms` (its index), or -1. */
const lastBeat = (ms: number) => {
  let index = -1;
  while (index + 1 < DRUM.length && DRUM[index + 1] <= ms) index += 1;
  return index;
};

function BaraatField({ cast, art, sound, frames }: RhythmTapFieldProps<BaraatParams, BaraatOutcome>) {
  const [beat, setBeat] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [hands, setHands] = useState<"down" | "met" | "off">("down");
  const [outcome, setOutcome] = useState<BaraatOutcome | null>(null);
  const ring = useRef(sound);
  ring.current = sound;

  useEffect(() => {
    let rung = -1;
    let taps = 0;
    let hits = 0;
    let handsAt = Number.NEGATIVE_INFINITY;
    let handsMet = false;
    return frames(({ ms, summary, outcome: decided }) => {
      const at = lastBeat(ms);
      // The drum plays on to the end of the play (not after it: the outcome shows).
      if (at > rung && summary.ended === null) {
        rung = at;
        ring.current(SOUNDS.drum);
      }
      setBeat(at >= 0 && ms - DRUM[at] < BEAT_MS && summary.ended === null);
      setCount(at >= 0 && at < BARAAT_COUNT_IN_BEATS.length ? at + 1 : null);
      // The player's hands: up with each tap, lit when it met the beat.
      if (summary.taps > taps) {
        taps = summary.taps;
        handsAt = ms;
        handsMet = summary.hits > hits;
      }
      hits = summary.hits;
      setHands(ms - handsAt < HANDS_MS ? (handsMet ? "met" : "off") : "down");
      setOutcome(decided);
    });
  }, [frames]);

  return (
    <div className="mg-baraat-dance" data-art-street={art.street ? true : undefined} data-beat={beat || undefined} data-outcome={outcome ?? undefined}>
      {art.street && <img className="mg-baraat-dance-backdrop" src={art.street} alt="" draggable={false} />}
      <span className="mg-baraat-dance-drummer">
        {art.drummer ? <img src={art.drummer} alt="" draggable={false} /> : <span className="mg-baraat-dance-drum"><span /></span>}
      </span>
      {count !== null && <span className="mg-baraat-dance-count" key={count}>{count}</span>}
      <span className="mg-baraat-dance-dancer mg-baraat-dance-kamla">
        {art.kamla ? <img src={art.kamla} alt="" draggable={false} /> : cast.person}
      </span>
      <span className="mg-baraat-dance-dancer mg-baraat-dance-heroine">
        {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
      </span>
      <span className="mg-baraat-dance-hands" data-hands={hands}><span /><span /></span>
    </div>
  );
}

/** The baraat dance as a rhythm_tap skin: its beats, rules, words and field. */
export const baraatSkin: RhythmTapSkin<BaraatParams, BaraatOutcome> = {
  tuning: BARAAT_TUNING,
  rules: baraatRules,
  hintJa: "印が輪に重なったら「踊る」",
  actionJa: "踊る",
  actionHintJa: "太鼓が鳴るたびに押します。最初の4つは数えるだけです。",
  autoJa: "おまかせで踊っています",
  stop: null,
  statusJa: (summary) => (summary.came > 0 ? `のこり${BARAAT_BEATS - summary.came}拍` : ""),
  detailJa: (summary) => `${BARAAT_BEATS}拍のうち${summary.hits}拍`,
  endDelayMs: (_, still) => (still ? 300 : 600),
  Field: BaraatField,
};
