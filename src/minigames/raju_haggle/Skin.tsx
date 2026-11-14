import { Fragment, useEffect, useRef, useState } from "react";
import { availableOutcome } from "../fallback";
import type { StepPickFieldProps, StepPickSkin, StepPickView } from "../engines/step_pick/EnginePlay";
import { stepPickThresholds, type StepPickTuning } from "../engines/step_pick/engine";
import { useMiniGameKit } from "../host/kit";
import { rajuHaggle } from "./definition";
import {
  RAJU_HAGGLE_TUNING, RAJU_MAP, RAJU_NUDGE_BEFORE_MS, RAJU_PRICES, rajuHaggleRulesFor, rajuStepTuning, type RajuHaggleOutcome, type RajuHaggleParams,
  type RajuTuning,
} from "./rules";
import "./skin.css";

// Raju's haggle (a step_pick skin): at the fort's gate, Raju with his paper map on the left, his speech bubble over him
// with his patience (his face and five dots, filled while it lasts), and the paper of his prices on the right: the price
// on show, the passed ones struck out, the coming ones faint. Each stare costs him a dot and flinches him; every second one
// brings his price down; the last dot gone, he turns away with the map. A price the player cannot pay now shows lowered to
// the one its outcome falls back to (the host takes that one); with none, the paper says so and only 「やめておく」 is left
// (「この値段で」 refuses when pressed: the host's denied). With one dot of patience left, she feels for him (her face and a
// word in the band); the stamp lands with a squash and a small shake. With the use's art (`art.raju_glad`,
// `art.raju_unsure`, `art.raju_sulky`) his mood's picture stands in place of his standing picture.

type Mood = "glad" | "unsure" | "sulky";
const SOUNDS = { page: "ui_page", stamp: "stamp", stare: "ui_tap" } as const;
/** Her word when his patience is down to its last dot (her face in the band). */
const PITY_JA = "ちょっと、かわいそうかも……";
/** His patience in dots: all of it at the start, none once he gives up. */
const patienceOf = (tuning: StepPickTuning, pushes: number) => Math.max(0, (tuning.pushLimit ?? 0) - pushes);

/** What a take at a step ends as now: its outcome, or the fallback its outcome takes (docs/13 4.2). */
const takenAt = (step: number, available: readonly string[]): RajuHaggleOutcome =>
  (availableOutcome(rajuHaggle, RAJU_MAP.steps[step], available) ?? RAJU_MAP.leave) as RajuHaggleOutcome;
const price = (outcome: RajuHaggleOutcome) => RAJU_PRICES[outcome];

/** His words now: a new price as it comes (lowered for a player who cannot pay his), a stare between prices, his end. */
function callJa(view: StepPickView<RajuHaggleOutcome>, available: readonly string[], waiting: boolean, thresholds: readonly number[]): string {
  if (view.ending?.kind === "out") return "もういい！　地図は売らない！";
  if (view.ending?.kind === "none") return "……買わないの？";
  if (waiting) return "……買うの？　買わないの？";
  const step = view.step;
  const own = RAJU_MAP.steps[step];
  const taken = takenAt(step, available);
  if (price(taken) === null) return "……買えないなら、見るだけね";
  // A stare that has not brought the price down yet: he squirms.
  if (view.pushes > thresholds[step]) return step === 0 ? "……う。そんなに見ないでよ" : "まだ見るの？　……ぼく、もう負けないからね";
  if (taken === "buy_map") return "五十ルピー！　全部、手描きだよ";
  if (taken === "fair_map") return own === taken ? "……四十なら、いいよ" : "五十は……無理そう？　じゃあ、四十";
  return own === taken ? "さ、三十！　もう、これ以上は無理！" : "……三十でいいよ。特別だからね";
}

/** His words with a break allowed after each phrase's mark (a narrow phone breaks there, not inside a word). */
function Phrased({ text }: { text: string }) {
  const parts = text.split(/(?<=[、。！？　]|……)/u);
  return <>{parts.map((part, index) => <Fragment key={index}>{part}{index < parts.length - 1 && <wbr />}</Fragment>)}</>;
}

/** His mood: while the haggle goes on, by the patience he has left; once decided, by the deal. */
function moodOf(patience: number, decided: RajuHaggleOutcome | null): Mood {
  if (decided) return decided === "buy_map" || decided === "fair_map" ? "glad" : "sulky";
  return patience >= 4 ? "glad" : patience >= 2 ? "unsure" : "sulky";
}

