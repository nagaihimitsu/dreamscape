import { z } from "zod";

/**
 * A story's address (the unified event design, stage 3a, 3.1): a story file's ID
 * (`dates/milano_date_cafe`, the file's place under stories/), and for a scene of a place file
 * also its knot after a dot (`places/smp_mihon_clock_tower.smp_mihon_clock_bookmark_stall`).
 * The game starts that Ink path (a knot, or a knot's stitch) by name (beginStory). Light module (zod only).
 */
export const STORY_FILE_PATTERN = /^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/u;
export const STORY_ADDRESS_PATTERN = /^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+(?:\.[a-z][a-z0-9_]*){0,2}$/u;
/** A catalog's story field: a story file, or a place file's knot. */
export const storyAddressSchema = z.string().regex(STORY_ADDRESS_PATTERN);
/** The folder of the place files under stories/ (3.1). */
export const PLACE_FOLDER = "places";

/** The story file an address is in, and the Ink path (knot, knot.stitch) it starts at, if any. */
export function splitStoryAddress(address: string): { storyId: string; path?: string } {
  const dot = address.indexOf(".");
  return dot < 0 ? { storyId: address } : { storyId: address.slice(0, dot), path: address.slice(dot + 1) };
}
/** The story file of an address. */
export const storyFileOf = (address: string) => splitStoryAddress(address).storyId;
/** The knot of an address (undefined for a whole file). */
export const storyKnotOf = (address: string) => splitStoryAddress(address).path?.split(".")[0];
/** The address of a knot of a story file. */
export const knotAddress = (storyId: string, knot: string) => `${storyId}.${knot}`;
/** A place file (stories/places/…): its scenes are knots with head tags. */
export const isPlaceStory = (storyId: string) => storyId.startsWith(`${PLACE_FOLDER}/`);
