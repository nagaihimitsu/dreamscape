import { z } from "zod";
import { conditionSchema } from "./condition-schemas";
import { storyAddressSchema } from "./story-address";
import { imageRegionSchema } from "./tourism-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const version = z.literal(1);
/** The fields and values of a date validation context, whatever their order. */
const validationContextKey = (context: object) =>
  JSON.stringify(Object.entries(context).sort(([a], [b]) => a.localeCompare(b)));

export const dateSchema = z
  .object({
    id,
    kind: z.enum(["normal", "special", "confession", "reassurance"]).default("normal"),
    chapterId: id,
    titleJa: text,
    descriptionJa: text.default("ふたりで旅先を訪ねる。"),
    apCost: z.number().int().nonnegative().default(2),
    minRomanceStage: z.number().int().min(1).max(4).default(1),
    storyId: storyAddressSchema,
    /** When the date opens (src/content/condition-schemas.ts); without it the date has no progress condition. */
    when: conditionSchema.optional(),
    /** When the date is over for good, even if it was unlocked: a true `until` closes it. */
    until: conditionSchema.optional(),
    /**
     * The writer's hint (2026-11-13; also a date knot's or a one-scene date file's head `# hint:`): while `when` does
     * not hold yet, free time's row shows the date as a locked card with these words (date-rules.ts hintedLockedDates).
     */
    hintJa: text.optional(),
    destinationId: id.optional(),
    allowAfterEnding: z.boolean().optional(),
    rewardOnlyOnce: z.boolean().default(true),
    backgroundId: id,
    minAffection: z.number().int().nonnegative().default(0),
    repeatable: z.boolean().default(false),
    recovery: z.boolean().optional(),
    needsDeferred: z.boolean().default(false),
    choiceCount: z.number().int().min(0).default(2),
    effectCount: z.number().int().min(0).default(2),
    validationContexts: z
      .array(
        z
          .object({
            romanceStage: z.number().int().min(1).max(4),
            confessionReady: z.boolean(),
            confessionResult: z.enum(["accepted", "deferred", "rejected"]).optional(),
            memoryId: id.optional(),
            memoryIds: z.array(id).optional(),
            endingReached: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1)
      // Each context is validated in full; a repeated one only costs build time.
      .refine(
        (contexts) => new Set(contexts.map(validationContextKey)).size === contexts.length,
        "Duplicate validation context",
      )
      .default([{ romanceStage: 1, confessionReady: false }]),
  })
  .strict()
  .transform((date) => ({
    ...date,
    allowAfterEnding: date.allowAfterEnding ?? (date.kind === "normal"),
  }))
  .refine(
    (date) => date.kind === "normal" || !date.destinationId,
    "Destinations are for normal dates",
  );

export const dateCatalogSchema = z
  .object({ schemaVersion: version, dates: z.array(dateSchema).min(1) })
  .strict();
export const effectSchema = z
  .object({
    id,
    affectionDelta: z.number().int(),
    trustDelta: z.number().int().optional(),
    sparkDelta: z.number().int().optional(),
    responseProfileId: id.optional(),
    memoryId: id.optional(),
    outcome: z.enum(["accepted", "deferred", "rejected"]).optional(),
  })
  .strict();
export const effectCatalogSchema = z
  .object({ schemaVersion: version, effects: z.array(effectSchema).min(1) })
  .strict();

const deltaRangeSchema = z.tuple([z.number().int(), z.number().int()])
  .refine(([min, max]) => min <= max, "Delta range minimum exceeds maximum");
const deltaRangesSchema = z.object({
  affection: deltaRangeSchema,
  trust: deltaRangeSchema,
  spark: deltaRangeSchema,
}).strict();
export const responseProfileSchema = z.object({
  id,
  baseChance: z.number().min(0).max(100),
  minChance: z.number().min(0).max(100),
  maxChance: z.number().min(0).max(100),
  relationshipWeights: z.object({
    affection: z.number().min(0).max(1),
    trust: z.number().min(0).max(1),
    spark: z.number().min(0).max(1),
  }).strict(),
  chancePerRelationshipPoint: z.number().nonnegative(),
  positive: deltaRangesSchema,
  negative: deltaRangesSchema,
}).strict().refine(({ minChance, baseChance, maxChance }) =>
  minChance <= baseChance && baseChance <= maxChance,
  "Expected minChance <= baseChance <= maxChance");
export const responseProfileCatalogSchema = z.object({
  schemaVersion: version,
  profiles: z.array(responseProfileSchema).min(1),
}).strict();
export const citySchema = z
  .object({
    schemaVersion: version,
    id,
    nextCityId: id.optional(),
    countryCode: z.string().length(2),
    nameJa: text,
    themeJa: text,
    /** A one-scene file (`arrivals/<city>`) or a place file's arrival knot (`places/<file>.<knot>`; stage 3). */
    arrivalStoryId: storyAddressSchema.optional(),
    firstClearReward: z
      .object({ rewardSourceId: id, ap: z.number().int().nonnegative() })
      .strict(),
    landmarkIdsPlanned: z.array(id),
    productionStatus: z.enum(["prototype", "complete"]),
    /**
     * The free-time backdrop: a tourism asset of the same journey (content:build
     * checks it). Absent, or a placeholder asset, shows the plain background
     * (src/content/city-backdrop.ts).
     */
    backdropAssetId: id.optional(),
    /**
     * Or the free-time backdrop as artwork made for Dreamscape: the served path
     * of an image in the same journey's public/ folder that its
     * presentation/own-artwork.json lists (content:build checks both, and that a
     * city names backdropAssetId or backdropImagePath, not both). Shown as it is.
     */
    backdropImagePath: z.string()
      .regex(/^assets\/(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(?:webp|png|jpe?g)$/)
      .optional(),
  })
  .strict();
export const balanceSchema = z
  .object({
    schemaVersion: version,
    apCap: z.number().int().positive(),
    defaultPlayerName: text,
    defaultHeroineName: text,
    maxNameLength: z.number().int().min(1).max(100),
  })
  .strict();
export const presentationSchema = z
  .object({
    schemaVersion: version,
    ending: z
      .object({ titleJa: text, descriptionJa: text, buttonJa: text })
      .strict(),
    backgrounds: z.record(
      id,
      z
        .object({
          nameJa: text,
          captionJa: text,
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          fallback: z.enum(["canal", "neutral"]).optional(),
          imagePath: z.string().regex(/^assets\/(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9_./-]+\.(?:png|webp|svg)$/).nullable().optional(),
          // Reuse the tourism image ledger, including its source and licence.
          imageAssetId: id.optional(),
          imagePosition: z.object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
          }).strict().optional(),
        })
        .strict(),
    ),
    emotions: z.record(id, text),
    memories: z.record(
      id,
      z.object({ titleJa: text, descriptionJa: text }).strict(),
    ),
  })
  .strict();

// An example quiz (quizzes/*.example.json) is checked as data only and never played.
export const quizExampleSchema = z
  .object({
    schemaVersion: version,
    id,
    landmarkId: id,
    englishLevel: z.enum(["A2", "B1", "B2"]),
    productionStatus: z.literal("example_not_for_publication_without_review"),
    source: z.object({ publisher: text, url: z.string().url() }).strict(),
    questions: z
      .array(
        z
          .object({
            id,
            questionEn: text,
            options: z
              .array(z.object({ id: text, textEn: text }).strict())
              .length(3),
            correctOptionId: text,
            vocabularyJa: z.array(
              z.object({ word: text, meaning: text }).strict(),
            ),
            hintJa: text,
            explanationJa: text,
            historicalClaimType: z.enum([
              "documented_fact",
              "interpretation",
              "legend",
            ]),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export type DateDefinition = z.infer<typeof dateSchema>;
export type EffectDefinition = z.infer<typeof effectSchema>;
export type Presentation = z.infer<typeof presentationSchema>;

export const progressionSchema = z
  .object({
    schemaVersion: version,
    stages: z
      .array(
        z
          .object({
            stage: z.number().int().min(1).max(4),
            minAffection: z.number().int().nonnegative(),
            minTrust: z.number().int(),
            minSpark: z.number().int(),
            minCompletedDates: z.number().int().nonnegative(),
            playerSuffix: z.string(),
          })
          .strict(),
      )
      .length(4),
    confession: z
      .object({
        minAffection: z.number().int().nonnegative(),
        minTrust: z.number().int(),
        minSpark: z.number().int(),
        minCompletedDates: z.number().int().nonnegative(),
      })
      .strict(),
    // May be empty: a date without a matching callback uses fallbackMemoryCallbackJa.
    memoryCallbacks: z.array(z.object({ memoryId: id, textJa: text }).strict()),
    fallbackMemoryCallbackJa: text,
  })
  .strict();

// The language of these fields is a content:build warning, not a schema rule (text-language.ts).
export { englishText, japaneseText } from "./text-language";
import { englishText, japaneseText } from "./text-language";

const uniqueEvidenceIds = z
  .array(id)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Evidence IDs must be unique",
  );
// The battle's Ink writes the proof's lines: the claim in the helper knot <battle>_claim (the press in <battle>_press), the
// rest after `-> reasoning ->` by reasoning_action and evidence_result.
const reasoningFields = {
  roundIndex: z.number().int().min(0).max(2),
  caseClueIds: uniqueEvidenceIds.min(3).max(5),
};

/** One exceptional round; the conclusion is still an ordinary English three-choice quiz. */
export const battleReasoningSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...reasoningFields,
        kind: z.literal("contradiction"),
        correctClueIds: uniqueEvidenceIds.length(1),
      })
      .strict(),
    z
      .object({
        ...reasoningFields,
        kind: z.literal("connection"),
        correctClueIds: uniqueEvidenceIds.length(2),
      })
      .strict(),
  ])
  .refine(
    (reasoning) =>
      reasoning.correctClueIds.every((id) =>
        reasoning.caseClueIds.includes(id),
      ),
    "Correct evidence must be available in the case materials",
  );

export const battleSchema = z
  .object({
    id,
    titleJa: japaneseText,
    descriptionJa: japaneseText,
    landmarkId: id.nullable(),
    scope: z.literal("city_finale").optional(),
    cityId: id.optional(),
    enemyNameJa: japaneseText,
    enemyTitleJa: japaneseText,
    enemyDescriptionJa: japaneseText,
    /** A one-line quote of the opponent's on the name plate a normal battle opens with (shown as written). */
    enemyQuoteJa: japaneseText.optional(),
    storyId: storyAddressSchema,
    quizId: id,
    backgroundId: id,
    portrait: z
      .enum(["porter", "fortune", "archivist", "conductor", "abstract"])
      .optional(),
    // Deliberately no default: an omitted format is an ordinary A battle, and its
    // definition (and content fingerprint) stays exactly as authored.
    format: z.enum(["A", "B", "C"]).optional(),
    reasoning: battleReasoningSchema.optional(),
  })
  .strict()
  .refine((battle) => {
    if ((battle.format ?? "A") === "A") return battle.reasoning === undefined;
    return (
      battle.reasoning?.kind ===
      (battle.format === "B" ? "contradiction" : "connection")
    );
  }, "Battle format and reasoning kind must agree")
  .refine(
    (battle) =>
      battle.scope === "city_finale"
        ? battle.landmarkId === null && !!battle.cityId && !battle.reasoning
        : battle.landmarkId !== null && battle.cityId === undefined,
    "Only a city finale has no landmark; it names its city and has no reasoning",
  );

export const battleCatalogSchema = z
  .object({
    schemaVersion: version,
    battles: z.array(battleSchema).min(1),
  })
  .strict();

export const quizQuestionSchema = z
  .object({
    id,
    questionEn: englishText,
    options: z
      .array(
        z
          .object({
            id: z.enum(["A", "B", "C"]),
            textEn: englishText,
          })
          .strict(),
      )
      .length(3),
    correctOptionId: z.enum(["A", "B", "C"]),
    vocabularyJa: z.array(
      z.object({ word: text, meaning: japaneseText }).strict(),
    ),
    hintJa: japaneseText,
    correctExplanationJa: japaneseText,
    incorrectExplanationJa: japaneseText,
    sources: z
      .array(
        z
          .object({
            publisher: text,
            title: text,
            url: z.url({ protocol: /^https$/ }),
            checkedAt: z.iso.date(),
            claimType: z.enum(["documented_fact", "interpretation", "legend"]),
            claimJa: japaneseText,
          })
          .strict(),
      )
      .min(1),
    difficulty: z.enum(["easy", "medium", "hard"]),
  })
  .strict();

/**
 * A battle's question: the heroine's optional lines by its quiz card and the optional reveal on the landmark
 * photo under its explanation (an encounter's quiz has no hint button and no explanation card, so its question
 * has none of them).
 */
export const battleQuestionSchema = quizQuestionSchema.extend({
  /** The hint in her own words, shown in place of hintJa as her whisper. */
  hintHeroineJa: japaneseText.optional(),
  /** Her short line beside the explanation of a right answer. */
  heroineCorrectJa: japaneseText.optional(),
  /**
   * A part of the battle's landmark photo that the answer's feedback zooms toward and outlines (fractions of the
   * photo, as an observation hotspot's region). content:build checks that the battle has a landmark photo.
   */
  revealRegion: imageRegionSchema(
    "写真の種明かしの範囲（revealRegion）が写真の外にはみ出しています。x + width と y + height を1以下にしてください" +
    "（Reveal region exceeds image bounds）",
  ).optional(),
  /** A one-line caption under the reveal (shown only with a revealRegion). */
  revealCaptionJa: japaneseText.optional(),
});

export const quizSchema = z
  .object({
    schemaVersion: version,
    id,
    landmarkId: id.nullable(),
    scope: z.literal("city_finale").optional(),
    cityId: id.optional(),
    englishLevel: z.enum(["A2", "B1", "B2"]),
    questions: z.array(battleQuestionSchema).min(3).max(5),
  })
  .strict()
  .refine(
    (quiz) =>
      quiz.scope === "city_finale"
        ? quiz.landmarkId === null &&
          !!quiz.cityId &&
          quiz.questions.length === 5
        : quiz.landmarkId !== null &&
          quiz.cityId === undefined &&
          quiz.questions.length === 3,
    "A normal quiz needs three questions; a city finale needs five",
  );

export type BattleDefinition = z.infer<typeof battleSchema>;
export type BattleReasoning = z.infer<typeof battleReasoningSchema>;
export type QuizDefinition = z.infer<typeof quizSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
