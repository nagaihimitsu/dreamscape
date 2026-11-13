import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { focusIsLost, focusQuietly } from "../../components/scene-focus";
import { holdTaps } from "../../components/tap-hold";
import { playSe } from "../../audio/sound-effects";
import type { NightAction } from "../../domain/day-end";
import type { GameState } from "../../domain/game";
import { NightSky, reducedMotionNow, useAnnounced, useNightCard } from "./NightRest";
import { NIGHT_REST_BUTTON_JA, NIGHT_RESTED_JA, NIGHT_SCREEN_JA, nightActionLabelJa } from "./night-rest-text";
import { TourBooking, TourCancelDialog } from "./TravelTours";
import { hasNightRecap, nightRecap, todayWord, type NightRecap, type TodayWord } from "./night-recap";
import { NightRecapView, TodayWordLine } from "./NightRecap";
import "./night-rest.css";

/** How long 「ホテルで休みました。」 shows before the night screen has faded to the morning (ms); reduced motion: still. */
const NIGHT_LEAVING_MS = 2000;
const NIGHT_LEAVING_REDUCED_MS = 2000;

/** A button of the night screen: a night action, or the rest. */
export type NightButton = { kind: NightAction | "rest"; label: string };

/** The night screen's buttons now: the night actions open (getDayEnd), in their order, then 「ホテルで休む」. */
export function nightButtons(game: GameState, actions: readonly NightAction[], nextCityNameJa?: string): NightButton[] {
  const pendingAp = game.pendingApRewards.reduce((total, item) => total + item.remainingAp, 0);
  return [...actions.map((kind) => ({ kind, label: nightActionLabelJa(kind, { nextCityNameJa, pendingAp }) })),
    { kind: "rest", label: NIGHT_REST_BUTTON_JA }];
}

/**
 * The night screen (docs/02 「一日の終わり」): free time at 21:00 or later while night actions are open (GameApp, getDayEnd). The
 * whole screen under the header is the night of the day's end card (the night colour, the crescent moon and the stars) with
 * 「夜も更けました。」, a button for each night action open now, then 「ホテルで休む」, and under them today's route and the
 * heroine's line of the night when there are any (NightRecap; 2026-11-11), then 今日の一語 when a word was met today (todayWord;
 * 2026-11-13). Each button opens what its control in free time
 * opens (the tours' sheet and the cancel's dialog here, the epilogue, the departure's dialog, the stored AP); the free-time
 * screen (its photo cards included) is not there meanwhile. The screen is the game's state, not a saved mark: when a flow comes
 * back at 21:00 or later it shows again with what is left. Taps are held as it appears and when its buttons change (the second
 * tap of a double tap presses none of them); a lost focus goes to its first button; its line is announced.
 */
