import { Fragment, useEffect, useRef, useState } from "react";
import { availableOutcome } from "../fallback";
import type { StepPickFieldProps, StepPickSkin, StepPickView } from "../engines/step_pick/EnginePlay";
import type { StepPickTuning } from "../engines/step_pick/engine";
import { useMiniGameKit } from "../host/kit";
import { seededRandom } from "../host/seed";
import { rajuHaggle } from "./definition";
import {
  RAJU_HAGGLE_TUNING, RAJU_MAP, RAJU_NUDGE_BEFORE_MS, RAJU_PRICES, rajuHaggleRulesFor, rajuStepTuning, type RajuHaggleOutcome, type RajuHaggleParams,
  type RajuLook, type RajuTuning,
} from "./rules";
import "./skin.css";

// Raju's haggle (a step_pick skin with moods, round 3): at the fort's gate, Raju with his paper map on the left, his speech
// bubble over him (his face and his words), and the paper of his prices on the right: the price on show, the passed ones
// struck out, the coming ones faint. Raju is never still, and how a stare lands is read from him: boasting (chin up, the
// map held high, a boast in his bubble: a stare bounces and he glares back, huffier), his eyes wandering (his tell: a
// sigh, a glance at his map, fiddling with its corner, a look at his grandpa's stall — which one is from the seed: looks
// only; a stare lands and he flinches), at ₹40 his fake walk-away (he turns his back, then peeks over his shoulder — she
// notices — and a stare calls his bluff), and at ₹30 his 「もう無理！」. His pride is not dots: his face gets a cross mark,
// then puffed red cheeks, his boasts turn to 「……ふん！」, and with the last of it she feels for him; gone, he stomps off
// with the map. A price the player cannot pay now shows lowered to the one its outcome falls back to (the host takes that
// one); with none, the paper says so and only 「やめておく」 is left. The stamp lands with a squash and a small shake. With
// the use's art (`art.raju_glad`, `art.raju_unsure`, `art.raju_sulky`) his mood's picture stands in place of his standing
// picture.

type Mood = "glad" | "unsure" | "sulky";
type Face = "proud" | "wobble" | "peek" | "glad" | "unsure" | "sulky";
const SOUNDS = { page: "ui_page", stamp: "stamp", stare: "ui_tap", snatch: "snatch", step: "footstep" } as const;
/** A field this short hides his picture (skin.css's container query): no place for her word that covers nothing. */
const SHORT_FIELD_PX = 300;
/** Her word when his pride is down to its last bit, and when she sees him peek back on his fake walk-away. */
const PITY_JA = "ちょっと、かわいそうかも……";
const PEEK_JA = "ふふっ、ちらちら見てる";
/** His pride left: all of it at the start, none once he gives up. */
const prideOf = (tuning: StepPickTuning, view: Pick<StepPickView<RajuHaggleOutcome>, "bounces">) => Math.max(0, (tuning.moods?.patience ?? 0) - view.bounces);

/** What a take at a step ends as now: its outcome, or the fallback its outcome takes (docs/13 4.2). */
const takenAt = (step: number, available: readonly string[]): RajuHaggleOutcome =>
  (availableOutcome(rajuHaggle, RAJU_MAP.steps[step], available) ?? RAJU_MAP.leave) as RajuHaggleOutcome;
const price = (outcome: RajuHaggleOutcome) => RAJU_PRICES[outcome];

/** His boasts (by the seed and the stretch, looks only), and the ones once his pride is hurt. */
const BOASTS = ["全部、手描きだよ！", "この地図、三日かかったんだよ", "本物の宝の地図なんだから", "ここの印、ぼくしか知らないよ"] as const;
const HUFFS = ["じろじろ見ないでよ！", "……ふん！"] as const;
/** His tells while his eyes wander (which one: the seed and the stretch, looks only; each means the same: a stare lands now). */
export const RAJU_TELLS = [
  { id: "sigh", lineJa: "……はあ" },
  { id: "map", lineJa: "（地図を、ちらっ）" },
  { id: "fidget", lineJa: "（地図の端を、くるくる）" },
  { id: "nana", lineJa: "（ナーナーの店の方を、ちらっ）" },
] as const;
export const rajuTell = (seed: number, index: number) => RAJU_TELLS[Math.floor(seededRandom(seed + index * 7919)() * RAJU_TELLS.length)];
const pick = <T,>(list: readonly T[], seed: number, index: number): T => list[Math.floor(seededRandom(seed * 31 + index)() * list.length)];

