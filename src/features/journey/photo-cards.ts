// B案「写真札で旅先を選ぶ」 (docs/02 「自由時間の画面」), its rules as pure functions: which places are photo cards
// (the sightseeing row, the date sheet), the way a card's button takes, which icons the bottom band shows, how a
// card is read out, how the arrow keys and a flick move the selection, and when the cards stand in a vertical list.
// The game's rules stay where they are: these only arrange what getTravelDestinations and destinationChoicesOf say.
import type { DestinationChoices, EventChoice, RouteChoice, TravelDestinationPlace } from "../../domain/travel-destinations";
import type { TravelMode } from "../../domain/travel-game";
import { compareRouteTime } from "../../domain/travel-routes";
import { announcement, type TargetChoices } from "./travel-selection";

/** Which photo cards: the sightseeing row (観光) or the date sheet (デート). */
export type CardKind = "main" | "date";

/** A photo card: a destination with its events of one kind. */
export type PhotoCardEntry = {
  place: TravelDestinationPlace;
  /** The place's events of the card's kind (data order), each with its routes from the current place. */
  events: EventChoice[];
  /** Whether one of them can be done now. */
  available: boolean;
  /** Why none can, when none can (the first event's reason). */
  reason?: string;
};

/** A place's card of one kind (`any`: every event, the expanded map's 「選んだ行き先」), or null with no event of that kind. */
export function photoCardEntry(place: TravelDestinationPlace, choices: DestinationChoices, kind: CardKind | "any"): PhotoCardEntry | null {
  const events = choices.events.filter((choice) => kind === "any" || choice.event.category === kind);
  if (!events.length) return null;
  return events.some((choice) => choice.available) ? { place, events, available: true } : { place, events, available: false, reason: events[0].reason };
}

/**
 * The cards of one kind in today's order (`places`: the destinations' nearby then other lists, nearest first with the
 * recommended sightseeing in slot 5), those with nothing to do now last.
 */
export function photoCardEntries(places: readonly TravelDestinationPlace[], choices: ReadonlyMap<string, DestinationChoices>, kind: CardKind): PhotoCardEntry[] {
  const entries = places.flatMap((place) => {
    const placeChoices = choices.get(place.id);
    const entry = placeChoices && photoCardEntry(place, placeChoices, kind);
    return entry ? [entry] : [];
  });
  return [...entries.filter((entry) => entry.available), ...entries.filter((entry) => !entry.available)];
}

/**
 * The way a card's 「行く」 takes: the mode the player picked while it can be taken, else the fastest way that can be
 * taken now (then the cheaper; data order on a tie); null when none can.
 */
export function chooseWay(routes: readonly RouteChoice[], picked: TravelMode | null): RouteChoice | null {
  const open = routes.filter((choice) => choice.available);
  return open.find((choice) => choice.route.mode === picked) ?? [...open].sort((a, b) => compareRouteTime(a.route, b.route))[0] ?? null;
}

/** The ways that cannot be taken, one line per reason with the modes it holds back (data order). */
export function blockedWays(routes: readonly RouteChoice[]): { modes: TravelMode[]; reason: string }[] {
  const lines = new Map<string, TravelMode[]>();
  for (const choice of routes) if (!choice.available) lines.set(choice.reason ?? "", [...(lines.get(choice.reason ?? "") ?? []), choice.route.mode]);
  return [...lines].map(([reason, modes]) => ({ modes, reason }));
}

/** The bottom band's icons, in their order. */
export type BandItem = "wait" | "sleep" | "dates" | "tours";

/**
 * Which icons the bottom band shows: 待機 and 休む always; デート while a date can be started now (its sheet); ツアー
 * while a tour is offered here (today's 「ツアーを見る」). An icon that would lead nowhere is not shown.
 */
export function bandItems({ dates, tourOffers }: { dates: readonly Pick<PhotoCardEntry, "available">[]; tourOffers: number }): BandItem[] {
  const items: BandItem[] = ["wait", "sleep"];
  if (dates.some((entry) => entry.available)) items.push("dates");
  if (tourOffers > 0) items.push("tours");
  return items;
}

/** What a screen reader reads for a card: 「13件中2件目、ガッレリア、徒歩約5分」, then its marks (おすすめ, 訪問済み …). */
export function photoCardLabel({ position, count, name, summary, marks = [] }: {
  position: number;
  count: number;
  name: string;
  summary: string;
  marks?: readonly string[];
}): string {
  return [`${count}件中${position}件目`, name, summary, ...marks].join("、");
}

/**
 * The live regions' words for a selection: a place says where its way is (its card's button, never a second
 * press); 休む, the current place and a place that cannot be visited now read as before (travel-selection.ts).
 */
export function photoCardAnnouncement(target: TargetChoices, name: string, openEventId: string | null = null): string {
  if (target.kind === "sleep" || !target.choices || !target.choices.available) return announcement(target, name, openEventId);
  return `${name}を選びました。紹介と行き方を出しています。`;
}

/** The card a key moves the selection to (← the previous, → the next, and ↑↓ in the list; Home, End), or null for any other key. */
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

/** How the cards stand: a horizontal row (a flick selects) or a vertical list (the card opens under the chosen row). */
export type CardArrangement = "row" | "list";

/** The row is used while one card takes at most this share of the height between the header and the bottom band. */
export const ROW_HEIGHT_SHARE = 0.45;

/**
 * Row or list. Phones held sideways list; otherwise the row while a reference card (a two-line name and one summary
 * line, so larger text counts) fits ROW_HEIGHT_SHARE of the visible height (100svh) less the header and the band:
 * short screens and large text list, so the card's way button stays within reach. Unmeasured: the row.
 */
export function chooseArrangement({ viewport, hud, band, card, sideways }: {
  viewport: number;
  hud: number;
  band: number;
  card: number;
  sideways: boolean;
}): CardArrangement {
  if (sideways) return "list";
  if (viewport <= 0 || card <= 0) return "row";
  return card <= (viewport - hud - band) * ROW_HEIGHT_SHARE ? "row" : "list";
}
