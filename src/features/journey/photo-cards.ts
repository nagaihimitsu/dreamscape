// B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」), its rules as pure functions: the row of cards (「待機」, each place
// with all its events, then the tour and 「ホテルに戻る」) and the card chosen first, the selection each card stands for,
// the event and way a swipe up takes (and 「待機」's wait, 「ホテルに戻る」's way home), the fill and the tag that say what a
// place holds, how a card is read out, how the arrow keys and a flick move the choice, how big each card of the row is,
// where a drag of the screen starts and which way it goes, when a swipe up departs, and when the cards stand in a
// vertical list. The game's rules stay where they are: these only arrange what getTravelDestinations,
// destinationChoicesOf, getTravelWaitOptions and getTravelSleepChoices say.
import { DAY_END, NIGHT_START } from "../../domain/travel";
import type {
  DestinationChoices, EventChoice, RouteChoice, SleepOption, TravelDestinationEvent, TravelDestinationPlace, TravelWaitOption,
} from "../../domain/travel-destinations";
import type { TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { announcement, sameTarget, type SelectionTarget, type TargetChoices } from "./travel-selection";
import { formatTravelTime } from "./travel-time";

/** A place's card: the destination with every event there (sightseeing and dates alike). */
export type PhotoCardEntry = {
  place: TravelDestinationPlace;
  /** The place's events (data order), each with its routes from the current place. */
  events: EventChoice[];
  /** Whether one of them can be done now. */
  available: boolean;
};

/** A place's card, or null when nothing is shown there. */
function photoCardEntry(place: TravelDestinationPlace, choices: DestinationChoices): PhotoCardEntry | null {
  const { events } = choices;
  return events.length ? { place, events, available: events.some((choice) => choice.available) } : null;
}

/**
 * The places' cards in today's order (`places`: the destinations' nearby then other lists, nearest first with the
 * recommended sightseeing in slot 5), those with nothing to do now last.
 */
export function photoCardEntries(places: readonly TravelDestinationPlace[], choices: ReadonlyMap<string, DestinationChoices>): PhotoCardEntry[] {
  const entries = places.flatMap((place) => {
    const placeChoices = choices.get(place.id);
    const entry = placeChoices && photoCardEntry(place, placeChoices);
    return entry ? [entry] : [];
  });
  return [...entries.filter((entry) => entry.available), ...entries.filter((entry) => !entry.available)];
}

/** The ids of 「待機」's card, the tour's and 「ホテルに戻る」's (no place id starts with a colon). */
export const WAIT_CARD_ID = ":wait";
export const TOUR_CARD_ID = ":tour";
export const STAY_CARD_ID = ":stay";

/** A card of the row: 「待機」 (the waits), a place, the city's tour (booking, cancelling) or 「ホテルに戻る」 (休む). */
export type RowCard =
  | { kind: "wait"; id: typeof WAIT_CARD_ID }
  | { kind: "place"; id: string; entry: PhotoCardEntry }
  | { kind: "tour"; id: typeof TOUR_CARD_ID }
  | { kind: "stay"; id: typeof STAY_CARD_ID };

/**
 * The row: 「待機」 at the left end (always), the places' cards, then the tour while one is offered or booked here, then
 * 「ホテルに戻る」 at the right end (always).
 */
export function rowCards(entries: readonly PhotoCardEntry[], { tour }: { tour: boolean }): RowCard[] {
  const places = entries.map((entry): RowCard => ({ kind: "place", id: entry.place.id, entry }));
  return [{ kind: "wait", id: WAIT_CARD_ID }, ...places, ...(tour ? [{ kind: "tour", id: TOUR_CARD_ID } as const] : []), { kind: "stay", id: STAY_CARD_ID }];
}

/** The card chosen when the screen opens (and when the chosen card leaves the row): the first place's, else the first. */
export function defaultCardIndex(cards: readonly RowCard[]): number {
  return Math.max(0, cards.findIndex((card) => card.kind === "place"));
}

/**
 * Whether a card takes a swipe up (and, in the row, Enter on it): a place's departs (or starts there), 「待機」's waits
 * and 「ホテルに戻る」's rests (user decision 2026-11-11), each by what its card under the row has chosen; the tour's never.
 */
export function takesSwipe(card: RowCard): boolean {
  return card.kind !== "tour";
}

/** The selection a card stands for: its place, the hotel's 休む (「ホテルに戻る」), or none (「待機」, the tour). */
export function cardTarget(card: RowCard): SelectionTarget | null {
  return card.kind === "place" ? { kind: "place", placeId: card.id } : card.kind === "stay" ? { kind: "sleep" } : null;
}

/** The card of the row that stands for a selection, or null when none does (no selection, the current place's marker). */
export function cardOfTarget(cards: readonly RowCard[], target: SelectionTarget | null): RowCard | null {
  if (!target) return null;
  return cards.find((card) => {
    const own = cardTarget(card);
    return !!own && sameTarget(own, target);
  }) ?? null;
}

/**
 * What keeps the chosen card the selection: null while they agree; else `turn` the row to the card the selection
 * stands for (the expanded map chose it), or `select` the chosen card's target (none for the tour).
 */
export function syncRow(cards: readonly RowCard[], chosen: RowCard, target: SelectionTarget | null): { turn: string } | { select: SelectionTarget | null } | null {
  const wanted = cardTarget(chosen);
  if (wanted ? !!target && sameTarget(wanted, target) : !target) return null;
  const shown = cardOfTarget(cards, target);
  return shown ? { turn: shown.id } : { select: wanted };
}

/**
 * The way a card's 「行く」 takes: the mode the player picked while it can be taken, else the fastest way that can be
 * taken now (then the cheaper; data order on a tie); null when none can.
 */
export function chooseWay(routes: readonly RouteChoice[], picked: TravelMode | null): RouteChoice | null {
  const open = routes.filter((choice) => choice.available);
  return open.find((choice) => choice.route.mode === picked) ?? [...open].sort((a, b) => compareRouteTime(a.route, b.route))[0] ?? null;
}

/** What a place's card departs with: the event the player picked (a place with several) and the mode, null when not picked. */
export type DeparturePlan = { eventId: string | null; mode: TravelMode | null };
export const NO_PLAN: DeparturePlan = { eventId: null, mode: null };

/**
 * The event a place's card departs for: the one the player picked while it is still there, else the first that can be
 * done now, else the first.
 */
export function chosenEvent(entry: PhotoCardEntry, eventId: string | null): EventChoice {
  return entry.events.find((choice) => choice.event.id === eventId) ?? entry.events.find((choice) => choice.available) ?? entry.events[0];
}

/** What a swipe up on a place's card (or its 「行く」) takes: the chosen event and its way (chooseWay), null when none can be taken. */
export function departureOf(entry: PhotoCardEntry, plan: DeparturePlan): { event: EventChoice; way: RouteChoice | null } {
  const event = chosenEvent(entry, plan.eventId);
  return { event, way: chooseWay(event.routes, plan.mode) };
}

/** A wait of 「待機」's card, as a key: `minutes` for 「30分待つ」, else the time it waits until. */
export function waitKey(option: Pick<TravelWaitOption, "until">): string {
  return option.until === null ? "minutes" : String(option.until);
}

/**
 * The wait a swipe up on 「待機」 (or its 「待つ」) takes: the one the player picked while it can be waited, else the first
 * that can (「30分待つ」 comes first: the card chosen afresh starts there), null when none can.
 */
export function chooseWait<T extends TravelWaitOption>(options: readonly T[], picked: string | null): T | null {
  const open = options.filter((option) => option.available);
  return open.find((option) => waitKey(option) === picked) ?? open[0] ?? null;
}

/** A wait in words: 「30分待つ」, 「夜(18:00)まで待つ」 until the night starts (NIGHT_START), else 「15:00まで待つ」. */
export function waitLabelJa(option: Pick<TravelWaitOption, "minutes" | "until">): string {
  if (option.until === null) return `${option.minutes}分待つ`;
  return `${option.until === NIGHT_START ? `夜(${formatTravelTime(NIGHT_START)})` : formatTravelTime(option.until)}まで待つ`;
}

/** Why a wait cannot be chosen (the line under 「待機」's waits), and the live regions' words when none can be waited. */
export const WAIT_BLOCKED_JA = `${formatTravelTime(DAY_END)}までにホテルへ帰れなくなる待ち方は選べません。`;
export const WAIT_REFUSAL_JA = `待てません。${formatTravelTime(DAY_END)}までにホテルへ帰れなくなります。`;

/** A way home of 「ホテルに戻る」's card, as a key: its mode and the place where it changes to walking (none: direct). */
export function sleepWayKey(route: { mode: string; viaPlaceId?: string }): string {
  return JSON.stringify([route.mode, route.viaPlaceId ?? null]);
}

/**
 * The way home a swipe up on 「ホテルに戻る」 (or its 「休む」) takes: the one the player picked while it can be taken, else
 * the first that can (the ways come fastest first: the card chosen afresh starts there), null when none can.
 */
export function chooseSleepWay<T extends Pick<SleepOption, "route" | "plan">>(options: readonly T[], picked: string | null): T | null {
  const open = options.filter((option) => option.plan.ok);
  return open.find((option) => sleepWayKey(option.route) === picked) ?? open[0] ?? null;
}

/**
 * A way home in words: at the hotel 「ホテルに戻って休む」 (user decision 2026-11-11), else 「{mode}で帰る」 and, when it
 * changes to walking at a place, 「・{place}から徒歩」 (`mode` and `via` already in words).
 */
export function sleepWayLabelJa({ atHotel, mode, via }: { atHotel: boolean; mode: string; via?: string }): string {
  return atHotel ? "ホテルに戻って休む" : `${mode}で帰る${via ? `・${via}から徒歩` : ""}`;
}

/** Why a way home cannot be taken ("" when it can). */
export function sleepReasonJa(plan: SleepOption["plan"]): string {
  if (plan.ok) return "";
  return plan.reason === "budget" ? "この移動手段の予算が足りません。" : "この経路では帰れません。";
}

/** The ways home that cannot be taken, one line per reason with the ways it holds back (in their order). */
export function blockedSleepWays<T extends Pick<SleepOption, "route" | "plan">>(options: readonly T[]): { options: T[]; reason: string }[] {
  const lines = new Map<string, T[]>();
  for (const option of options) {
    if (option.plan.ok) continue;
    const reason = sleepReasonJa(option.plan);
    lines.set(reason, [...(lines.get(reason) ?? []), option]);
  }
  return [...lines].map(([reason, held]) => ({ options: held, reason }));
}

/** The live regions' words when a swipe up on 「ホテルに戻る」 cannot rest: the reasons, each once (none: no way home). */
export function sleepRefusalJa(options: readonly Pick<SleepOption, "route" | "plan">[]): string {
  const reasons = blockedSleepWays(options).map((line) => line.reason);
  return `休めません。${reasons.length ? reasons.join("") : "ホテルへの経路は確認されていません。"}`;
}

/** The live regions' words when a swipe up cannot depart: the chosen event's reasons, each once. */
export function refusalJa(event: EventChoice): string {
  const reasons = blockedWays(event.routes).map((line) => line.reason).filter((reason) => reason);
  return `出発できません。${(reasons.length ? reasons : [event.reason ?? "今は行けません。"]).join("")}`;
}

/** The ways that cannot be taken, one line per reason with the modes it holds back (data order). */
export function blockedWays(routes: readonly RouteChoice[]): { modes: TravelMode[]; reason: string }[] {
  const lines = new Map<string, TravelMode[]>();
  for (const choice of routes) if (!choice.available) lines.set(choice.reason ?? "", [...(lines.get(choice.reason ?? "") ?? []), choice.route.mode]);
  return [...lines].map(([reason, modes]) => ({ modes, reason }));
}

/** What a card's fill says at a glance (no words: the selected place's card under the row keeps its tags). */
export type CardKinds = "story" | "date" | "both" | "none";

/** The kinds of events a card stands for: a place's own (a date, else the story), none for 「待機」, the tour and 「ホテルに戻る」. */
export function cardKinds(card: RowCard): CardKinds {
  if (card.kind !== "place") return "none";
  const date = card.entry.events.some((choice) => choice.event.category === "date");
  const story = card.entry.events.some((choice) => choice.event.category !== "date");
  return story && date ? "both" : story ? "story" : date ? "date" : "none";
}

/** The tag of an event in the selected place's card, in words: 「ストーリー」 (sightseeing, the main story) or 「デート」. */
export function eventKindJa(category: TravelDestinationEvent["category"]): string {
  return category === "date" ? "デート" : "ストーリー";
}

/** What a screen reader reads for a card: 「13件中2件目、ガッレリア」, then its marks (おすすめ, 訪問済み, 今は行けない …). */
export function photoCardLabel({ position, count, name, marks = [] }: {
  position: number;
  count: number;
  name: string;
  marks?: readonly string[];
}): string {
  return [`${count}件中${position}件目`, name, ...marks].join("、");
}

/** The live regions' words when the tour's card is chosen. */
export const TOUR_CHOSEN_JA = "ツアーを選びました。予約の案内を出しています。";

/** The live regions' words when 「待機」's card is chosen: the wait its swipe up (and 「待つ」) takes (`wait`, in words), or none. */
export function waitChosenJa(wait: string | null): string {
  return wait ? `「待機」を選びました。待ち方を出しています（「${wait}」を選んでいます）。` : "「待機」を選びました。今は待てません。";
}

/**
 * The live regions' words for a selection: a place says where its way is (its card's button, never a second press),
 * 「ホテルに戻る」 where its ways home are and the one its swipe up (and 「休む」) takes (`sleepWay`, in words; null: none
 * can be taken); the current place and a place that cannot be visited now read as before (travel-selection.ts).
 */
export function photoCardAnnouncement(target: TargetChoices, name: string, openEventId: string | null = null, sleepWay: string | null = null): string {
  if (target.kind === "sleep")
    return sleepWay ? `「ホテルに戻る」を選びました。帰り方を出しています（「${sleepWay}」を選んでいます）。` : "「ホテルに戻る」を選びました。今は休めません。";
  if (!target.choices || !target.choices.available) return announcement(target, name, openEventId);
  return `${name}を選びました。紹介と行き方を出しています。`;
}

/** The card a key moves the choice to (← the previous, → the next, and ↑↓ in the list; Home, End), or null for any other key. */
export function stepIndex(index: number, count: number, key: string): number | null {
  if (count < 1) return null;
  switch (key) {
    case "ArrowLeft": case "ArrowUp": return Math.max(0, index - 1);
    case "ArrowRight": case "ArrowDown": return Math.min(count - 1, index + 1);
    case "Home": return 0;
    case "End": return count - 1;
    default: return null;
  }
}

/** The card whose centre is nearest the row's centre (`centres` and `centre` in the row's scroll coordinates). */
export function nearestIndex(centres: readonly number[], centre: number): number | null {
  let best: number | null = null;
  for (let index = 0; index < centres.length; index++)
    if (best === null || Math.abs(centres[index] - centre) < Math.abs(centres[best] - centre)) best = index;
  return best;
}

/**
 * Each card's scale in the row (`centres` and `centre` as nearestIndex, `step` from one card's centre to the next): 1
 * for the card in the centre, `small` for its neighbours and those beyond, and in between in step with the scroll, so
 * the card coming to the centre grows as it comes. With reduced motion only the nearest card is whole size, at once.
 */
export function cardScales(centres: readonly number[], centre: number, step: number, small: number, reduced: boolean): number[] {
  const nearest = nearestIndex(centres, centre);
  return centres.map((at, index) => {
    if (reduced || step <= 0) return index === nearest ? 1 : small;
    return 1 - (1 - small) * Math.min(1, Math.abs(at - centre) / step);
  });
}

/** How far a finger moves before a press counts as a drag (px): a press that moves less is a tap on what it started on. */
export const DRAG_SLOP_PX = 10;
/** A lifted card's drag this far sideways, and more sideways than up, is no swipe up any more: the card comes back. */
export const SIDEWAYS_PX = 32;

/** The way a drag goes, decided by its first movement past DRAG_SLOP_PX. */
export type DragDirection = "sideways" | "up" | "down";

/** The way a drag of `dx`, `dy` px goes (`dy` positive downwards; as far across as up or down is sideways), null within the slop. */
export function dragDirection(dx: number, dy: number): DragDirection | null {
  if (Math.hypot(dx, dy) < DRAG_SLOP_PX) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return "sideways";
  return dy < 0 ? "up" : "down";
}

/** Whether a lifted card's drag (`dx`, `dy` from its start) has turned sideways: it comes back. */
export function liftTurnedSideways(dx: number, dy: number): boolean {
  return Math.abs(dx) >= SIDEWAYS_PX && Math.abs(dx) > -dy;
}

/** Where a drag of the free-time screen starts (the row arrangement): on the row of cards, or elsewhere on the screen. */
export type SwipeArea = "row" | "screen";

/**
 * The area a press starts a drag in: the row, else the rest of the screen, or none (null) where `excluded` (the header
 * and its menus, a dialog, a text field) and, while the page is pinch-zoomed in, off the row (the page pans there).
 */
export function swipeArea({ onRow, excluded, zoomed }: { onRow: boolean; excluded: boolean; zoomed: boolean }): SwipeArea | null {
  if (excluded) return null;
  if (onRow) return "row";
  return zoomed ? null : "screen";
}

/**
 * Whether a drag up lifts the chosen card: from the row, always; from elsewhere on the screen only once the page has
 * nothing left below (`atEnd`: until then a drag up scrolls the page, so reading never loses its scroll) and at least
 * half the card is on the screen (`cardShown`: the card that flies is seen).
 */
export function liftsCard({ area, atEnd, cardShown }: { area: SwipeArea; atEnd: boolean; cardShown: boolean }): boolean {
  return area === "row" || (atEnd && cardShown);
}

/** Whether the page is scrolled to its end or fits the screen (px: its scroll position, the visible height, its whole height). */
export function pageAtEnd({ top, viewport, height }: { top: number; viewport: number; height: number }): boolean {
  return top + viewport >= height - 2;
}

/** Whether at least half of a card (its `top` and `bottom` on the screen, px) is within a screen `viewport` px tall. */
export function halfShown({ top, bottom, viewport }: { top: number; bottom: number; viewport: number }): boolean {
  const height = bottom - top;
  return height > 0 && Math.min(bottom, viewport) - Math.max(top, 0) >= height / 2;
}

/** A released swipe up departs once the card went up this share of its height … */
export const SWIPE_DEPART_SHARE = 1 / 3;
/** … or on a flick up: at least this fast (px per ms) over its last moment (FLICK_WINDOW_MS), and this far. */
export const FLICK_SPEED = 0.5;
export const FLICK_MIN_PX = 24;
export const FLICK_WINDOW_MS = 80;

/** A pointer's place on the screen (px) at a moment (ms). */
export type SwipeSample = { t: number; x: number; y: number };

/**
 * The speed along `axis` (px per ms, negative upwards or leftwards) over the last FLICK_WINDOW_MS of the samples (the
 * last is the release); 0 for one.
 */
export function flickSpeed(samples: readonly SwipeSample[], axis: "x" | "y"): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find((sample) => last.t - sample.t <= FLICK_WINDOW_MS) ?? last;
  return last.t > first.t ? (last[axis] - first[axis]) / (last.t - first.t) : 0;
}

