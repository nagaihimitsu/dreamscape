import { z } from "zod";
import { SNS_IMAGE_ID } from "../content/sns";
import { stableContentId } from "./stable-id";

// The save's SNS record (2026-11-26 user decisions, an optional field of save v23; src/domain/sns.ts): what has arrived on
// the SNS, each once, in the order it arrived, with the night it came (the city, its day and the minute of the game clock),
// and the posts the player likes. What arrived is kept as it was (the heroine's photos and the people who liked it as it
// came), so a post never changes once it is there.

const arrivalFields = {
  cityId: stableContentId,
  day: z.number().int().positive().safe(),
  minute: z.number().int().min(540).max(1980),
};

/** An arrived post: its ID, its night, the heroine's photos it shows (those taken by then) and its `# likes:` people then. */
export const snsArrivedPostSchema = z.object({
  id: stableContentId,
  ...arrivalFields,
  imageIds: z.array(z.string().regex(SNS_IMAGE_ID)).min(1),
  likes: z.array(stableContentId),
}).strict();
export type SnsArrivedPost = z.infer<typeof snsArrivedPostSchema>;

/** An arrived comment: `<post>.<comment>` and its night. */
export const snsArrivedCommentSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/u),
  ...arrivalFields,
}).strict();
export type SnsArrivedComment = z.infer<typeof snsArrivedCommentSchema>;

const once = (items: readonly { id: string }[]) => new Set(items.map((item) => item.id)).size === items.length;
export const snsStateSchema = z.object({
  posts: z.array(snsArrivedPostSchema).refine(once, "同じ投稿が2回届いています。"),
  comments: z.array(snsArrivedCommentSchema).refine(once, "同じコメントが2回届いています。"),
  /** The posts the player likes now (pressing again takes the like back). */
  liked: z.array(stableContentId).refine((items) => new Set(items).size === items.length, "同じ投稿に2回いいねしています。"),
}).strict();
export type SnsState = z.infer<typeof snsStateSchema>;

export const EMPTY_SNS: SnsState = { posts: [], comments: [], liked: [] };
