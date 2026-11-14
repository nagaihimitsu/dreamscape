import { useEffect, useRef, useState } from "react";
import { useMiniGameKit } from "../host/kit";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { rhythmTapPerfect } from "../engines/rhythm_tap/engine";
import { GOLGAPPA_GAME, GOLGAPPA_HER_BLUFF, GOLGAPPA_HER_STOP, type GolgappaGame, type GolgappaOutcome, type GolgappaParams } from "./rules";
import "./skin.css";

// The golgappa duel's field (a rhythm_tap skin): the stall's counter from the customer's side, her leaf bowl on the left
// with her behind it, the player's on the right, the vendor's hand above. The hand holds the next golgappa over a bowl and
// drops it (a soft 「ぽとっ」 as the player's lands: the beat to eat on); each count is under its bowl. A feint: the hand
// rises high and shakes over the player's bowl (the lane's mark turns into a rest at the same moment) and drops nothing; a
// bite at it clacks with the vendor's 「フェイント！」 and fills two drops of the choke gauge, holding still is 「見切った！」.
// A bite crumbles over the bowl (a star right on the landing, with a bigger golden 「パリッ！」); a bite at nothing clacks
// and fills a drop of the choke gauge beside the player's bowl, and a full gauge coughs one golgappa back into the bowl.
// A missed one stays in the bowl (after her hand, the next one lands on it: a choke). Her face under the band as her 10th
// goes down (the sour water gets to her); at her 12th she bluffs beside her face (her palm half up, 「バ……」, then
// 「なんてね」 as she thumps her chest: no flag on the lane, no gold ring); one golgappa before her 14th she says she is
// about to stop; her raised palm and 「バス！」 come beside her face after it (the lane's flag meets its ring then); the
// onlookers count aloud from the 10th. With the use's art (`art.stall`, `art.heroine`, `art.bowl`, `art.puri`) those
// pictures take the drawn ones' places.

/** Where things are, in percent of the field: the hand's height, the bowls (her on the left, the player's on the right). */
const HAND_Y = 12;
const HER = { x: 27, y: 74 };
const YOU = { x: 71, y: 77 };
/** How long 「パリッ」, a clack and a cough show. */
const BITE_MS = 380;
const CLACK_MS = 300;
const COUGH_MS = 700;
/** How long the vendor's 「フェイント！」 or the player's 「見切った！」 shows, and the hand's grin after a feint. */
const FEINT_WORD_MS = 750;
/** Her bluff: 「バ……」 with her palm half up this long, then 「なんてね」 (her chest) until the end of the bluff. */
const BLUFF_TEASE_MS = 380;
const BLUFF_MS = 900;
/** The onlookers count aloud from this golgappa of the player's on (「周りの客が数を数え出す」), each word this long. */
const COUNT_FROM = 10;
const COUNT_MS = 520;
const COUNT_WORDS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十"];
/** Her line as her 13th goes down (the heroine's quick reaction): the next one is her last. */
const HER_NEXT_IS_LAST = "わたし、次でバス";
/** Her bluff's words beside her face (not a reaction: the field's own), before and after the joke. */
const BLUFF_WORDS = ["バ……", "バ……なんてね"] as const;
/** The host shows her reactions at most this often (with a little to spare). */
const REACT_APART_MS = 1600;

/** The sounds of a play (definition `sounds`): a landing, a bite, her hand on the counter, the vendor's wind-up. */
const SOUNDS = { land: "cork_pop", bite: "puri_crunch", her: "stamp", windup: "snatch" } as const;

/** The next time at or after `ms` in a sorted list (its index), or -1. */
const nextIndex = (times: readonly number[], ms: number) => times.findIndex((time) => time >= ms);

/** A golgappa (the use's picture, or the drawn one). */
const Puri = ({ art }: { art?: string }) => (art ? <img src={art} alt="" draggable={false} /> : <span className="mg-golgappa-duel-puri-drawn" />);

/** An open palm, raised (her 「バス！」, like the stop button's). */
const Palm = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 12V6.5a1.5 1.5 0 0 1 3 0V11 4.5a1.5 1.5 0 0 1 3 0V11 5.5a1.5 1.5 0 0 1 3 0V12 8.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L4.3 15.3a1.5 1.5 0 0 1 2.3-1.9Z" />
  </svg>
);

