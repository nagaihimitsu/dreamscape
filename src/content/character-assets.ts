import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const countryId = z.string().regex(/^[A-Z]{2}$/);
// Paths are relative to public/. Null is reserved for existing temporary artwork.
const assetPath = z.string().regex(/^assets\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.(?:png|webp|svg)$/);
const imagePath = assetPath.nullable();
const placementSchema = z.object({
  x: z.number().min(0).max(100),
  bottom: z.number().min(0).max(100),
  width: z.number().positive().max(150),
  height: z.number().positive().max(150),
  scale: z.number().positive().max(3),
  originX: z.number().min(0).max(100),
  originY: z.number().min(0).max(100),
}).strict();
const variantSchema = z.object({
  emotion: id.optional(),
  costume: id.optional(),
  pose: id.optional(),
  imagePath,
}).strict().refine((variant) => variant.emotion || variant.costume || variant.pose, "A variant needs at least one selector");
const poseSchema = z.object({
  id,
  canvas: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  placement: placementSchema.optional(),
  // Only delivered assets are listed. Unlisted expressions fall back to neutral.
  expressions: z.record(id, z.string().regex(/^assets\/(?!.*\.\.)[a-zA-Z0-9_./-]+\.(?:png|webp)$/)),
}).strict();
const costumeSchema = z.object({
  id,
  poses: z.array(poseSchema).min(1),
}).strict();
const characterSchema = z.object({
  id,
  imagePath,
  placement: placementSchema,
  placeholderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  variants: z.array(variantSchema),
  costumes: z.array(costumeSchema).optional(),
}).strict();
const wardrobeSchema = z.object({
  regions: z.record(id, z.object({ defaultCostume: id }).strict()),
  countries: z.record(countryId, z.object({ region: id, costume: id.optional(), pose: id.optional() }).strict()),
  cities: z.record(id, z.object({ country: countryId, costume: id.optional(), pose: id.optional() }).strict()),
  scenes: z.record(id, z.object({ costume: id, pose: id.optional() }).strict()),
}).strict();
export const characterCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  characters: z.array(characterSchema).min(1),
  battleCharacters: z.record(id, id).optional(),
  expressionIds: z.array(id).min(1).optional(),
  wardrobe: wardrobeSchema.optional(),
}).strict().superRefine(({ characters, battleCharacters, expressionIds, wardrobe }, context) => {
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
    const costumeIds = new Set<string>();
    for (const costume of character.costumes ?? []) {
      if (costumeIds.has(costume.id)) context.addIssue({ code: "custom", message: `Duplicate costume: ${character.id}/${costume.id}` });
      costumeIds.add(costume.id);
      const poseIds = new Set<string>();
      for (const pose of costume.poses) {
        if (poseIds.has(pose.id)) context.addIssue({ code: "custom", message: `Duplicate pose: ${character.id}/${costume.id}/${pose.id}` });
        poseIds.add(pose.id);
        for (const emotion of Object.keys(pose.expressions)) {
          if (expressionIds && !expressionIds.includes(emotion)) context.addIssue({ code: "custom", message: `Unknown expression: ${character.id}/${costume.id}/${pose.id}/${emotion}` });
        }
      }
    }
  }
  if (expressionIds && new Set(expressionIds).size !== expressionIds.length) context.addIssue({ code: "custom", message: "Duplicate expression ID" });
  for (const [battleId, characterId] of Object.entries(battleCharacters ?? {})) {
    if (!ids.has(characterId)) context.addIssue({ code: "custom", message: `Unknown character ID for battle ${battleId}: ${characterId}` });
  }
  if (wardrobe) {
    const heroineCostumes = characters.find((character) => character.id === "heroine")?.costumes ?? [];
    const checkCostume = (costume: string | undefined, pose: string | undefined, source: string) => {
      if (!costume) return;
      const found = heroineCostumes.find((item) => item.id === costume);
      if (!found) context.addIssue({ code: "custom", message: `Unknown wardrobe costume: ${source}/${costume}` });
      else if (pose && !found.poses.some((item) => item.id === pose)) context.addIssue({ code: "custom", message: `Unknown wardrobe pose: ${source}/${costume}/${pose}` });
    };
    for (const [regionId, region] of Object.entries(wardrobe.regions)) checkCostume(region.defaultCostume, undefined, `region/${regionId}`);
    for (const [country, mapping] of Object.entries(wardrobe.countries)) {
      if (!wardrobe.regions[mapping.region]) context.addIssue({ code: "custom", message: `Unknown wardrobe region: ${country}/${mapping.region}` });
      if (mapping.pose && !mapping.costume) context.addIssue({ code: "custom", message: `Wardrobe pose needs a costume: country/${country}` });
      checkCostume(mapping.costume, mapping.pose, `country/${country}`);
    }
    for (const [city, mapping] of Object.entries(wardrobe.cities)) {
      if (!wardrobe.countries[mapping.country]) context.addIssue({ code: "custom", message: `Unknown wardrobe country: ${city}/${mapping.country}` });
      if (mapping.pose && !mapping.costume) context.addIssue({ code: "custom", message: `Wardrobe pose needs a costume: city/${city}` });
      checkCostume(mapping.costume, mapping.pose, `city/${city}`);
    }
    for (const [scene, mapping] of Object.entries(wardrobe.scenes)) checkCostume(mapping.costume, mapping.pose, `scene/${scene}`);
  }
});
export type CharacterAsset = z.infer<typeof characterSchema>;
export type Wardrobe = z.infer<typeof wardrobeSchema>;
export type CharacterSelection = { emotion?: string; costume?: string; pose?: string };
export type CostumeContext = { sceneId?: string; cityId?: string; countryId?: string; regionId?: string; costume?: string; pose?: string };

