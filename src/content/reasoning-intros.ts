import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/);

/** Presentation-only dialogue; excluded from battle rules and their save hash. */
export const reasoningIntroCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(z.object({ battleId: id, storyId }).strict()),
}).strict().superRefine(({ entries }, context) => {
  const ids = new Set<string>();
  entries.forEach((entry, index) => {
    if (ids.has(entry.battleId)) context.addIssue({
      code: "custom", path: ["entries", index, "battleId"],
      message: `Duplicate reasoning introduction battle: ${entry.battleId}`,
    });
    ids.add(entry.battleId);
  });
});