/** His look now (the stretch's, or none once decided). */
const lookOf = (view: StepPickView<RajuHaggleOutcome>): RajuLook | null => (view.ending ? null : (view.mood?.look as RajuLook | undefined) ?? null);

/** His words now: his end, a nudge, what his last stare did, else his look's. */
export function rajuCallJa(view: StepPickView<RajuHaggleOutcome>, available: readonly string[], waiting: boolean, seed: number, pride: number, full: number): string {
  if (view.ending?.kind === "out") return "もういい！　地図は売らない！";
  if (view.ending?.kind === "none") return "……買わないの？";
  if (waiting) return "……買うの？　買わないの？";
  const step = view.step;
  const own = RAJU_MAP.steps[step];
  const taken = takenAt(step, available);
  if (price(taken) === null) return "……買えないなら、見るだけね";
  const look = lookOf(view);
  const index = view.mood?.index ?? 0;
  // What the last stare did, while its moment lasts (a stare that moved the price on starts his routine afresh).
  const fresh = view.pushedAt !== null && view.mood !== null && view.pushedAt >= view.mood.from;
  if (fresh && view.lastPush === "bounced") return step >= RAJU_MAP.steps.length - 1 ? "もう無理だってば！" : pick(HUFFS, seed, view.pushes);
  if (fresh && view.lastPush === "called") return taken === "haggle_map" ? "わ、わかったよ！　三十！" : "わ、わかったよ！";
  if (fresh && view.lastPush === "landed" && view.landed === 0 && step > 0) {
    if (taken === "fair_map") return own === taken ? "……四十なら、いいよ" : "五十は……無理そう？　じゃあ、四十";
    return own === taken ? "さ、三十！　もう、これ以上は無理！" : "……三十でいいよ。特別だからね";
  }
  switch (look) {
    case "recover": return "う……そんなに見ないでよ";
    case "wobble": return rajuTell(seed, index + view.pushes * 3).lineJa;
    case "turn": return "……じゃあ、いいよ。ほかのお客さん、探すから";
    case "peek": return "（ちらっ）";
    case "back": return "……べつに、行かないけど";
    case "floor": return "さ、三十！　もう、これ以上は無理！";
    default:
      if (pride < full) return pick(HUFFS, seed, index);
      if (step === 0 && index === 0 && taken === "buy_map") return "五十ルピー！　全部、手描きだよ";
      if (step === 0 && index === 0 && taken !== own) return taken === "fair_map" ? "五十は……無理そう？　じゃあ、四十" : "……三十でいいよ。特別だからね";
      return pick(BOASTS, seed, index);
  }
}

/** His words with a break allowed after each phrase's mark (a narrow phone breaks there, not inside a word). */
function Phrased({ text }: { text: string }) {
  const parts = text.split(/(?<=[、。！？　）]|……)/u);
  return <>{parts.map((part, index) => <Fragment key={index}>{part}{index < parts.length - 1 && <wbr />}</Fragment>)}</>;
}

/** His mood for his picture (a use's three pictures): while the haggle goes on, by his look and pride; once decided, by the deal. */
function moodOf(look: RajuLook | null, pride: number, decided: RajuHaggleOutcome | null): Mood {
  if (decided) return decided === "buy_map" || decided === "fair_map" ? "glad" : "sulky";
  if (pride <= 1 || look === "turn" || look === "floor") return "sulky";
  return look === "boast" || look === "back" ? "glad" : "unsure";
}
/** His face in the bubble, by his look. */
function faceOf(look: RajuLook | null, mood: Mood): Face {
  if (look === "boast" || look === "back") return mood === "sulky" ? "sulky" : "proud";
  if (look === "wobble" || look === "recover") return "wobble";
  if (look === "peek") return "peek";
  return mood;
}

