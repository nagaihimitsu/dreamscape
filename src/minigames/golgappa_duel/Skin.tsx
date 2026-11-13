import { useEffect, useRef, useState } from "react";
import type { RhythmTapFieldProps, RhythmTapSkin } from "../engines/rhythm_tap/EnginePlay";
import { GOLGAPPA_FIELD, GOLGAPPA_HER_HAND_MS, GOLGAPPA_HER_STOP, GOLGAPPA_TUNING, golgappaHerLandings, golgappaRules, type GolgappaOutcome, type GolgappaParams } from "./rules";
import "./skin.css";

// The golgappa duel's field (a rhythm_tap skin): the stall's counter from the customer's side, her leaf bowl on the left
// with her behind it, the player's on the right, the vendor's hand above. The hand drops hers, then the player's; each
// count is under its bowl. A missed one stays in the player's bowl; her 「バス」 goes up after her 14th. With the use's art
// (`art.stall`, `art.heroine`, `art.bowl`, `art.puri`) those pictures take the drawn ones' places.

/** Where things are, in percent of the field: the hand's height, the bowls (her on the left, the player's on the right). */
const HAND_Y = 12;
const HER = { x: 27, y: 74 };
const YOU = { x: 71, y: 77 };
const herLandings = golgappaHerLandings();
const yourBeats = GOLGAPPA_TUNING.beats;
/** How long 「パリッ」 shows after a bite. */
const BITE_MS = 380;

/** The sounds of a play (definition `sounds`): a bite; the onlookers' clapping when the player outlasts her. */
const SOUNDS = { bite: "puri_crunch", cheer: "applause" } as const;

/** The next landing at or after `ms` in a sorted list (its index), or -1. */
const nextIndex = (times: readonly number[], ms: number) => times.findIndex((time) => time >= ms);

/** A golgappa (the use's picture, or the drawn one). */
const Puri = ({ art }: { art?: string }) => (art ? <img src={art} alt="" draggable={false} /> : <span className="mg-golgappa-duel-puri-drawn" />);

