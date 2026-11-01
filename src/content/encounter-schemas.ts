import { z } from "zod";
import { englishText, japaneseText, quizQuestionSchema } from "./schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const storyId = z.string().regex(/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/);
const euros = z.number().int().nonnegative().safe();
const optionSchema = z.object({
  id,
  textEn: englishText,
  translationJa: japaneseText,
  costEuro: euros,
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
  sources: quizQuestionSchema.shape.sources,
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
export type EncounterCatalog = z.infer<typeof encounterCatalogSchema>;
export type EncounterDefinition = z.infer<typeof encounterSchema>;
