import { z } from "zod";
import { storyFrameSchema } from "../story/runtime";
import { responseProfileSchema } from "../content/schemas";
import { encounters } from "../content/encounters";
import { stableContentId } from "./stable-id";

const roll = z.number().int().min(0).max(9999);

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
  // Where the encounter goes on from: exactly one of these (validateEncounterState checks it matches the
  // encounter's slot of its landmark's visit). The landmark observation it returns to (a return point,
  // not a second active scene), for an encounter met while observing.
  returnTourism: z.object({ landmarkId: z.string().min(1), contentHash: z.string().min(1), encounterIds: z.array(z.string().min(1)).optional() }).strict().optional(),
  // After the landmark's main part: the battle whose result was left to free time and the encounters of
  // that chain so far, in play order (the last is this one).
  afterBattle: z.object({ battleId: stableContentId, encounterIds: z.array(stableContentId) }).strict().optional(),
  // Before the main part: the map event the trip goes to and its mode; the main part opens after the last
  // of these encounters (the unified event design, stage 1).
  trip: z.object({ eventId: stableContentId, modeId: stableContentId }).strict().optional(),
}).strict().refine((active) => [active.returnTourism, active.afterBattle, active.trip].filter(Boolean).length <= 1,
  "An encounter has at most one moment to continue from");

export type ActiveEncounter = z.infer<typeof activeEncounterSchema>;

export function validObservationEncounterIds(landmarkId: string, ids?: string[]): boolean {
  return !ids || (new Set(ids).size === ids.length && ids.every((id) =>
    encounters.encounters.some((event) => event.id === id && event.landmarkId === landmarkId)));
}
