import { z } from "zod";
import { contentId as id } from "./content-id";
import { TERM_ID } from "./glossary";
import { japaneseText } from "./text-language";

// The shops of free time and the heroine's outfits they sell (2026-11-20 user decision): an optional catalog of a journey
// folder, `shop/catalog.json`, merged across the journeys like the other catalogs. A city with a shop shows its card at the
// right end of free time's row (src/features/journey/ShopCard.tsx); an outfit bought there stays the party's for the rest
// of the journey and is chosen in the header's 「服」 (src/domain/outfits.ts, src/components/HudOutfits.tsx). The basic
// outfit (普段の服) is not sold: every journey has it. Light module (zod only).

/**
 * One outfit the heroine can wear: the costume it shows (a costume of the heroine in presentation/characters.json with a
 * neutral picture), its name and description, its price in the journey's currency (paid once from the travel budget),
 * the heroine's few words as it is bought ({heroine} and {player} are the names; src/features/romance/names.ts) and the
 * 旅の図鑑 terms buying it puts in 旅の図鑑, in this order (optional, terms of the same journey's glossary/terms.json: the
 * garment itself and the words its description uses, e.g. a kurta and its block print; 2026-11-21 and 2026-11-25 user
 * decisions).
 */
export const outfitSchema = z.object({
  id,
  costume: id,
  nameJa: japaneseText,
  descriptionJa: japaneseText,
  price: z.number().int().positive().safe(),
  boughtLineJa: japaneseText,
  termIds: z.array(z.string().regex(TERM_ID, "Expected the ID of a 旅の図鑑 term (glossary/terms.json)")).min(1)
    .refine((ids) => new Set(ids).size === ids.length, "Expected each 旅の図鑑 term once").optional(),
}).strict();

/**
 * A city's shop (at most one per city): the name its card shows (short), what kind of shop it is, the heroine's few words
 * there (none: no line) and the outfits it sells (the same journey's, in this order).
 */
export const shopSchema = z.object({
  id,
  cityId: id,
  nameJa: japaneseText,
  descriptionJa: japaneseText,
  heroineLineJa: japaneseText.optional(),
  outfitIds: z.array(id).min(1),
}).strict();

export const shopCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  shops: z.array(shopSchema),
  outfits: z.array(outfitSchema),
}).strict();

export type Outfit = z.infer<typeof outfitSchema>;
export type Shop = z.infer<typeof shopSchema>;
export type ShopCatalog = z.infer<typeof shopCatalogSchema>;
