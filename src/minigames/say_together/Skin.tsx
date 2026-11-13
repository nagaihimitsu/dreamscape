import { useEffect, useRef, useState, type RefObject } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { SAY_COUNT_MS, SAY_END_MS, SAY_FIELD, SAY_TUNING, SAY_WORDS_MS, sayTogetherRules, type SayTogetherOutcome, type SayTogetherParams } from "./rules";
import "./skin.css";

// Saying it together's field (a cue_tap skin): the player's view across a wide morning lawn, a stone tomb far off on the
// left, her standing a step away on the right. Her bubble over her head counts the beats (「せー」「の」, one dot a beat,
// the third dot gold, a ring closing on it through the last beat) and shows her words from the third; the player's
// bubble rises from the bottom left on the tap. On the beat both bubbles glow together, and their last word, 「デーン！」,
// is the loudest (written large). With the use's art (`art.lawn`, `art.heroine`) the drawn lawn and her standing picture
// give way to those pictures.

/** The words, as said: one more shows each SAY_FIELD.wordsAtMs. Katakana as the story writes them (not a name). */
const WORDS = ["ヤートリーガン、", "クリプヤー、", "ディヤーン、", "デーン！"] as const;
/** Her count, a word a beat (the third beat is the words). */
const COUNT = ["せー", "の"] as const;
/** When each count beat falls. */
const BEATS_AT = Array.from({ length: SAY_FIELD.countBeats }, (_, beat) => SAY_COUNT_MS + SAY_FIELD.beatMs * beat);
/** Her nod on a count beat lasts this long (not with less motion). */
const NOD_MS = 180;
/** The sounds of a play (definition `sounds`): a tick on each count, a chime when a voice starts (two together: one). */
const SOUNDS = { tick: "ui_tap", voice: "local_word" } as const;

/** How many words have been said `ms` after a voice started at `from` (0 before it). */
function wordsSaid(ms: number, from: number): number {
  return SAY_FIELD.wordsAtMs.filter((at) => ms >= from + at).length;
}

/** How many dots of her count are lit at `ms`: one a beat, the third with the words. */
function beatsLit(ms: number): number {
  return BEATS_AT.filter((at) => ms >= at).length + (ms >= SAY_WORDS_MS ? 1 : 0);
}

/**
 * The ring closing on the gold dot through the last beat (「の」 to the words): its size, from 1 (wide) to 0 (on the
 * dot) as her beat comes, or null when it is not shown (before 「の」, from the words on).
 */
function closingAt(ms: number): number | null {
  const from = BEATS_AT[BEATS_AT.length - 1];
  if (ms < from || ms >= SAY_WORDS_MS) return null;
  return 1 - (ms - from) / (SAY_WORDS_MS - from);
}

/** What the field draws at a frame (only changes re-render; the closing ring is drawn straight from the frames). */
interface SayView {
  lit: number;
  her: number;
  yours: number | null;
  nod: boolean;
  together: boolean;
  look: boolean;
}
const sameView = (a: SayView, b: SayView) =>
  a.lit === b.lit && a.her === b.her && a.yours === b.yours && a.nod === b.nod && a.together === b.together && a.look === b.look;

function viewAt(ms: number, tapMs: number | null, outcome: SayTogetherOutcome | null, still: boolean): SayView {
  return {
    lit: beatsLit(ms),
    her: wordsSaid(ms, SAY_WORDS_MS),
    yours: tapMs === null ? null : wordsSaid(ms, tapMs),
    nod: !still && BEATS_AT.some((at) => ms >= at && ms < at + NOD_MS),
    together: outcome === "together" && ms >= Math.max(SAY_WORDS_MS, tapMs ?? SAY_WORDS_MS),
    // A play without a tap ends (silent) once she has said them all: she turns to look at the player.
    look: outcome === "silent",
  };
}

const START: SayView = { lit: 0, her: 0, yours: null, nod: false, together: false, look: false };

/** The tomb far off across the lawn (drawn when the use gives no picture): a Lodi-era tomb's outline, a dome and two kiosks. */
function FarTomb() {
  return (
    <svg viewBox="0 0 120 70" className="mg-say-together-tomb-figure" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <path d="M44 30 Q 60 4, 76 30 Z" />
      <rect x="58.6" y="6" width="2.8" height="6" rx="1" />
      <path d="M24 34 Q 28 25, 32 34 Z M88 34 Q 92 25, 96 34 Z" />
      <rect x="22" y="34" width="12" height="4" />
      <rect x="86" y="34" width="12" height="4" />
      <rect x="40" y="29" width="40" height="9" />
      <rect x="14" y="38" width="92" height="30" />
      <path className="mg-say-together-tomb-arches" d="M24 68 V 52 Q 30 44, 36 52 V 68 Z M47 68 V 52 Q 53 44, 59 52 V 68 Z M61 68 V 52 Q 67 44, 73 52 V 68 Z M84 68 V 52 Q 90 44, 96 52 V 68 Z" />
    </svg>
  );
}

