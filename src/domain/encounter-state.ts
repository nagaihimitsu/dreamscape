import { z } from "zod";
import { storyFrameSchema } from "../story/runtime";
import { responseProfileSchema } from "../content/schemas";

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
  // A place file's scene (stage 3a; scene-effects.ts): the choices made so far, in order, with the result
  // of each `# profile:` choice (its roll drawn when it was chosen; decision 39).
  chosen: z.array(z.object({ optionId: z.string().min(1), result: z.enum(["positive", "negative"]).optional(),
    roll: z.number().int().min(0).max(9999).optional() }).strict()).optional(),
  // Where the encounter goes on from is the moment record (state.occasion; stage 3b), not the encounter.
}).strict();

export type ActiveEncounter = z.infer<typeof activeEncounterSchema>;
