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
    kind: z.enum(["episode", "city_finale"]),
    cityId: id,
    landmarkId: id.nullable(),
    requiredEpisodeIds: z.array(id),
    epilogueStoryId: z
      .string()
      .regex(/^[a-z][a-z0-9_]*(\/[a-z][a-z0-9_]*)+$/)
      .optional(),
    battleId: id,
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
    episodeId: id.optional(),
    battleId: id.optional(),
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
    (rule) => (rule.episodeId !== undefined) !== (rule.battleId !== undefined),
    "A reward must target exactly one episode or special battle",
  )
  .refine(
    (rule) => rule.battleId === undefined || rule.trigger !== "city_clear",
    "Only an episode can award city completion",
  )
  .refine(
    (rule) => (rule.trigger === "battle_score") === (rule.minScore !== null),
    "Only score rewards require a minimum score",
  );

// Special battles have their own independent prerequisites and records.
export const storyBattleSchema = z.object({
  battleId: id,
  completionReward: z.object({ id, ap: z.number().int().positive(), titleJa: japanese }).strict().optional(),
  requiredEpisodeIds: z.array(id),
  titleJa: japanese,
  descriptionJa: japanese,
  actionLabelJa: japanese,
}).strict();

export const journeySchema = z
  .object({
    schemaVersion: z.literal(1),
    episodes: z.array(episodeSchema).min(1),
    storyBattles: z.array(storyBattleSchema).default([]),
    rewards: z.array(rewardRuleSchema).min(1),
  })
  .strict();

export type EpisodeDefinition = z.infer<typeof episodeSchema>;
export type StoryBattle = z.infer<typeof storyBattleSchema>;
export type RewardRule = z.infer<typeof rewardRuleSchema>;
export type JourneyConfig = z.infer<typeof journeySchema>;

/** Existing special-battle reward IDs participate in the shared rule engine. */
export function getAllRewardRules(journey: JourneyConfig): RewardRule[] {
  return [...journey.storyBattles.flatMap((battle) => battle.completionReward ? [{
    ...battle.completionReward,
    battleId: battle.battleId,
    trigger: "battle_complete" as const,
    minScore: null,
  }] : []), ...journey.rewards];
}
