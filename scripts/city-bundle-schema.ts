import { z } from "zod";
import { contentId } from "../src/content/content-id";
import { citySchema, presentationSchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { landmarkSchema, tourismAssetSchema, tourismClueSchema } from "../src/content/tourism-schemas";
import { dateDestinationSchema } from "../src/content/date-destinations";
import { compactTravelSchema } from "./city-bundle-routes";

export const idSchema = contentId.refine((value) => !["constructor", "prototype", "__proto__"].includes(value), "Reserved city ID");
const backgroundSchema = presentationSchema.shape.backgrounds;
/**
 * The directed working form (version 1): the game's own route catalogs. The CLI writes and reads the
 * compact editable form (version 2, `editableBundleSchema`); version 1 stays the internal form the
 * editable one expands to (and the tests' exports).
 */
export const bundleSchema = z.object({
  schemaVersion: z.literal(1), cityId: idSchema,
  baseFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  city: citySchema, travel: travelCatalogSchema, travelSettings: travelSettingsSchema,
  backgrounds: backgroundSchema, assets: z.array(tourismAssetSchema), dateDestinations: z.array(dateDestinationSchema),
  landmarks: z.array(landmarkSchema), clues: z.array(tourismClueSchema),
  // null means this city has no compatible auxiliary transit decision ledger.
  transitDecisions: z.array(z.unknown()).nullable(),
}).strict();
export type CityBundle = z.infer<typeof bundleSchema>;
export const editableBundleSchema = bundleSchema.extend({ schemaVersion: z.literal(2), travel: compactTravelSchema });
export type EditableCityBundle = z.infer<typeof editableBundleSchema>;

/**
 * The working copy of a file for check/apply: the editable form (version 2) that export and new
 * write. An older working copy is refused (AGENTS.md keeps no compatibility with old development
 * formats); export writes a fresh one. `file` names the file in the messages.
 */
export function parseWorkingCopy(text: string, file: string): unknown {
  let bundle: unknown;
  try {
    bundle = JSON.parse(text);
  } catch (error) {
    throw new Error(`作業コピーを JSON として読めません: ${file}（${error instanceof Error ? error.message : String(error)}）`);
  }
  const version = bundle && typeof bundle === "object" && !Array.isArray(bundle) ? (bundle as { schemaVersion?: unknown }).schemaVersion : undefined;
  if (version === 1) throw new Error(`古い形式の作業コピーです（schemaVersion: 1）: ${file}。export し直してください。`);
  if (version !== 2) throw new Error(`作業コピーの形式が違います: ${file}。export か new で作った作業コピー（schemaVersion: 2）を使います。`);
  return bundle;
}