/** Resolve once when a scene begins. Undelivered outfits use the existing base artwork. */
export function resolveCharacterCostume(character: CharacterAsset, wardrobe: Wardrobe | undefined, context: CostumeContext): CharacterSelection {
  if (character.id !== "heroine") return { costume: context.costume, pose: context.pose };
  const scene = context.sceneId ? wardrobe?.scenes[context.sceneId] : undefined;
  const city = context.cityId ? wardrobe?.cities[context.cityId] : undefined;
  const countryKey = context.countryId ?? city?.country;
  const country = countryKey ? wardrobe?.countries[countryKey] : undefined;
  const regionKey = context.regionId ?? country?.region;
  const region = regionKey ? wardrobe?.regions[regionKey] : undefined;
  const chosen = context.costume ? { costume: context.costume } : scene?.costume ? scene : city?.costume ? city : country?.costume ? country : region ? { costume: region.defaultCostume } : undefined;
  const costumeId = chosen?.costume;
  if (!costumeId) return {};
  const costume = character.costumes?.find((item) => item.id === costumeId);
  const poseId = context.pose ?? ("pose" in chosen ? chosen.pose : undefined) ?? costume?.poses[0]?.id;
  const pose = costume?.poses.find((item) => item.id === poseId);
  return pose?.expressions.neutral ? { costume: costumeId, pose: pose.id } : {};
}

/** Unregistered mappings keep the existing battle-specific fallback artwork. */
export function battleCharacterId(battleCharacters: Record<string, string> | undefined, battleId: string): string {
  return battleCharacters && Object.hasOwn(battleCharacters, battleId) ? battleCharacters[battleId] : "enemy";
}

/** Use the selected pose's neutral before falling back to the existing placeholder. */
export function characterImage(character: CharacterAsset, selection: CharacterSelection): string | null {
  const costume = character.costumes?.find((item) => item.id === selection.costume);
  if (costume) {
    const pose = selection.pose ? costume.poses.find((item) => item.id === selection.pose) : costume.poses[0];
    if (pose?.expressions.neutral) return pose.expressions[selection.emotion ?? "neutral"] ?? pose.expressions.neutral;
    // Do not mix an expression from a different costume with a registered outfit.
    return character.imagePath;
  }
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

/** All expression images for one pose share one placement to avoid jumping. */
export function characterPlacement(character: CharacterAsset, selection: CharacterSelection) {
  const costume = character.costumes?.find((item) => item.id === selection.costume);
  const pose = selection.pose ? costume?.poses.find((item) => item.id === selection.pose) : costume?.poses[0];
  return pose?.expressions.neutral ? pose.placement ?? character.placement : character.placement;
}
