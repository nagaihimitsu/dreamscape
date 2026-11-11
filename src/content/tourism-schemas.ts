import { z } from "zod";
import { japaneseText as japanese } from "./text-language";
import { storyAddressSchema } from "./story-address";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const https = z.url({ protocol: /^https$/ });
const uniqueIds = z
  .array(id)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Duplicate tourism reference",
  );

/**
 * A part of an image: its top-left corner (`x`, `y`) and its size (`width`, `height`) as fractions (0–1) of the
 * image's width and height, inside the image (`outside` is the message when it is not). An observation hotspot's
 * region and a battle question's reveal (revealRegion) use it.
 */
export const imageRegionSchema = (outside: string) => z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .refine(
    (region) => region.x + region.width <= 1 && region.y + region.height <= 1,
    outside,
  );

export const observationRegionSchema = imageRegionSchema("Observation region exceeds image bounds");

export const tourismSourceSchema = z
  .object({
    publisher: text,
    title: text,
    url: https,
    checkedAt: z.iso.date(),
    claimType: z.enum([
      "documented_fact",
      "interpretation",
      "hypothesis",
      "legend",
    ]),
    claimJa: japanese,
  })
  .strict();

export const tourismAssetSchema = z
  .object({
    id,
    path: z
      .string()
      .regex(/^assets\/tourism\/[a-zA-Z0-9_/-]+\.(?:webp|png|jpe?g)$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    altJa: japanese,
    isPlaceholder: z.boolean(),
    sourceUrl: https,
    licenseName: text,
    licenseUrl: https,
    creditJa: japanese,
    modificationJa: japanese,
    checkedAt: z.iso.date(),
  })
  .strict();

export const tourismClueSchema = z
  .object({
    id,
    landmarkId: id,
    kind: z.enum(["hotspot", "document"]),
    titleJa: japanese,
    descriptionJa: japanese,
    factId: id,
    /**
     * Questions of a quiz of the same landmark whose question, correct answer
     * or explanation needs what this clue shows (checked by content:build; no
     * screen or rule reads it). Only a special battle's save fingerprint hashes
     * its evidence clues whole (battle.ts hashBattle), so changing an evidence
     * clue's links makes that battle's mid-battle save non-resumable. An empty
     * list is deliberate: an observation-only clue (観察だけの手がかり) that no
     * question depends on. See docs/07 「観察だけの手がかり」.
     */
    relatedQuestionIds: uniqueIds,
    region: observationRegionSchema.nullable(),
    sources: z.array(tourismSourceSchema).min(1),
  })
  .strict()
  .refine(
    (clue) => (clue.kind === "hotspot") === (clue.region !== null),
    "Hotspots need a region; document cards must not have one",
  );

export const landmarkSchema = z
  .object({
    id,
    cityId: id,
    nameJa: japanese,
    nameEn: text,
    descriptionJa: japanese,
    imageAssetId: id,
    /** The landmark's guide (Ink); without it the visit has no guide and no guide AP (stage 2b, decision 26). */
    guideStoryId: storyAddressSchema.optional(),
    battleId: id,
    /** false: the visit has no observation (stage 2b). Without a guide either, the battle starts on arrival. */
    observation: z.boolean().optional(),
    /**
     * The order of the visit's main parts (stage 3b, 3.9 (b)): each part the landmark has, once
     * (`guide` with a guideStoryId, `observe` unless observation is false, and `battle`); content:build
     * checks it. Without it: guide, observe, battle.
     */
    order: z.array(z.enum(["guide", "observe", "battle"])).min(1).optional(),
    clueIds: uniqueIds,
  })
  .strict();

export const tourismCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    assets: z.array(tourismAssetSchema).min(1),
    landmarks: z.array(landmarkSchema).min(1),
    clues: z.array(tourismClueSchema),
  })
  .strict();

/** Whether a visit of the landmark has an observation (it has unless `observation: false`). */
export const hasObservation = (landmark: { observation?: boolean }) => landmark.observation !== false;
export type VisitPart = "guide" | "observe" | "battle";
/** The main parts a visit of the landmark has, in its order (`order`, else guide, observe, battle). */
export function landmarkParts(landmark: { guideStoryId?: string; observation?: boolean; order?: readonly VisitPart[] }): VisitPart[] {
  const has = (part: VisitPart) => part === "battle" || (part === "guide" ? !!landmark.guideStoryId : hasObservation(landmark));
  return (landmark.order ?? ["guide", "observe", "battle"]).filter(has);
}
/** The problem with a landmark's `order`, if any: a part it does not have, one it has left out, or one written twice (A2). */
export function landmarkOrderError(landmark: { id: string; guideStoryId?: string; observation?: boolean; order?: readonly VisitPart[] }): string | undefined {
  if (!landmark.order) return undefined;
  const has = (part: VisitPart) => part === "battle" || (part === "guide" ? !!landmark.guideStoryId : hasObservation(landmark));
  const parts: VisitPart[] = ["guide", "observe", "battle"];
  const missing = parts.filter((part) => has(part) && !landmark.order!.includes(part));
  const extra = landmark.order.filter((part) => !has(part));
  const twice = landmark.order.filter((part, index) => landmark.order!.indexOf(part) !== index);
  if (!missing.length && !extra.length && !twice.length) return undefined;
  return `The order of ${landmark.id} lists each part the landmark has once (guide with a guideStoryId, observe unless observation is false, battle)` +
    `${missing.length ? `; missing: ${missing.join(", ")}` : ""}${extra.length ? `; not at this landmark: ${extra.join(", ")}` : ""}${twice.length ? `; twice: ${twice.join(", ")}` : ""}`;
}

/** An observation-only clue: no quiz question depends on it (empty relatedQuestionIds). */
export function isObservationOnlyClue(clue: { relatedQuestionIds: readonly string[] }): boolean {
  return clue.relatedQuestionIds.length === 0;
}

export type TourismAsset = z.infer<typeof tourismAssetSchema>;
export type TourismClue = z.infer<typeof tourismClueSchema>;
export type LandmarkDefinition = z.infer<typeof landmarkSchema>;
export type ObservationRegion = z.infer<typeof observationRegionSchema>;
export type TourismCatalog = z.infer<typeof tourismCatalogSchema>;
