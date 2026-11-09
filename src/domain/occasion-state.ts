import { z } from "zod";
import { stableContentId } from "./stable-id";

/**
 * The moment record (時点の記録; the unified event design, stage 3b, 4.5): the occasion the game is
 * running now — a landmark's visit, a city finale or a date opened from the map, or a visit a
 * `# then: move` opened — with what was decided when it opened (its main group and order) and how
 * far it has gone. Light module (zod only): the save schema reads it.
 */
export const OCCASION_PARTS = ["guide", "observe", "battle", "date", "ending"] as const;
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

export const occasionSchema = z.object({
  kind: z.enum(["visit", "battle", "date"]),
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
  /** The 「交際開始」 screen is showing (a step of the date's occasion; saved, so a reload shows it again). */
  romanceEnding: z.literal(true).optional(),
}).strict();
export type Occasion = z.infer<typeof occasionSchema>;
