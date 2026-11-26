import { z } from "zod";
import { CONTENT_ID_PATTERN } from "../content/content-id";
import type { GameState } from "./game-state-schema";
import { stableContentId } from "./stable-id";

// When and where each person was first met (2026-11-26 user decision, for the SNS's person pages and the faces of its days;
// authoring/SNS_PLAN.md 「先に片付けること」): an optional field of save v23 (the version not raised). The action that first
// lists a person among the people met (met-people.ts metPeople) records the city, its day, the minute of the game clock and
// the place the party is at, in the order met. A save written before it has no time for the people it had met; they stay
// without one (never the time of a later action). Debug plays in its own memory storage, so nothing it records reaches the
// normal save.

export const metTimeSchema = z.object({
  /** The met entry's ID: a person's, or `quiz:<battle ID>` for a quiz's own partner. */
  id: z.string().regex(new RegExp(`^(?:quiz:)?${CONTENT_ID_PATTERN.source.slice(1, -1)}$`, "u")),
  /** Where the party was: the city, its day and the minute of the game clock (as the header showed them), the place. */
  cityId: stableContentId,
  day: z.number().int().positive().safe(),
  minute: z.number().int().min(540).max(1980),
  placeId: stableContentId,
}).strict();
export type MetTime = z.infer<typeof metTimeSchema>;

export const metTimesSchema = z.array(metTimeSchema)
  .refine((items) => new Set(items.map((item) => item.id)).size === items.length, "同じ人に会った記録が2つあります。");

/** When and where the save says `personId` was first met; undefined when it does not know (not met, or met before it kept times). */
export const metTimeOf = (state: Pick<GameState, "metTimes">, personId: string): MetTime | undefined =>
  state.metTimes?.find((item) => item.id === personId);

