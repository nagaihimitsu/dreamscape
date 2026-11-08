import { z } from "zod";
import { storyFrameSchema } from "../story/runtime";
import { responseProfileSchema } from "../content/schemas";
import { encounters } from "../content/encounters";

const roll = z.number().int().min(0).max(9999);
const id = z.string().regex(/^[a-z][a-z0-9_]*$/);

/** All random tickets are committed at the start, before any choice is made. */
export const activeEncounterSchema = z.object({
  encounterId: z.string().min(1),
  runId: z.string().min(1),
  contentHash: z.string().min(1),
  storyId: z.string().min(1),
  storyHash: z.string().min(1),
  storyState: z.string().min(1),
  frame: storyFrameSchema,
  phase: z.enum(["story", "quiz", "feedback", "outcome"]),
  selectedOptionId: z.string().min(1).nullable(),
  quizAnswerId: z.enum(["A", "B", "C"]).nullable(),
  rewardRoll: roll,
  rewardChancePercent: z.number().int().min(0).max(100).nullable(),
  rewardAlreadyDrawn: z.boolean(),
  romanceRoll: z.object({ reaction: roll, affection: roll, trust: roll, spark: roll }).strict(),
  responseProfiles: z.array(responseProfileSchema),
  romanceResolution: z.object({
    profileId: z.string().min(1),
    before: z.object({ affection: z.number().int(), trust: z.number().int(), spark: z.number().int() }).strict(),
    deltas: z.object({ affection: z.number().int(), trust: z.number().int(), spark: z.number().int() }).strict(),
    result: z.enum(["positive", "negative"]),
  }).strict().nullable(),
  // An optional return point, not a second active scene. Older saves omit it.
  returnTourism: z.object({ landmarkId: z.string().min(1), contentHash: z.string().min(1), encounterIds: z.array(z.string().min(1)).optional() }).strict().optional(),
  // The other moments of the common condition system (design p5 §2.10, Appendix A), declared in the v14
  // format for stage 3, which writes them: an encounter met on leaving a battle's result (the battle and the
  // encounters of that chain), or on a trip to a map event (the event and the mode). Nothing writes them yet,
  // so validateEncounterState refuses a save that holds one.
  afterBattle: z.object({ battleId: id, encounterIds: z.array(id) }).strict().optional(),
  trip: z.object({ eventId: id, modeId: id }).strict().optional(),
}).strict().refine((active) => [active.returnTourism, active.afterBattle, active.trip].filter(Boolean).length <= 1,
  "An encounter has at most one moment to continue from");

export type ActiveEncounter = z.infer<typeof activeEncounterSchema>;

export function validObservationEncounterIds(landmarkId: string, ids?: string[]): boolean {
  return !ids || (new Set(ids).size === ids.length && ids.every((id) =>
    encounters.encounters.some((event) => event.id === id && event.landmarkId === landmarkId)));
}
