import { albumImages, cityContents, localWords } from "../../content";
import { formatMoneyForCity } from "../../content/currency";
import { getJourneyForCity } from "../../content/journeys";
import type { GameState } from "../../domain/game";
import { declaresPeople, metPeopleGroups } from "./met-people";
import { eventPlaceIdsIn } from "./visited-places";

// 旅の数字 (2026-11-13 user decision): a short card of the journey in numbers, at the end roll and in 旅の記録, derived
// from what the game and this device already keep (nothing new is saved). Never a relationship value, never an English
// score (AGENTS.md: the quizzes estimate no English ability).

// Every number is the whole journey's (2026-11-13 user decision). The days without a calendar (travel.day starts again
// in each city) are the journey's only while the party is still in its first city; after that they are not known (null)
// and their line is left out, never a part shown as the whole. The rides are not shown at all: travel.rideCounts is per
// city and no record keeps them for the journey. Nor are all the places reached (a move is kept for today only): the
// card counts the places where something happened, and says so.
export type JourneyNumbers = {
  /** The journey's days so far: its calendar's day, or (no calendar) the day while still in the first city; else null. */
  days: number | null;
  /**
   * The places of the journey's cities where something happened (visited-places.ts eventPlaceIdsIn), a hotel too when
   * something happened there. Not every place reached: a place only passed through is kept for today only.
   */
  eventPlaces: number;
  /** The people met (旅の記録's 出会った人); null for a journey with no one to meet. */
  people: number | null;
  /** The words of the country this device has learned in this journey (learning/local-words); null for a journey without any. */
  localWords: number | null;
  /** The album's photos; null for a journey without album pictures. */
  photos: number | null;
  /** The journey's starting budget less what is left, in the journey's currency (never below 0); null without a start. */
  spent: { amount: number; textJa: string } | null;
};

/** The budget the journey started with: its manifest's, else its first city's (as a new game starts: src/domain/game.ts). */
function startingBudget(game: Pick<GameState, "currentCityId">): number | null {
  const journey = getJourneyForCity(game.currentCityId);
  if (!journey) return null;
  if (typeof journey.initialBudget === "number") return journey.initialBudget;
  return cityContents[journey.cities[0]?.id ?? ""]?.travelSettings.initialBudget ?? null;
}

/**
 * The journey in numbers for `game`, with the words of the country this device has learned (`learnedWordIds`). A number
 * whose kind the journey's content has none of (no one to meet, no words of the country, no album pictures: Milano has
 * neither words nor pictures) is null, and its line is left out rather than a lasting 0 (2026-11-13 user decision).
 */
export function journeyNumbers(game: GameState, learnedWordIds: readonly string[]): JourneyNumbers {
  const journey = getJourneyForCity(game.currentCityId);
  const cityIds = journey?.cities.map((city) => city.id) ?? [game.currentCityId];
  const hasWords = localWords.some((word) => word.cityId !== undefined && cityIds.includes(word.cityId));
  const hasPictures = albumImages.some((image) => image.journeyId === journey?.id);
  const eventPlaces = cityIds.reduce((sum, cityId) => sum + eventPlaceIdsIn(game, cityId).length, 0);
  const start = startingBudget(game);
  const spent = start === null ? null : Math.max(0, start - game.travelBudget);
  // No city left yet: this city's own day is the journey's.
  const firstCity = cityIds[0] === game.currentCityId;
  return {
    days: game.travel.calendar?.journeyDay ?? (firstCity ? game.travel.day : null),
    eventPlaces,
    people: declaresPeople(game) ? metPeopleGroups(game).reduce((sum, group) => sum + group.people.length, 0) : null,
    localWords: hasWords ? new Set(learnedWordIds).size : null,
    photos: hasPictures ? game.album.length : null,
    spent: spent === null ? null : { amount: spent, textJa: formatMoneyForCity(game.currentCityId, spent) },
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