/** His face by the bubble (drawn: no picture needed). Not the only sign: his words and the top band change too. */
function FaceIcon({ face, pride, full }: { face: Face; pride: number; full: number }) {
  const hurt = pride < full;
  return (
    <svg viewBox="0 0 40 40" className="mg-raju-haggle-face" aria-hidden="true" data-face={face}>
      <circle cx="20" cy="21" r="16" fill="#b9805a" />
      <path d="M5 17 Q 8 3, 20 4 Q 33 3, 35 17 Q 30 9, 20 10 Q 10 9, 5 17 Z" fill="#231a16" />
      {(face === "glad" || face === "proud") && <>
        <path d="M12 19 Q 14.5 16, 17 19 M23 19 Q 25.5 16, 28 19" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        {face === "glad" ? <path d="M12 25 Q 20 33, 28 25 Z" fill="#7a2e22" /> : <path d="M14 27 Q 21 30, 27 25" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />}
      </>}
      {face === "wobble" && <>
        <circle cx="17" cy="18" r="1.8" fill="#231a16" />
        <circle cx="28" cy="18" r="1.8" fill="#231a16" />
        <path d="M15 27 Q 18 25, 21 27 Q 24 29, 26 27" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <path d="M33 10 q2 4 0 6 q-2 -2 0 -6 Z" fill="#8fc6e8" />
      </>}
      {face === "peek" && <>
        <path d="M11 19 L 17 19" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <circle cx="26" cy="18.5" r="2.2" fill="#231a16" />
        <path d="M16 27 L 24 27" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
      </>}
      {face === "unsure" && <>
        <circle cx="14.5" cy="18" r="1.8" fill="#231a16" />
        <circle cx="25.5" cy="18" r="1.8" fill="#231a16" />
        <path d="M15 27 L 25 26" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
      </>}
      {face === "sulky" && <>
        <path d="M11 16 L 17 18 M29 16 L 23 18" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14.5" cy="20.5" r="1.6" fill="#231a16" />
        <circle cx="25.5" cy="20.5" r="1.6" fill="#231a16" />
        <path d="M16.5 28 Q 20 25, 23.5 28" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
      </>}
      {/* His pride hurt: a cross mark; nearly gone: puffed red cheeks. */}
      {hurt && <path d="M30 5 l 4 4 m 0 -4 l -4 4" stroke="#c8302a" strokeWidth="2" strokeLinecap="round" data-testid="raju-hurt" />}
      {pride <= 1 && face !== "glad" && <>
        <circle cx="9.5" cy="25" r="4" fill="#d9705f" opacity="0.8" />
        <circle cx="30.5" cy="25" r="4" fill="#d9705f" opacity="0.8" />
      </>}
    </svg>
  );
}

