import { tourSchema, type Tour } from "../src/content/tour-schemas";
import { displayPath, type ContentSources } from "./content-sources";

// The tours of the journey folders (tour design stage 2a; `tours/<tourId>.json`): their shape here,
// the rules between a tour and the rest of the content in validateTours (content:build). Pure, on
// the loaded sources and the parsed catalogs.

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** A parsed tour with the file it comes from. */
export type TourFile = { file: string; layer: string; tour: Tour };

/**
 * Every tour file, parsed strictly (`schemaVersion: 1`), named after its ID (`tours/<id>.json`),
 * each ID once across the journeys. Throws the first problem, naming the file.
 */
export function parseTourFiles(sources: Pick<ContentSources, "root" | "tourFiles">): TourFile[] {
  const seen = new Map<string, string>();
  return sources.tourFiles.map(({ file, layer, id, data }) => {
    const shown = displayPath(sources.root, file);
    if (isObject(data) && typeof data.id === "string" && data.id !== id)
      throw new Error(`ツアーのファイル名がツアーIDと違います（Tour file name differs from its id）: ${shown} のIDは ${JSON.stringify(data.id)} です。` +
        `ファイル名を ${data.id}.json にしてください。`);
    const parsed = tourSchema.safeParse(data);
    if (!parsed.success) throw new Error(`Invalid tour ${shown}: ${parsed.error.message}`, { cause: parsed.error });
    const previous = seen.get(parsed.data.id);
    if (previous) throw new Error(`Duplicate tour ID ${parsed.data.id}: ${previous} and ${shown}`);
    seen.set(parsed.data.id, shown);
    return { file, layer, tour: parsed.data };
  });
}
