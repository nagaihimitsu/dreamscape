import { z } from "zod";
import { contentId as id } from "./content-id";
import { japaneseText as japanese } from "./text-language";
import { SOUND_ID } from "./sounds";

/**
 * In-city transport. Walking is built in; a journey declares up to two more
 * modes in its manifest (`transportModes`). Routes, the transit ledger and
 * rentals name a mode by its ID; the screens take its labels and art from
 * the declaration. Intercity travel (`intercityModes`) is separate.
 */
export const transportKinds = ["rail", "tram", "bus", "car", "three_wheeler", "bicycle"] as const;
export type TransportKind = typeof transportKinds[number];
/** The kinds that have built-in transition art: walking plus every declarable kind. */
export type TransportArtKind = "walk" | TransportKind;
export const WALK_MODE_ID = "walk";



export const transportModeSchema = z.object({
  /** Journey-local and saved (rented modes), so it never changes once the journey is public. */
  id: id.refine((value) => value !== WALK_MODE_ID, "walk is built in; do not declare it"),
  /** Short name on route buttons, destination lines and the rest options (e.g. 「路面電車」). */
  nameJa: japanese,
  /** Caption of the travel transition (e.g. 「タクシーで移動中」). */
  movingJa: japanese,
  /** Which built-in transition art the mode uses. */
  kind: z.enum(transportKinds),
  /**
   * The mode is ridden only after renting it in the city (an offer in
   * `travel/<city>-settings.json` `rentals`); the rental lasts until the
   * party leaves the city. A placeholder until the common condition system.
   */
  rental: z.literal(true).optional(),
  /**
   * The sound of the ride's transition, in place of its kind's (`travel_<kind>`): a shared sound or one of the journey's
   * own presentation/sounds.json (content:build checks it, scripts/sound-files.ts).
   */
  se: z.string().regex(SOUND_ID).optional(),
}).strict();
export type DeclaredTransportMode = z.infer<typeof transportModeSchema>;
export type TransportMode = Omit<DeclaredTransportMode, "kind"> & { kind: TransportArtKind };

export const WALK_MODE: TransportMode = { id: WALK_MODE_ID, nameJa: "徒歩", movingJa: "歩いて移動中", kind: "walk" };
