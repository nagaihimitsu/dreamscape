import { z } from "zod";
import { englishText, japaneseText, quizQuestionSchema } from "./schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/);
const money = z.number().int().nonnegative().safe();
const optionSchema = z.object({
  id,
  // Older saves still refer to catalogs containing choice text. New catalogs
  // take the displayed English from Ink instead.
  textEn: englishText.optional(),
  translationJa: japaneseText.optional(),
  cost: money.optional(),
  costEuro: money.optional(),
  requiresItemId: id.optional(),
  consumeItemId: id.optional(),
  giftItemId: id.optional(),
  responseProfileId: id.optional(),
  deferCompletion: z.boolean().optional(),
}).strict().superRefine((option, context) => {
  if (option.cost !== undefined && option.costEuro !== undefined)
    context.addIssue({ code: "custom", message: "Specify cost or costEuro, not both" });
});
const encounterSchema = z.object({
  id,
  cityId: id,
  landmarkId: id,
  titleJa: japaneseText,
  descriptionJa: japaneseText,
  storyId,
  availability: z.enum(["dormant", "tourism"]).optional(),
  options: z.array(optionSchema).length(3),
  repeatable: z.boolean().optional(),
  completionMoney: money.optional(),
  completionMoneyEuro: money.optional(),
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
const encounterCatalogObjectSchema = z.object({
  schemaVersion: z.literal(1),
  initialBudget: money,
  items: z.array(z.object({ id, cityId: id, nameJa: japaneseText, descriptionJa: japaneseText }).strict()),
  encounters: z.array(encounterSchema),
}).strict();
function validateMoneyFields(catalog: { encounters: { completionMoney?: number; completionMoneyEuro?: number }[] }, context: z.RefinementCtx) {
  catalog.encounters.forEach((event, index) => {
    if (event.completionMoney !== undefined && event.completionMoneyEuro !== undefined)
      context.addIssue({ code: "custom", message: "Specify completionMoney or completionMoneyEuro, not both", path: ["encounters", index] });
  });
}
export const encounterCatalogSchema = encounterCatalogObjectSchema.superRefine(validateMoneyFields);
const encounterInputSchema = encounterSchema.extend({
  cityId: id.optional(),
  descriptionJa: japaneseText.optional(),
  sources: quizQuestionSchema.shape.sources.optional(),
  options: z.array(optionSchema).length(3).optional(),
});
/** Author-facing catalog: plain three-choice encounters need no rule boilerplate. */
export const encounterCatalogInputSchema = encounterCatalogObjectSchema.extend({
  encounters: z.array(encounterInputSchema),
}).superRefine(validateMoneyFields);
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
    options: event.options ?? [1, 2, 3].map((index) => ({ id: `choice_${index}` })),
  })) });
}
export type EncounterCatalog = z.infer<typeof encounterCatalogSchema>;
export type EncounterDefinition = z.infer<typeof encounterSchema>;
