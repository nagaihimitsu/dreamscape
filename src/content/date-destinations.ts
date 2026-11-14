import { z } from "zod";
import { contentId as id } from "./content-id";
import { tourismSourceSchema } from "./tourism-schemas";
import { japaneseText as japanese } from "./text-language";

const text = z.string().trim().min(1);

/** Real places visited on dates; they do not imply an observation or battle. */
export const dateDestinationSchema = z.object({
  id,
  cityId: id,
  nameJa: japanese,
  nameEn: text,
  descriptionJa: japanese,
  backgroundId: id,
  facts: z.array(tourismSourceSchema).min(1),
  /** Optional external reference for a place or artwork not shown in the background. */
  referenceImage: z.object({
    url: z.url({ protocol: /^https$/ }),
    labelJa: japanese,
    backgroundNoteJa: japanese,
  }).strict().optional(),
}).strict();

export const dateDestinationsSchema = z.object({
  schemaVersion: z.literal(1),
  destinations: z.array(dateDestinationSchema),
}).strict();

export type DateDestination = z.infer<typeof dateDestinationSchema>;
