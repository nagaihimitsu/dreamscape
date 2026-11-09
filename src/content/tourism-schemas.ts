import { z } from "zod";
import { japaneseText as japanese } from "./text-language";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const https = z.url({ protocol: /^https$/ });
const uniqueIds = z
  .array(id)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Duplicate tourism reference",
  );

export const observationRegionSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    width: z.number().positive().max(1),
    height: z.number().positive().max(1),
  })
  .strict()
  .refine(
    (region) => region.x + region.width <= 1 && region.y + region.height <= 1,
    "Observation region exceeds image bounds",
  );

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
    guideStoryId: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/).optional(),
    battleId: id,
    /** false: the visit has no observation (stage 2b). Without a guide either, the battle starts on arrival. */
    observation: z.boolean().optional(),
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

/** An observation-only clue: no quiz question depends on it (empty relatedQuestionIds). */
export function isObservationOnlyClue(clue: { relatedQuestionIds: readonly string[] }): boolean {
  return clue.relatedQuestionIds.length === 0;
}

export type TourismAsset = z.infer<typeof tourismAssetSchema>;
export type TourismClue = z.infer<typeof tourismClueSchema>;
export type LandmarkDefinition = z.infer<typeof landmarkSchema>;
export type ObservationRegion = z.infer<typeof observationRegionSchema>;
export type TourismCatalog = z.infer<typeof tourismCatalogSchema>;
