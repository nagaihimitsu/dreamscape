import { describe, expect, it } from "vitest";
import { battleQuizzes, cityContents, stories } from "../content";
import { bundledParts } from "../content/journey-part-files.all";
import { journeys } from "../content/journeys";
import { newJourney } from "../dev/scenario-builders";
import { destinationChoicesOf, getTravelDestinations } from "./travel-destinations";
import { beginTravelEvent } from "./travel-game";

// A production page loads only the open journey's part of the content (src/content/index.ts loadJourneyContent): its
// cities, stories and quizzes. The unit tests bring every part with the game (journey-part-files.all.ts), so these
// take the other journeys' parts out again, as a page that opened the journey (or was reloaded on it) has them.

type JourneyPart = { journeyId: string; stories: Record<string, string>; quizzes: Record<string, unknown>; travel: Record<string, unknown> };

/** Takes every journey's part but `journeyId`'s out of the content; returns what puts them back. */
function onlyJourneyLoaded(journeyId: string): () => void {
  const parts = Object.values(bundledParts) as JourneyPart[];
  const own = parts.find((part) => part.journeyId === journeyId);
  if (!own) throw new Error(`No content part for ${journeyId}`);
  const removed: (() => void)[] = [];
  const take = <T>(registry: Record<string, T>, ids: readonly string[]) => {
    for (const id of ids) {
      if (!(id in registry)) continue;
      const value = registry[id];
      delete registry[id];
      removed.push(() => { registry[id] = value; });
    }
  };
  for (const part of parts) {
    if (part === own) continue;
    take(cityContents, Object.keys(part.travel).filter((id) => !(id in own.travel)));
    take(stories, Object.keys(part.stories).filter((id) => !(id in own.stories)));
    take(battleQuizzes, Object.keys(part.quizzes).filter((id) => !(id in own.quizzes)));
  }
  return () => removed.forEach((put) => put());
}

describe("a page that opened one journey (only its part of the content loaded)", () => {
  // The journeys a new game starts (createGame: available ones; the sample journey too, in the tests).
  for (const { id: journeyId } of journeys.filter((journey) => journey.status === "available")) {
    it(`${journeyId}: every event of the first free time that can be gone to departs`, () => {
      const restore = onlyJourneyLoaded(journeyId);
      try {
        const start = newJourney(journeyId);
        const ways = getTravelDestinations(start).places.flatMap((place) => destinationChoicesOf(start, place).events.flatMap((choice) => {
          const way = choice.available ? choice.routes.find((route) => route.available) : undefined;
          return way ? [{ eventId: choice.event.id, mode: way.route.mode }] : [];
        }));
        expect(ways.length).toBeGreaterThan(0);
        for (const { eventId, mode } of ways) {
          // The swipe up's departure (PhotoCardFreeTime → travelToEvent): another journey's scenes are never read
          // (encounter.ts sceneLandmarks once read their cities, which a production page has not loaded).
          const opened = beginTravelEvent(start, eventId, mode, start.revision, () => 0);
          expect(opened, eventId).not.toBe(start);
        }
      } finally {
        restore();
      }
    });
  }
});
