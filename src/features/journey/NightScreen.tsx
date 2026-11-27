import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { focusIsLost, focusQuietly } from "../../components/scene-focus";
import { holdTaps } from "../../components/tap-hold";
import { playSe } from "../../audio/sound-effects";
import type { NightAction } from "../../domain/day-end";
import type { GameState } from "../../domain/game";
import { NIGHT_TAP_HINT_JA, NightBackdrop, NightSky, reducedMotionNow, useAnnounced, useNightCard } from "./NightRest";
import { NIGHT_REST_BUTTON_JA, NIGHT_RESTED_JA, NIGHT_SCREEN_JA, nightActionLabelJa } from "./night-rest-text";
import { TourBooking, TourCancelDialog } from "./TravelTours";
import { hasNightRecap, nightRecap, todayWord, type NightRecap, type TodayWord } from "./night-recap";
import { NightRecapView, TodayWordLine } from "./NightRecap";
import { SnsNightCardView } from "./SnsNightCard";
import type { SnsNightCard } from "./sns";
import "./night-rest.css";

/** A button of the night screen: a night action, or the rest. */
export type NightButton = { kind: NightAction | "rest"; label: string };

/** The night screen's buttons now: the night actions open (getDayEnd), in their order, then 「ホテルで休む」. */
export function nightButtons(game: GameState, actions: readonly NightAction[], nextCityNameJa?: string): NightButton[] {
  const pendingAp = game.pendingApRewards.reduce((total, item) => total + item.remainingAp, 0);
  return [...actions.map((kind) => ({ kind, label: nightActionLabelJa(kind, { nextCityNameJa, pendingAp }) })),
    { kind: "rest", label: NIGHT_REST_BUTTON_JA }];
}

/**
 * The night screen (docs/02 「一日の終わり」): free time at 21:00 or later while night actions are open, or something came on the
 * SNS tonight (GameApp, getDayEnd; 2026-11-27). The whole screen under the header is the night of the day's end card (the night
 * colour, the crescent moon and the stars) with 「夜も更けました。」, a button for each night action open now, then 「ホテルで
 * 休む」; apart under them (2026-11-27 user decision: made again for the SNS, no headlines) the SNS's card when something came
 * tonight (`sns`: its faces, words and first comment; it opens 旅の記録's 「SNS」 at that post), the heroine's line of the night
 * and today's route when there are any (NightRecap; 2026-11-11), then 今日の一語 when a word was met today (todayWord;
 * 2026-11-13). Each button opens what its control in free time
 * opens (the tours' sheet and the cancel's dialog here, the epilogue, the departure's dialog, the stored AP); the free-time
 * screen (its photo cards included) is not there meanwhile. The screen is the game's state, not a saved mark: when a flow comes
 * back at 21:00 or later it shows again with what is left. Taps are held as it appears and when its buttons change (the second
 * tap of a double tap presses none of them); a lost focus goes to its first button (its ring only once a key has been pressed:
 * focusQuietly, so after a load it does not look chosen); its line is announced.
 */
