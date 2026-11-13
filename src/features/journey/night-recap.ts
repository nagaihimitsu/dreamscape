import { battleQuizzes, battles, episodes, getCityContent } from "../../content";
import type { TravelPlace } from "../../content/travel-schemas";
import { nightLineJa, todayRoute } from "../../domain/day-end";
import type { GameState } from "../../domain/game";
import { withNames } from "../romance/names";
import { placeDisplayName } from "./travel-labels";

/** A stop of today's route: its place and its name as the screens write it (the hotel is 「滞在先のホテル」). */
export type RouteStop = { place: TravelPlace; nameJa: string };

/**
 * What the night shows under its line (2026-11-11 user decision; NightScreen, NightRest): today's headlines (the clear
 * titles of the episodes completed today, in order, the names filled in; save v23's `todayEpisodeIds`), today's route
 * on a small map (none when the party stayed at the hotel) and the heroine's line of the night (the city's
 * `nightLinesJa`, the names filled in; none without them). Taken from the night's own state: the card and the fading
 * night screen, drawn over the next morning, are given the night before the rest.
 */
export type NightRecap = { headlines: string[]; route: RouteStop[]; line: string | null; heroineName: string; cityId: string };

export function nightRecap(game: GameState): NightRecap {
  const { travel } = getCityContent(game.currentCityId);
  const route = todayRoute(game).flatMap((id) => travel.places.filter((place) => place.id === id)
    .map((place) => ({ place, nameJa: placeDisplayName(game, place) })));
  const line = nightLineJa(travel.nightLinesJa, game.travel.day);
  const headlines = game.travel.todayEpisodeIds.flatMap((id) => episodes.filter((episode) => episode.id === id))
    .map((episode) => withNames(episode.clearTitleJa, game));
  return { headlines, route: route.length > 1 ? route : [], line: line === null ? null : withNames(line, game), heroineName: game.heroineName, cityId: game.currentCityId };
}

/** 今日の一語: an English word or phrase met today and its meaning there. */
export type TodayWord = { word: string; meaningJa: string };

/**
 * 今日の一語 (2026-11-13 user decision; the night screen): the first word of the vocabulary (`vocabularyJa`) of the quiz of
 * the first episode completed today that has one (today's headlines' `todayEpisodeIds`; the quiz's questions in order), so
 * the same night always shows the same word. Null when no episode was completed today or its quizzes have no vocabulary.
 */
export function todayWord(game: Pick<GameState, "travel">): TodayWord | null {
  for (const episodeId of game.travel.todayEpisodeIds) {
    const battle = battles.find((item) => item.id === episodes.find((episode) => episode.id === episodeId)?.battleId);
    const questions = battle ? battleQuizzes[battle.quizId]?.questions ?? [] : [];
    const item = questions.flatMap((question) => question.vocabularyJa)[0];
    if (item) return { word: item.word, meaningJa: item.meaning };
  }
  return null;
}

/** Whether the night has anything to show under its line. */
export const hasNightRecap = (recap: NightRecap | undefined): recap is NightRecap =>
  !!recap && (recap.headlines.length > 0 || recap.route.length > 1 || recap.line !== null);

/** A night: the city and the day it ends. */
export type NightKey = { cityId: string; day: number };

/**
 * The card a night shows as it passes at the hotel (useTravelEffects), `atNight` being the state before it passes:
 * - `dayEnd` (the game's own rest at 21:00): the day's end card, with the night's recap when it has one (as before);
 * - a rest before 21:00 (2026-11-13 user decision: whenever the day ends by resting, the night shows what the 21:00 card
 *   shows): the card 「ホテルで休みました。」 with the recap when the night has one (hasNightRecap: today's route when the party
 *   went out, today's headlines, her line), else 「次の日」 (`next_day`) as before.
 * A night shows its recap once (`shown`: the last night that showed it, the caller's memory; nothing is saved).
 */
export type RestNightCard = { kind: "day_end"; recap?: NightRecap } | { kind: "rest"; recap: NightRecap } | { kind: "next_day" };

export function restNightCard(atNight: GameState, { dayEnd, shown }: { dayEnd: boolean; shown: NightKey | null }): RestNightCard {
  const recap = nightRecap(atNight);
  const fresh = hasNightRecap(recap) && !(shown?.cityId === atNight.currentCityId && shown.day === atNight.travel.day);
  if (dayEnd) return fresh ? { kind: "day_end", recap } : { kind: "day_end" };
  return fresh ? { kind: "rest", recap } : { kind: "next_day" };
}

/** Today's headlines said in words (the card's live region): 「今日の見出し：いつ来ても三時、三時の約束。」 */
export function headlinesSentenceJa(headlines: readonly string[]): string {
  return headlines.length ? `今日の見出し：${headlines.join("、")}。` : "";
}

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

/** Today's route said in words (the card's live region): 「今日の道のり：滞在先のホテル、時計塔、朝市。」 */
export function routeSentenceJa(route: readonly RouteStop[]): string {
  return route.length > 1 ? `今日の道のり：${route.map((stop) => stop.nameJa).join("、")}。` : "";
}
