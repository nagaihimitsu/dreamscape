import { LEARNING_KEY, SAVE_KEY, type StorageLike } from "./index";

export interface ScopedStorage extends StorageLike {
  removeItem(key: string): void;
  physicalKey(key: string): string;
}

/** The browser key of a journey's logical slot key (old-data.ts parses the same pattern). */
export function journeyPhysicalKey(journeyId: string, key: string): string {
  const prefix = `dreamscape.journey.${journeyId}`;
  if (key === SAVE_KEY || key.startsWith(`${SAVE_KEY}.backup.`))
    return `${prefix}.save.v1${key.slice(SAVE_KEY.length)}`;
  if (key === LEARNING_KEY) return `${prefix}.learning.v1`;
  return key;
}

/** Every journey keeps its game save, backups and English notes in separate slots. */
export function journeyStorage(
  base: StorageLike & { removeItem(key: string): void },
  journeyId: string,
): ScopedStorage {
  if (!/^[a-z][a-z0-9_]*$/.test(journeyId)) throw new Error("Invalid journey ID");
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
