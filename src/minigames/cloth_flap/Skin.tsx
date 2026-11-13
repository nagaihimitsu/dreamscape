import { useEffect, useRef, useState } from "react";
import type { CueTapFieldProps, CueTapSkin } from "../engines/cue_tap/EnginePlay";
import { CLOTH_END_MS, CLOTH_FIELD, CLOTH_NICHE_MS, CLOTH_START_MS, CLOTH_TUNING, clothFlapRules, type ClothFlapOutcome, type ClothFlapParams } from "./rules";
import "./skin.css";

// The flap's field (a cue_tap skin): the view from inside a niche of the stepwell, through its arch. The stairs cross the
// view from the upper left down to the lower right; she comes down them one step at a time, to the step in front of the
// niche (the middle) and on. The player's hands hold the folded cloth at the bottom of the niche. Everything sits on a
// stage of a fixed shape (3:4, as large as the field holds; dark stone around it), so a stairs picture's steps stay under
// her feet on every screen. With the use's art (`art.stairs`, `art.walker`) the drawn stairs and figure give way to those
// pictures.

type Foot = { x: number; y: number };
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

// In percent of the stage: where her foot is on step k (0 at the top; CLOTH_FIELD.stepsToNiche in front of the niche, the
// middle of the stage). A stairs picture (art.stairs) puts its steps on these points (the art request says so).
const STEP_X = 7.2;
const STEP_Y = 4.5;
const NICHE: Foot = { x: 50, y: 66 };
const footOn = (k: number): Foot => ({ x: NICHE.x + STEP_X * (k - CLOTH_FIELD.stepsToNiche), y: NICHE.y + STEP_Y * (k - CLOTH_FIELD.stepsToNiche) });
/** The last step drawn (she never goes past CLOTH_FIELD.stepsToNiche + stepsPast). */
const LAST_STEP = CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast + 2;

/** The stairs' outline (a clip-path polygon): a landing at the top on the left, then step after step down to the right. */
function stairsOutline(): string {
  const half = STEP_X / 2;
  const points: string[] = [`0% ${footOn(0).y}%`];
  for (let k = 0; k <= LAST_STEP; k += 1) {
    const { x, y } = footOn(k);
    points.push(`${x + half}% ${y}%`, `${x + half}% ${y + STEP_Y}%`);
  }
  points.push("100% 100%", "0% 100%");
  return `polygon(${points.join(", ")})`;
}
const STAIRS = stairsOutline();

/** Where her foot is `ms` after the start: on the top step, then one step down each CLOTH_FIELD.stepMs (the move in its last 60%). */
function walkerAt(ms: number): { foot: Foot; lift: number } {
  const steps = Math.max(0, (ms - CLOTH_START_MS) / CLOTH_FIELD.stepMs);
  const done = Math.min(Math.floor(steps), CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast);
  if (done >= CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast) return { foot: footOn(done), lift: 0 };
  const move = easeInOut(clamp01((steps - done - 0.4) / 0.6));
  const from = footOn(done);
  const to = footOn(done + 1);
  return { foot: { x: from.x + (to.x - from.x) * move, y: from.y + (to.y - from.y) * move }, lift: Math.sin(Math.PI * move) };
}

/** After an early flap: the pigeon in the niche, startled by the cloth, bursts out this long after it. */
const PIGEON_AFTER_MS = 450;
const PIGEON_FLIGHT_MS = 650;
/** The footsteps sound (four steps at about CLOTH_FIELD.stepMs) rings from her first step and again from her fifth. */
const FOOTSTEPS_AT = [CLOTH_START_MS + CLOTH_FIELD.stepMs * 1 - 60, CLOTH_START_MS + CLOTH_FIELD.stepMs * 5 - 60];
/** The sounds of a play (definition `sounds`). */
const SOUNDS = { steps: "travel_walk", cloth: "cloth_flap", pigeon: "pigeon_flutter" } as const;

