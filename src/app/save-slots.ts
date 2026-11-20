import { getJourney } from "../content/journeys";
import { isJourneyComplete } from "../domain/city-travel";
import { difficultyOf, type Difficulty } from "../domain/difficulty";
import { loadGame, MEMORY_KEY, replaceWithNewJourney, type SaveResult, type StorageLike } from "../persistence";
import type { GameState } from "../domain/game";
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
  | { slot: SaveSlot; status: "saved"; playerName: string; heroineName: string; cityJa: string; day: number; finished: boolean;
      difficulty: Difficulty }
  | { slot: SaveSlot; status: "unreadable" };

/** Each slot of the journey in order: empty, a save this version loads (names, city, day), or one it cannot read. */
export function slotSummaries(base: StorageLike & { removeItem(key: string): void }, journeyId: string): SlotSummary[] {
  return SAVE_SLOTS.map((slot) => summarizeSlot(journeyStorage(base, journeyId, slot), journeyId, slot));
}

/** What one slot's storage holds (also Debug's isolated storage, shown as its only slot). */
export function summarizeSlot(storage: StorageLike, journeyId: string, slot: SaveSlot): SlotSummary {
  const loaded = loadGame(storage);
  if (loaded.status === "empty") return { slot, status: "empty" };
  if (loaded.status === "invalid") return { slot, status: "unreadable" };
  const { state } = loaded;
  const cities = getJourney(journeyId)?.cities ?? [];
  return {
    slot, status: "saved", playerName: state.playerName, heroineName: state.heroineName,
    cityJa: cities.find((city) => city.id === state.currentCityId)?.nameJa ?? "",
    day: state.travel.day, finished: isJourneyComplete(state), difficulty: difficultyOf(state),
  };
}

/**
 * 「セーブ・ロード」's セーブ into a slot other than the one played (2026-11-19 user decision): the game as it is now goes
 * into `target` in place of what it holds (an empty slot, or a save the player chose to overwrite), with the played
 * slot's 旅の思い出, so the slot becomes a copy of this play. Play goes on in the slot played. A slot this version cannot
 * read is never written over (replaceWithNewJourney refuses it).
 */
export function saveToAnotherSlot(from: StorageLike & { removeItem(key: string): void }, target: StorageLike & { removeItem(key: string): void },
  state: GameState): SaveResult {
  const before = loadGame(target);
  if (before.status === "invalid") return { ok: false, message: "読み込めないセーブを保護するため、上書きしませんでした。" };
  const written = replaceWithNewJourney(target, state, before.status === "loaded" ? before.state : null);
  if (!written.ok) return written;
  try {
    const memory = from.getItem(MEMORY_KEY);
    if (memory === null) target.removeItem(MEMORY_KEY);
    else target.setItem(MEMORY_KEY, memory);
  } catch {
    return { ok: false, message: "セーブは保存しましたが、旅の思い出を写せませんでした。空き容量やブラウザの保存設定を確認してください。" };
  }
  return { ok: true };
}
