import { z } from "zod";
import { conditionSchema } from "./condition-schemas";
import { contentId as id } from "./content-id";
import { japaneseText } from "./text-language";

// SNS (旅の記録's 「SNS」, 2026-11-26 user decisions; authoring/SNS_PLAN.md): the posts content:build reads from each journey's
// `stories/posts/<city>.ink` (scripts/sns-posts.ts) into src/content/generated/sns.json. A knot is one post, a stitch one
// comment; they are never played as scenes. What has arrived, and the player's likes, are the save's (src/domain/sns.ts).
// Light module (zod only): the runtime parses the generated file with it.

/** The folder below a journey's `public/` that holds the SNS's own pictures (people's everyday photos), apart from the album. */
export const SNS_IMAGE_FOLDER = "assets/sns";
export const SNS_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const;
/** An SNS picture's ID: its file name without the extension (as an album image's). */
export const SNS_IMAGE_ID = /^[a-z0-9_]+$/u;

/** The ID of a served path that names an SNS picture (`assets/sns/<ID>.<webp|png|jpg|jpeg>`, directly in the folder). */
export function snsImageIdOf(assetPath: string): string | undefined {
  const prefix = `${SNS_IMAGE_FOLDER}/`;
  if (!assetPath.startsWith(prefix)) return undefined;
  const name = assetPath.slice(prefix.length);
  const dot = name.lastIndexOf(".");
  const imageId = name.slice(0, dot);
  return dot > 0 && SNS_IMAGE_ID.test(imageId) && (SNS_IMAGE_EXTENSIONS as readonly string[]).includes(name.slice(dot + 1)) ? imageId : undefined;
}

/** Who writes on the SNS: the heroine, or a person of progression/story.json people (with a portrait, not hidden). */
export const SNS_HEROINE = "heroine";

/**
 * One line: who says it (`heroine` or a person's ID) and the text, the names set still as `{heroine_name}`・`{player_name}`;
 * `translationJa`, a `# translation:` for an English line.
 */
export const snsLineSchema = z.object({
  speaker: id,
  textJa: z.string().trim().min(1),
  translationJa: japaneseText.optional(),
}).strict();
export type SnsLine = z.infer<typeof snsLineSchema>;

/**
 * One comment (a stitch): its first line is the comment of its writer, the next lines the replies. `when`: `# when:` and
 * `# until:` together (it never arrives once `until` is true); `later`: `# timing: later` (it may also arrive after the
 * post's night); `oneOf`: `# one_of:` (of the post's comments with the same name, only the first to arrive is kept).
 */
export const snsCommentSchema = z.object({
  id,
  lines: z.array(snsLineSchema).min(1),
  when: conditionSchema.optional(),
  later: z.literal(true).optional(),
  oneOf: id.optional(),
}).strict();
export type SnsComment = z.infer<typeof snsCommentSchema>;

/** A `# likes:` person (or the heroine): likes the post as it arrives, when `when` holds then. */
export const snsLikeSchema = z.object({ personId: id, when: conditionSchema.optional() }).strict();

/**
 * One post (a knot). `author`: `# post:`. `imageIds`: `# images:` (album images, or for a person also SNS pictures; the
 * heroine's show only the photos taken). `where`: `# where:` (a person's post only: a place of its city, or a name).
 * `when`: `# when:` and `# until:`. `line`: its one line. `likes`: `# likes:`. `comments`: its stitches, in order.
 */
export const snsPostSchema = z.object({
  id,
  journeyId: id,
  cityId: id,
  author: id,
  imageIds: z.array(z.string().regex(SNS_IMAGE_ID)).min(1),
  where: z.union([z.object({ placeId: id }).strict(), z.object({ nameJa: japaneseText }).strict()]).optional(),
  when: conditionSchema.optional(),
  line: snsLineSchema,
  likes: z.array(snsLikeSchema),
  comments: z.array(snsCommentSchema),
}).strict();
export type SnsPost = z.infer<typeof snsPostSchema>;

/** An SNS picture of a journey: its ID, served path and journey. */
export const snsImageSchema = z.object({ id: z.string().regex(SNS_IMAGE_ID), path: z.string().min(1), journeyId: id }).strict();
export type SnsImage = z.infer<typeof snsImageSchema>;

/**
 * The generated file (src/content/generated/sns.json): every journey's posts (in file order, each ID once), the SNS
 * pictures, and the people a photo shows (`photoWith`: an album image → the people of its line's `# photo_with:`).
 */
export const snsDataSchema = z.object({
  schemaVersion: z.literal(1),
  posts: z.array(snsPostSchema),
  images: z.array(snsImageSchema),
  photoWith: z.record(z.string().regex(SNS_IMAGE_ID), z.array(id).min(1)),
}).strict();
export type SnsData = z.infer<typeof snsDataSchema>;

/** A comment's full ID, as the save and `comment <post>.<comment>` write it. */
export const snsCommentId = (postId: string, commentId: string) => `${postId}.${commentId}`;
