import { z } from "zod";
import { tourismSourceSchema } from "./tourism-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const japanese = text.refine(
  (value) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value),
  "Expected Japanese destination text",
);

/** Real places visited on dates; they do not imply an observation or battle. */
export const dateDestinationSchema = z.object({
  id,
  cityId: id,
  nameJa: japanese,
  nameEn: text,
  descriptionJa: japanese,
  backgroundAssetId: id,
  facts: z.array(tourismSourceSchema).min(1),
}).strict();

export const dateDestinationsSchema = z.object({
  schemaVersion: z.literal(1),
  destinations: z.array(dateDestinationSchema),
}).strict();

export type DateDestination = z.infer<typeof dateDestinationSchema>;
