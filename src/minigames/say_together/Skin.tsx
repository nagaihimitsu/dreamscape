import { useEffect, useRef, useState } from "react";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { useMiniGameKit } from "../host/kit";
import { SAY_GAME, SAY_WORD_COUNT, sayFirstDetail, type SayGame, type SayRecord, type SayTogetherOutcome, type SayTogetherParams, type SayWord } from "./rules";
import "./skin.css";

// Saying it together's field (a rhythm_tap skin): the player's view across a wide morning lawn, a stone tomb far off on
// the left, her standing a step away on the right. Her bubble over her head counts 「せー」「の」 and then says the four
// words in her own rhythm (rules.ts: a stretched first word, a quick third whose long syllable she holds, its ー growing
// in the bubble, and a breath, 「すっ」, before the last); the player's bubble rises from the bottom left and says each
// word the player taps, gold when it came on her word (both bubbles glow), plain when off it. The lane under the field shows her beats (her count as
// crosses, the words as marks, the last one bigger). The last word, 「デーン！」, is the peak: together, the play stops on it with stars on both
// bubbles, a shake and the host's finish (the skin ends the play there). With the use's art (`art.lawn`, `art.heroine`)
// the drawn lawn and her standing picture give way to those pictures. As the play ends, the player's bubble lifts clear
// of the result card (group2 N9).

/** The words, as said, in her rhythm from her first. Katakana as the story writes them (not a name). */
const WORDS = ["ヤートリーガン、", "クリプヤー、", "ディヤーン、", "デーン！"] as const;
/** The word whose long syllable she holds, and how many more ー it grows to as she holds it. */
const HELD_WORD = 2;
const HELD_MAX = 3;
/** Her breath before the last word, as her bubble shows it. */
const BREATH = "すっ";
/** Her count, a word a beat. */
const COUNT = ["せー", "の"] as const;
/** Her nod on a count beat lasts this long (not with less motion). */
const NOD_MS = 180;
/** The field still shows the end this long (the last word's glow, her turning) before the result card; less with less motion. */
const HOLD_MS = 900;
const HOLD_STILL_MS = 400;
/** The sounds of a play (definition `sounds`): a tick on each count, a chime with each word (brighter when the two meet). */
const SOUNDS = { tick: "ui_tap", voice: "local_word" } as const;

/** What the field draws at a frame (only changes re-render). */
export interface SayView {
  /** Her count's beats come (0–2) and her words said (0–4). */
  lit: number;
  her: number;
  /** The player's words so far (her order; null: not said). */
  yours: readonly SayWord[];
  nod: boolean;
  /** The word she is saying now came together: both bubbles glow. */
  glow: boolean;
  /** The last word came together: the peak. */
  peak: boolean;
  /** She said them alone and the play is over: she turns to look at the player. */
  look: boolean;
  /** How many more ー her held syllable has grown (0 to 3), and whether she is taking her breath before the last word. */
  held: number;
  breath: boolean;
  /** The play is over: the player's bubble lifts clear of the result card. */
  lifted: boolean;
}
const sameView = (a: SayView, b: SayView) => a.lit === b.lit && a.her === b.her && a.nod === b.nod && a.glow === b.glow && a.peak === b.peak &&
  a.look === b.look && a.lifted === b.lifted && a.held === b.held && a.breath === b.breath && a.yours.length === b.yours.length &&
  a.yours.every((word, index) => word === b.yours[index]);

/** The field's view at `ms` of a play (pure: the tests read it). */
export function sayView(game: SayGame, ms: number, record: SayRecord, ended: boolean, still: boolean): SayView {
  const judgement = game.judge(record, ms);
  const lit = game.countAt.filter((at) => ms >= at).length;
  const her = game.wordsAt.filter((at) => ms >= at).length;
  const { holdAt, breathAt } = game;
  const holding = Math.min(ms, holdAt.to) - holdAt.from;
  return {
    lit, her, yours: judgement.words,
    nod: !still && game.countAt.some((at) => ms >= at && ms < at + NOD_MS),
    glow: her > 0 && judgement.words[her - 1] === "together",
    peak: judgement.words[SAY_WORD_COUNT - 1] === "together",
    look: ended && judgement.outcome === "silent",
    lifted: ended,
    held: holding <= 0 ? 0 : Math.min(HELD_MAX, Math.floor((holding / Math.max(1, holdAt.to - holdAt.from)) * HELD_MAX) + 1),
    breath: !ended && ms >= breathAt.from && ms < breathAt.to,
  };
}

