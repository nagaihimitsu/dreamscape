import { useEffect, useRef, useState, type RefObject } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { cueTapEnd, cueTapMoment, type CueTapTuning } from "../engines/cue_tap/engine";
import { useMiniGameKit } from "../host/kit";
import { SAY_FIELD, SAY_TUNING, sayTogetherRulesFor, type SayTogetherOutcome, type SayTogetherParams } from "./rules";
import "./skin.css";

// Saying it together's field (a cue_tap skin): the player's view across a wide morning lawn, a stone tomb far off on the
// left, her standing a step away on the right. Her bubble over her head counts the beats (「せー」「の」, one dot a beat,
// the third dot gold, a ring closing on it through the last beat) and shows her words from the third; the player's
// bubble rises from the bottom left on the tap. On the beat both bubbles glow together, and their last word, 「デーン！」,
// is the loudest (written large). With the use's art (`art.lawn`, `art.heroine`) the drawn lawn and her standing picture
// give way to those pictures.
//
// The host's flow (docs/13 2.6): together, the play ends on the last word both voices say (its peak, the finish over it);
// a voice alone first ends it as it comes (the player's tap); silence ends it once she has said them all.

/** The words, as said: one more shows each SAY_FIELD.wordsAtMs. Katakana as the story writes them (not a name). */
const WORDS = ["ヤートリーガン、", "クリプヤー、", "ディヤーン、", "デーン！"] as const;
/** Her count, a word a beat (the third beat is the words). */
const COUNT = ["せー", "の"] as const;
/** When the last word comes after a voice starts. */
const LAST_WORD_MS = SAY_FIELD.wordsAtMs[SAY_FIELD.wordsAtMs.length - 1];
/** Her nod on a count beat lasts this long (not with less motion). */
const NOD_MS = 180;
/** The sounds of a play (definition `sounds`): a tick on each count, a chime when a voice starts (two together: one). */
const SOUNDS = { tick: "ui_tap", voice: "local_word" } as const;

