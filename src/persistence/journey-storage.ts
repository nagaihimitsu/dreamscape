import { LEARNING_KEY, READ_LINES_KEY, SAVE_KEY, type StorageLike } from "./index";

export interface ScopedStorage extends StorageLike {
  removeItem(key: string): void;
  physicalKey(key: string): string;
}

const JOURNEY_ID = /^[a-z][a-z0-9_]*$/;

/** The browser key of a journey's logical slot key (parseJourneyPhysicalKey reads it back). */
export function journeyPhysicalKey(journeyId: string, key: string): string {
  const prefix = `dreamscape.journey.${journeyId}`;
  if (key === SAVE_KEY || key.startsWith(`${SAVE_KEY}.backup.`))
    return `${prefix}.save.v1${key.slice(SAVE_KEY.length)}`;
  if (key === LEARNING_KEY) return `${prefix}.learning.v1`;
  if (key === READ_LINES_KEY) return `${prefix}.read-lines.v1`;
  return key;
}

/**
 * The journey and logical key behind a journey slot's browser key, the inverse of journeyPhysicalKey
 * (`dreamscape.journey.<id>.save.v1[.backup.…]` → SAVE_KEY[.backup.…], `….learning.v1` →
 * LEARNING_KEY, `….read-lines.v1` → READ_LINES_KEY); null for every other key.
 */
export function parseJourneyPhysicalKey(physical: string): { journeyId: string; key: string } | null {
  const match = /^dreamscape\.journey\.([^.]+)\.(?:(save\.v1)(\..+)?|(learning\.v1)|read-lines\.v1)$/.exec(physical);
  if (!match || !JOURNEY_ID.test(match[1])) return null;
  const key = match[2] ? `${SAVE_KEY}${match[3] ?? ""}` : match[4] ? LEARNING_KEY : READ_LINES_KEY;
  return journeyPhysicalKey(match[1], key) === physical ? { journeyId: match[1], key } : null;
}

/** Every journey keeps its game save, backups, English notes and read lines in separate slots. */
export function journeyStorage(
  base: StorageLike & { removeItem(key: string): void },
  journeyId: string,
): ScopedStorage {
  if (!JOURNEY_ID.test(journeyId)) throw new Error("Invalid journey ID");
  const mapKey = (key: string): string => journeyPhysicalKey(journeyId, key);
  return {
    journeyId,
    physicalKey: mapKey,
    getItem: (key) => base.getItem(mapKey(key)),
    setItem: (key, value) => base.setItem(mapKey(key), value),
    removeItem: (key) => base.removeItem(mapKey(key)),
  };
}

/** Browser storage events contain physical keys, not the scoped logical keys. */
export function storagePhysicalKey(storage: StorageLike, key: string): string {
  return storage.physicalKey?.(key) ?? key;
}