/** Her reaction once the play is decided: what her figure does and the mark over her head, from when. */
function reactionOf(outcome: ClothFlapOutcome, tapMs: number | null): { at: number; react: "scream" | "laugh" | "peek"; turned: boolean; then?: { at: number; react: "scream" } } {
  switch (outcome) {
    case "perfect": return { at: (tapMs ?? 0) + 120, react: "scream", turned: false };
    case "early": return { at: (tapMs ?? 0) + 120, react: "laugh", turned: false, then: { at: (tapMs ?? 0) + PIGEON_AFTER_MS + 120, react: "scream" } };
    case "late": return { at: (tapMs ?? 0) + 160, react: "scream", turned: true };
    case "frozen": return { at: CLOTH_END_MS, react: "peek", turned: true };
  }
}

/** The one coming down (drawn when the use gives no picture): a young woman in a kurta, side on, walking to the right. */
function WalkerFigure() {
  return (
    <svg viewBox="0 0 40 104" className="mg-cloth-flap-walker-figure" aria-hidden="true">
      <path d="M17 10 Q 9 24, 12 44" fill="none" stroke="#2a211c" strokeWidth="4" strokeLinecap="round" />
      <path d="M17 66 L 15 98 M25 66 L 29 98" stroke="#e6dac4" strokeWidth="6" strokeLinecap="round" />
      <path d="M12 99 L 18 99 M27 99 L 34 99" stroke="#5a4636" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 22 L 28 22 L 33 68 L 9 68 Z" fill="#3f7f86" />
      <path d="M26 26 Q 32 40, 30 52" fill="none" stroke="#3f7f86" strokeWidth="5" strokeLinecap="round" />
      <circle cx="21" cy="12" r="8" fill="#b98b6b" />
      <path d="M13 11 Q 15 2, 23 3 Q 29 4, 29 9 Q 22 7, 16 13 Z" fill="#2a211c" />
    </svg>
  );
}

/** A grey pigeon, wings up (drawn by the game in every look). */
function Pigeon() {
  return (
    <svg viewBox="0 0 60 40" className="mg-cloth-flap-pigeon-figure" aria-hidden="true">
      <path className="mg-cloth-flap-pigeon-wing" d="M30 22 Q 14 2, 2 6 Q 14 14, 24 26 Z" fill="#9aa0a6" />
      <ellipse cx="32" cy="26" rx="14" ry="8" fill="#7d838a" />
      <circle cx="46" cy="20" r="5.5" fill="#6d737a" />
      <path d="M51 20 L 56 21 L 51 23 Z" fill="#c9a06a" />
      <path className="mg-cloth-flap-pigeon-wing" d="M32 22 Q 44 0, 58 2 Q 46 14, 38 26 Z" fill="#b3b8bd" />
    </svg>
  );
}