/** How far a sideways drag of the screen glides on once let go: its release speed for this long (ms). */
export const GLIDE_MS = 200;

/**
 * The card a sideways drag of the screen leaves in the row's centre (`centres` and `centre` as nearestIndex; `speed` the
 * row's scroll speed at the release, px per ms, positive towards the row's end): the one nearest where the row glides
 * to (GLIDE_MS on). A flick (FLICK_SPEED or faster) goes on at least to the next card its way, as the row's own snap
 * does after a flick; at either end of the row it stays on the end card.
 */
export function glideIndex(centres: readonly number[], centre: number, speed: number): number | null {
  const landing = centre + speed * GLIDE_MS;
  if (Math.abs(speed) >= FLICK_SPEED) {
    let best: number | null = null;
    for (let index = 0; index < centres.length; index++) {
      const ahead = (centres[index] - centre) * Math.sign(speed) > 1;
      if (ahead && (best === null || Math.abs(centres[index] - landing) < Math.abs(centres[best] - landing))) best = index;
    }
    if (best !== null) return best;
  }
  return nearestIndex(centres, landing);
}

/** Whether a released swipe departs: `lift` (px, negative upwards) of a card `height` px tall, at `speed` (flickSpeed). */
export function swipeDeparts({ lift, height, speed }: { lift: number; height: number; speed: number }): boolean {
  const up = -lift;
  if (up <= 0) return false;
  return up >= height * SWIPE_DEPART_SHARE || (up >= FLICK_MIN_PX && -speed >= FLICK_SPEED);
}

/** How the cards stand: a horizontal row (a flick chooses) or a vertical list (the card opens under the chosen row). */
export type CardArrangement = "row" | "list";

/** The row is used while one card takes at most this share of the visible height below the header. */
export const ROW_HEIGHT_SHARE = 0.45;

/**
 * Row or list. Phones held sideways list; otherwise the row while a reference card (the middle card with a two-line
 * name and its swipe hint, so larger text counts) fits ROW_HEIGHT_SHARE of the visible height (100svh) below the
 * header: short screens and large text list (there a swipe up would scroll the list, so the list keeps its 「行く」),
 * so the card and its ways stay within reach. Unmeasured: the row.
 */
export function chooseArrangement({ viewport, hud, card, sideways }: {
  viewport: number;
  hud: number;
  card: number;
  sideways: boolean;
}): CardArrangement {
  if (sideways) return "list";
  if (viewport <= 0 || card <= 0) return "row";
  return card <= (viewport - hud) * ROW_HEIGHT_SHARE ? "row" : "list";
}
