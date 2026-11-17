/**
 * Which journeys this device keeps for 「オフラインで遊ぶ」, mirrored in localStorage (user decision 2026-11-17, 「A」):
 * what must know it before Cache Storage can be read — the title's first choice without a network
 * (src/app/last-journey.ts titleJourneyId) and index.html's script that starts loading the opening journey's part
 * (scripts/journey-parts-build.ts) — reads it here. The controller writes it each time it reads the store
 * (src/offline/offline-controller.ts), and it is removed when the device keeps nothing. A hint only: when it is absent
 * or cannot be read, the title chooses as with a network. A per-device note, never part of a save.
 */
export const KEPT_JOURNEYS_KEY = "dreamscape.offline.kept.v1";

/**
 * The journeys a stored value names: a JSON array; what in it is not a string is left out (the readers keep only the
 * journeys this version can play). Null for anything else (nothing stored, another form).
 */
export function parseJourneyList(raw: string | null): string[] | null {
  if (raw === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : null;
}

/** The kept journeys as last mirrored; null when unknown (nothing mirrored, a storage that cannot be read). */
export function readKeptJourneys(storage: { getItem(key: string): string | null }): string[] | null {
  try {
    return parseJourneyList(storage.getItem(KEPT_JOURNEYS_KEY));
  } catch {
    return null;
  }
}

/** Mirror the kept journeys (none: the key is removed). A storage that refuses is ignored: the title then chooses as with a network. */
export function writeKeptJourneys(storage: { setItem(key: string, value: string): void; removeItem(key: string): void }, journeys: readonly string[]): void {
  try {
    if (journeys.length) storage.setItem(KEPT_JOURNEYS_KEY, JSON.stringify([...journeys]));
    else storage.removeItem(KEPT_JOURNEYS_KEY);
  } catch {
    // A hint only.
  }
}

/** Mirror the kept journeys in this browser's own localStorage (none: removed); a browser that refuses is ignored. */
export function mirrorKeptJourneys(journeys: readonly string[]): void {
  try {
    writeKeptJourneys(window.localStorage, journeys);
  } catch {
    // A hint only.
  }
}