function ClothFlapField({ still, art, sound, frames }: CueTapFieldProps<ClothFlapParams, ClothFlapOutcome>) {
  const walker = useRef<HTMLSpanElement>(null);
  const pigeon = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [react, setReact] = useState<"scream" | "laugh" | "peek" | null>(null);
  const [turned, setTurned] = useState(false);
  const play = useRef(sound);
  play.current = sound;
  useEffect(() => {
    let rung = 0;
    let spread = false;
    let flown = false;
    let shown: string | null = null;
    return frames(({ ms, tapMs, outcome }) => {
      // Her footsteps, while nothing has happened yet.
      while (!outcome && rung < FOOTSTEPS_AT.length && ms >= FOOTSTEPS_AT[rung]) {
        rung += 1;
        play.current(SOUNDS.steps);
      }
      if (tapMs !== null && !spread) {
        spread = true;
        setOpen(true);
        play.current(SOUNDS.cloth);
      }
      // She walks until the cloth spreads (she stops where she is), or on down to her last step when it never does.
      const { foot, lift } = walkerAt(tapMs !== null ? Math.min(ms, tapMs) : ms);
      const reaction = outcome ? reactionOf(outcome, tapMs) : null;
      const now = reaction?.then && ms >= reaction.then.at ? reaction.then.react : reaction && ms >= reaction.at ? reaction.react : null;
      if (now !== shown) {
        shown = now;
        setReact(now);
        setTurned(!!reaction?.turned && !!now);
      }
      const element = walker.current;
      if (element) {
        element.style.left = `${foot.x}%`;
        element.style.top = `${foot.y - (still ? 0 : 1.2 * lift)}%`;
      }
      // After an early flap, the real pigeon bursts out of the niche and away over the stairs.
      const bird = pigeon.current;
      if (bird) {
        const pigeonAt = outcome === "early" && tapMs !== null ? tapMs + PIGEON_AFTER_MS : null;
        const t = pigeonAt === null ? -1 : (ms - pigeonAt) / PIGEON_FLIGHT_MS;
        if (pigeonAt !== null && t >= 0 && !flown) {
          flown = true;
          play.current(SOUNDS.pigeon);
        }
        const seen = t >= 0 && t <= 1;
        const at = still ? 0.45 : clamp01(t);
        bird.style.left = `${54 - 40 * at}%`;
        bird.style.top = `${84 - 70 * at}%`;
        // Drawn facing right; it flies up to the left.
        bird.style.transform = `translate(-50%, -50%) scale(${-(1.4 - 0.6 * at)}, ${1.4 - 0.6 * at})`;
        bird.style.opacity = seen ? "1" : "0";
      }
    });
  }, [frames, still]);
  return (
    <div className="mg-cloth-flap" data-art-stairs={art.stairs ? true : undefined} data-still={still || undefined}>
      <span className="mg-cloth-flap-stage">
        {art.stairs && <img className="mg-cloth-flap-backdrop" src={art.stairs} alt="" draggable={false} />}
        <span className="mg-cloth-flap-far-wall"><span /><span /><span /></span>
        <span className="mg-cloth-flap-stairs" style={{ clipPath: STAIRS }} />
        <span className="mg-cloth-flap-mark-step" style={{ left: `${NICHE.x}%`, top: `${NICHE.y}%` }} />
        <span className="mg-cloth-flap-walker" ref={walker} data-react={react ?? undefined}>
          <span className="mg-cloth-flap-walker-body" data-turned={turned || undefined}>
            {art.walker ? <img src={art.walker} alt="" draggable={false} /> : <WalkerFigure />}
          </span>
          {react && <span className="mg-cloth-flap-bubble">{react === "scream" ? "！" : react === "laugh" ? "♪" : "？"}</span>}
        </span>
        <span className="mg-cloth-flap-arch" />
        <span className="mg-cloth-flap-cloth" data-open={open || undefined}><span /></span>
        <span className="mg-cloth-flap-pigeon" ref={pigeon}><Pigeon /></span>
      </span>
    </div>
  );
}

/** The flap as a cue_tap skin: its timing, rules, words and field. */
export const clothFlapSkin: CueTapSkin<ClothFlapParams, ClothFlapOutcome> = {
  tuning: CLOTH_TUNING,
  rules: clothFlapRules,
  hintJa: "針が金色の所に来たら「広げる」",
  actionJa: "広げる",
  actionHintJa: "階段を下りてくる人が、くぼみの前の段に来るのに合わせて押します。",
  autoJa: "おまかせで広げています",
  // Her scream (and, after an early flap, the pigeon first), or her turning back to peer into the niche, before the outcome shows.
  endAt: ({ outcome, tapMs }, still) => {
    const reaction = reactionOf(outcome, tapMs);
    const last = reaction.then?.at ?? reaction.at;
    return last + (still ? 450 : outcome === "early" ? 900 : 750);
  },
  Field: ClothFlapField,
};

/** For the tests: where her foot is on a step, and when it lands on the step in front of the niche. */
export const CLOTH_FIELD_POINTS = { footOn, NICHE, nicheMs: CLOTH_NICHE_MS, walkerAt } as const;
