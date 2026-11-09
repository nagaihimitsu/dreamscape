// Free time's sticky mini map (UI redesign §3.4, U22): the map block stays under
// the header while the list scrolls, as long as the list keeps room for about
// two rows between the stuck map and the bottom band.

/** The map block's height at its smallest frame (140 px) plus its 8-px bottom padding. */
export const MAP_BLOCK_MIN_PX = 148;

/**
 * The least list area (px) between the stuck map (or, side by side, the header)
 * and the bottom band for the map to stick: about two rows. Measured in step
 * 1.5 at 320×460, 375×553, 568×320 and with 200 % text (Chromium).
 */
export const MAP_STICKY_MIN_LIST_PX = 150;

/** The media query of phones held sideways, where the map and the list stand side by side. */
export const SIDE_BY_SIDE_QUERY = "(orientation: landscape) and (max-height: 559px)";

export type FreeTimeHeights = {
  /** The visible height with the browser's bars shown (100svh). */
  viewport: number;
  /** The header's measured height. */
  hud: number;
  /** The bottom band's measured height. */
  band: number;
  /** Map and list side by side (SIDE_BY_SIDE_QUERY). */
  sideBySide: boolean;
};

/** The list area the stuck map would leave (side by side the list has the whole height beside it). */
export function stuckListArea({ viewport, hud, band, sideBySide }: FreeTimeHeights): number {
  return viewport - hud - band - (sideBySide ? 0 : MAP_BLOCK_MIN_PX);
}

/** Whether the map block sticks under the header (otherwise it scrolls with the page). */
export function mapSticks(heights: FreeTimeHeights): boolean {
  return stuckListArea(heights) >= MAP_STICKY_MIN_LIST_PX;
}
