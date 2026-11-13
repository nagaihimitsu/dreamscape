import { fnvHash } from "../../content/fingerprint";

// Looks only (docs/13 2.8): a game that wants a little variety on screen (where the crowd stands, how the leaves sway)
// draws it from the host's `seed`, never from Math.random. The seed comes from what the save already holds, so a reload
// looks the same; it never reaches the rules.

/** The seed of a play: from the save's revision, the game and the tag's prefix. */
export function miniGameSeed(revision: number, gameId: string, prefix?: string): number {
  return Number.parseInt(fnvHash(`${revision}:${gameId}:${prefix ?? ""}`), 16);
}

/** A small generator of numbers in [0, 1) from a seed (mulberry32): the same seed gives the same numbers. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A pointer's place on a field (docs/13 2.9), 0 to 1 across and down its box (clamped): a drawing game's points do not
 * depend on the screen's size.
 */
export function fieldPoint(event: { clientX: number; clientY: number }, field: { getBoundingClientRect(): { left: number; top: number; width: number; height: number } }): { x: number; y: number } {
  const box = field.getBoundingClientRect();
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  return { x: clamp(box.width ? (event.clientX - box.left) / box.width : 0), y: clamp(box.height ? (event.clientY - box.top) / box.height : 0) };
}
