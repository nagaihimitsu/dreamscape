import type { DateDefinition } from "../../content";
import { activeDateStoryId, type ActiveDate } from "../../domain/game";

/** Presentation follows the saved script, including an older script in progress. */
export function resolveRomancePresentation(
  date: DateDefinition | undefined,
  active: Pick<ActiveDate, "storyHash">,
): { storyId: string; destinationId: string | undefined } {
  if (!date) return { storyId: "", destinationId: undefined };
  const storyId = activeDateStoryId(date, active);
  return {
    storyId,
    destinationId: storyId === date.storyId
      ? date.destinationId
      : date.legacyStoryDestinationIds?.[storyId] ?? date.legacyDestinationId,
  };
}
