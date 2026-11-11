import type { ObservationRegion } from "../../content/tourism-schemas";

/** The most the reveal zooms in (a photo shown in a small frame stays sharp enough). */
export const REVEAL_MAX_SCALE = 2.4;
/** The share of the frame the region fills at most once zoomed, in either direction (the rest shows around it). */
const REVEAL_FILL = 0.7;

/** A zoom of the photo: its scale about an origin, both as fractions (0–1) of the photo's width and height. */
export type RevealZoom = { scale: number; originX: number; originY: number };

/**
 * How the reveal under an answer's explanation (a question's revealRegion) zooms its photo, framed at the photo's own
 * proportions: up to REVEAL_FILL of the frame for the region and never past REVEAL_MAX_SCALE; a region larger than
 * that is only outlined (scale 1). The origin brings the region's centre to the frame's centre, kept inside the photo,
 * so the zoomed photo always covers its frame and the whole region stays in it.
 */
export function revealZoom(region: ObservationRegion): RevealZoom {
  const scale = Math.min(REVEAL_MAX_SCALE, Math.max(1, REVEAL_FILL / Math.max(region.width, region.height)));
  const centreX = region.x + region.width / 2;
  const centreY = region.y + region.height / 2;
  if (scale === 1) return { scale, originX: centreX, originY: centreY };
  // A scale s about o takes the centre c to o + s(c − o); it lands on 0.5 for o = (sc − 0.5) / (s − 1).
  const origin = (centre: number) => Math.min(1, Math.max(0, (scale * centre - 0.5) / (scale - 1)));
  return { scale, originX: origin(centreX), originY: origin(centreY) };
}
