import type { StorageLike } from "../persistence";

/**
 * The journey the title opens is the playable journey last opened on this
 * device: a small preference beside the saves (like the display settings),
 * never part of a save, a backup or Debug, which keeps its own storage.
 */
export const LAST_JOURNEY_KEY = "dreamscape.last-journey.v1";

type JourneyEntry = { id: string; status: string };

/**
 * The journey to open: the remembered one while this version has it and it can
 * be played; otherwise (nothing remembered, a journey this version does not
 * have, or one that is preparing) the default journey.
 */
export function openingJourneyId(remembered: string | null, journeys: readonly JourneyEntry[], fallback: string): string {
  const journey = journeys.find((entry) => entry.id === remembered);
  return journey?.status === "available" ? journey.id : fallback;
}

/** The remembered journey ID; a storage that cannot be read counts as nothing remembered. */
export function readLastJourney(storage: Pick<StorageLike, "getItem">): string | null {
  try {
    return storage.getItem(LAST_JOURNEY_KEY);
  } catch {
    return null;
  }
}

/**
 * Remember a journey the player opened. Only a playable journey is kept (a
 * preparing one would not be reopened), and a storage that refuses the write is
 * ignored: the title then opens the default journey, nothing else changes.
 */
export function rememberJourney(storage: Pick<StorageLike, "setItem">, journey: JourneyEntry | undefined): void {
  if (journey?.status !== "available") return;
  try {
    storage.setItem(LAST_JOURNEY_KEY, journey.id);
  } catch {
    // A preference only.
  }
}
