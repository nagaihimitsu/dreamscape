import { useEffect, useRef, useState } from "react";
import { useMiniGameKit } from "../host/kit";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { rhythmTapPerfect } from "../engines/rhythm_tap/engine";
import { GOLGAPPA_GAME, GOLGAPPA_HER_STOP, type GolgappaGame, type GolgappaOutcome, type GolgappaParams } from "./rules";
import "./skin.css";

// The golgappa duel's field (a rhythm_tap skin): the stall's counter from the customer's side, her leaf bowl on the left
// with her behind it, the player's on the right, the vendor's hand above. The hand drops hers, then the player's (a soft
// 「ぽとっ」 as the player's lands: the beat to eat on); each count is under its bowl. A bite crumbles over the bowl (a
// star right on the landing, with a bigger golden 「パリッ！」); a bite at nothing clacks and fills a drop of the choke
// gauge beside the player's bowl, and a full gauge coughs one golgappa back into the bowl. A missed one stays in the
// bowl (after her hand, the next one lands on it: a choke). Her face under the band as her 10th goes down (the sour
// water gets to her), and one golgappa before her 14th she says she is about to stop; her raised palm and 「バス！」 come
// beside her face after it (the lane's flag meets its ring then); the onlookers count aloud from the 10th.
// With the use's art (`art.stall`, `art.heroine`, `art.bowl`, `art.puri`) those pictures take the drawn ones' places.

/** Where things are, in percent of the field: the hand's height, the bowls (her on the left, the player's on the right). */
const HAND_Y = 12;
const HER = { x: 27, y: 74 };
const YOU = { x: 71, y: 77 };
/** How long 「パリッ」, a clack and a cough show. */
const BITE_MS = 380;
const CLACK_MS = 300;
const COUGH_MS = 700;
/** The onlookers count aloud from this golgappa of the player's on (「周りの客が数を数え出す」), each word this long. */
const COUNT_FROM = 10;
const COUNT_MS = 520;
const COUNT_WORDS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三", "十四", "十五", "十六", "十七"];
/** Her line as her 13th goes down (the heroine's quick reaction): the next one is her last. */
const HER_NEXT_IS_LAST = "わたし、次でバス";
/** The host shows her reactions at most this often (with a little to spare). */
const REACT_APART_MS = 1600;

/** The sounds of a play (definition `sounds`): a landing, a bite, her hand on the counter. */
const SOUNDS = { land: "cork_pop", bite: "puri_crunch", her: "stamp" } as const;

/** The next landing at or after `ms` in a sorted list (its index), or -1. */
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
  const { tuning, herLandings, handMs, numbers } = game;
  const yourBeats = tuning.beats;
  const gaugeSize = tuning.strayLimit ?? 0;
  /** Her 13th eaten: she says the next is her last. */
  const herWarnMs = herLandings[GOLGAPPA_HER_STOP - 2] + numbers.herEatMs;
  /**
   * Her 10th eaten, as the onlookers start counting: the sour water gets to her (her face only). Not when it would come
   * too near her warning for the host to show both (a reaction at most every 1.5 s; Debug's room's edited numbers).
   */
  const herTenthMs = herLandings[COUNT_FROM - 1] + numbers.herEatMs;
  const tenthFace = herWarnMs - herTenthMs >= REACT_APART_MS;

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
    const kit = useMiniGameKit();
    const live = useRef({ sound, vibrate, kit });
    live.current = { sound, vibrate, kit };

    useEffect(() => {
      let hits = 0;
      let strays = 0;
      let overflows = 0;
      let landed = 0;
      let biteAt = Number.NEGATIVE_INFINITY;
      let biteKind: "perfect" | "good" = "good";
      let clackAt = Number.NEGATIVE_INFINITY;
      let coughAt = Number.NEGATIVE_INFINITY;
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
        // The onlookers count the player's golgappa aloud from the 10th.
        const word = served >= COUNT_FROM && !over && ms - yourBeats[served - 1] < COUNT_MS ? COUNT_WORDS[served] ?? null : null;
        setCrowd(word);
        // Hers: she eats each a moment after it lands; as her 13th goes down she says the next is her last; her hand goes up
        // after her 14th (a slap on the counter, a ring round her 「バス！」).
        const herLanded = herLandings.filter((time) => time <= ms).length;
        setHerCount(herLanded);
        setHerBowl(herLanded > 0 && ms - herLandings[herLanded - 1] < numbers.herEatMs && herLanded <= GOLGAPPA_HER_STOP);
        if (tenthFace && !tenth && ms >= herTenthMs && !over) {
          tenth = true;
          live.current.kit.react("oops");
        }
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
        // The hand waits over the bowl of the next one to drop.
        const nextYours = yours >= 0 ? yourBeats[yours] : Infinity;
        const nextHers = herNext >= 0 ? herLandings[herNext] : Infinity;
        const toward = nextHers < nextYours ? HER : nextYours < Infinity ? YOU : { x: 50, y: 0 };
        if (hand.current) hand.current.style.left = `${toward.x}%`;
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
        <span className="mg-golgappa-duel-her" data-art={art.heroine ? true : undefined} data-eating={herBowl || undefined}>
          {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
        </span>
        <span className="mg-golgappa-duel-hand mg-play-object" ref={hand} />
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
        {clack && !bite && !cough && !choked && <span className="mg-golgappa-duel-clack" style={{ left: `${YOU.x}%`, top: `${YOU.y - 16}%` }}>カチッ</span>}
        {crowd && <span className="mg-golgappa-duel-crowd" key={crowd}>{crowd}！</span>}
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
    hintJa: "落ちたら「食べる」。旗は彼女の「バス」",
    actionJa: "食べる",
    actionHintJa: "自分の器にゴルガッパが落ちるたびに押します。何もない時に押すと、むせそうになります。",
    autoJa: "おまかせで食べています",
    stop: { labelJa: "バス", hintJa: "もう十分、と手を上げます。押すと勝負が終わります。彼女は14個目で手を上げます。" },
    partner: { atMs: handMs, flagJa: "バス" },
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
