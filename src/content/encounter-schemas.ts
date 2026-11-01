import { z } from "zod";
import { englishText, japaneseText, quizQuestionSchema } from "./schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/);
const euros = z.number().int().nonnegative().safe();
const optionSchema = z.object({
  id,
  // Older saves still refer to catalogs containing choice text. New catalogs
  // take the displayed English from Ink instead.
  textEn: englishText.optional(),
  translationJa: japaneseText.optional(),
  costEuro: euros.default(0),
  requiresItemId: id.optional(),
  consumeItemId: id.optional(),
  giftItemId: id.optional(),
  responseProfileId: id.optional(),
  deferCompletion: z.boolean().optional(),
}).strict();
const encounterSchema = z.object({
  id,
  cityId: id,
  landmarkId: id,
  titleJa: japaneseText,
  descriptionJa: japaneseText,
  storyId,
  options: z.array(optionSchema).length(3),
  repeatable: z.boolean().optional(),
  completionMoneyEuro: euros.optional(),
  completionItemId: id.optional(),
  alternativeApRewardId: id.optional(),
  sources: z.array(quizQuestionSchema.shape.sources.element),
  quiz: z.object({
    question: quizQuestionSchema,
    translations: z.object({
      questionJa: japaneseText,
      options: z.object({ A: japaneseText, B: japaneseText, C: japaneseText }).strict(),
    }).strict(),
    chancePercent: z.number().int().min(0).max(100),
    rewardItemId: id,
    wonStoryId: storyId,
    lostStoryId: storyId,
    alreadyStoryId: storyId,
  }).strict().optional(),
}).strict();
export const encounterCatalogSchema = z.object({
  schemaVersion: z.literal(1),
  initialBudget: euros,
  items: z.array(z.object({ id, cityId: id, nameJa: japaneseText, descriptionJa: japaneseText }).strict()),
  encounters: z.array(encounterSchema),
}).strict();
const encounterInputSchema = encounterSchema.extend({
  cityId: id.optional(),
  descriptionJa: japaneseText.optional(),
  sources: quizQuestionSchema.shape.sources.optional(),
  options: z.array(optionSchema).length(3).optional(),
});
/** Author-facing catalog: plain three-choice encounters need no rule boilerplate. */
export const encounterCatalogInputSchema = encounterCatalogSchema.extend({
  encounters: z.array(encounterInputSchema),
});
export function normalizeEncounterCatalog(
  value: unknown,
  landmarks: readonly { id: string; cityId: string }[],
): EncounterCatalog {
  const input = encounterCatalogInputSchema.parse(value);
  return encounterCatalogSchema.parse({ ...input, encounters: input.encounters.map((event) => ({
    ...event,
    cityId: event.cityId ?? landmarks.find((landmark) => landmark.id === event.landmarkId)?.cityId,
    descriptionJa: event.descriptionJa ?? event.titleJa,
    sources: event.sources ?? [],
    options: event.options ?? [1, 2, 3].map((index) => ({ id: `choice_${index}`, costEuro: 0 })),
  })) });
}
export type EncounterCatalog = z.infer<typeof encounterCatalogSchema>;
export type EncounterDefinition = z.infer<typeof encounterSchema>;
