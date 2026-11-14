import { z } from "zod";
import { contentId as id } from "./content-id";
import { englishText, japaneseText, quizQuestionSchema } from "./schemas";
import { storyAddressSchema } from "./story-address";
import { conditionSchema } from "./condition-schemas";

const storyId = storyAddressSchema;
const money = z.number().int().nonnegative().safe();
const optionSchema = z.object({
  id,
  // Older saves still refer to catalogs containing choice text. New catalogs
  // take the displayed English from Ink instead.
  textEn: englishText.optional(),
  translationJa: japaneseText.optional(),
  /** In whole units of the journey's currency (manifest currency). */
  cost: money.optional(),
  requiresItemId: id.optional(),
  consumeItemId: id.optional(),
  giftItemId: id.optional(),
  responseProfileId: id.optional(),
  deferCompletion: z.boolean().optional(),
}).strict();
const encounterSchema = z.object({
  id,
  cityId: id,
  /** The landmark whose visit it is met at (a place file's scene at another moment, stage 4: none). */
  landmarkId: id.optional(),
  titleJa: japaneseText,
  descriptionJa: japaneseText,
  storyId,
  // One option per choice of the story, in any number (decision 41); a place file's talk may have none (stage 3a).
  options: z.array(optionSchema),
  repeatable: z.boolean().optional(),
  completionMoney: money.optional(),
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
  items: z.array(z.object({
    id, cityId: id, nameJa: japaneseText, descriptionJa: japaneseText,
    /**
     * `"journey"`: an item carried through the journey (the item design §2.2): obtained in its city, kept on
     * departing, and held, given and used in the journey's later cities too. Without it, the item stays in its city.
     * Not changed after publishing (a save holding it may then be refused).
     */
    carry: z.literal("journey").optional(),
    /**
     * What is written on the item (a note's lines), shown in order under its description when the item is opened.
     * A line written as `{ textJa, when }` shows only while its condition holds (a line added later in the story).
     */
    linesJa: z.array(z.union([japaneseText, z.object({ textJa: japaneseText, when: conditionSchema }).strict()])).min(1).optional(),
    /** Icon among the held items (a served file such as assets/items/x.svg); a generic icon otherwise. */
    iconPath: z.string().regex(/^assets\/(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:png|webp|svg)$/).optional(),
  }).strict()),
  encounters: z.array(encounterSchema),
}).strict();
const encounterInputSchema = encounterSchema.extend({
  cityId: id.optional(),
  descriptionJa: japaneseText.optional(),
  sources: quizQuestionSchema.shape.sources.optional(),
  options: z.array(optionSchema).optional(),
});
/** Author-facing catalog: plain three-choice encounters need no rule boilerplate (other counts list their options). */
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
    options: event.options ?? [1, 2, 3].map((index) => ({ id: `choice_${index}` })),
  })) });
}
export type EncounterCatalog = z.infer<typeof encounterCatalogSchema>;
export type EncounterDefinition = z.infer<typeof encounterSchema>;