/** The words said so far (at least the first), each kept whole on a line: a line breaks between words, never inside one. */
function Words({ count }: { count: number }) {
  const said = WORDS.slice(0, Math.max(1, count));
  return <>{said.map((word, index) => (
    <span key={word} className="mg-say-together-word" data-last={index === WORDS.length - 1 || undefined}>{word}</span>
  ))}</>;
}

function Dots({ lit, closing }: { lit: number; closing: RefObject<HTMLElement | null> }) {
  return (
    <span className="mg-say-together-dots">
      {[0, 1, 2].map((dot) => (
        <span key={dot} data-lit={dot < lit || undefined} data-words={dot === 2 || undefined}>
          {dot === 2 && <i className="mg-say-together-closing" ref={closing} />}
        </span>
      ))}
    </span>
  );
}

function SayTogetherField({ cast, names, still, art, sound, vibrate, frames }: CueTapFieldProps<SayTogetherParams, SayTogetherOutcome>) {
  const [view, setView] = useState<SayView>(START);
  const closing = useRef<HTMLElement>(null);
  const play = useRef({ sound, vibrate });
  play.current = { sound, vibrate };
  useEffect(() => {
    let ticked = 0;
    let herVoice = false;
    let yourVoice = false;
    let shown = START;
    return frames(({ ms, tapMs, outcome }) => {
      while (ticked < BEATS_AT.length && ms >= BEATS_AT[ticked]) {
        ticked += 1;
        play.current.sound(SOUNDS.tick);
        play.current.vibrate("clue");
      }
      // A chime when a voice starts; two voices together sound as one (hers rings, on her beat).
      if (tapMs !== null && !yourVoice) {
        yourVoice = true;
        if (outcome !== "together") play.current.sound(SOUNDS.voice);
      }
      if (ms >= SAY_WORDS_MS && !herVoice) {
        herVoice = true;
        play.current.sound(SOUNDS.voice);
      }
      const ring = closing.current;
      if (ring) {
        const size = tapMs !== null && tapMs < SAY_WORDS_MS ? null : closingAt(ms);
        ring.style.opacity = size === null ? "0" : "1";
        if (size !== null) ring.style.transform = `translate(-50%, -50%) scale(${1 + 2.2 * size})`;
      }
      const next = viewAt(ms, tapMs, outcome, still);
      if (!sameView(next, shown)) {
        shown = next;
        setView(next);
      }
    });
  }, [frames, still]);
  const herText = view.her > 0 ? <Words count={view.her} /> : view.lit > 0 ? COUNT[Math.min(view.lit, COUNT.length) - 1] : "……";
  return (
    <div className="mg-say-together" data-art-lawn={art.lawn ? true : undefined} data-still={still || undefined}>
      {art.lawn ? <img className="mg-say-together-backdrop" src={art.lawn} alt="" draggable={false} /> : <>
        <span className="mg-say-together-lawn" />
        <span className="mg-say-together-tomb"><FarTomb /></span>
      </>}
      <span className="mg-say-together-her" data-nod={view.nod || undefined} data-art={art.heroine ? true : undefined}>
        <span className="mg-say-together-her-body">
          {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
        </span>
        <span className="mg-say-together-bubble mg-say-together-bubble-her" data-words={view.her > 0 || undefined} data-together={view.together || undefined}>
          <span className="mg-say-together-bubble-head"><small>{names.heroine}</small><Dots lit={view.lit} closing={closing} /></span>
          <span className="mg-say-together-text">{herText}</span>
        </span>
        {view.look && <span className="mg-say-together-mark">？</span>}
      </span>
      {view.yours !== null && (
        <span className="mg-say-together-bubble mg-say-together-bubble-yours" data-together={view.together || undefined}>
          <small>{names.player}</small>
          <span className="mg-say-together-text"><Words count={view.yours} /></span>
        </span>
      )}
    </div>
  );
}

/** Saying it together as a cue_tap skin: its timing, rules, words and field. */
export const sayTogetherSkin: CueTapSkin<SayTogetherParams, SayTogetherOutcome> = {
  tuning: SAY_TUNING,
  rules: sayTogetherRules,
  hintJa: "「せー」「の」の次の拍で「言う」",
  actionJa: "言う",
  actionHintJa: "彼女が「せー」「の」と数えた次の拍で押すと、二人の声がそろいます。",
  autoJa: "おまかせで言っています",
  // Both voices to the end (together), her voice following (early), the player's following (late), or her turning to
  // look (silent), before the outcome shows.
  endAt: ({ outcome, tapMs }) => {
    switch (outcome) {
      case "together": return SAY_WORDS_MS + SAY_FIELD.wordsMs + 400;
      case "early": return SAY_WORDS_MS + 900;
      case "late": return (tapMs ?? SAY_WORDS_MS) + 900;
      case "silent": return SAY_END_MS + 700;
    }
  },
  Field: SayTogetherField,
};

/** For the tests: the field's view at a frame, her count's beats and the ring closing on the last one. */
export const SAY_FIELD_POINTS = { viewAt, beatsLit, wordsSaid, closingAt, BEATS_AT, WORDS } as const;
