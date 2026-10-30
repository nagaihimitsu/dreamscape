import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const japanese = text.refine(
  (value) =>
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value),
  "Expected Japanese tourism text",
);
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
    guideStoryId: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/),
    battleId: id,
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

export type TourismAsset = z.infer<typeof tourismAssetSchema>;
export type TourismClue = z.infer<typeof tourismClueSchema>;
export type LandmarkDefinition = z.infer<typeof landmarkSchema>;
export type ObservationRegion = z.infer<typeof observationRegionSchema>;
export type TourismCatalog = z.infer<typeof tourismCatalogSchema>;
