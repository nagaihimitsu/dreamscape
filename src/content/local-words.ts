import { z } from "zod";
import { contentId as id } from "./content-id";
import { japaneseText } from "./text-language";
import { tourismSourceSchema } from "./tourism-schemas";

// The words of the countries visited (2026-11-11 user decision, 英語ノートの「その国の言葉」): an optional catalog of a
// journey folder, `learning/local-words.json`, merged across the journeys like the other catalogs. A line's
// `# local_word: <id>` tag (src/content/tags.ts) teaches one when the line is shown in normal play; this device
// remembers it (src/features/learning/local-words.ts), never the save. Light module (zod only).

const text = z.string().trim().min(1);

/**
 * One word: written in its own script (`word`, e.g. नमस्ते), read in katakana (`reading`, e.g. ナマステ), its meaning,
 * an optional note and the sources that support it (the tourism catalogs' source shape). `cityId`: the city the notes
 * list it under (a city of the same journey; without one it belongs to the whole journey).
 */
export const localWordSchema = z.object({
  id,
  cityId: id.optional(),
  word: text,
  reading: japaneseText,
  meaningJa: japaneseText,
  noteJa: japaneseText.optional(),
  sources: z.array(tourismSourceSchema).min(1),
}).strict();

export const localWordsCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  words: z.array(localWordSchema),
}).strict();

export type LocalWord = z.infer<typeof localWordSchema>;
