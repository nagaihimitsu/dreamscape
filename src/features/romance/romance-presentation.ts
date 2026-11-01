import type { DateDefinition } from "../../content";
import { legacyDates, legacyStoryId } from "../../content/legacy-milano";
import { activeDateStoryId, type ActiveDate } from "../../domain/game";

/** Presentation follows the saved script, including an older script in progress. */
export function resolveRomancePresentation(
  date: DateDefinition | undefined,
  active: Pick<ActiveDate, "storyHash">,
): { storyId: string; destinationId: string | undefined } {
  if (!date) return { storyId: "", destinationId: undefined };
  const storyId = activeDateStoryId(date, active);
  const old = legacyDates.find((entry) => entry.id === date.id);
  const archivedIds = old ? [old.storyId, ...(old.legacyStoryIds ?? [])] : [];
  const originalId = archivedIds.find((id) => legacyStoryId(id) === storyId);
  if (old && originalId) return {
    storyId,
    destinationId: originalId === old.storyId ? old.destinationId : old.legacyStoryDestinationIds?.[originalId] ?? old.legacyDestinationId,
  };
  return {
    storyId,
    destinationId: storyId === date.storyId
      ? date.destinationId
      : date.legacyStoryDestinationIds?.[storyId] ?? date.legacyDestinationId,
  };
}
