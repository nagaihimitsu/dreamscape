import { LEARNING_KEY, LOCAL_WORDS_KEY, READ_LINES_KEY, SAVE_KEY, type StorageLike } from "./index";

export interface ScopedStorage extends StorageLike {
  removeItem(key: string): void;
  physicalKey(key: string): string;
  saveSlot: SaveSlot;
  otherSlotsInUse(): boolean;
}

const JOURNEY_ID = /^[a-z][a-z0-9_]*$/;

/**
 * The save slots of a journey (2026-11-19 user decision: several saves of one journey, each with its own names). Only
 * the game save and its backups are kept per slot; the English notes, the read lines and the words learned are the
 * device's records of the journey, shared by its slots.
 */
export const SAVE_SLOTS = [1, 2, 3] as const;
export type SaveSlot = (typeof SAVE_SLOTS)[number];
export function isSaveSlot(value: unknown): value is SaveSlot {
  return SAVE_SLOTS.includes(value as SaveSlot);
}

/**
 * The browser key of a journey's logical key (parseJourneyPhysicalKey reads it back). Slot 1's save keeps the key
 * journeys used before there were slots (`dreamscape.journey.<id>.save.v1`); slot n's is `….slot<n>.save.v1`.
 */
export function journeyPhysicalKey(journeyId: string, key: string, slot: SaveSlot = 1): string {
  const prefix = `dreamscape.journey.${journeyId}`;
  if (key === SAVE_KEY || key.startsWith(`${SAVE_KEY}.backup.`))
    return `${prefix}${slot === 1 ? "" : `.slot${slot}`}.save.v1${key.slice(SAVE_KEY.length)}`;
  if (key === LEARNING_KEY) return `${prefix}.learning.v1`;
  if (key === READ_LINES_KEY) return `${prefix}.read-lines.v1`;
  if (key === LOCAL_WORDS_KEY) return `${prefix}.local-words.v1`;
  return key;
}

/**
 * The journey and logical key behind a journey slot's browser key, the inverse of journeyPhysicalKey
 * (`dreamscape.journey.<id>.save.v1[.backup.…]` → SAVE_KEY[.backup.…], `….learning.v1` →
 * LEARNING_KEY, `….read-lines.v1` → READ_LINES_KEY, `….local-words.v1` → LOCAL_WORDS_KEY); null for every other key.
 */
export function parseJourneyPhysicalKey(physical: string): { journeyId: string; key: string; slot: SaveSlot } | null {
  const match = /^dreamscape\.journey\.([^.]+)\.(?:(?:slot(\d+)\.)?(save\.v1)(\..+)?|(learning\.v1)|(local-words\.v1)|read-lines\.v1)$/.exec(physical);
  if (!match || !JOURNEY_ID.test(match[1])) return null;
  const slot = match[2] === undefined ? 1 : Number(match[2]);
  if (!isSaveSlot(slot)) return null;
  const key = match[3] ? `${SAVE_KEY}${match[4] ?? ""}` : match[5] ? LEARNING_KEY : match[6] ? LOCAL_WORDS_KEY : READ_LINES_KEY;
  return journeyPhysicalKey(match[1], key, slot) === physical ? { journeyId: match[1], key, slot } : null;
}

/**
 * Every journey keeps its game saves (one per slot) with their backups, English notes, read lines and local words
 * learned under keys of its own; this storage reads and writes slot `slot`'s save.
 */
export function journeyStorage(
  base: StorageLike & { removeItem(key: string): void },
  journeyId: string,
  slot: SaveSlot = 1,
): ScopedStorage {
  if (!JOURNEY_ID.test(journeyId)) throw new Error("Invalid journey ID");
  const mapKey = (key: string): string => journeyPhysicalKey(journeyId, key, slot);
  return {
    journeyId,
    saveSlot: slot,
    /** Whether another slot of the journey holds a save (readable or not): its shared records are then still in use. */
    otherSlotsInUse: () => SAVE_SLOTS.some((other) => other !== slot && base.getItem(journeyPhysicalKey(journeyId, SAVE_KEY, other)) !== null),
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
