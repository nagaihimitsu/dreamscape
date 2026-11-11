// B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」), its rules as pure functions: the row of cards (「待機」, each place
// with all its events, then the tour and 「ホテルに戻る」) and the card chosen first, the selection each card stands for,
// the event and way a swipe up takes, the fill and the tag that say what a place holds, how a card is read out, how the
// arrow keys and a flick move the choice, how big each card of the row is, when a swipe up departs, and when the cards
// stand in a vertical list. The game's rules stay where they are: these only arrange what getTravelDestinations and
// destinationChoicesOf say.
import type { DestinationChoices, EventChoice, RouteChoice, TravelDestinationEvent, TravelDestinationPlace } from "../../domain/travel-destinations";
import type { TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { announcement, sameTarget, type SelectionTarget, type TargetChoices } from "./travel-selection";

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

/** The live regions' words when the tour's card or 「待機」's is chosen. */
export const TOUR_CHOSEN_JA = "ツアーを選びました。予約の案内を出しています。";
export const WAIT_CHOSEN_JA = "「待機」を選びました。待ち方を出しています。";

/**
 * The live regions' words for a selection: a place says where its way is (its card's button, never a second press),
 * 「ホテルに戻る」 where its ways home are; the current place and a place that cannot be visited now read as
 * before (travel-selection.ts).
 */
export function photoCardAnnouncement(target: TargetChoices, name: string, openEventId: string | null = null): string {
  if (target.kind === "sleep") return "「ホテルに戻る」を選びました。帰り方を出しています。";
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

/** A released swipe up departs once the card went up this share of its height … */
export const SWIPE_DEPART_SHARE = 1 / 3;
/** … or on a flick up: at least this fast (px per ms) over its last moment (FLICK_WINDOW_MS), and this far. */
export const FLICK_SPEED = 0.5;
export const FLICK_MIN_PX = 24;
export const FLICK_WINDOW_MS = 80;

/** A pointer's height on the screen at a moment (ms). */
export type SwipeSample = { t: number; y: number };

/** The speed (px per ms, negative upwards) over the last FLICK_WINDOW_MS of the samples (the last is the release); 0 for one. */
export function flickSpeed(samples: readonly SwipeSample[]): number {
  const last = samples[samples.length - 1];
  if (!last) return 0;
  const first = samples.find((sample) => last.t - sample.t <= FLICK_WINDOW_MS) ?? last;
  return last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
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