function GolgappaField({ cast, art, names, sound, vibrate, frames }: RhythmTapFieldProps<GolgappaParams, GolgappaOutcome>) {
  const hand = useRef<HTMLSpanElement>(null);
  const yourFall = useRef<HTMLSpanElement>(null);
  const herFall = useRef<HTMLSpanElement>(null);
  const [yourCount, setYourCount] = useState(0);
  const [herCount, setHerCount] = useState(0);
  const [inBowl, setInBowl] = useState(0);
  const [herBowl, setHerBowl] = useState(false);
  const [bite, setBite] = useState(false);
  const [herStopped, setHerStopped] = useState(false);
  const [youStopped, setYouStopped] = useState(false);
  const [choked, setChoked] = useState(false);
  const ring = useRef({ sound, vibrate });
  ring.current = { sound, vibrate };

  useEffect(() => {
    let hits = 0;
    let biteAt = Number.NEGATIVE_INFINITY;
    let cheered = false;
    let shook = false;
    const place = (element: HTMLElement | null, x: number, y: number, shown: boolean) => {
      if (!element) return;
      element.style.left = `${x}%`;
      element.style.top = `${y}%`;
      element.style.opacity = shown ? "1" : "0";
    };
    /** Where a golgappa falling to `bowl` is (`left` ms before it lands), or null when it is not falling. */
    const falling = (bowl: { x: number; y: number }, left: number) => {
      if (left < 0 || left > GOLGAPPA_FIELD.fallMs) return null;
      const t = 1 - left / GOLGAPPA_FIELD.fallMs;
      return { x: bowl.x, y: HAND_Y + 6 + (bowl.y - 6 - HAND_Y - 6) * t * t };
    };
    return frames(({ ms, record, summary, outcome }) => {
      const over = summary.ended !== null;
      const stopAt = record.stopMs;
      // The player's: landed so far (until the stop), eaten, left in the bowl.
      const served = summary.came;
      const sitting = Math.max(0, served - summary.hits);
      setYourCount(served);
      setInBowl(Math.min(3, sitting));
      if (summary.hits > hits) {
        hits = summary.hits;
        biteAt = ms;
        ring.current.sound(SOUNDS.bite);
      }
      setBite(ms - biteAt < BITE_MS);
      // Hers: she eats each a moment after it lands; her hand goes up after her 14th.
      const herLanded = herLandings.filter((time) => time <= ms).length;
      setHerCount(herLanded);
      setHerBowl(herLanded > 0 && ms - herLandings[herLanded - 1] < GOLGAPPA_FIELD.herEatMs && herLanded <= GOLGAPPA_HER_STOP);
      setHerStopped(ms >= GOLGAPPA_HER_HAND_MS);
      setYouStopped(stopAt !== null && summary.ended === "stop");
      if (summary.ended === "misses" && !shook) {
        shook = true;
        setChoked(true);
        ring.current.vibrate("shake");
      }
      if (outcome === "outlast" && !cheered) {
        cheered = true;
        ring.current.sound(SOUNDS.cheer);
      }
      // The falling ones: the player's (not after the stop or the end), hers (her 14 only).
      const yours = over ? -1 : nextIndex(yourBeats, ms);
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
      {art.stall ? <img className="mg-golgappa-duel-backdrop" src={art.stall} alt="" draggable={false} /> : (
        <>
          <span className="mg-golgappa-duel-pot" />
          <span className="mg-golgappa-duel-heap"><span /><span /><span /><span /><span /></span>
          <span className="mg-golgappa-duel-counter" />
        </>
      )}
      <span className="mg-golgappa-duel-her" data-eating={herBowl || undefined}>
        {art.heroine ? <img src={art.heroine} alt="" draggable={false} /> : cast.heroine}
      </span>
      <span className="mg-golgappa-duel-hand" ref={hand} />
      <span className="mg-golgappa-duel-bowl mg-golgappa-duel-bowl-her" style={{ left: `${HER.x}%`, top: `${HER.y}%` }}>
        {art.bowl ? <img src={art.bowl} alt="" draggable={false} /> : <span className="mg-golgappa-duel-bowl-drawn" />}
        {herBowl && <span className="mg-golgappa-duel-in-bowl"><Puri art={art.puri} /></span>}
      </span>
      <span className="mg-golgappa-duel-bowl mg-golgappa-duel-bowl-you" data-choked={choked || undefined} style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}>
        {art.bowl ? <img src={art.bowl} alt="" draggable={false} /> : <span className="mg-golgappa-duel-bowl-drawn" />}
        {Array.from({ length: inBowl }, (_, index) => <span key={index} className="mg-golgappa-duel-in-bowl" data-place={index}><Puri art={art.puri} /></span>)}
      </span>
      <span className="mg-golgappa-duel-fall" ref={herFall}><Puri art={art.puri} /></span>
      <span className="mg-golgappa-duel-fall mg-golgappa-duel-fall-you" ref={yourFall}><Puri art={art.puri} /></span>
      {bite && !choked && <span className="mg-golgappa-duel-bite" style={{ left: `${YOU.x}%`, top: `${YOU.y - 16}%` }}>パリッ</span>}
      {herStopped && <span className="mg-golgappa-duel-say mg-golgappa-duel-say-her" style={{ left: `${HER.x}%` }}>バス！</span>}
      {youStopped && <span className="mg-golgappa-duel-say" style={{ left: `${YOU.x}%`, top: `${YOU.y - 22}%` }}>バス！</span>}
      {choked && <span className="mg-golgappa-duel-say mg-golgappa-duel-say-choke" style={{ left: `${YOU.x}%`, top: `${YOU.y - 22}%` }}>ごほっ</span>}
      <span className="mg-golgappa-duel-count" style={{ left: `${HER.x}%` }}><small>{names.heroine}</small>{herCount}</span>
      <span className="mg-golgappa-duel-count" style={{ left: `${YOU.x}%` }}><small>{names.player}</small>{yourCount}</span>
    </div>
  );
}

/** The golgappa duel as a rhythm_tap skin: its beats, rules, words and field. */
export const golgappaSkin: RhythmTapSkin<GolgappaParams, GolgappaOutcome> = {
  tuning: GOLGAPPA_TUNING,
  rules: golgappaRules,
  hintJa: "器に落ちたら「食べる」",
  actionJa: "食べる",
  actionHintJa: "自分の器にゴルガッパが落ちるたびに押します。",
  autoJa: "おまかせで食べています",
  stop: { labelJa: "バス", hintJa: "もう十分、と手を上げます。押すと勝負が終わります。" },
  statusJa: (summary) => (summary.came > 0 ? `${summary.came}個目` : ""),
  detailJa: (summary) => `${summary.hits}個食べた`,
  // Her hand and the player's 「バス」 (or the cough) stay a moment before the outcome.
  endDelayMs: (outcome, still) => (still ? 450 : outcome === "choke" ? 1000 : 800),
  Field: GolgappaField,
};
