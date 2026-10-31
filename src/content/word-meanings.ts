import { z } from "zod";
import { japaneseText } from "./schemas";

export const wordMeaningsSchema = z
  .object({
    schemaVersion: z.literal(1),
    words: z.record(z.string().min(1), japaneseText),
  })
  .strict();

/** Keep apostrophes and hyphens inside a word, including accented place names. */
export const wordPattern = /[\p{L}]+(?:[’'\-][\p{L}]+)*'?/gu;
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replaceAll("’", "'");
}
