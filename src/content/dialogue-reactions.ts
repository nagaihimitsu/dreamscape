import { z } from "zod";

/** Named display assets only; these do not change the story or game state. */
export const REACTION_MARKS = [
  "question", "exclamation", "interrobang", "anger", "sweat", "blush",
  "gloom", "dizzy", "music", "heart", "sparkle", "sleep", "sigh",
] as const;
export type ReactionMark = (typeof REACTION_MARKS)[number];
export type ReactionTarget = "heroine" | "enemy";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/);
const reactionEntrySchema = z.object({
  storyId,
  speaker: z.enum(["narrator", "heroine", "player", "enemy"]),
  text: z.string().trim().min(1),
  targetCharacterId: z.enum(["heroine", "enemy"]),
  expression: id.optional(),
  mark: z.enum(REACTION_MARKS).optional(),
}).strict().refine((entry) => entry.expression !== undefined || entry.mark !== undefined,
  "A dialogue reaction requires an expression or a mark");

export const dialogueReactionCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(reactionEntrySchema),
}).strict().superRefine(({ entries }, context) => {
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.storyId, entry.speaker, entry.text, entry.targetCharacterId]);
    if (keys.has(key)) context.addIssue({ code: "custom", message: `Duplicate dialogue reaction: ${entry.storyId}/${entry.speaker}/${entry.text}/${entry.targetCharacterId}` });
    keys.add(key);
  }
});

export type DialogueReactionCatalog = z.infer<typeof dialogueReactionCatalogSchema>;
export type DialogueReaction = Pick<DialogueReactionCatalog["entries"][number], "expression" | "mark">;

/** Resolves only the current rendered line, without changing Ink or saved data. */
export function resolveDialogueReaction(
  catalog: DialogueReactionCatalog,
  storyId: string,
  frame: { text: string; speaker: "narrator" | "heroine" | "player" | "enemy" },
  targetCharacterId: ReactionTarget,
): DialogueReaction | undefined {
  const found = catalog.entries.find((entry) => entry.storyId === storyId && entry.speaker === frame.speaker && entry.text === frame.text && entry.targetCharacterId === targetCharacterId);
  return found && { expression: found.expression, mark: found.mark };
}
