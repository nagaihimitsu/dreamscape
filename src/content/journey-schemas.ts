import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const japanese = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) =>
      /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(value),
    "Expected Japanese journey text",
  );

export const episodeSchema = z
  .object({
    id,
    kind: z.literal("trial_episode"),
    cityId: id,
    landmarkId: id,
    battleId: id,
    legacyChapterId: id,
    titleJa: japanese,
    descriptionJa: japanese,
    clearTitleJa: japanese,
    clearDescriptionJa: japanese,
  })
  .strict();

export const rewardRuleSchema = z
  .object({
    id,
    episodeId: id,
    trigger: z.enum([
      "guide_read",
      "battle_complete",
      "battle_score",
      "episode_clear",
    ]),
    ap: z.number().int().positive(),
    minScore: z.number().int().positive().nullable(),
    titleJa: japanese,
  })
  .strict()
  .refine(
    (rule) => (rule.trigger === "battle_score") === (rule.minScore !== null),
    "Only score rewards require a minimum score",
  );

export const journeySchema = z
  .object({
    schemaVersion: z.literal(1),
    entryEpisodeId: id,
    episodes: z.array(episodeSchema).min(1),
    rewards: z.array(rewardRuleSchema).min(1),
  })
  .strict();

export type EpisodeDefinition = z.infer<typeof episodeSchema>;
export type RewardRule = z.infer<typeof rewardRuleSchema>;
export type JourneyConfig = z.infer<typeof journeySchema>;
