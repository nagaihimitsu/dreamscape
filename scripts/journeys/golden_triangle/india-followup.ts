import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tourismSourceSchema } from "../../../src/content/tourism-schemas";

// These files are authoring research, not the game's content catalogs. Reuse
// Milan's source contract while leaving domain-specific observations intact.
const sourceList = z.array(tourismSourceSchema).min(1);
const text = z.string().trim().min(1);
const city = z.enum(["delhi", "agra", "jaipur"]);
const record = z.looseObject({ sources: sourceList });
const venue = record.extend({ id: text, cityId: city, placeId: text, field: text, value: z.unknown(), status: text, conditionsJa: text });
const access = record.extend({ placeId: text, category: text, status: text, observationJa: text,
  candidatePosition: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), osmNodeId: text }).strict().optional() });
const transit = record.extend({ id: text, cityId: city.nullable(), field: text, value: z.unknown(), status: text, conditionsJa: text });
const photo = record.extend({ id: text, placeId: text, cityId: city,
  sourceUrl: z.url({ protocol: /^https$/ }), licenseName: text,
  licenseUrl: z.url({ protocol: /^https$/ }).nullable(), creator: text,
  originalWidth: z.number().int().positive(), originalHeight: z.number().int().positive(),
  metadataCheckedAt: z.iso.date(), originalImageDownloaded: z.boolean(), previewViewed: z.boolean(),
  originalImageVisualReviewComplete: z.boolean(), rightsReviewComplete: z.boolean(), productionReady: z.boolean(),
  subjectScopeJa: text, riskNotesJa: text }).superRefine((image, context) => {
    if (image.productionReady && !(image.originalImageDownloaded && image.originalImageVisualReviewComplete && image.rightsReviewComplete))
      context.addIssue({ code: "custom", message: "Production image requires original, visual and rights review" });
  });
const recordsFile = <T extends z.ZodType>(schema: T) => z.looseObject({ schemaVersion: z.literal(1), records: z.array(schema).min(1) });
const imagesFile = z.looseObject({ schemaVersion: z.literal(1), images: z.array(photo).min(1), alternatives: z.array(photo).optional() });

export type IndiaFollowupInput = { venues: unknown; access: unknown; transit: unknown; images: unknown; places: unknown };

export function readIndiaFollowup(root: string): IndiaFollowupInput {
  const read = (name: string): unknown => JSON.parse(readFileSync(path.join(root, name), "utf8"));
  const base = "authoring/journeys/golden_triangle/research/golden-triangle-followup-20261103";
  return { venues: read(`${base}/venues.json`), access: read(`${base}/access.json`), transit: read(`${base}/transit.json`),
    images: read(`${base}/images.json`), places: read("authoring/journeys/golden_triangle/research/golden-triangle-20261103/source/data/ALL_LOCATIONS.json") };
}

export function validateIndiaFollowup(input: IndiaFollowupInput): { venues: number; access: number; transit: number; images: number; alternatives: number } {
  const places = z.array(z.looseObject({ id: text, cityId: city })).parse(input.places);
  const placeCities = new Map(places.map((place) => [place.id, place.cityId]));
  if (placeCities.size !== places.length) throw new Error("Duplicate research place ID");
  const venues = recordsFile(venue).parse(input.venues).records;
  const accessRecords = recordsFile(access).parse(input.access).records;
  const transitRecords = recordsFile(transit).parse(input.transit).records;
  const photoFile = imagesFile.parse(input.images);
  const images = photoFile.images;
  const alternatives = photoFile.alternatives ?? [];
  for (const [name, records] of [["venues", venues], ["transit", transitRecords], ["images", [...images, ...alternatives]]] as const) {
    const ids = records.map((item) => item.id);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${name} ID`);
  }
  for (const item of [...venues, ...images, ...alternatives]) {
    if (placeCities.get(item.placeId) !== item.cityId) throw new Error(`Unknown or mismatched city for ${item.placeId}`);
  }
  for (const item of accessRecords) {
    if (!placeCities.has(item.placeId)) throw new Error(`Unknown access place ${item.placeId}`);
  }
  return { venues: venues.length, access: accessRecords.length, transit: transitRecords.length, images: images.length, alternatives: alternatives.length };
}
