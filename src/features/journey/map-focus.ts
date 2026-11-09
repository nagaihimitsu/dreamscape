// Where a map looks when a destination is selected (UI redesign §3.5 「Map focus on
// selection」): the destination at the frame's centre, zoomed in as far as the current
// place still shows clear of the frame's controls. Web Mercator (EPSG:3857) with 256-px
// tiles, the projection Leaflet uses.

export type LatLng = { latitude: number; longitude: number };
export type Frame = { width: number; height: number };
export type Padding = { left: number; right: number; top: number; bottom: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

/** Keeps a shown current place clear of the zoom column and 「大きく」 (72 = 54 + half a marker + 2) and of the attribution (40). */
export const FOCUS_PADDING: Padding = { left: 72, right: 72, top: 32, bottom: 40 };
export const FOCUS_MAX_ZOOM = 17;

/** A point's position in pixels of the whole world at `zoom`. */
export function project({ latitude, longitude }: LatLng, zoom: number): { x: number; y: number } {
  const size = 256 * 2 ** zoom;
  const lat = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * size,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * size,
  };
}

/** The largest integer zoom ≤ `maxZoom` at which every point fits the frame less `padding` on each side (as the overview's fitBounds). */
export function fitZoom(points: readonly LatLng[], frame: Frame, padding: number, maxZoom: number): number {
  for (let zoom = maxZoom; zoom > 0; zoom--) {
    const projected = points.map((point) => project(point, zoom));
    const xs = projected.map((point) => point.x);
    const ys = projected.map((point) => point.y);
    if (Math.max(...xs) - Math.min(...xs) <= frame.width - 2 * padding && Math.max(...ys) - Math.min(...ys) <= frame.height - 2 * padding) return zoom;
  }
  return 0;
}

function offset(destination: LatLng, current: LatLng, zoom: number) {
  const a = project(destination, zoom);
  const b = project(current, zoom);
  return { dx: b.x - a.x, dy: b.y - a.y };
}

function inside({ dx, dy }: { dx: number; dy: number }, frame: Frame, padding: Padding) {
  return dx >= -(frame.width / 2 - padding.left) && dx <= frame.width / 2 - padding.right &&
    dy >= -(frame.height / 2 - padding.top) && dy <= frame.height / 2 - padding.bottom;
}

/**
 * The view for a selection: centre = the destination; zoom = the largest integer zoom ≤
 * `maxZoom` at which the current place lies inside the padded frame, but at least
 * `overviewZoom + 1` (a selection always zooms in). When the current place does not fit at
 * that floor it is left out (`showsCurrent: false`). Current place = destination → `maxZoom`.
 */
export function getFocusView({ destination, current, frame, padding = FOCUS_PADDING, overviewZoom, maxZoom = FOCUS_MAX_ZOOM }: {
  destination: LatLng;
  current: LatLng | null;
  frame: Frame;
  padding?: Padding;
  overviewZoom: number;
  maxZoom?: number;
}): { center: LatLng; zoom: number; showsCurrent: boolean } {
  const center = { latitude: destination.latitude, longitude: destination.longitude };
  if (!current || (current.latitude === destination.latitude && current.longitude === destination.longitude))
    return { center, zoom: maxZoom, showsCurrent: !!current };
  const floor = Math.min(maxZoom, overviewZoom + 1);
  for (let zoom = maxZoom; zoom >= floor; zoom--)
    if (inside(offset(destination, current, zoom), frame, padding)) return { center, zoom, showsCurrent: true };
  return { center, zoom: floor, showsCurrent: false };
}

/** The frame's controls: Leaflet's zoom column (top left), 「大きく」 (top right) and the attribution (bottom right). */
export function mapControlRects({ width, height }: Frame): Rect[] {
  return [
    { left: 10, top: 10, right: 54, bottom: 98 },
    { left: width - 54, top: 10, right: width - 10, bottom: 54 },
    { left: width - 225, top: height - 18, right: width, bottom: height },
  ];
}

/** Where `point` shows in the frame when the map is centred on `center` at `zoom`. */
export function framePosition(point: LatLng, center: LatLng, zoom: number, frame: Frame): { x: number; y: number } {
  const { dx, dy } = offset(center, point, zoom);
  return { x: frame.width / 2 + dx, y: frame.height / 2 + dy };
}

/** The selected marker's name label width (px): the frame less both side paddings, at most 180. */
export function labelMaxWidth(frameWidth: number): number {
  return Math.max(0, Math.min(180, frameWidth - FOCUS_PADDING.left - FOCUS_PADDING.right));
}
