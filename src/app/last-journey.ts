import type { StorageLike } from "../persistence";
// With its extension: vite.config.ts loads this module through scripts/journey-parts-build.ts (Vite's native config loader asks for it).
import { parseJourneyList } from "../offline/kept-journeys.ts";

/**
 * The journey the title opens is the playable journey last opened on this
 * device: a small preference beside the saves (like the display settings),
 * never part of a save, a backup or Debug, which keeps its own storage.
 */
export const LAST_JOURNEY_KEY = "dreamscape.last-journey.v1";
/**
 * The playable journeys opened on this device, the most recent first (written with the remembered one): without a
 * network the title opens the kept journey opened most recently (titleJourneyId). A preference of the same kind.
 */
export const RECENT_JOURNEYS_KEY = "dreamscape.recent-journeys.v1";
/** How many journeys the recent list holds at most. */
const RECENT_LIMIT = 12;

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

/**
 * The journey the title opens (user decision 2026-11-17, 「A」). With a network, or when the device keeps no journey
 * for 「オフラインで遊ぶ」 (or that is not known: `kept` null), as openingJourneyId. Without a network on a device that
 * keeps journeys: the journey openingJourneyId gives when it is kept; else the kept journey opened most recently
 * (`recent`); else the first kept journey in the catalog's order. Only journeys this version can play count. The
 * remembered journey is not changed by it: a page opened with a network opens that one again. index.html's preload
 * script picks the same journey (scripts/journey-parts-build.ts journeyPartPreloadScript; its test runs both).
 */
export function titleJourneyId(
  facts: { remembered: string | null; recent: readonly string[]; kept: readonly string[] | null; online: boolean },
  journeys: readonly JourneyEntry[],
  fallback: string,
): string {
  const opening = openingJourneyId(facts.remembered, journeys, fallback);
  if (facts.online || !facts.kept) return opening;
  const playable = journeys.filter((journey) => journey.status === "available").map((journey) => journey.id);
  const kept = facts.kept.filter((journeyId) => playable.includes(journeyId));
  if (!kept.length || kept.includes(opening)) return opening;
  return facts.recent.find((journeyId) => kept.includes(journeyId)) ?? playable.find((journeyId) => kept.includes(journeyId))!;
}

/** The remembered journey ID; a storage that cannot be read counts as nothing remembered. */
export function readLastJourney(storage: Pick<StorageLike, "getItem">): string | null {
  try {
    return storage.getItem(LAST_JOURNEY_KEY);
  } catch {
    return null;
  }
}

/** The journeys opened on this device, the most recent first; a storage that cannot be read, or a value of another form, counts as none. */
export function readRecentJourneys(storage: Pick<StorageLike, "getItem">): string[] {
  try {
    return parseJourneyList(storage.getItem(RECENT_JOURNEYS_KEY)) ?? [];
  } catch {
    return [];
  }
}

/**
 * Remember a journey the player opened, and put it first in the recent list. Only a
 * playable journey is kept (a preparing one would not be reopened), and a storage
 * that refuses the write is ignored: the title then opens the default journey,
 * nothing else changes.
 */
export function rememberJourney(storage: Pick<StorageLike, "getItem" | "setItem">, journey: JourneyEntry | undefined): void {
  if (journey?.status !== "available") return;
  try {
    storage.setItem(LAST_JOURNEY_KEY, journey.id);
    const recent = [journey.id, ...readRecentJourneys(storage).filter((journeyId) => journeyId !== journey.id)].slice(0, RECENT_LIMIT);
    storage.setItem(RECENT_JOURNEYS_KEY, JSON.stringify(recent));
  } catch {
    // A preference only.
  }
}
