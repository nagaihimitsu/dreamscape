import { cityContents } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import { getTransportMode } from "../../content/transport";
import type { GameState } from "../../domain/game";
import { metPeopleGroups } from "./met-people";
import { visitedPlaceIdsIn } from "./visited-places";

// 旅の数字 (2026-11-13 user decision): a short card of the journey in numbers, at the end roll and in 旅の記録, derived
// from what the game and this device already keep (nothing new is saved). Never a relationship value, never an English
// score (AGENTS.md: the quizzes estimate no English ability).

/** A vehicle and how many times the party took it in the city they are in now (travel.rideCounts is per city). */
export type RideNumber = { modeId: string; nameJa: string; count: number };

export type JourneyNumbers = {
  /** The journey's days so far: its calendar's day, or (no calendar) the first city's day; null when not known. */
  days: number | null;
  /** The places of the journey's cities the party has been to, the hotels left out (visited-places.ts). */
  places: number;
  /** The people met (旅の記録's 出会った人). */
  people: number;
  /** The words of the country this device has learned in this journey (learning/local-words). */
  localWords: number;
  /** The album's photos. */
  photos: number;
  /** The journey's starting budget less what is left, in the journey's currency (never below 0); null without a start. */
  spent: { amount: number; textJa: string } | null;
  /** The city the rides were counted in, and the rides there (most first; walking is never counted). */
  ridesCityJa: string;
  rides: RideNumber[];
};

/** The budget the journey started with: its manifest's, else its first city's (as a new game starts: src/domain/game.ts). */
function startingBudget(game: Pick<GameState, "currentCityId">): number | null {
  const journey = getJourneyForCity(game.currentCityId);
  if (!journey) return null;
  if (typeof journey.initialBudget === "number") return journey.initialBudget;
  return cityContents[journey.cities[0]?.id ?? ""]?.travelSettings.initialBudget ?? null;
}

/** The journey in numbers for `game`, with the words of the country this device has learned (`learnedWordIds`). */
export function journeyNumbers(game: GameState, learnedWordIds: readonly string[]): JourneyNumbers {
  const journey = getJourneyForCity(game.currentCityId);
  const cityIds = journey?.cities.map((city) => city.id) ?? [game.currentCityId];
  const places = cityIds.reduce((sum, cityId) => {
    const hotel = cityContents[cityId]?.travelSettings.hotelPlaceId;
    return sum + visitedPlaceIdsIn(game, cityId).filter((id) => id !== hotel).length;
  }, 0);
  const start = startingBudget(game);
  const spent = start === null ? null : Math.max(0, start - game.travelBudget);
  const firstCity = cityIds[0] === game.currentCityId;
  return {
    days: game.travel.calendar?.journeyDay ?? (firstCity ? game.travel.day : null),
    places,
    people: metPeopleGroups(game).reduce((sum, group) => sum + group.people.length, 0),
    localWords: new Set(learnedWordIds).size,
    photos: game.album.length,
    spent: spent === null ? null : { amount: spent, textJa: formatMoneyForCity(game.currentCityId, spent) },
    ridesCityJa: cityContents[game.currentCityId]?.city.nameJa ?? game.currentCityId,
    rides: Object.entries(game.travel.rideCounts)
      .map(([modeId, count]) => ({ modeId, nameJa: getTransportMode(game.currentCityId, modeId)?.nameJa ?? modeId, count }))
      .sort((a, b) => b.count - a.count || a.nameJa.localeCompare(b.nameJa, "ja")),
  };
}

/** How long the numbers count up (ms). */
export const COUNT_UP_MS = 700;

/** The number shown `elapsed` ms into a count up to `target` (eased out, whole numbers; the target itself from the end). */
export function countUpValue(target: number, elapsed: number, duration = COUNT_UP_MS): number {
  if (!(elapsed < duration) || duration <= 0) return target;
  const share = Math.max(0, elapsed) / duration;
  return Math.round(target * (1 - (1 - share) ** 3));
}
