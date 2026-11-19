import { getJourney } from "../content/journeys";
import { isJourneyComplete } from "../domain/city-travel";
import { loadGame, type StorageLike } from "../persistence";
import { SAVE_SLOTS, isSaveSlot, journeyStorage, type SaveSlot } from "../persistence/journey-storage";

/**
 * The save slots of a journey (2026-11-19 user decision): which one this device played last, and what each holds, for
 * the list of saves (SaveSlots.tsx). The slot played last is a per-device preference beside the saves (like the
 * journey last opened, last-journey.ts), never part of a save; Debug's isolated storage neither reads nor writes it.
 */
export const lastSlotKey = (journeyId: string): string => `dreamscape.journey.${journeyId}.last-slot.v1`;

/** The slot this device played last in the journey; slot 1 when none is remembered or the storage cannot be read. */
export function readLastSlot(storage: Pick<StorageLike, "getItem">, journeyId: string): SaveSlot {
  try {
    const value = Number(storage.getItem(lastSlotKey(journeyId)));
    return isSaveSlot(value) ? value : 1;
  } catch {
    return 1;
  }
}

/** Remember the slot played; a storage that refuses the write is ignored (the journey then opens slot 1). */
export function rememberSlot(storage: Pick<StorageLike, "setItem">, journeyId: string, slot: SaveSlot): void {
  try {
    storage.setItem(lastSlotKey(journeyId), String(slot));
  } catch {
    // A preference only.
  }
}

/** What a slot holds, as the list of saves shows it. Relationship values are never shown. */
export type SlotSummary =
  | { slot: SaveSlot; status: "empty" }
  | { slot: SaveSlot; status: "saved"; playerName: string; heroineName: string; cityJa: string; day: number; finished: boolean }
  | { slot: SaveSlot; status: "unreadable" };

/** Each slot of the journey in order: empty, a save this version loads (names, city, day), or one it cannot read. */
export function slotSummaries(base: StorageLike & { removeItem(key: string): void }, journeyId: string): SlotSummary[] {
  const cities = getJourney(journeyId)?.cities ?? [];
  return SAVE_SLOTS.map((slot): SlotSummary => {
    const loaded = loadGame(journeyStorage(base, journeyId, slot));
    if (loaded.status === "empty") return { slot, status: "empty" };
    if (loaded.status === "invalid") return { slot, status: "unreadable" };
    const { state } = loaded;
    return {
      slot, status: "saved", playerName: state.playerName, heroineName: state.heroineName,
      cityJa: cities.find((city) => city.id === state.currentCityId)?.nameJa ?? "",
      day: state.travel.day, finished: isJourneyComplete(state),
    };
  });
}
