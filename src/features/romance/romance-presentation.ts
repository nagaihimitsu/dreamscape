import type { DateDefinition } from "../../content";
import { activeDateStoryId, type ActiveDate } from "../../domain/game";

/** Check the saved script before using the current destination. */
export function resolveRomancePresentation(
  date: DateDefinition | undefined,
  active: Pick<ActiveDate, "storyHash">,
): { storyId: string; destinationId: string | undefined } {
  if (!date) return { storyId: "", destinationId: undefined };
  const storyId = activeDateStoryId(date, active);
  return { storyId, destinationId: date.destinationId };
}
