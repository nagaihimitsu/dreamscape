import { z } from "zod";
import { japaneseText } from "./text-language";

// 旅の図鑑 (2026-11-13 user decision): words a Japanese traveller cannot picture at once (ゴルガッパ, ブラックバック). A
// journey's optional catalog `glossary/terms.json` lists them, merged across the journeys like the other catalogs; a
// line's `# term: <id>` (src/content/tags.ts) shows the term's card over the scene the first time the line is on screen
// in a game (src/domain/glossary.ts), and the term stays in the save's 旅の図鑑 (⚙設定). content:build checks the catalog
// and the tags (scripts/glossary-terms.ts) and lists the terms with their journeys in src/content/generated/glossary.json,
// which src/content/index.ts reads. Light module (zod only).

/** A term's ID, as `# term:` names it (the journey's prefix first, e.g. gt_term_golgappa). */
export const TERM_ID = /^[a-z][a-z0-9_]*$/u;

/** What a term is, in the order 旅の図鑑 shows its groups. */
export const GLOSSARY_CATEGORIES = ["food", "creature", "thing", "building", "custom", "person", "transport"] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
/** The heading of each group in 旅の図鑑. */
export const GLOSSARY_CATEGORY_LABELS_JA: Readonly<Record<GlossaryCategory, string>> = {
  food: "食べ物", creature: "生き物", thing: "もの", building: "建物", custom: "ならわし", person: "人", transport: "乗り物",
};

/** The most characters a term's line may have (content:build stops a longer one: the card has room for about two lines). */
export const TERM_LINE_MAX = 60;
/** The characters a term's line should keep within (content:build warns beyond them, without stopping). */
export const TERM_LINE_ADVISED = 40;
/** The characters of a text as the reader counts them (a kanji, a kana, a letter: one each). */
export const textLength = (text: string) => Array.from(text).length;

const optionalText = japaneseText.nullable().optional();

/**
 * One term: its ID, its name (`nameJa`), an optional reading (`readingJa`, for a name in kanji) or other name (`aliasJa`,
 * another name it goes by), its group (`category`), one line that lets the reader picture it (`lineJa`, 40 characters
 * advised, 60 at most) and its picture (`imageId`: a tourism photo of the same journey's tourism/catalog.json `assets`,
 * whose credit 旅の図鑑 and the credits list show; artwork made for the game is registered there too, with its credit).
 * `readingJa` and `aliasJa` may be left out or null.
 */
export const glossaryTermSchema = z.object({
  id: z.string().regex(TERM_ID, "Expected an ID of a-z, 0-9 and _ (the journey's prefix first)"),
  nameJa: japaneseText,
  readingJa: optionalText,
  aliasJa: optionalText,
  category: z.enum(GLOSSARY_CATEGORIES),
  lineJa: japaneseText,
  imageId: z.string().regex(TERM_ID, "Expected the ID of a tourism photo (tourism/catalog.json assets)"),
}).strict();
export type GlossaryTerm = z.infer<typeof glossaryTermSchema>;

/** `glossary/terms.json` of a journey folder. */
export const glossaryCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  terms: z.array(glossaryTermSchema),
}).strict();

/** A term of the generated list, with the journey whose folder lists it. */
export const listedTermSchema = glossaryTermSchema.extend({ journeyId: z.string().min(1) }).strict();
export type ListedTerm = z.infer<typeof listedTermSchema>;
/** The generated list (`src/content/generated/glossary.json`): every journey's terms, each ID once. */
export const glossaryListSchema = z.array(listedTermSchema)
  .refine((terms) => new Set(terms.map((term) => term.id)).size === terms.length, "Duplicate term ID");

/** What the card and 旅の図鑑 show under a term's name: its reading and its other name (「別名：…」), or nothing. */
export function termSubtitle(term: Pick<GlossaryTerm, "readingJa" | "aliasJa">): string | null {
  const parts = [term.readingJa, term.aliasJa ? `別名：${term.aliasJa}` : null].filter((part): part is string => !!part);
  return parts.length ? parts.join("　") : null;
}
