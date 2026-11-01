import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const version = z.literal(1);

export const dateSchema = z
  .object({
    id,
    kind: z.enum(["normal", "special", "confession", "reassurance"]),
    chapterId: id,
    titleJa: text,
    descriptionJa: text,
    apCost: z.number().int().nonnegative(),
    minRomanceStage: z.number().int().min(1).max(4),
    storyId: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/),
    legacyOnly: z.boolean().optional(),
    legacyStoryIds: z.array(z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/)).optional(),
    requiredCompletedChapters: z.array(id),
    requiredCompletedCityIds: z.array(id).optional(),
    requiredCompletedEpisodeIds: z.array(id).optional(),
    forbiddenCompletedEpisodeIds: z.array(id).optional(),
    destinationId: id.optional(),
    legacyDestinationId: id.optional(),
    legacyStoryDestinationIds: z.record(z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/), id).optional(),
    allowAfterEnding: z.boolean().optional(),
    rewardOnlyOnce: z.boolean(),
    backgroundAssetId: id,
    minAffection: z.number().int().nonnegative(),
    requiredPlayedDateIds: z.array(id),
    repeatable: z.boolean(),
    recovery: z.boolean().optional(),
    needsDeferred: z.boolean(),
    choiceCount: z.number().int().min(0).max(2),
    effectCount: z.number().int().min(0).max(2),
    actionLabelJa: text,
    eventLabelJa: text.optional(),
    invitationJa: text.optional(),
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
            hasCafeMemory: z.boolean().optional(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .refine(
    (date) => date.requiredCompletedChapters.length > 0 ||
      (date.kind === "normal" && !!date.destinationId && !!date.requiredCompletedEpisodeIds?.length),
    "A date needs a chapter or a destination and completed episode prerequisite",
  )
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
    stageDeltas: z.partialRecord(z.enum(["1", "2", "3", "4"]), z.object({
      affectionDelta: z.number().int(), trustDelta: z.number().int(), sparkDelta: z.number().int(),
    }).strict()).optional(),
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
    countryCode: z.string().length(2),
    nameJa: text,
    themeJa: text,
    firstClearReward: z
      .object({ rewardSourceId: id, ap: z.number().int().nonnegative() })
      .strict(),
    landmarkIdsPlanned: z.array(id),
    productionStatus: z.enum(["prototype", "complete"]),
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
    deferred: z.object({ titleJa: text, descriptionJa: text }).strict(),
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

// The future quiz sample is checked as data only; no battle runtime is included.
export const quizSampleSchema = z
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
    memoryCallbacks: z
      .array(z.object({ memoryId: id, textJa: text }).strict())
      .min(1),
    fallbackMemoryCallbackJa: text,
  })
  .strict();
export const trialMilestoneSchema = z
  .object({
    id,
    rewardSourceId: id,
    titleJa: text,
    descriptionJa: text,
    ap: z.number().int().positive(),
    requiredPlayedDateIds: z.array(id).min(1),
  })
  .strict();
export const trialProgressionSchema = z
  .object({ schemaVersion: version, milestones: z.array(trialMilestoneSchema) })
  .strict();
export type TrialMilestone = z.infer<typeof trialMilestoneSchema>;

export const englishText = text.refine(
  (value) =>
    /[A-Za-z]/.test(value) &&
    !/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value),
  "Quiz questions and options must be English",
);
export const japaneseText = text.refine(
  (value) =>
    /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value),
  "Expected Japanese text",
);

const uniqueEvidenceIds = z
  .array(id)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Evidence IDs must be unique",
  );
const reasoningFields = {
  roundIndex: z.number().int().min(0).max(2),
  caseClueIds: uniqueEvidenceIds.min(3).max(5),
  claimScene: id,
  successScene: id,
  failureScene: id,
};

/** One exceptional round; the conclusion is still an ordinary English three-choice quiz. */
export const battleReasoningSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...reasoningFields,
        kind: z.literal("contradiction"),
        correctClueIds: uniqueEvidenceIds.length(1),
        pressScene: id,
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
    storyId: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/),
    quizId: id,
    backgroundAssetId: id,
    portrait: z
      .enum(["porter", "fortune", "archivist", "conductor"])
      .optional(),
    // Deliberately no default: legacy A definitions and their saved fingerprints stay unchanged.
    format: z.enum(["A", "B", "C"]).optional(),
    reasoning: battleReasoningSchema.optional(),
    scenes: z
      .object({
        intro: id,
        afterRounds: z.array(id).min(2).max(4),
        outro: id,
      })
      .strict(),
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
        ? battle.landmarkId === null &&
          !!battle.cityId &&
          battle.scenes.afterRounds.length === 4 &&
          !battle.reasoning
        : battle.landmarkId !== null &&
          battle.cityId === undefined &&
          battle.scenes.afterRounds.length === 2,
    "Only a city finale has no landmark and four intermediate scenes",
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

export const quizSchema = z
  .object({
    schemaVersion: version,
    id,
    landmarkId: id.nullable(),
    scope: z.literal("city_finale").optional(),
    cityId: id.optional(),
    englishLevel: z.enum(["A2", "B1", "B2"]),
    questions: z.array(quizQuestionSchema).min(3).max(5),
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
