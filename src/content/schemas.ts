import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const text = z.string().trim().min(1);
const version = z.literal(1);

export const dateSchema = z
  .object({
    id,
    chapterId: id,
    titleJa: text,
    descriptionJa: text,
    apCost: z.number().int().nonnegative(),
    minRomanceStage: z.number().int().min(1).max(4),
    storyId: z.string().regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/),
    requiredCompletedChapters: z.array(id).min(1),
    rewardOnlyOnce: z.boolean(),
    backgroundAssetId: id,
  })
  .strict();

export const dateCatalogSchema = z
  .object({ schemaVersion: version, dates: z.array(dateSchema).min(1) })
  .strict();
export const effectSchema = z
  .object({ id, affectionDelta: z.number().int(), memoryId: id })
  .strict();
export const effectCatalogSchema = z
  .object({ schemaVersion: version, effects: z.array(effectSchema).min(1) })
  .strict();
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
    productionStatus: z.literal("prototype"),
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
    backgrounds: z.record(
      id,
      z
        .object({
          nameJa: text,
          captionJa: text,
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
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
