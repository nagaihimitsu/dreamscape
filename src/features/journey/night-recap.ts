import { getCityContent } from "../../content";
import type { TravelPlace } from "../../content/travel-schemas";
import { nightLineJa, todayRoute } from "../../domain/day-end";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";
import { placeDisplayName } from "./travel-labels";

/** A stop of today's route: its place and its name as the screens write it (the hotel is 「滞在先」). */
export type RouteStop = { place: TravelPlace; nameJa: string };

/**
 * What the night shows under its line (2026-11-11 user decision; NightScreen, NightRest): today's route on a small map
 * (none when the party stayed at the hotel) and the heroine's line of the night (the city's `nightLinesJa`, the names
 * filled in; none without them). Taken from the night's own state: the card and the fading night screen, drawn over
 * the next morning, are given the night before the rest.
 */
export type NightRecap = { route: RouteStop[]; line: string | null; heroineName: string; cityId: string };

export function nightRecap(game: GameState): NightRecap {
  const { travel } = getCityContent(game.currentCityId);
  const route = todayRoute(game).flatMap((id) => travel.places.filter((place) => place.id === id)
    .map((place) => ({ place, nameJa: placeDisplayName(game, place) })));
  const line = nightLineJa(travel.nightLinesJa, game.travel.day);
  return { route: route.length > 1 ? route : [], line: line === null ? null : withNames(line, game), heroineName: game.heroineName, cityId: game.currentCityId };
}

/** Whether the night has anything to show under its line. */
export const hasNightRecap = (recap: NightRecap | undefined): recap is NightRecap => !!recap && (recap.route.length > 1 || recap.line !== null);

/**
 * The marks on the route's map: one per place, labelled with its stops' numbers in the day's order (「1・4」 for the
 * hotel left and come back to), the place of the last stop marked as where the day ended.
 */
export function routeMarks(route: readonly RouteStop[]): { place: TravelPlace; label: string; last: boolean }[] {
  const marks = new Map<string, { place: TravelPlace; numbers: number[] }>();
  route.forEach((stop, index) => {
    const mark = marks.get(stop.place.id) ?? { place: stop.place, numbers: [] };
    mark.numbers.push(index + 1);
    marks.set(stop.place.id, mark);
  });
  const lastId = route[route.length - 1]?.place.id;
  return [...marks.values()].map(({ place, numbers }) => ({ place, label: numbers.join("・"), last: place.id === lastId }));
}

/** Today's route said in words (the card's live region): 「今日の道のり：滞在先、時計塔、朝市。」 */
export function routeSentenceJa(route: readonly RouteStop[]): string {
  return route.length > 1 ? `今日の道のり：${route.map((stop) => stop.nameJa).join("、")}。` : "";
}
