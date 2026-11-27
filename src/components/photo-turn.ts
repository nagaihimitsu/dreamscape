import { useSyncExternalStore } from "react";

// A line's large photo has its own turn before the line (2026-11-27 user decision): while the print is up, the line's
// text waits (nothing is written, its voice and sounds wait with it); a tap or a key on the scene (what would read the
// line on) ends the photo's turn instead, the print goes quickly and the line starts at once. No timer ends it.
// PhotoShowLayer holds the turn, DialogueText reads it.

/** The photo's turn on screen: `end` takes the print away and lets the line start. */
export type PhotoTurn = { end(): void };

let turn: PhotoTurn | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** The photo's turn now, if one is on (read outside React, as a tap or an effect does). */
export const photoTurn = (): PhotoTurn | null => turn;

/** Starts `next`'s turn (the print is up); `release` ends it, if it is still the one on. */
export function holdPhotoTurn(next: PhotoTurn): () => void {
  turn = next;
  notify();
  return () => {
    if (turn !== next) return;
    turn = null;
    notify();
  };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether a photo's turn is on (the line waits). */
export const usePhotoTurnOn = (): boolean => useSyncExternalStore(subscribe, () => turn !== null, () => false);
