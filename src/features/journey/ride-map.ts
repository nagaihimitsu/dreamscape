// The small map card of a ride (2026-11-13 user decision; TravelTransition): the place left and the place reached as two
// dots with their names, and a straight dotted line between them that draws itself over the ride (no road routing). Pure
// geometry over the places' map positions, in the projection the maps use (Web Mercator: map-focus.ts project).
import { cityContents } from "../../content";
import type { GameState } from "../../domain/game";
import { project, type LatLng } from "./map-focus";
import { placeDisplayName } from "./travel-labels";

/** A place of the ride: its map position and its name as the screens write it (the hotel is 「滞在先のホテル」). */
export type RideStop = LatLng & { nameJa: string };
export type RideRoute = { from: RideStop; to: RideStop };

/**
 * The ride between two places of the party's city, or undefined when either cannot be found or both are the same place
 * (the card is then left out). Names as the screens write them.
 */
export function rideRoute(
  game: Pick<GameState, "currentCityId"> & { travel: Pick<GameState["travel"], "hotelPlaceId"> },
  fromPlaceId: string | undefined,
  toPlaceId: string | undefined,
): RideRoute | undefined {
  if (!fromPlaceId || !toPlaceId || fromPlaceId === toPlaceId) return undefined;
  const places = cityContents[game.currentCityId]?.travel.places ?? [];
  const stop = (id: string): RideStop | undefined => {
    const place = places.find((item) => item.id === id);
    return place && { latitude: place.latitude, longitude: place.longitude, nameJa: placeDisplayName(game, place) };
  };
  const from = stop(fromPlaceId);
  const to = stop(toPlaceId);
  return from && to ? { from, to } : undefined;
}

/** The card's drawing area (SVG units): room at the sides for the dots, above and below for the names. */
export const RIDE_MAP = { width: 220, height: 84, padX: 16, padTop: 24, padBottom: 24 } as const;
/** The gap between the line's dots, and the room the line leaves around each end's dot. */
const DOT_SPACING = 7;
const FROM_GAP = 8;
const TO_GAP = 9;
/** A name's lines (travel-transition.css: 12-unit type, .02em apart): a full-width character's width, the line height. */
const NAME_EM = 12.24;
export const RIDE_NAME_LINE = 14;
/** How far a name keeps from the card's sides and from the other name on its row. */
const NAME_EDGE = 4;
const NAME_GAP = 4;
/** A name's ink above its baseline and below it (with its halo), and the room it keeps from the card's top and bottom. */
const NAME_ASCENT = 11;
const NAME_DESCENT = 3;
const NAME_MARGIN = 2;
/** The most lines a name takes; a name longer still ends its last line with 「…」 (no place name comes near). */
export const RIDE_NAME_LINES = 3;

export type RidePoint = { x: number; y: number };
/** A name: where its first line's baseline starts (or is centred, or ends), and its lines, top to bottom. */
export type RideLabel = RidePoint & { anchor: "start" | "middle" | "end"; lines: string[] };
/** `height`: the drawing's height (RIDE_MAP.height, more when a name takes more lines than the card has room for). */
export type RideMapLayout = { height: number; from: RidePoint; to: RidePoint; dots: RidePoint[]; labels: { from: RideLabel; to: RideLabel } };

/** Where a name may go to its next line: after 「・」, 「、」, a closing bracket or a space, or before an opening bracket. */
const breaksBetween = (char: string, next: string) => /[・、）)\s]/.test(char) || /[（(]/.test(next);
/** What a line never starts with when a name has to break elsewhere: the long vowel mark, small kana, closing marks. */
const NO_LINE_START = /[ー・、。）)ァィゥェォッャュョヮぁぃぅぇぉっゃゅょゎ]/;

/**
 * A name as the card writes it, in lines of at most `maxChars` characters: whole, on one line when it fits, else broken
 * at the last point within a line where a name reads well broken (after 「・」 and the like; breaksBetween), or at the
 * line's end when it has none (never before 「ー」 or a small kana). At most `maxLines` lines; what does not fit in them
 * ends the last with 「…」.
 */
