import { z } from "zod";
import { stableContentId } from "./stable-id";

/**
 * The moment record (時点の記録; the unified event design, stage 3b, 4.5): the occasion the game is
 * running now — a landmark's visit, a city finale or a date opened from the map, or a visit a
 * `# then: move` opened — with what was decided when it opened (its main group and order) and how
 * far it has gone. Light module (zod only): the save schema reads it.
 */
/**
 * The main steps (本筋の組, 0) of the moments: a visit's guide, observation and battle; a date and its
 * 「交際開始」 screen; stage 4: the trip's move (place, time, rides) and the ticket counter's entry before
 * a map event's moment, the hotel's sleep, the city's epilogue, the departure (the items left behind,
 * then the next city), an arrival's logo and its conversation; tour stages 2b and 3: a tour leg's
 * narration ("leg"; `after leg` follows it) and its move ("leg_move": the leg's place and minutes).
 */
export const OCCASION_PARTS = ["guide", "observe", "battle", "date", "ending", "move", "ticket", "sleep", "epilogue", "depart", "logo", "arrival",
  "leg", "leg_move"] as const;
export type OccasionPart = (typeof OCCASION_PARTS)[number];
const part = z.enum(OCCASION_PARTS);

/** A `# then:` decided while its scene runs (chosen, or the scene's head at its start): paid then, run when the scene ends. */
export const occasionThenSchema = z.union([
  z.object({
    move: stableContentId, modeId: stableContentId, minutes: z.number().int().nonnegative(),
    /** The map event whose main part the visit there opens (null: a visit with no main part, decision 20). */
    eventId: stableContentId.nullable(),
    sceneId: stableContentId,
  }).strict(),
  z.object({ epilogue: z.literal(true), sceneId: stableContentId }).strict(),
]);
export type OccasionThen = z.infer<typeof occasionThenSchema>;

/**
 * The move of a trip still to apply (stage 4: its trip moment's scenes run at the place it leaves; the
 * "move" part applies it). Fare and admission were paid when it was decided.
 */
export const occasionTripSchema = z.object({
  from: stableContentId, to: stableContentId, modeId: stableContentId,
  arrivalMinute: z.number().int().min(540).max(1980),
}).strict();
export type OccasionTrip = z.infer<typeof occasionTripSchema>;

export const OCCASION_KINDS = ["visit", "battle", "date", "hotel", "epilogue", "depart", "arrive", "tour"] as const;
export type OccasionKind = (typeof OCCASION_KINDS)[number];

/** The tour step an occasion runs (tour stages 2b, 3): its `# at: tour <tour> <step>` scenes run around it. */
export const occasionTourSchema = z.object({ id: stableContentId, step: stableContentId }).strict();
export type OccasionTour = z.infer<typeof occasionTourSchema>;

export const occasionSchema = z.object({
  /**
   * A landmark's visit, a battle (a finale), a date (the map's); stage 4: a rest at the hotel, the city's epilogue, its departure, an
   * arrival; tour stages 2b, 3: a running tour's leg (its scenes, its narration, its move).
   */
  kind: z.enum(OCCASION_KINDS),
  /** The city of a hotel's, an epilogue's, a departure's, an arrival's or a tour leg's moment (stage 4). */
  cityId: stableContentId.optional(),
  /** A running tour's step (tour stages 2b, 3): a tour leg's own occasion, or the visit of the tour's event step. */
  tour: occasionTourSchema.optional(),
  /** The trip before the moment (stage 4; the "move" part applies it). */
  trip: occasionTripSchema.optional(),
  /** The ticket counter's place (stage 4; the "ticket" part is the entry, admission paid on departing). */
  ticket: stableContentId.optional(),
  /** The map event it opened for (null: a visit a then: move opened without a main part to play). */
  eventId: stableContentId.nullable(),
  /** A visit's landmark. */
  landmarkId: stableContentId.nullable(),
  /** The main group decided when it opened, in its order (a visit: its landmark's order; a date: the date and, for a confession, the 「交際開始」 screen). */
  parts: z.array(part),
  /** A special battle's revisit: its observation opens only when an `after observe` scene waits at its turn (4.3). */
  observeIfWaiting: z.literal(true).optional(),
  /** The main parts that ran in this occasion (`after <part>` runs only after these). */
  ran: z.array(part),
  /** The last step started: an inserted scene's ID, `main:<part>`, or `left:observe` once the observation was left. */
  at: z.string().min(1).nullable(),
  /** The inserted scenes started in this occasion (each runs at most once in it). */
  started: z.array(stableContentId),
  then: occasionThenSchema.optional(),
  /** A then: move opened this visit: the mode it moved by; the travel art plays from this mark (4.7). */
  moved: stableContentId.optional(),
  /**
   * The finale result's 「エピローグへ」 was pressed (stage 4): the rest of the finale's moment (after battle, its positive
   * scenes) runs first, and the city's epilogue opens as it ends.
   */
  onClose: z.literal("epilogue").optional(),
  /** The 「交際開始」 screen is showing (a step of the date's occasion; saved, so a reload shows it again). */
  romanceEnding: z.literal(true).optional(),
}).strict();
export type Occasion = z.infer<typeof occasionSchema>;
