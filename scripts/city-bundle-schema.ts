import { z } from "zod";
import { citySchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { landmarkSchema, tourismAssetSchema, tourismClueSchema } from "../src/content/tourism-schemas";
import { dateDestinationSchema } from "../src/content/date-destinations";
import { compactTravelSchema } from "./city-bundle-routes";

export const idSchema = z.string().regex(/^[a-z][a-z0-9_]*$/).refine((value) => !["constructor", "prototype", "__proto__"].includes(value), "Reserved city ID");
const backgroundSchema = presentationSchema.shape.backgrounds;
export const bundleSchema = z.object({
  schemaVersion: z.literal(1), cityId: idSchema,
  baseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  city: citySchema, travel: travelCatalogSchema, travelSettings: travelSettingsSchema,
  backgrounds: backgroundSchema, assets: z.array(tourismAssetSchema), dateDestinations: z.array(dateDestinationSchema),
  // Earlier version-1 working copies have no tourism section. Preserve their
  // catalog values on import rather than silently deleting existing content.
  landmarks: z.array(landmarkSchema).optional(), clues: z.array(tourismClueSchema).optional(),
  // null means this city has no compatible auxiliary transit decision ledger.
  transitDecisions: z.array(z.unknown()).nullable(),
}).strict();
export const completeBundleSchema = bundleSchema.extend({ landmarks: z.array(landmarkSchema), clues: z.array(tourismClueSchema) });
export type CityBundle = z.infer<typeof completeBundleSchema>;
export const editableBundleSchema = bundleSchema.extend({ schemaVersion: z.literal(2), travel: compactTravelSchema });
export const completeEditableBundleSchema = editableBundleSchema.extend({ landmarks: z.array(landmarkSchema), clues: z.array(tourismClueSchema) });
export type EditableCityBundle = z.infer<typeof completeEditableBundleSchema>;