/**
 * When the play ends (the skin ends it, the host's finish over it): on the last word as both voices say it (the peak:
 * its tap on her beat, from her word on), else as its window closes.
 */
export function sayEndsAt(game: SayGame, ms: number, record: SayRecord): boolean {
  const last = game.wordsAt[SAY_WORD_COUNT - 1];
  return (game.judge(record, ms).words[SAY_WORD_COUNT - 1] === "together" && ms >= last) || ms >= last + game.lateOf(SAY_WORD_COUNT - 1);
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

/** Her held word with its long syllable `held` ー longer (ディヤーーン、). */
const heldWord = (held: number) => WORDS[HELD_WORD].replace("ー", "ー".repeat(1 + held));

/** Her words said so far, each kept whole on a line (a line breaks between words, never inside one), the held one held. */
function HerWords({ count, held }: { count: number; held: number }) {
  return <>{WORDS.slice(0, count).map((word, index) => (
    <span key={word} className="mg-say-together-word" data-last={index === WORDS.length - 1 || undefined} data-held={(index === HELD_WORD && held > 0) || undefined}>
      {index === HELD_WORD ? heldWord(held) : word}
    </span>
  ))}</>;
}

/** The player's words said so far (a word skipped is not there): gold on her beat, plain off it. */
function YourWords({ words }: { words: readonly SayWord[] }) {
  return <>{words.map((state, index) => state && (
    <span key={WORDS[index]} className="mg-say-together-word" data-state={state} data-last={index === WORDS.length - 1 || undefined}>{WORDS[index]}</span>
  ))}</>;
}

/** Saying it together's skin from its game (the story's; Debug's room plays an edited one: play.ts retune). */
export function sayTogetherSkinFor(game: SayGame): RhythmTapSkin<SayTogetherParams, SayTogetherOutcome> {
  const firstWord = game.wordsAt[0];
  const START: SayView = { lit: 0, her: 0, yours: [null, null, null, null], nod: false, glow: false, peak: false, look: false, lifted: false, held: 0, breath: false };

  function SayTogetherField({ cast, names, still, art, sound, vibrate, frames }: RhythmTapFieldProps<SayTogetherParams, SayTogetherOutcome>) {
    const [view, setView] = useState<SayView>(START);
    const herBubble = useRef<HTMLSpanElement>(null);
    const yourBubble = useRef<HTMLSpanElement>(null);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit, still });
    live.current = { sound, vibrate, kit, still };
    useEffect(() => {
      let ticked = 0;
      let spoken = 0;
      let said: readonly SayWord[] = START.yours;
      let first: "pending" | "told" = "pending";
      let ended = false;
      let locked = false;
      let shown = START;
      return frames(({ ms, record }) => {
        const { juice, react } = live.current.kit;
        const judgement = game.judge(record, ms);
        // Her count: a tick a beat.
        while (ticked < game.countAt.length && ms >= game.countAt[ticked] && !ended) {
          ticked += 1;
          live.current.sound(SOUNDS.tick);
          live.current.vibrate("clue");
        }
        // Each of the player's words as it is said: gold on her beat (a bright chime, a ring on both bubbles), plain off it;
        // a second tap on a word she has met turns it plain (a small refusal on the bubble).
        judgement.words.forEach((state, word) => {
          if (state === said[word]) return;
          if (state === "together") {
            live.current.sound(SOUNDS.voice, { rate: 1.2 });
            juice.burst(yourBubble.current, "ring", 0.7);
            juice.burst(herBubble.current, "ring", 0.6);
            // The last word's buzz is the peak's.
            if (word < SAY_WORD_COUNT - 1) live.current.vibrate("tap");
          } else if (state === "off") {
            if (said[word] === "together") juice.denied(yourBubble.current);
            else live.current.sound(SOUNDS.voice, { volume: 0.4, rate: 0.85 });
          }
        });
        said = judgement.words;
        // Her words, one a beat (her chime, unless the player's word already met hers).
        while (spoken < SAY_WORD_COUNT && ms >= game.wordsAt[spoken] && !ended) {
          if (judgement.words[spoken] !== "together") live.current.sound(SOUNDS.voice, { volume: 0.6 });
          spoken += 1;
        }
        // The first word said is the story's outcome: the real play's one try is spent (no leaving it now).
        if (judgement.firstMs !== null && !locked) {
          locked = true;
          live.current.kit.decided();
        }
        // Her face as the first word tells: the voices meeting, the player's first (surprise), hers alone first (oops).
        if (first === "pending" && !ended) {
          const told = judgement.outcome === "together" ? ms >= firstWord : judgement.outcome === "early" || ms > firstWord + game.numbers.cleanLateMs;
          if (told) {
            first = "told";
            react(judgement.outcome === "together" || judgement.outcome === "early" ? "surprise" : "oops");
          }
        }
        // The end: on the last word as both voices say it (the peak), else as its window closes.
        if (!ended && sayEndsAt(game, ms, record)) {
          ended = true;
          const kept: SayRecord = { taps: [...record.taps], stopMs: null };
          const final = game.judge(kept);
          if (final.words[SAY_WORD_COUNT - 1] === "together") {
            juice.hitStop(90, herBubble.current);
            juice.burst(herBubble.current, "star", 1.2);
            juice.burst(yourBubble.current, "star", 1.2);
            juice.squash(herBubble.current, "pop");
            juice.squash(yourBubble.current, "pop");
            juice.shake("m");
            live.current.vibrate("success");
            react("cheer");
          } else if (final.outcome === "silent") react("oops");
          live.current.kit.end(final.outcome, sayFirstDetail(final, game), { record: kept, holdMs: live.current.still ? HOLD_STILL_MS : HOLD_MS });
        }
        const next = sayView(game, ms, record, ended, live.current.still);
        if (!sameView(next, shown)) {
          shown = next;
          setView(next);
        }
      });
    }, [frames]);
    const herText = view.her > 0 ? <><HerWords count={view.her} held={view.held} />{view.breath && <span className="mg-say-together-breath" data-testid="say-breath">{BREATH}</span>}</>
      : view.lit > 0 ? COUNT[Math.min(view.lit, COUNT.length) - 1] : "……";
    const anyYours = view.yours.some((word) => word !== null);
    return (
      <div className="mg-say-together" data-art-lawn={art.lawn ? true : undefined} data-still={still || undefined}>
        {art.lawn ? <img className="mg-say-together-backdrop mg-photo" src={art.lawn} alt="" draggable={false} /> : <>
          <span className="mg-say-together-lawn" />
          <span className="mg-say-together-tomb"><FarTomb /></span>
        </>}
        <span className="mg-say-together-her" data-nod={view.nod || undefined} data-breath={view.breath || undefined} data-art={art.heroine ? true : undefined}>
          <span className="mg-say-together-her-body mg-play-object">
            {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
          </span>
          <span ref={herBubble} className="mg-say-together-bubble mg-say-together-bubble-her" data-words={view.her > 0 || undefined}
            data-together={view.glow || undefined} data-peak={view.peak || undefined}>
            <small>{names.heroine}</small>
            <span className="mg-say-together-text" key={view.her}>{herText}</span>
          </span>
          {view.look && <span className="mg-say-together-mark">？</span>}
        </span>
        {anyYours && (
          <span ref={yourBubble} className="mg-say-together-bubble mg-say-together-bubble-yours" data-together={view.glow || undefined}
            data-peak={view.peak || undefined} data-lifted={view.lifted || undefined} data-testid="say-yours">
            <small>{names.player}</small>
            <span className="mg-say-together-text"><YourWords words={view.yours} /></span>
          </span>
        )}
      </div>
    );
  }

  return {
    tuning: game.tuning,
    rules: game.rules,
    hintJa: "「せー」「の」の次から、彼女の言葉に合わせて「言う」",
    actionJa: "言う",
    actionHintJa: "彼女が「せー」「の」と数えた次の拍から、言葉を1つずつ、彼女が言うのに合わせて押します（4回）。2つ目は少し遅れ、3つ目は伸ばして、息を吸ってから最後の言葉。最初の言葉がそろうと、声がそろいます。",
    autoJa: "おまかせで言っています",
    stop: null,
    countIn: game.countAt,
    bigBeats: [SAY_WORD_COUNT - 1],
    // Her breath before 「せー」: a tap then is no tap (turned away; the player can still say it with her).
    ignoreBeforeMs: game.countAt[0],
    statusJa: (summary) => (summary.came > 0 ? `のこり${SAY_WORD_COUNT - summary.came}語` : ""),
    // The skin ends the play itself (on the last word, with the card's lines): the engine's own end is a fallback.
    detailJa: () => undefined,
    endDelayMs: (_, still) => (still ? HOLD_STILL_MS : HOLD_MS),
    Field: SayTogetherField,
  };
}

/** Saying it together as a rhythm_tap skin: its timing, rules, words and field. */
export const sayTogetherSkin = sayTogetherSkinFor(SAY_GAME);
export const SAY_WORDS_TEXT = WORDS;
