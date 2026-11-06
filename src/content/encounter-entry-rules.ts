import { z } from "zod";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/u);
const ruleSchema = z.object({
  encounterId: id,
  landmarkId: id,
  storyId: z.string().regex(/^[a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+$/u).optional(),
  completedEpisodeId: id.optional(),
  completedStoryBattleId: id.optional(),
  /**
   * A tourism encounter whose quiz waits for the landmark's battle: it can be
   * met during the first observation (its story then ends without the quiz)
   * and, once the battle was played, revisited from free time for the quiz.
   */
  quizAfterLandmarkBattle: z.literal(true).optional(),
}).strict().refine((rule) => !!rule.completedEpisodeId !== !!rule.completedStoryBattleId,
  "Each entry needs exactly one episode or story battle condition");

export const encounterEntryRulesSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(ruleSchema),
}).strict().superRefine(({ entries }, context) => {
  const ids = entries.map((entry) => entry.encounterId);
  if (new Set(ids).size !== ids.length)
    context.addIssue({ code: "custom", message: "Duplicate encounter entry rule" });
});

export type EncounterEntryRules = z.infer<typeof encounterEntryRulesSchema>;

/** Entry metadata cannot attach an event to another location or unknown milestone. */
export function validateEncounterEntryRules(
  rules: EncounterEntryRules,
  encounters: readonly { id: string; landmarkId: string; storyId: string; availability?: string; quiz?: unknown }[],
  journey: { episodes: readonly { id: string }[]; storyBattles: readonly { battleId: string }[] },
): void {
  for (const rule of rules.entries) {
    const event = encounters.find((item) => item.id === rule.encounterId);
    if (!event || event.landmarkId !== rule.landmarkId)
      throw new Error(`Unknown or mismatched encounter entry: ${rule.encounterId}/${rule.landmarkId}`);
    if (rule.storyId && event.storyId !== rule.storyId)
      throw new Error(`Mismatched encounter entry story: ${rule.encounterId}/${rule.storyId}`);
    if (rule.quizAfterLandmarkBattle && (event.availability !== "tourism" || !event.quiz))
      throw new Error(`A quiz after the landmark battle needs a tourism encounter with a quiz: ${rule.encounterId}`);
    if (rule.completedEpisodeId && !journey.episodes.some((item) => item.id === rule.completedEpisodeId))
      throw new Error(`Unknown encounter entry episode: ${rule.encounterId}/${rule.completedEpisodeId}`);
    if (rule.completedStoryBattleId && !journey.storyBattles.some((item) => item.battleId === rule.completedStoryBattleId))
      throw new Error(`Unknown encounter entry battle: ${rule.encounterId}/${rule.completedStoryBattleId}`);
  }
}