export function NightScreen({ game, buttons, reduceMotion, onAction, onBookTour, onCancelTour }: {
  game: GameState;
  buttons: readonly NightButton[];
  reduceMotion: boolean;
  /** A button other than the tours' (whose sheet and dialog open here): the epilogue, the departure, the AP, the rest. */
  onAction: (kind: Exclude<NightButton["kind"], "book_tour" | "cancel_tour">) => void;
  onBookTour: (tourId: string, offerId: string) => boolean;
  onCancelTour: () => boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [reduced] = useState(() => reducedMotionNow(reduceMotion));
  const announced = useAnnounced();
  const [tours, setTours] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const shown = buttons.map((button) => button.kind).join(" ");
  const recap = useMemo(() => nightRecap(game), [game]);
  const word = useMemo(() => todayWord(game), [game]);
  useEffect(() => {
    // The screen appeared, or its buttons changed, under the finger.
    holdTaps();
    const screen = root.current;
    // A focus another screen part holds (the header's, a dialog's) stays; a lost one (on nothing, the page or <main>) comes here.
    if (!screen || document.querySelector("dialog[open]") || !(focusIsLost(screen) || document.activeElement === screen.closest("main"))) return;
    const first = screen.querySelector<HTMLElement>(".night-screen-actions button");
    if (first) focusQuietly(first);
  }, [shown]);
  function press(kind: NightButton["kind"]) {
    if (kind === "book_tour") setTours(true);
    else if (kind === "cancel_tour") setCancelling(true);
    else onAction(kind);
  }
  return <NightLayout rootRef={root} line={NIGHT_SCREEN_JA} recap={recap} word={word} buttons={buttons} reduced={reduced} announced={announced} onPress={press}>
    {tours && <TourBooking game={game} onBook={onBookTour} onClose={() => setTours(false)} />}
    {cancelling && <TourCancelDialog game={game} onCancel={onCancelTour} onClose={() => setCancelling(false)} />}
  </NightLayout>;
}

/**
 * The night screen after its 「ホテルで休む」 has slept (useTravelEffects): the same screen, its line changed in place to
 * 「ホテルで休みました。」 and its buttons gone from sight (their room kept, so nothing moves; its route and line are the night's,
 * given by useTravelEffects), over the next morning, until it has
 * faded to it (2 s; a tap or Enter, Space or Esc ends it at once). With reduced motion it does not fade: the line shows plainly
 * until a tap or 2 s. Inside the app shell (not a portal), so it lies under the header as the night screen does.
 */
export function NightLeaving({ buttons, recap, word = null, reduceMotion, onEnd }: {
  buttons: readonly NightButton[];
  recap?: NightRecap;
  /** The night's 今日の一語 (the night before the rest), so it stays in place as the screen fades. */
  word?: TodayWord | null;
  reduceMotion: boolean;
  onEnd: () => void;
}) {
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: NIGHT_LEAVING_MS, reducedMs: NIGHT_LEAVING_REDUCED_MS, onEnd });
  // The night's rest from this screen: the same sound as the card of a rest the game took by itself (NightRest).
  useEffect(() => playSe("night_rest"), []);
  return <NightLayout line={NIGHT_RESTED_JA} recap={recap} word={word} buttons={buttons} reduced={reduced} announced={announced} leaving onClick={end} />;
}

/** The night screen's layout, shared by the screen and its leaving so that its moon and line stay in place. */
function NightLayout({ rootRef, line, recap, word = null, buttons, reduced, announced, leaving = false, onPress, onClick, children }: {
  rootRef?: RefObject<HTMLElement | null>;
  line: string;
  recap?: NightRecap;
  word?: TodayWord | null;
  buttons: readonly NightButton[];
  reduced: boolean;
  announced: boolean;
  leaving?: boolean;
  onPress?: (kind: NightButton["kind"]) => void;
  onClick?: () => void;
  children?: ReactNode;
}) {
  // Leaving: a scene under it (the hotel's after waking, a tour's morning) waits for it (dialogueObstructed), as under the card.
  return <section ref={rootRef} className={`night-screen${leaving ? " is-leaving" : ""}${reduced ? " is-reduced" : ""}`}
    data-testid={leaving ? "night-leaving" : "night-screen"} data-obstructs-dialogue={leaving ? "" : undefined} onClick={onClick}>
    <div className={`night-screen-content${hasNightRecap(recap) ? " has-recap" : ""}`}>
      <NightSky />
      <h1 className="night-screen-line" tabIndex={-1}>{line}</h1>
      <div className="night-screen-actions">
        {buttons.map((button) => <button key={button.kind} type="button" data-testid={`night-action-${button.kind}`}
          className={button.kind === "rest" ? "night-screen-rest" : "secondary"} onClick={() => onPress?.(button.kind)}>{button.label}</button>)}
      </div>
      {/* Under the buttons, so the night's actions stay in view on a short phone (the screen scrolls to the rest). */}
      {hasNightRecap(recap) && <NightRecapView recap={recap} />}
      {/* Last, a small plain line in the reading order (2026-11-13): nothing announces it and it never sits over a button. */}
      {word && <TodayWordLine word={word} />}
    </div>
    <p className="sr-only" role="status">{announced ? line : ""}</p>
    {children}
  </section>;
}
