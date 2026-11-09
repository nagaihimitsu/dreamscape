import { z } from "zod";
import { japaneseText as japanese } from "./text-language";
import { conditionSchema } from "./condition-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/);

export const episodeSchema = z
  .object({
    id,
    kind: z.enum(["episode", "city_finale"]),
    cityId: id,
    landmarkId: id.nullable(),
    requiredEpisodeIds: z.array(id),
    /**
     * When the episode (a landmark's or the city finale) shows on the map (unified event design
     * stage 2b, 3.9 (a)): checked once, on departing from the map. Without it the current rule
     * holds: every requiredEpisodeIds episode completed (a finale: also every special battle of
     * its city played). content:build stops when both are written (check 7).
     */
    when: conditionSchema.optional(),
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
    /** The scene whose tag gives the AP (`scene_tag`, written by content:build; stage 3a, 3.3). */
    sceneId: id.optional(),
    trigger: z.enum([
      "guide_read",
      "battle_complete",
      "battle_score",
      "episode_clear",
      "city_clear",
      "scene_tag",
    ]),
    ap: z.number().int().positive(),
    minScore: z.number().int().positive().nullable(),
    titleJa: japanese,
  })
  .strict()
  .refine(
    (rule) => rule.trigger === "scene_tag"
      ? rule.sceneId !== undefined && rule.episodeId === undefined && rule.battleId === undefined
      : rule.sceneId === undefined && (rule.episodeId !== undefined) !== (rule.battleId !== undefined),
    "A reward must target exactly one episode or special battle (a scene tag's AP: its scene only)",
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
  /** When the special battle shows on the map (stage 2b): read like an episode's `when`, instead of requiredEpisodeIds. */
  when: conditionSchema.optional(),
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

/**
 * Existing special-battle reward IDs participate in the shared rule engine, and so do the AP rules
 * content:build makes for the scenes' tags (`sceneRules`, generated/scenes.json; stage 3a). Only
 * the game's rule list and the build's ID check pass them: a Debug test city adds its special
 * battles' rules to the list and takes them out again, without the scenes' rules piling up.
 */
export function getAllRewardRules(journey: JourneyConfig, sceneRules: readonly RewardRule[] = []): RewardRule[] {
  return [...journey.storyBattles.flatMap((battle) => battle.completionReward ? [{
    ...battle.completionReward,
    battleId: battle.battleId,
    trigger: "battle_complete" as const,
    minScore: null,
  }] : []), ...journey.rewards, ...sceneRules];
}
