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
/** The longest name the card writes whole (「滞在先のホテル」 fits); a longer one is cut with 「…」. */
export const RIDE_NAME_MAX = 8;

export type RidePoint = { x: number; y: number };
export type RideLabel = RidePoint & { anchor: "start" | "middle" | "end"; text: string };
export type RideMapLayout = { from: RidePoint; to: RidePoint; dots: RidePoint[]; labels: { from: RideLabel; to: RideLabel } };

/** A name as the card writes it: whole up to RIDE_NAME_MAX characters, else its first ones and 「…」. */
export function shortPlaceName(name: string, max = RIDE_NAME_MAX): string {
  const chars = Array.from(name);
  return chars.length <= max ? name : `${chars.slice(0, max - 1).join("")}…`;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Where the card draws the ride: both places fitted into the drawing area at one scale (north up, as the maps), centred;
 * the dots of the line from the place left to the place reached, in that order (the line draws itself in it); each name
 * above its dot when the dot is in the upper half, else below it, starting at the dot on the left third, ending at it on
 * the right third, centred between (so the two names never meet). Null when both positions are the same (no line).
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
  const label = (point: RidePoint, name: string): RideLabel => {
    const anchor = point.x < width / 3 ? "start" : point.x > (2 * width) / 3 ? "end" : "middle";
    const x = anchor === "start" ? point.x - 6 : anchor === "end" ? point.x + 6 : point.x;
    return { x: round(Math.min(width - 4, Math.max(4, x))), y: round(point.y <= centre.y ? point.y - 10 : point.y + 18), anchor, text: shortPlaceName(name) };
  };
  return { from, to, dots, labels: { from: label(from, route.from.nameJa), to: label(to, route.to.nameJa) } };
}
