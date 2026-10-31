import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
// Paths are relative to public/; null explicitly means a temporary illustration.
const imagePath = z.string().regex(/^assets\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.(?:png|webp|svg)$/).nullable();
const variantSchema = z.object({
  emotion: id.optional(),
  costume: id.optional(),
  pose: id.optional(),
  imagePath,
}).strict().refine((variant) => variant.emotion || variant.costume || variant.pose, "A variant needs at least one selector");
const characterSchema = z.object({
  id,
  imagePath,
  placement: z.object({
    x: z.number().min(0).max(100),
    bottom: z.number().min(0).max(100),
    width: z.number().positive().max(150),
    height: z.number().positive().max(150),
    scale: z.number().positive().max(3),
    originX: z.number().min(0).max(100),
    originY: z.number().min(0).max(100),
  }).strict(),
  placeholderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  variants: z.array(variantSchema),
}).strict();
export const characterCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  characters: z.array(characterSchema).min(1),
  battleCharacters: z.record(id, id).optional(),
}).strict().superRefine(({ characters, battleCharacters }, context) => {
  const ids = new Set<string>();
  for (const character of characters) {
    if (ids.has(character.id)) context.addIssue({ code: "custom", message: `Duplicate character ID: ${character.id}` });
    ids.add(character.id);
    const selectors = new Set<string>();
    for (const variant of character.variants) {
      const key = [variant.emotion ?? "", variant.costume ?? "", variant.pose ?? ""].join("/");
      if (selectors.has(key)) context.addIssue({ code: "custom", message: `Duplicate character variant: ${character.id} ${key}` });
      selectors.add(key);
    }
  }
  for (const [battleId, characterId] of Object.entries(battleCharacters ?? {})) {
    if (!ids.has(characterId)) context.addIssue({ code: "custom", message: `Unknown character ID for battle ${battleId}: ${characterId}` });
  }
});
export type CharacterAsset = z.infer<typeof characterSchema>;
export type CharacterSelection = { emotion?: string; costume?: string; pose?: string };

/** Unregistered mappings keep the existing battle-specific fallback artwork. */
export function battleCharacterId(battleCharacters: Record<string, string> | undefined, battleId: string): string {
  return battleCharacters && Object.hasOwn(battleCharacters, battleId)
    ? battleCharacters[battleId]
    : "enemy";
}

/** A missing optional expression/costume/pose uses the most specific matching image. */
export function characterImage(character: CharacterAsset, selection: CharacterSelection): string | null {
  let selected: string | null = character.imagePath;
  let score = 0;
  for (const variant of character.variants) {
    const fields = ["emotion", "costume", "pose"] as const;
    if (fields.some((field) => variant[field] !== undefined && variant[field] !== selection[field])) continue;
    const specificity = fields.filter((field) => variant[field] !== undefined).length;
    if (specificity > score) { selected = variant.imagePath; score = specificity; }
  }
  return selected;
}
