import { z } from "zod";
import { conditionSchema } from "./condition-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/u);
/**
 * When an encounter is looked up. Stage 1 of the condition system has one
 * moment, the observation at the encounter's own landmark (also when `at` is
 * left out); after a battle, on a trip and the other moments come later.
 */
const momentsSchema = z.custom<["observe"]>().superRefine((value, context) => {
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== "observe")
    context.addIssue({ code: "custom", message: 'Encounters are met only while observing for now: at must be ["observe"] (other moments come at stage 3)' });
});
const ruleSchema = z.object({
  encounterId: id,
  at: momentsSchema.optional(),
  /** When the encounter can be met (src/content/condition-schemas.ts); without it, always. */
  when: conditionSchema.optional(),
  /**
   * An encounter with a quiz that waits for the landmark's battle: it can be
   * met during the first observation, before its `when` holds (its story
   * then ends without the quiz); met after the battle was played, it goes on
   * to the quiz. In Milan no observation of the Galleria opens after its
   * battle today, so its quiz is reached only once stage 3's after-battle
   * moment exists.
   */
  quizAfterLandmarkBattle: z.literal(true).optional(),
}).strict();

export const encounterEntryRulesSchema = z.object({
  schemaVersion: z.literal(2),
  entries: z.array(ruleSchema),
}).strict().superRefine(({ entries }, context) => {
  const ids = entries.map((entry) => entry.encounterId);
  if (new Set(ids).size !== ids.length)
    context.addIssue({ code: "custom", message: "Duplicate encounter entry rule" });
});

export type EncounterEntryRules = z.infer<typeof encounterEntryRulesSchema>;
export type EncounterEntryRule = EncounterEntryRules["entries"][number];

/** A rule names an existing encounter; the quiz-after-battle flag needs a quiz. (Its `when` is checked by condition-validation.ts.) */
export function validateEncounterEntryRules(
  rules: EncounterEntryRules,
  encounters: readonly { id: string; quiz?: unknown }[],
): void {
  for (const rule of rules.entries) {
    const event = encounters.find((item) => item.id === rule.encounterId);
    if (!event) throw new Error(`Unknown encounter entry: ${rule.encounterId}`);
    if (rule.quizAfterLandmarkBattle && !event.quiz)
      throw new Error(`A quiz after the landmark battle needs an encounter with a quiz: ${rule.encounterId}`);
  }
}
