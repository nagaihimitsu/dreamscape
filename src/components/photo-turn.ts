import { useSyncExternalStore } from "react";

// A line's large photo has its own turn before the line (2026-11-27 user decision): while the print is up, the line's
// text waits (nothing is written, its voice and sounds wait with it); a tap or a key on the scene (what would read the
// line on) ends the photo's turn instead, the print goes quickly and the line starts at once. No timer ends it.
// The cards of 旅の図鑑 and 旅のことば have their turn the same way (2026-11-27 user decision; LineCardWindow), before a
// photo of the same line. PhotoShowLayer and LineCardWindow hold a turn, DialogueText reads it.

/** A turn on screen: `end` takes the print (or the card) away and lets the line start. */
export type PhotoTurn = { end(): void };

// The turns held, the latest last: the latest is on, and an earlier one is on again once the later ones are released.
let turns: readonly PhotoTurn[] = [];
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** The turn on now, if one is (read outside React, as a tap or an effect does). */
export const photoTurn = (): PhotoTurn | null => turns.at(-1) ?? null;

/** Starts `next`'s turn (the print or the card is up); `release` ends it. */
export function holdPhotoTurn(next: PhotoTurn): () => void {
  turns = [...turns.filter((turn) => turn !== next), next];
  notify();
  return () => {
    if (!turns.includes(next)) return;
    turns = turns.filter((turn) => turn !== next);
    notify();
  };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether a turn is on (the line waits). */
export const usePhotoTurnOn = (): boolean => useSyncExternalStore(subscribe, () => turns.length > 0, () => false);