/** His paper map (drawn when neither his standing picture nor a picture of the use is on hand): a notebook page, pencil lines, a red X. */
function DrawnMap() {
  return (
    <svg viewBox="0 0 120 90" className="mg-raju-haggle-drawn-map" aria-hidden="true">
      <path d="M4 6 L 116 2 L 114 86 L 6 88 Z" fill="#f6f0e2" stroke="#b9ae98" strokeWidth="1.5" />
      {[18, 30, 42, 54, 66, 78].map((y) => <path key={y} d={`M8 ${y} L 112 ${y - 2}`} stroke="#a9c3d8" strokeWidth="0.8" />)}
      <path d="M14 70 C 30 40, 52 62, 66 36 S 96 30, 102 20" fill="none" stroke="#5b5650" strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M20 24 h12 v10 h-12 Z M70 60 q8 -10 16 0" fill="none" stroke="#5b5650" strokeWidth="1.4" />
      <path d="M92 12 L 108 28 M108 12 L 92 28" stroke="#c8302a" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function RajuHaggleField({ available, still, seed, cast, art, sound, vibrate, view, frames, tuning }: StepPickFieldProps<RajuHaggleParams, RajuHaggleOutcome>) {
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const root = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLDivElement>(null);
  const play = useRef(sound);
  play.current = sound;
  const buzz = useRef(vibrate);
  buzz.current = vibrate;
  const full = tuning.moods?.patience ?? 0;
  const [waiting, setWaiting] = useState(false);
  // The deal as the host takes it (a price the player cannot pay falls back, as on the paper).
  const decided = view.outcome ? (availableOutcome(rajuHaggle, view.outcome, available) ?? view.outcome) as RajuHaggleOutcome : null;
  const pride = prideOf(tuning, view);
  const look = lookOf(view);
  const mood = moodOf(look, pride, decided);
  const away = view.ending?.kind === "out" || view.ending?.kind === "none";
  const nothingPayable = RAJU_MAP.steps.every((_, step) => price(takenAt(step, available)) === null);
  const roomy = () => (root.current?.clientHeight ?? 0) > SHORT_FIELD_PX;

  // A stare: a soft tap; one that bounces, a lower one and a buzz (his last bit of pride: she feels for him, but not on a
  // field too short for a free place); a new price: the page's sound; the stamp: a squash and a small shake, a deal with
  // its sound and a buzz, no deal with a softer, lower stamp (his stomping off: the map snatched back first).
  useEffect(() => {
    if (!view.pushes) return;
    if (view.lastPush === "bounced") {
      play.current(SOUNDS.stare, { volume: 0.6, rate: 0.8 });
      buzz.current("tap");
    } else play.current(SOUNDS.stare);
    if (pride === 1 && view.lastPush === "bounced" && !view.ending && roomy()) kitRef.current.react("oops", PITY_JA);
  }, [view.pushes]);
  useEffect(() => { if (view.step > 0 && !view.ending) play.current(SOUNDS.page); }, [view.step, view.ending]);
  // His fake walk-away: two steps as he turns; she notices his peek (once).
  const peeked = useRef(false);
  useEffect(() => {
    if (look === "turn") play.current(SOUNDS.step, { volume: 0.5 });
    if (look === "peek" && !peeked.current && roomy()) {
      peeked.current = true;
      kitRef.current.react("laugh", PEEK_JA);
    }
  }, [look]);
  useEffect(() => {
    if (!decided) return;
    if (price(decided) !== null) {
      play.current(SOUNDS.stamp);
      buzz.current("hit");
    } else {
      if (away) play.current(SOUNDS.snatch, { volume: 0.7 });
      play.current(SOUNDS.stamp, { volume: 0.8, rate: 0.85 });
    }
    kitRef.current.juice.squash(paper.current?.querySelector(".mg-raju-haggle-stamp") ?? null, "land");
    kitRef.current.juice.shake("s");
  }, [decided]);
  // A long while with nothing done: he asks once more before he gives up asking.
  useEffect(() => frames((ms) => {
    const now = !view.ending && ms - view.activeAt >= tuning.idleMs - RAJU_NUDGE_BEFORE_MS;
    setWaiting((current) => (current === now ? current : now));
  }), [frames, view.activeAt, view.ending]);

  const picture = art[`raju_${mood}`];
  const showBubble = !decided || away;
  const words = rajuCallJa(view, available, waiting, seed, pride, full);
  return (
    <div ref={root} className="mg-raju-haggle" data-mood={mood} data-look={look ?? undefined} data-pride={pride} data-away={away || undefined}
      data-still={still || undefined} data-decided={decided ?? undefined}>
      <span className="mg-raju-haggle-raju mg-play-object" data-figure={picture ? "art" : cast.person ? "cast" : "drawn"}>
        {/* Each stare: he flinches (it landed) or glares back (it bounced); the key starts it again. */}
        <span className="mg-raju-haggle-flinch" key={view.pushes} data-stared={view.lastPush ?? undefined}>
          {picture ? <img src={picture} alt="" draggable={false} /> : cast.person ?? <DrawnMap />}
        </span>
      </span>
      {showBubble && (
        <div className="mg-raju-haggle-bubble" key={`${words}:${view.pushes}`} data-testid="raju-bubble">
          <FaceIcon face={away ? "sulky" : faceOf(look, mood)} pride={pride} full={full} />
          <span className="mg-raju-haggle-line"><Phrased text={words} /></span>
        </div>
      )}
      <div className="mg-raju-haggle-paper mg-play-object" ref={paper} data-none={nothingPayable || undefined}>
        <p className="mg-raju-haggle-paper-title">地図の値段</p>
        <ol>
          {RAJU_MAP.steps.map((own, step) => {
            const taken = takenAt(step, available);
            const amount = price(taken);
            const state = step < view.step ? "passed" : step === view.step ? "now" : "coming";
            const deal = !!decided && price(decided) !== null && step === view.step;
            return (
              <li key={own} data-state={state} data-deal={deal || undefined}>
                <span className="mg-raju-haggle-mark" aria-hidden="true">{state === "now" && !decided ? "▶" : ""}</span>
                {taken !== own && <s className="mg-raju-haggle-was">₹{price(own)}</s>}
                <span className="mg-raju-haggle-price">{amount === null ? "買えない" : `₹${amount}`}</span>
                {/* The deal: stamped at the end of its price's row, the price still readable. */}
                {deal && <span className="mg-raju-haggle-stamp" data-on="row">決まり</span>}
              </li>
            );
          })}
        </ol>
        {/* No deal: stamped across the paper's middle. */}
        {decided && price(decided) === null && <span className="mg-raju-haggle-stamp">買わない</span>}
      </div>
    </div>
  );
}

/** His look in words for the top band (read out): how a stare would land now, said as what he is doing. */
const LOOK_JA: Record<RajuLook, string> = {
  boast: "胸を張っている", wobble: "目が泳いでいる", recover: "たじろいでいる", turn: "背を向けた", peek: "ちらっとこっちを見た", back: "戻ってきた",
  floor: "もう下げられないと言っている",
};

/** The top band: the price on show and what Raju is doing, in words (read out). */
function status(view: StepPickView<RajuHaggleOutcome>, available: readonly RajuHaggleOutcome[], tuning: StepPickTuning): string {
  const amount = price(takenAt(Math.min(view.step, RAJU_MAP.steps.length - 1), available));
  const look = lookOf(view);
  const pride = prideOf(tuning, view);
  const doing = !look ? "" : look === "boast" && pride <= 1 ? "むくれている" : LOOK_JA[look];
  return `${amount === null ? "買える値段がない" : `₹${amount}`}${doing ? `　${doing}` : ""}`;
}

/** The haggle as a step_pick skin for a tuning (Debug's room retunes it): its steps, rules, words and field. */
export function rajuHaggleSkinFor(numbers: RajuTuning): StepPickSkin<RajuHaggleParams, RajuHaggleOutcome> {
  const tuning = rajuStepTuning(numbers);
  return {
    tuning,
    rules: rajuHaggleRulesFor(tuning),
    hintJa: "目が泳いだ時に「じっと見る」と値段が下がる。胸を張っている時に見ると、むくれる",
    pushJa: "じっと見る",
    pushHintJa: "ラージューをじっと見ます。目が泳いでいる時なら2回で値段が一つ下がり、胸を張っている時だと、むくれます。むくれすぎると地図は買えません。",
    takeJa: "この値段で",
    takeHintJa: "いま出ている値段で地図を買います。",
    takeDetailJa: (step, available) => {
      const amount = price(takenAt(step, available));
      return amount === null ? "" : `₹${amount}`;
    },
    leaveJa: "やめておく",
    leaveHintJa: "地図を買わずに進みます。",
    autoJa: "おまかせで値段を決めています",
    takeOpen: (step, available) => price(takenAt(step, available)) !== null,
    takeClosedJa: "今は手持ちで買える値段がない。「やめておく」で進む",
    statusJa: (view, available) => status(view, available, tuning),
    // The deal's stamp, or his stomping off, before the outcome shows.
    endDelayMs: (ending, still) => (still ? 600 : ending.kind === "out" ? 1300 : 1000),
    // What was saved, by the rupee (display only: the story gets the outcome, never the number).
    detailJa: (outcome, available) => {
      const taken = (availableOutcome(rajuHaggle, outcome, available) ?? outcome) as RajuHaggleOutcome;
      const paid = price(taken);
      const asked = price(RAJU_MAP.steps[0]);
      return paid !== null && asked !== null && paid < asked ? `₹${asked - paid} 値切った` : undefined;
    },
    Field: RajuHaggleField,
  };
}
export const rajuHaggleSkin = rajuHaggleSkinFor(RAJU_HAGGLE_TUNING);