/** How many words have been said `ms` after a voice started at `from` (0 before it). */
function wordsSaid(ms: number, from: number): number {
  return SAY_FIELD.wordsAtMs.filter((at) => ms >= from + at).length;
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
const START: SayView = { lit: 0, her: 0, yours: null, nod: false, together: false, look: false };

/**
 * Her count with a tuning (the story's, or Debug's room's edited one): 「せー」 at the lead's end, a beat each, the words on
 * the beat after 「の」 (the moment); a play without a tap ends after she has said them all.
 */
function sayCount(tuning: CueTapTuning) {
  const words = cueTapMoment(tuning);
  const beatMs = tuning.approachMs / SAY_FIELD.countBeats;
  const beatsAt = Array.from({ length: SAY_FIELD.countBeats }, (_, beat) => tuning.leadMs + beatMs * beat);
  const end = cueTapEnd(tuning);
  /** How many dots of her count are lit at `ms`: one a beat, the third with the words. */
  const beatsLit = (ms: number) => beatsAt.filter((at) => ms >= at).length + (ms >= words ? 1 : 0);
  /**
   * The ring closing on the gold dot through the last beat (「の」 to the words): its size, from 1 (wide) to 0 (on the
   * dot) as her beat comes, or null when it is not shown (before 「の」, from the words on).
   */
  const closingAt = (ms: number): number | null => {
    const from = beatsAt[beatsAt.length - 1];
    if (ms < from || ms >= words) return null;
    return 1 - (ms - from) / (words - from);
  };
  const viewAt = (ms: number, tapMs: number | null, outcome: SayTogetherOutcome | null, still: boolean): SayView => ({
    lit: beatsLit(ms),
    her: wordsSaid(ms, words),
    yours: tapMs === null ? null : wordsSaid(ms, tapMs),
    nod: !still && beatsAt.some((at) => ms >= at && ms < at + NOD_MS),
    together: outcome === "together" && ms >= Math.max(words, tapMs ?? words),
    // A play without a tap ends (silent) once she has said them all: she turns to look at the player.
    look: outcome === "silent",
  });
  /**
   * When the field shows each outcome (the play ends there): together, the last word both voices say (the peak); a voice
   * alone first, as the player's comes (before hers, or after it); silent, once the play is over.
   */
  const impactOf = (outcome: SayTogetherOutcome, tapMs: number | null) =>
    outcome === "together" ? Math.max(words, tapMs ?? words) + LAST_WORD_MS : tapMs ?? end;
  return { words, beatsAt, end, beatsLit, closingAt, viewAt, impactOf };
}

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

/**
 * The moment the field shows each outcome (group3 6.4's values): together, the stop and the stars on both bubbles and a
 * small shake on the last word (the peak); a voice alone, a ring on the bubble it comes from. Her face: surprise at the
 * voices meeting or at the player's first, a small "oops" when hers came alone (it fits both of the story's moods).
 */
const IMPACTS: Readonly<Record<SayTogetherOutcome, { stopMs?: number; burst?: { kind: "star" | "ring"; size: number }; shake?: "s"; react: "surprise" | "oops" }>> = {
  together: { stopMs: 90, burst: { kind: "star", size: 1 }, shake: "s", react: "surprise" },
  early: { burst: { kind: "ring", size: 0.8 }, react: "surprise" },
  late: { burst: { kind: "ring", size: 0.8 }, react: "oops" },
  silent: { react: "oops" },
};

/** Saying it together's skin with a tuning (the story's; Debug's room plays an edited one: play.ts retune). */
export function sayTogetherSkinFor(tuning: CueTapTuning): CueTapSkin<SayTogetherParams, SayTogetherOutcome> {
  const count = sayCount(tuning);

  function SayTogetherField({ cast, names, still, art, sound, vibrate, frames }: CueTapFieldProps<SayTogetherParams, SayTogetherOutcome>) {
    const [view, setView] = useState<SayView>(START);
    const closing = useRef<HTMLElement>(null);
    const herBubble = useRef<HTMLSpanElement>(null);
    const yourBubble = useRef<HTMLSpanElement>(null);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };
    useEffect(() => {
      let ticked = 0;
      let herVoice = false;
      let yourVoice = false;
      let met = false;
      let struck = false;
      let shown = START;
      return frames(({ ms, tapMs, outcome, impactAt }) => {
        const { juice } = live.current.kit;
        while (ticked < count.beatsAt.length && ms >= count.beatsAt[ticked]) {
          ticked += 1;
          live.current.sound(SOUNDS.tick);
          live.current.vibrate("clue");
        }
        // A chime when a voice starts; two voices together sound as one (hers rings, on her beat).
        if (tapMs !== null && !yourVoice) {
          yourVoice = true;
          if (outcome !== "together") live.current.sound(SOUNDS.voice);
        }
        if (ms >= count.words && !herVoice) {
          herVoice = true;
          live.current.sound(SOUNDS.voice);
        }
        const ring = closing.current;
        if (ring) {
          const size = tapMs !== null && tapMs < count.words ? null : count.closingAt(ms);
          ring.style.opacity = size === null ? "0" : "1";
          if (size !== null) ring.style.transform = `translate(-50%, -50%) scale(${1 + 2.2 * size})`;
        }
        const next = count.viewAt(ms, tapMs, outcome, still);
        if (!sameView(next, shown)) {
          shown = next;
          setView(next);
        }
        // Together: as the two voices meet, a ring on each bubble (the peak comes with the last word).
        if (next.together && !met) {
          met = true;
          juice.burst(herBubble.current, "ring", 0.8);
          juice.burst(yourBubble.current, "ring", 0.8);
          live.current.vibrate("tap");
        }
        // The moment the field shows the outcome (the engine ends the play in this frame): its juice, and her face.
        // (A voice alone first strikes from the player's bubble, drawn a frame after the tap: it waits for it.)
        const alone = outcome === "early" || outcome === "late";
        if (outcome && impactAt !== null && ms >= impactAt && !struck && (!alone || yourBubble.current)) {
          struck = true;
          const it = IMPACTS[outcome];
          const from = alone ? yourBubble.current : herBubble.current;
          if (it.stopMs) juice.hitStop(it.stopMs, herBubble.current);
          if (it.burst) juice.burst(from, it.burst.kind, it.burst.size);
          if (outcome === "together") {
            juice.burst(yourBubble.current, "star", 1);
            juice.squash(herBubble.current, "pop");
            juice.squash(yourBubble.current, "pop");
            live.current.vibrate("success");
          }
          if (it.shake) juice.shake(it.shake);
          live.current.kit.react(it.react);
        }
      });
    }, [frames, still]);
    const herText = view.her > 0 ? <Words count={view.her} /> : view.lit > 0 ? COUNT[Math.min(view.lit, COUNT.length) - 1] : "……";
    return (
      <div className="mg-say-together" data-art-lawn={art.lawn ? true : undefined} data-still={still || undefined}>
        {art.lawn ? <img className="mg-say-together-backdrop mg-photo" src={art.lawn} alt="" draggable={false} /> : <>
          <span className="mg-say-together-lawn" />
          <span className="mg-say-together-tomb"><FarTomb /></span>
        </>}
        <span className="mg-say-together-her" data-nod={view.nod || undefined} data-art={art.heroine ? true : undefined}>
          <span className="mg-say-together-her-body mg-play-object">
            {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
          </span>
          <span ref={herBubble} className="mg-say-together-bubble mg-say-together-bubble-her" data-words={view.her > 0 || undefined} data-together={view.together || undefined}>
            <span className="mg-say-together-bubble-head"><small>{names.heroine}</small><Dots lit={view.lit} closing={closing} /></span>
            <span className="mg-say-together-text">{herText}</span>
          </span>
          {view.look && <span className="mg-say-together-mark">？</span>}
        </span>
        {view.yours !== null && (
          <span ref={yourBubble} className="mg-say-together-bubble mg-say-together-bubble-yours" data-together={view.together || undefined}>
            <small>{names.player}</small>
            <span className="mg-say-together-text"><Words count={view.yours} /></span>
          </span>
        )}
      </div>
    );
  }

  return {
    tuning,
    rules: sayTogetherRulesFor(tuning),
    hintJa: "「せー」「の」の次の拍で「言う」",
    actionJa: "言う",
    actionHintJa: "彼女が「せー」「の」と数えた次の拍で押すと、二人の声がそろいます。",
    autoJa: "おまかせで言っています",
    impactAt: ({ outcome, tapMs }) => count.impactOf(outcome, tapMs),
    // Both voices to the end (together), her voice following (early), the player's following (late), or her turning to
    // look (silent), before the result card.
    endAt: ({ outcome, tapMs }) => {
      switch (outcome) {
        case "together": return Math.max(count.words + SAY_FIELD.wordsMs + 400, count.impactOf(outcome, tapMs) + 500);
        case "early": return count.words + 900;
        case "late": return (tapMs ?? count.words) + 900;
        case "silent": return count.end + 700;
      }
    },
    Field: SayTogetherField,
  };
}

/** Saying it together as a cue_tap skin: its timing, rules, words and field. */
export const sayTogetherSkin = sayTogetherSkinFor(SAY_TUNING);

/** For the tests: the field's view at a frame, her count's beats and the ring closing on the last one (the story's tuning). */
const COUNT_POINTS = sayCount(SAY_TUNING);
export const SAY_FIELD_POINTS = {
  viewAt: COUNT_POINTS.viewAt, beatsLit: COUNT_POINTS.beatsLit, closingAt: COUNT_POINTS.closingAt, impactOf: COUNT_POINTS.impactOf,
  BEATS_AT: COUNT_POINTS.beatsAt, wordsSaid, WORDS, sayCount,
} as const;