/** His face by the patience bar (drawn: no picture needed), by mood. Not the only sign: the dots and his words change too. */
function Face({ mood }: { mood: Mood }) {
  return (
    <svg viewBox="0 0 40 40" className="mg-raju-haggle-face" aria-hidden="true">
      <circle cx="20" cy="21" r="16" fill="#b9805a" />
      <path d="M5 17 Q 8 3, 20 4 Q 33 3, 35 17 Q 30 9, 20 10 Q 10 9, 5 17 Z" fill="#231a16" />
      {mood === "glad" && <>
        <path d="M12 19 Q 14.5 16, 17 19 M23 19 Q 25.5 16, 28 19" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 25 Q 20 33, 28 25 Z" fill="#7a2e22" />
      </>}
      {mood === "unsure" && <>
        <circle cx="14.5" cy="18" r="1.8" fill="#231a16" />
        <circle cx="25.5" cy="18" r="1.8" fill="#231a16" />
        <path d="M15 27 L 25 26" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <path d="M33 10 q2 4 0 6 q-2 -2 0 -6 Z" fill="#8fc6e8" />
      </>}
      {mood === "sulky" && <>
        <path d="M11 16 L 17 18 M29 16 L 23 18" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
        <circle cx="14.5" cy="20.5" r="1.6" fill="#231a16" />
        <circle cx="25.5" cy="20.5" r="1.6" fill="#231a16" />
        <circle cx="9.5" cy="25" r="3.5" fill="#d48a76" opacity="0.7" />
        <circle cx="30.5" cy="25" r="3.5" fill="#d48a76" opacity="0.7" />
        <path d="M16.5 28 Q 20 25, 23.5 28" fill="none" stroke="#231a16" strokeWidth="2" strokeLinecap="round" />
      </>}
    </svg>
  );
}

/** His patience: five dots, filled while it lasts, hollow once spent (shape and fill, not colour alone). */
function Patience({ left, total }: { left: number; total: number }) {
  return (
    <span className="mg-raju-haggle-patience" aria-hidden="true">
      <span className="mg-raju-haggle-patience-label">がまん</span>
      {Array.from({ length: total }, (_, index) => <i key={index} data-spent={index >= left || undefined} />)}
    </span>
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

function RajuHaggleField({ available, still, cast, art, sound, view, frames, tuning }: StepPickFieldProps<RajuHaggleParams, RajuHaggleOutcome>) {
  const kit = useMiniGameKit();
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const paper = useRef<HTMLDivElement>(null);
  const play = useRef(sound);
  play.current = sound;
  const thresholds = stepPickThresholds(tuning);
  const total = tuning.pushLimit ?? 0;
  const [waiting, setWaiting] = useState(false);
  // The deal as the host takes it (a price the player cannot pay falls back, as on the paper).
  const decided = view.outcome ? (availableOutcome(rajuHaggle, view.outcome, available) ?? view.outcome) as RajuHaggleOutcome : null;
  const patience = patienceOf(tuning, view.pushes);
  const mood = moodOf(patience, decided);
  const away = view.ending?.kind === "out" || view.ending?.kind === "none";
  const nothingPayable = RAJU_MAP.steps.every((_, step) => price(takenAt(step, available)) === null);

  // A stare: a soft tap (his last dot: she feels for him); a new price: the page's sound; the stamp: its sound, a squash
  // and a small shake (a deal, or no deal).
  useEffect(() => {
    if (!view.pushes) return;
    play.current(SOUNDS.stare);
    if (patienceOf(tuning, view.pushes) === 1 && !view.ending) kitRef.current.react("oops", PITY_JA);
  }, [view.pushes]);
  useEffect(() => { if (view.step > 0 && !view.ending) play.current(SOUNDS.page); }, [view.step, view.ending]);
  useEffect(() => {
    if (!decided) return;
    if (price(decided) !== null) play.current(SOUNDS.stamp);
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
  return (
    <div className="mg-raju-haggle" data-mood={mood} data-away={away || undefined} data-still={still || undefined} data-decided={decided ?? undefined}>
      <span className="mg-raju-haggle-raju mg-play-object" data-figure={picture ? "art" : cast.person ? "cast" : "drawn"}>
        {/* Each stare flinches him (the key starts it again). */}
        <span className="mg-raju-haggle-flinch" key={view.pushes} data-stared={view.pushes > 0 || undefined}>
          {picture ? <img src={picture} alt="" draggable={false} /> : cast.person ?? <DrawnMap />}
        </span>
      </span>
      {showBubble && (
        <div className="mg-raju-haggle-bubble" key={`${view.pushes}:${view.step}:${available.join(" ")}:${view.ending?.kind ?? ""}:${waiting}:${view.denied}`}>
          <Face mood={away ? "sulky" : mood} />
          <span className="mg-raju-haggle-words">
            <span className="mg-raju-haggle-line"><Phrased text={callJa(view, available, waiting, thresholds)} /></span>
            <Patience left={patience} total={total} />
          </span>
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

/** The top band: the price on show and his patience, in words (read out). */
function status(view: StepPickView<RajuHaggleOutcome>, available: readonly RajuHaggleOutcome[], tuning: StepPickTuning): string {
  const amount = price(takenAt(Math.min(view.step, RAJU_MAP.steps.length - 1), available));
  return `${amount === null ? "買える値段がない" : `いまの値段 ₹${amount}`}　がまん ${patienceOf(tuning, view.pushes)}/${tuning.pushLimit ?? 0}`;
}

/** The haggle as a step_pick skin for a tuning (Debug's room retunes it): its steps, rules, words and field. */
export function rajuHaggleSkinFor(numbers: RajuTuning): StepPickSkin<RajuHaggleParams, RajuHaggleOutcome> {
  const tuning = rajuStepTuning(numbers);
  return {
    tuning,
    rules: rajuHaggleRulesFor(tuning),
    hintJa: "「じっと見る」2回で値段が下がる。見すぎると、ラージューはへそを曲げる",
    pushJa: "じっと見る",
    pushHintJa: "ラージューをじっと見ます。2回で値段が一つ下がり、がまんが一つ減ります。がまんが尽きると地図は買えません。",
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
    // The deal's stamp, or his turning away, before the outcome shows.
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
