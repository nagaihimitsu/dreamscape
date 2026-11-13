import { useEffect, useRef } from "react";
import { availableOutcome } from "../fallback";
import type { StepPickFieldProps, StepPickSkin } from "../engines/step_pick/EnginePlay";
import { stepPickStarts } from "../engines/step_pick/engine";
import { rajuHaggle } from "./definition";
import { RAJU_MAP, RAJU_PRICES, RAJU_TUNING, rajuHaggleRules, type RajuHaggleOutcome, type RajuHaggleParams } from "./rules";
import "./skin.css";

// Raju's haggle (a step_pick skin): at the fort's gate, Raju with his paper map on the left, his speech bubble over him, and
// the paper of his prices on the right: the price on show, the passed ones struck out, the coming ones faint, a bar for the
// time left before he lowers it. A price the player cannot pay now shows lowered to the one its outcome falls back to (the
// host takes that one); with none, the paper says so and only 「やめておく」 is left. With the use's art (`art.raju_glad`,
// `art.raju_unsure`, `art.raju_sulky`) his mood's picture stands in place of his standing picture.

type Mood = "glad" | "unsure" | "sulky";
const STARTS = stepPickStarts(RAJU_TUNING);

/** What a take at a step ends as now: its outcome, or the fallback its outcome takes (docs/13 4.2). */
const takenAt = (step: number, available: readonly string[]): RajuHaggleOutcome =>
  (availableOutcome(rajuHaggle, RAJU_MAP.steps[step], available) ?? RAJU_MAP.leave) as RajuHaggleOutcome;

/** His words while a price is on show: the price, or (lowered for a player who cannot pay his) the lower one; none payable. */
function callJa(step: number, available: readonly string[]): string {
  const own = RAJU_MAP.steps[step];
  const taken = takenAt(step, available);
  if (RAJU_PRICES[taken] === null) return "……買えないなら、見るだけね";
  if (taken === "buy_map") return "五十ルピー！　全部、手描きだよ";
  if (taken === "fair_map") return own === taken ? "……四十なら、いいよ" : "五十は……無理そう？　じゃあ、四十";
  return own === taken ? "さ、三十！　もう、これ以上は無理！" : "……三十でいいよ。特別だからね";
}

/** His mood: while a price is on show, by the price he is at; once decided, by the deal. */
function moodOf(step: number, available: readonly string[], decided: RajuHaggleOutcome | null): Mood {
  if (decided) return decided === "buy_map" || decided === "fair_map" ? "glad" : "sulky";
  const taken = takenAt(step, available);
  return taken === "buy_map" ? "glad" : taken === "haggle_map" ? "sulky" : "unsure";
}

const price = (outcome: RajuHaggleOutcome) => RAJU_PRICES[outcome];

/** His face over the bubble's corner (drawn: no picture needed), by mood. Not the only sign: his words change too. */
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

function RajuHaggleField({ available, still, cast, art, sound, view, frames }: StepPickFieldProps<RajuHaggleParams, RajuHaggleOutcome>) {
  const bar = useRef<HTMLSpanElement>(null);
  const play = useRef(sound);
  play.current = sound;
  // The deal as the host takes it (a price the player cannot pay falls back, as on the paper).
  const decided = view.outcome ? (availableOutcome(rajuHaggle, view.outcome, available) ?? view.outcome) as RajuHaggleOutcome : null;
  const shownStep = Math.min(view.step, RAJU_MAP.steps.length - 1);
  const mood = moodOf(shownStep, available, decided ?? null);
  const nothingPayable = RAJU_MAP.steps.every((_, step) => price(takenAt(step, available)) === null);

  // A new price on show: the page's sound; a deal: the stamp.
  useEffect(() => {
    if (view.step > 0 && view.step < RAJU_MAP.steps.length && !view.ending) play.current("ui_page");
  }, [view.step, view.ending]);
  useEffect(() => {
    if (decided && price(decided) !== null) play.current("stamp");
  }, [decided]);
  // The time left on the price on show (the play needs it: it says when he lowers it), drawn from the clock.
  useEffect(() => frames((ms) => {
    const element = bar.current;
    if (!element) return;
    const step = Math.min(RAJU_MAP.steps.length - 1, STARTS.filter((start) => ms >= start).length - 1);
    const left = view.ending ? 0 : Math.max(0, 1 - (ms - STARTS[step]) / RAJU_TUNING.stepsMs[step]);
    element.style.transform = `scaleX(${left})`;
  }), [frames, view.ending]);

  const picture = art[`raju_${mood}`];
  return (
    <div className="mg-raju-haggle" data-mood={mood} data-still={still || undefined} data-decided={decided ?? undefined}>
      <span className="mg-raju-haggle-raju" data-figure={picture ? "art" : cast.person ? "cast" : "drawn"}>
        {picture ? <img src={picture} alt="" draggable={false} /> : cast.person ?? <DrawnMap />}
      </span>
      {!decided && (
        <p className="mg-raju-haggle-bubble" key={`${shownStep}:${available.join(" ")}`}>
          <Face mood={mood} />
          <span>{callJa(shownStep, available)}</span>
        </p>
      )}
      <div className="mg-raju-haggle-paper" data-none={nothingPayable || undefined}>
        <p className="mg-raju-haggle-paper-title">地図の値段</p>
        <ol>
          {RAJU_MAP.steps.map((own, step) => {
            const taken = takenAt(step, available);
            const amount = price(taken);
            const state = step < shownStep ? "passed" : step === shownStep ? "now" : "coming";
            const isDeal = !!decided && view.ending?.kind === "take" && step === shownStep;
            return (
              <li key={own} data-state={state} data-deal={isDeal || undefined}>
                <span className="mg-raju-haggle-mark" aria-hidden="true">{state === "now" && !decided ? "▶" : ""}</span>
                {taken !== own && <s className="mg-raju-haggle-was">₹{price(own)}</s>}
                <span className="mg-raju-haggle-price">{amount === null ? "買えない" : `₹${amount}`}</span>
                {isDeal && <span className="mg-raju-haggle-stamp">{amount === null ? "買わない" : "決まり"}</span>}
              </li>
            );
          })}
        </ol>
        {decided && view.ending?.kind !== "take" && <span className="mg-raju-haggle-stamp mg-raju-haggle-stamp-off">買わない</span>}
        <span className="mg-raju-haggle-time"><span ref={bar} /></span>
      </div>
    </div>
  );
}

/** The haggle as a step_pick skin: its steps, rules, words and field. */
export const rajuHaggleSkin: StepPickSkin<RajuHaggleParams, RajuHaggleOutcome> = {
  tuning: RAJU_TUNING,
  rules: rajuHaggleRules,
  hintJa: "値段が下がっていく。決めたら「この値段で」",
  takeJa: "この値段で",
  takeHintJa: "いま出ている値段で地図を買います。",
  leaveJa: "やめておく",
  leaveHintJa: "地図を買わずに進みます。",
  autoJa: "おまかせで値段を決めています",
  takeOpen: (step, available) => price(takenAt(step, available)) !== null,
  takeClosedJa: "今は手持ちで買える値段がない。「やめておく」で進む",
  // The deal's stamp, or his face as he gives up, before the outcome shows.
  endDelayMs: (_, still) => (still ? 500 : 900),
  Field: RajuHaggleField,
};
