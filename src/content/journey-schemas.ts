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
    kind: z.enum(["episode", "trial_episode", "city_finale"]),
    cityId: id,
    landmarkId: id.nullable(),
    requiredEpisodeIds: z.array(id),
    epilogueStoryId: z
      .string()
      .regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/)
      .optional(),
    battleId: id,
    legacyChapterId: id,
    titleJa: japanese,
    descriptionJa: japanese,
    clearTitleJa: japanese,
    clearDescriptionJa: japanese,
  })
  .strict()
  .refine(
    (episode) =>
      episode.kind === "city_finale"
        ? episode.landmarkId === null && !!episode.epilogueStoryId
        : episode.landmarkId !== null && episode.epilogueStoryId === undefined,
    "Only a city finale has an epilogue instead of a landmark",
  );

export const rewardRuleSchema = z
  .object({
    id,
    episodeId: id,
    trigger: z.enum([
      "guide_read",
      "battle_complete",
      "battle_score",
      "episode_clear",
      "city_clear",
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

// Battles placed between existing sightseeing episodes. Their own battle
// records are the completion history, independently of chapter rewards.
export const storyBattleSchema = z.object({
  battleId: id,
  afterEpisodeId: id,
  beforeEpisodeId: id,
  titleJa: japanese,
  descriptionJa: japanese,
  actionLabelJa: japanese,
}).strict();

export const journeySchema = z
  .object({
    schemaVersion: z.literal(1),
    entryEpisodeId: id,
    episodes: z.array(episodeSchema).min(1),
    storyBattles: z.array(storyBattleSchema).default([]),
    rewards: z.array(rewardRuleSchema).min(1),
  })
  .strict();

export type EpisodeDefinition = z.infer<typeof episodeSchema>;
export type StoryBattle = z.infer<typeof storyBattleSchema>;
export type RewardRule = z.infer<typeof rewardRuleSchema>;
export type JourneyConfig = z.infer<typeof journeySchema>;