export function wrapPlaceName(name: string, maxChars: number, maxLines = RIDE_NAME_LINES): string[] {
  const lines: string[] = [];
  let rest = Array.from(name.trim());
  while (rest.length > maxChars && lines.length < maxLines - 1) {
    let cut = 0;
    for (let at = Math.min(maxChars, rest.length - 1); at > 0 && !cut; at--) if (breaksBetween(rest[at - 1], rest[at])) cut = at;
    if (!cut) {
      cut = maxChars;
      while (cut > 1 && NO_LINE_START.test(rest[cut])) cut--;
    }
    lines.push(rest.slice(0, cut).join("").trimEnd());
    rest = Array.from(rest.slice(cut).join("").trimStart());
  }
  lines.push(rest.length <= maxChars ? rest.join("") : `${rest.slice(0, Math.max(1, maxChars - 1)).join("")}…`);
  return lines;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Where the card draws the ride: both places fitted into the drawing area at one scale (north up, as the maps), centred;
 * the dots of the line from the place left to the place reached, in that order (the line draws itself in it); each name
 * above its dot when the dot is in the upper half, else below it, starting at the dot on the left third, ending at it on
 * the right third, centred between. Each name is whole (2026-11-13): in lines as wide as its side of the card leaves it
 * (half the row each when both names share a row, so they never meet; wrapPlaceName), the drawing a little taller when
 * its lines need the room. Null when both positions are the same (no line).
 */
export function rideMapLayout(route: RideRoute): RideMapLayout | null {
  const a = project(route.from, 0);
  const b = project(route.to, 0);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return null;
  const { width, height, padX, padTop, padBottom } = RIDE_MAP;
  const innerWidth = width - 2 * padX;
  const innerHeight = height - padTop - padBottom;
  const scale = Math.min(dx ? innerWidth / Math.abs(dx) : Infinity, dy ? innerHeight / Math.abs(dy) : Infinity);
  const centre = { x: padX + innerWidth / 2, y: padTop + innerHeight / 2 };
  const from = { x: round(centre.x - (dx * scale) / 2), y: round(centre.y - (dy * scale) / 2) };
  const to = { x: round(centre.x + (dx * scale) / 2), y: round(centre.y + (dy * scale) / 2) };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const span = length - FROM_GAP - TO_GAP;
  const count = span > 0 ? Math.floor(span / DOT_SPACING) + 1 : 0;
  const dots = Array.from({ length: count }, (_, index) => {
    const at = (FROM_GAP + (count > 1 ? (span * index) / (count - 1) : span / 2)) / length;
    return { x: round(from.x + (to.x - from.x) * at), y: round(from.y + (to.y - from.y) * at) };
  });
  // Where each name stands: by its dot, above or below it, and on which side of its x it runs.
  const ends = [from, to].map((point) => {
    const anchor: RideLabel["anchor"] = point.x < width / 3 ? "start" : point.x > (2 * width) / 3 ? "end" : "middle";
    const x = round(Math.min(width - NAME_EDGE, Math.max(NAME_EDGE, anchor === "start" ? point.x - 6 : anchor === "end" ? point.x + 6 : point.x)));
    return { point, anchor, x, above: point.y <= centre.y };
  });
  // Both names on one row (an east–west ride): half the room between them each; else the room to the card's side.
  const shareRow = ends[0].above === ends[1].above;
  const room = ({ anchor, x }: (typeof ends)[number], other: (typeof ends)[number]) =>
    shareRow ? (Math.abs(other.x - x) - NAME_GAP) / 2
      : anchor === "start" ? width - NAME_EDGE - x : anchor === "end" ? x - NAME_EDGE : 2 * Math.min(x - NAME_EDGE, width - NAME_EDGE - x);
  const [fromLabel, toLabel] = ends.map((end, index): RideLabel => {
    const lines = wrapPlaceName(index ? route.to.nameJa : route.from.nameJa, Math.max(1, Math.floor(room(end, ends[1 - index]) / NAME_EM)));
    const y = end.above ? end.point.y - 10 - (lines.length - 1) * RIDE_NAME_LINE : end.point.y + 18;
    return { x: end.x, y, anchor: end.anchor, lines };
  });
  // Room for names longer than a line: the drawing grows above or below, the ride where it was.
  const labels = [fromLabel, toLabel];
  const top = Math.min(...labels.map((label) => label.y - NAME_ASCENT));
  const bottom = Math.max(...labels.map((label) => label.y + (label.lines.length - 1) * RIDE_NAME_LINE + NAME_DESCENT));
  const extraTop = Math.max(0, Math.ceil(NAME_MARGIN - top));
  const extraBottom = Math.max(0, Math.ceil(bottom - (height - NAME_MARGIN)));
  const down = <T extends RidePoint>(point: T): T => ({ ...point, y: round(point.y + extraTop) });
  return {
    height: height + extraTop + extraBottom,
    from: down(from), to: down(to), dots: dots.map(down), labels: { from: down(fromLabel), to: down(toLabel) },
  };
}
