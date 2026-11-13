/**
 * The rules of the header's cues (JourneyHud; display only, the header always shows the values themselves). A cue
 * plays for a change the player sees in play: never for what a load, a new game or Debug's return brings.
 */

export type Direction = "up" | "down";

/** A budget or AP that rose or fell. */
export const numberChange = (seen: number, now: number): Direction | null => now > seen ? "up" : now < seen ? "down" : null;

/**
 * An item the header has not shown before, from the header's item IDs joined by line breaks (one used or given away
 * only leaves the row: spentItemIds says that).
 */
export const itemsChange = (seen: string, now: string): Direction | null => {
  const before = seen.split("\n");
  return now.split("\n").some((id) => id !== "" && !before.includes(id)) ? "up" : null;
};

/** What flies into a header value as it rises (2026-11-13 user decision): coins into the budget, stars into the AP. */
export type FlightKind = "coin" | "star";

/**
 * How many tokens fly, 3 to 5 (0 when the value did not rise): coins by the receipt's share of the budget it makes (the
 * currencies differ by city, so not by the amount), stars by the AP gained.
 */
export function flightTokens(kind: FlightKind, before: number, now: number): number {
  const rise = now - before;
  if (!(rise > 0)) return 0;
  if (kind === "star") return Math.min(5, Math.max(3, rise + 2));
  const share = rise / Math.max(now, 1);
  return share >= 0.5 ? 5 : share >= 0.2 ? 4 : 3;
}

/** Between the tokens' starts (milliseconds); each flies for FLIGHT_MS (hud-effects.css: the same times). */
export const FLIGHT_STAGGER_MS = 70;
export const FLIGHT_MS = 520;

/** Where the tokens start around the screen's centre (px), the first ones nearest. */
const SPREAD: readonly (readonly [number, number])[] = [[-34, 8], [30, -16], [-6, -36], [42, 24], [-44, -24]];

type Box = { left: number; top: number; width: number; height: number };
/** A token's start (relative to the layer it is drawn in), its way to the target's centre and its delay. */
export type FlightPath = { x: number; y: number; dx: number; dy: number; delayMs: number };

/**
 * The paths of `count` tokens (at most 5) from around the centre of the screen (`viewport`) into the centre of `target`,
 * relative to `origin`, the top left corner of the layer that draws them (all in the screen's px).
 */
export function flightPaths(count: number, viewport: { width: number; height: number }, origin: { left: number; top: number }, target: Box): FlightPath[] {
  const endX = target.left + target.width / 2 - origin.left;
  const endY = target.top + target.height / 2 - origin.top;
  return SPREAD.slice(0, Math.max(0, count)).map(([offsetX, offsetY], index) => {
    const x = viewport.width / 2 + offsetX - origin.left;
    const y = viewport.height / 2 + offsetY - origin.top;
    return { x, y, dx: endX - x, dy: endY - y, delayMs: index * FLIGHT_STAGGER_MS };
  });
}