export function NightScreen({ game, buttons, sns = null, reduceMotion, onAction, onOpenSns, onBookTour, onCancelTour }: {
  game: GameState;
  buttons: readonly NightButton[];
  /** What came on the SNS tonight (snsNightCard), none for a quiet night. */
  sns?: SnsNightCard | null;
  reduceMotion: boolean;
  /** The SNS's card: 旅の記録's 「SNS」 at the post. */
  onOpenSns?: (postId: string) => void;
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
  return <NightLayout rootRef={root} cityId={game.currentCityId} line={NIGHT_SCREEN_JA} recap={recap} word={word} sns={sns} onOpenSns={onOpenSns}
    buttons={buttons} reduced={reduced} announced={announced} onPress={press}>
    {tours && <TourBooking game={game} onBook={onBookTour} onClose={() => setTours(false)} />}
    {cancelling && <TourCancelDialog game={game} onCancel={onCancelTour} onClose={() => setCancelling(false)} />}
  </NightLayout>;
}

/**
 * The night screen after its 「ホテルで休む」 has slept (useTravelEffects): the same screen, its line changed in place to
 * 「ホテルで休みました。」 and its buttons gone from sight (their room kept, so nothing moves; its route and line are the night's,
 * given by useTravelEffects), over the next morning, until it has
 * faded to it (2 s; a tap or Enter, Space or Esc ends it at once). With reduced motion it does not fade: the line shows plainly
 * until a tap or 1.4 s. Inside the app shell (not a portal), so it lies under the header as the night screen does.
 */
export function NightLeaving({ cityId, buttons, recap, word = null, sns = null, reduceMotion, onEnd }: {
  /** The city the night falls on (its backdrop behind the screen). */
  cityId?: string;
  buttons: readonly NightButton[];
  recap?: NightRecap;
  /** The night's SNS card as the screen showed it (it stays in place, no longer a button). */
  sns?: SnsNightCard | null;
  /** The night's 今日の一語 (the night before the rest), so it stays in place as the screen fades. */
  word?: TodayWord | null;
  reduceMotion: boolean;
  onEnd: () => void;
}) {
  // 「ホテルで休みました。」 stays until a tap anywhere or Enter, Space or Esc (2026-11-15 user decision: it used to fade by itself
  // after 2 s while the player was still reading today's route).
  const { reduced, announced, end } = useNightCard({ reduceMotion, ms: null, reducedMs: null, onEnd });
  // The night's rest from this screen: the same sound as the card of a rest the game took by itself (NightRest).
  useEffect(() => playSe("night_rest"), []);
  return <NightLayout cityId={cityId} line={NIGHT_RESTED_JA} recap={recap} word={word} sns={sns} buttons={buttons} reduced={reduced} announced={announced} leaving onClick={end} />;
}

/** The night screen's layout, shared by the screen and its leaving so that its moon and line stay in place. */
function NightLayout({ rootRef, cityId, line, recap, word = null, sns = null, onOpenSns, buttons, reduced, announced, leaving = false, onPress, onClick, children }: {
  rootRef?: RefObject<HTMLElement | null>;
  cityId?: string;
  line: string;
  recap?: NightRecap;
  word?: TodayWord | null;
  sns?: SnsNightCard | null;
  onOpenSns?: (postId: string) => void;
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
    <NightBackdrop cityId={cityId} />
    <div className={`night-screen-content${hasNightRecap(recap) || sns ? " has-recap" : ""}`}>
      <NightSky />
      <h1 className="night-screen-line" tabIndex={-1}>{line}</h1>
      <div className="night-screen-actions">
        {buttons.map((button) => <button key={button.kind} type="button" data-testid={`night-action-${button.kind}`}
          className={button.kind === "rest" ? "night-screen-rest" : "secondary"} onClick={() => onPress?.(button.kind)}>{button.label}</button>)}
        {/* Where the buttons were (their room stays): how the leaving ends. */}
        {leaving && <p className="night-tap-hint" aria-hidden="true">{NIGHT_TAP_HINT_JA}</p>}
      </div>
      {/* Under the buttons, so the night's actions stay in view on a short phone (the screen scrolls to the rest), and apart
          from them (a wider gap, a card of another shape), so a tap meant for a button does not open the SNS. */}
      {sns && <SnsNightCardView card={sns} onOpen={leaving ? undefined : onOpenSns} />}
      {hasNightRecap(recap) && <NightRecapView recap={recap} />}
      {/* Last, a small plain line in the reading order (2026-11-13): nothing announces it and it never sits over a button. */}
      {word && <TodayWordLine word={word} />}
    </div>
    <p className="sr-only" role="status">{announced ? (leaving ? `${line}${NIGHT_TAP_HINT_JA}。` : line) : ""}</p>
    {children}
  </section>;
}