/** The duel's skin built from its game (the story's, or Debug's room's edited numbers: play.ts retune). */
export function golgappaSkinFor(game: GolgappaGame): RhythmTapSkin<GolgappaParams, GolgappaOutcome> {
  const { tuning, herLandings, handMs, bluffMs, moves, numbers } = game;
  const yourBeats = tuning.beats;
  const feints = tuning.rests?.at ?? [];
  const gaugeSize = tuning.strayLimit ?? 0;
  /** Her 13th eaten: she says the next is her last. */
  const herWarnMs = herLandings[GOLGAPPA_HER_STOP - 2] + numbers.herEatMs;
  /**
   * Her 10th eaten, as the onlookers start counting: the sour water gets to her (her face only). Not when it would come
   * too near her warning for the host to show both (a reaction at most every 1.5 s; Debug's room's edited numbers).
   */
  const herTenthMs = herLandings[COUNT_FROM - 1] + numbers.herEatMs;
  const tenthFace = herWarnMs - herTenthMs >= REACT_APART_MS;
  /** A reaction of her own at `ms` (her laugh at a bitten feint) does not crowd out her warning or her 10th's face. */
  const freeToReact = (ms: number) => [herWarnMs, ...(tenthFace ? [herTenthMs] : [])].every((at) => Math.abs(at - ms) >= REACT_APART_MS);

  function GolgappaField({ cast, art, names, sound, vibrate, frames }: RhythmTapFieldProps<GolgappaParams, GolgappaOutcome>) {
    const hand = useRef<HTMLSpanElement>(null);
    const yourFall = useRef<HTMLSpanElement>(null);
    const herFall = useRef<HTMLSpanElement>(null);
    const yourBowl = useRef<HTMLSpanElement>(null);
    const herSay = useRef<HTMLSpanElement>(null);
    const [yourCount, setYourCount] = useState(0);
    const [herCount, setHerCount] = useState(0);
    const [inBowl, setInBowl] = useState(0);
    const [herBowl, setHerBowl] = useState(false);
    const [bite, setBite] = useState<"perfect" | "good" | null>(null);
    const [clack, setClack] = useState(false);
    const [cough, setCough] = useState(false);
    const [gauge, setGauge] = useState(0);
    const [crowd, setCrowd] = useState<string | null>(null);
    const [herStopped, setHerStopped] = useState(false);
    const [youStopped, setYouStopped] = useState(false);
    const [choked, setChoked] = useState(false);
    const [feintWord, setFeintWord] = useState<"fooled" | "kept" | null>(null);
    const [bluff, setBluff] = useState<0 | 1 | 2>(0);
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };

    useEffect(() => {
      let hits = 0;
      let strays = 0;
      let overflows = 0;
      let landed = 0;
      let rests = 0;
      let biteAt = Number.NEGATIVE_INFINITY;
      let biteKind: "perfect" | "good" = "good";
      let clackAt = Number.NEGATIVE_INFINITY;
      let coughAt = Number.NEGATIVE_INFINITY;
      let feintAt = Number.NEGATIVE_INFINITY;
      let feintKind: "fooled" | "kept" = "kept";
      let woundUp = -1;
      let tenth = false;
      let warned = false;
      let herUp = false;
      let finished = false;
      let chokeAt: number | null = null;
      let coughed = false;
      const place = (element: HTMLElement | null, x: number, y: number, shown: boolean) => {
        if (!element) return;
        element.style.left = `${x}%`;
        element.style.top = `${y}%`;
        element.style.opacity = shown ? "1" : "0";
      };
      /** Where a golgappa falling to `bowl` is (`left` ms before it lands), or null when it is not falling. */
      const falling = (bowl: { x: number; y: number }, left: number) => {
        if (left < 0 || left > numbers.fallMs) return null;
        const t = 1 - left / numbers.fallMs;
        return { x: bowl.x, y: HAND_Y + 6 + (bowl.y - 6 - HAND_Y - 6) * t * t };
      };
      return frames(({ ms, record, summary, outcome }) => {
        const { juice } = live.current.kit;
        const over = summary.ended !== null;
        // The player's: landed so far (until the stop), eaten, left in the bowl (a missed one, or one coughed back). A
        // choke with one left (after her hand the vendor no longer waits): the next one, already falling, lands on it.
        const left = Math.max(0, summary.came - summary.hits) + summary.overflows;
        const tailAt = summary.ended === "misses" && summary.endMs !== null && left < numbers.missLimit
          ? yourBeats.find((beat) => beat > summary.endMs! && beat - summary.endMs! <= numbers.fallMs) ?? null : null;
        const tailIn = tailAt !== null && ms >= tailAt ? 1 : 0;
        const served = summary.came + tailIn;
        if (served > landed) {
          landed = served;
          live.current.sound(SOUNDS.land);
        }
        setYourCount(served);
        setInBowl(Math.min(3, left + tailIn));
        // A bite: its crunch, crumbs over the bowl (a star right on the landing) and the bowl pressed.
        if (summary.hits > hits) {
          hits = summary.hits;
          biteAt = ms;
          const offset = summary.offsets[summary.offsets.length - 1];
          biteKind = offset !== null && rhythmTapPerfect(tuning, offset) ? "perfect" : "good";
          live.current.sound(SOUNDS.bite);
          juice.burst(yourBowl.current, biteKind === "perfect" ? "star" : "dust", biteKind === "perfect" ? 0.9 : 0.6);
          juice.squash(yourBowl.current, "press");
          if (biteKind === "perfect") live.current.vibrate("tap");
        }
        setBite(ms - biteAt < BITE_MS ? biteKind : null);
        // A bite at nothing clacks (and fills a drop); a full gauge coughs.
        if (summary.strays > strays) {
          strays = summary.strays;
          clackAt = ms;
        }
        setClack(ms - clackAt < CLACK_MS);
        if (summary.overflows > overflows) {
          overflows = summary.overflows;
          coughAt = ms;
          live.current.vibrate("shake");
        }
        setCough(ms - coughAt < COUGH_MS && summary.ended !== "misses");
        setGauge(summary.gauge);
        // A feint judged: bitten at (the vendor's 「フェイント！」, her laugh when it does not crowd her words) or seen
        // through (「見切った！」 over the player's bowl, a ring).
        if (summary.rests.length > rests) {
          rests = summary.rests.length;
          feintKind = summary.rests[rests - 1];
          feintAt = ms;
          if (feintKind === "kept") juice.burst(yourBowl.current, "ring", 0.7);
          else if (!over && freeToReact(ms)) live.current.kit.react("laugh");
        }
        setFeintWord(ms - feintAt < FEINT_WORD_MS && !over ? feintKind : null);
        // The onlookers count the player's golgappa aloud from the 10th.
        const word = served >= COUNT_FROM && !over && ms - yourBeats[served - 1] < COUNT_MS ? COUNT_WORDS[served] ?? null : null;
        setCrowd(word);
        // Hers: she eats each a moment after it lands; at her 12th she bluffs; as her 13th goes down she says the next is
        // her last; her hand goes up after her 14th (a slap on the counter, a ring round her 「バス！」).
        const herLanded = herLandings.filter((time) => time <= ms).length;
        setHerCount(herLanded);
        setHerBowl(herLanded > 0 && ms - herLandings[herLanded - 1] < numbers.herEatMs && herLanded <= GOLGAPPA_HER_STOP);
        if (tenthFace && !tenth && ms >= herTenthMs && !over) {
          tenth = true;
          live.current.kit.react("oops");
        }
        setBluff(over || ms < bluffMs || ms >= bluffMs + BLUFF_MS ? 0 : ms < bluffMs + BLUFF_TEASE_MS ? 1 : 2);
        if (!warned && ms >= herWarnMs && !over) {
          warned = true;
          live.current.kit.react("tease", HER_NEXT_IS_LAST);
        }
        const up = ms >= handMs;
        if (up && !herUp && !over) {
          live.current.sound(SOUNDS.her);
          juice.burst(herSay.current, "ring", 0.8);
        }
        herUp = up;
        setHerStopped(up);
        setYouStopped(record.stopMs !== null && summary.ended === "stop");
        // The end's moment in the field: the cough (a splash and a small shake; once the next one has landed on the one
        // left, when it was falling), outlasting her (a shake and stars).
        if (outcome && !finished) {
          finished = true;
          if (outcome === "choke") chokeAt = tailAt ?? ms;
          else if (outcome === "outlast") {
            juice.burst(yourBowl.current, "star", 1.2);
            juice.shake("m");
          }
        }
        if (chokeAt !== null && !coughed && ms >= chokeAt) {
          coughed = true;
          setChoked(true);
          live.current.vibrate("shake");
          juice.burst(yourBowl.current, "splash", 1);
          juice.shake("s");
        }
        // The falling ones: the player's (not after the stop or the end, but for the one landing on a choke), hers (her 14 only).
        const yours = over ? (tailAt !== null && ms < tailAt ? yourBeats.indexOf(tailAt) : -1) : nextIndex(yourBeats, ms);
        const yourDrop = yours >= 0 ? falling(YOU, yourBeats[yours] - ms) : null;
        const herNext = nextIndex(herLandings, ms);
        const herDrop = herNext >= 0 && !(over && summary.ended !== "stop") ? falling(HER, herLandings[herNext] - ms) : null;
        place(yourFall.current, YOU.x, yourDrop?.y ?? HAND_Y, !!yourDrop);
        place(herFall.current, HER.x, herDrop?.y ?? HAND_Y, !!herDrop);
        // The hand waits over the bowl of its next move with the golgappa in its fingers (not while one falls); a feint's
        // wind-up lifts it high and shakes it (its tell, with the lane's mark), and it wags a moment after.
        const move = over ? -1 : moves.findIndex((next) => next.at >= ms);
        const next = move >= 0 ? moves[move] : null;
        const toward = !next ? { x: 50, y: 0 } : next.to === "her" ? HER : YOU;
        const feint = next?.feint && next.at - ms <= numbers.feintTellMs ? move : -1;
        if (feint >= 0 && feint !== woundUp) {
          woundUp = feint;
          live.current.sound(SOUNDS.windup, { volume: 0.5 });
        }
        const lastFeint = feints.filter((at) => at <= ms).pop();
        const grin = !over && lastFeint !== undefined && ms - lastFeint < FEINT_WORD_MS;
        if (hand.current) {
          hand.current.style.left = `${toward.x}%`;
          hand.current.dataset.windup = feint >= 0 ? "up" : "";
          hand.current.dataset.grin = grin && feint < 0 ? "yes" : "";
          hand.current.dataset.holding = next && !yourDrop && !herDrop && !grin ? "yes" : "";
        }
      });
    }, [frames]);

    return (
      <div className="mg-golgappa-duel" data-art-stall={art.stall ? true : undefined}>
        {art.stall ? <img className="mg-golgappa-duel-backdrop mg-photo" src={art.stall} alt="" draggable={false} /> : (
          <>
            <span className="mg-golgappa-duel-pot" />
            <span className="mg-golgappa-duel-heap"><span /><span /><span /><span /><span /></span>
            <span className="mg-golgappa-duel-counter" />
          </>
        )}
        <span className="mg-golgappa-duel-her" data-art={art.heroine ? true : undefined} data-eating={herBowl || undefined} data-thump={bluff === 2 || undefined}>
          {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
        </span>
        <span className="mg-golgappa-duel-hand mg-play-object" ref={hand}>
          <span className="mg-golgappa-duel-held"><Puri art={art.puri} /></span>
        </span>
        <span className="mg-golgappa-duel-bowl mg-golgappa-duel-bowl-her mg-play-object" style={{ left: `${HER.x}%`, top: `${HER.y}%` }}>
          {art.bowl ? <img src={art.bowl} alt="" draggable={false} /> : <span className="mg-golgappa-duel-bowl-drawn" />}
          {herBowl && <span className="mg-golgappa-duel-in-bowl"><Puri art={art.puri} /></span>}
        </span>
        <span ref={yourBowl} className="mg-golgappa-duel-bowl mg-golgappa-duel-bowl-you mg-play-object" data-choked={choked || cough || undefined}
          style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}>
          {art.bowl ? <img src={art.bowl} alt="" draggable={false} /> : <span className="mg-golgappa-duel-bowl-drawn" />}
          {Array.from({ length: inBowl }, (_, index) => <span key={index} className="mg-golgappa-duel-in-bowl" data-place={index}><Puri art={art.puri} /></span>)}
        </span>
        <span className="mg-golgappa-duel-gauge" data-full={gauge >= gaugeSize - 1 || undefined} style={{ left: `${YOU.x + 19}%`, top: `${YOU.y - 4}%` }}>
          {Array.from({ length: gaugeSize }, (_, index) => <span key={index} className="mg-golgappa-duel-drop" data-filled={index < gauge || undefined} />)}
          <small>むせ</small>
        </span>
        <span className="mg-golgappa-duel-fall mg-play-object" ref={herFall}><Puri art={art.puri} /></span>
        <span className="mg-golgappa-duel-fall mg-golgappa-duel-fall-you mg-play-object" ref={yourFall}><Puri art={art.puri} /></span>
        {bite && !choked && (
          <span className="mg-golgappa-duel-bite" data-kind={bite} style={{ left: `${YOU.x}%`, top: `${YOU.y - 17}%` }}>{bite === "perfect" ? "パリッ！" : "パリッ"}</span>
        )}
        {clack && !bite && !cough && !choked && feintWord !== "fooled" && <span className="mg-golgappa-duel-clack" style={{ left: `${YOU.x}%`, top: `${YOU.y - 16}%` }}>カチッ</span>}
        {feintWord === "fooled" && <span className="mg-golgappa-duel-feint" data-testid="golgappa-feint" style={{ left: `${YOU.x}%` }}>フェイント！</span>}
        {feintWord === "kept" && <span className="mg-golgappa-duel-seen" data-testid="golgappa-seen" style={{ left: `${YOU.x}%`, top: `${YOU.y - 17}%` }}>見切った！</span>}
        {crowd && <span className="mg-golgappa-duel-crowd" key={crowd}>{crowd}！</span>}
        {bluff > 0 && (
          <span className="mg-golgappa-duel-say mg-golgappa-duel-bluff" data-joke={bluff === 2 || undefined} data-testid="golgappa-bluff" style={{ left: `${HER.x + 17}%` }}>
            <Palm />{BLUFF_WORDS[bluff - 1]}
          </span>
        )}
        <span ref={herSay} className="mg-golgappa-duel-say mg-golgappa-duel-say-her" data-shown={herStopped || undefined} style={{ left: `${HER.x + 17}%` }}>
          <Palm />バス！
        </span>
        {youStopped && <span className="mg-golgappa-duel-say" style={{ left: `${YOU.x}%`, top: `${YOU.y - 24}%` }}>バス！</span>}
        {(choked || cough) && <span className="mg-golgappa-duel-say mg-golgappa-duel-say-choke" style={{ left: `${YOU.x}%`, top: `${YOU.y - 24}%` }}>ごほっ</span>}
        <span className="mg-golgappa-duel-count" style={{ left: `${HER.x}%` }}><small>{names.heroine}</small>{herCount}</span>
        <span className="mg-golgappa-duel-count" style={{ left: `${YOU.x}%` }}><small>{names.player}</small>{yourCount}</span>
      </div>
    );
  }

  return {
    tuning,
    rules: game.rules,
    hintJa: "落ちたら「食べる」。振りかぶるだけはフェイント。旗が彼女の「バス」",
    actionJa: "食べる",
    actionHintJa: "自分の器にゴルガッパが落ちるたびに押します。屋台の男が手を高く振りかぶって何も落とさない時（フェイント）や、何もない時に押すと、むせそうになります。",
    autoJa: "おまかせで食べています",
    stop: { labelJa: "バス", hintJa: `もう十分、と手を上げます。押すと勝負が終わります。彼女は${GOLGAPPA_HER_STOP}個目で手を上げます（レーンの旗が輪に重なる時。${GOLGAPPA_HER_BLUFF}個目の手は冗談です）。` },
    partner: { atMs: handMs, flagJa: "バス" },
    restRevealMs: numbers.feintTellMs,
    statusJa: (summary) => (summary.came > 0 ? `${summary.came}個目` : ""),
    // The card's score (rules.ts golgappaRating) says it all: no line of its own.
    detailJa: () => undefined,
    // Her hand and the player's 「バス」 (or the cough) stay a moment under the host's finish.
    endDelayMs: (outcome, still) => (still ? 450 : outcome === "choke" ? 1000 : 800),
    Field: GolgappaField,
  };
}

/** The golgappa duel as a rhythm_tap skin: its beats, rules, words and field. */
export const golgappaSkin = golgappaSkinFor(GOLGAPPA_GAME);
