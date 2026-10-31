import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/);

/** Presentation-only annotations: neither the Ink source nor saved frames change. */
export const dialogueExpressionCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(z.object({
    storyId,
    text: z.string().trim().min(1),
    speaker: z.enum(["heroine", "narrator"]),
    emotion: id,
  }).strict()),
}).strict().superRefine(({ entries }, context) => {
  const keys = new Set<string>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.storyId, entry.speaker, entry.text]);
    if (keys.has(key)) context.addIssue({ code: "custom", message: `Duplicate dialogue expression: ${entry.storyId}/${entry.text}` });
    keys.add(key);
  }
});

export type DialogueExpressionCatalog = z.infer<typeof dialogueExpressionCatalogSchema>;
export type ExpressionFrame = { text: string; speaker: "narrator" | "heroine" | "player" | "enemy"; emotion: string };

/** A battle enemy's expression is never used for the heroine. Explicit Ink emotions win. */
export function resolveDialogueExpression(catalog: DialogueExpressionCatalog, storyId: string, frame: ExpressionFrame): string {
  if (frame.speaker === "enemy" || frame.speaker === "player") return "neutral";
  if (frame.emotion !== "neutral") return frame.emotion;
  return catalog.entries.find((entry) => entry.storyId === storyId && entry.speaker === frame.speaker && entry.text === frame.text)?.emotion ?? frame.emotion;
}
