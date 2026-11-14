import { z } from "zod";
import { conditionSchema } from "./condition-schemas";

const id = z.string().regex(/^[a-z][a-z0-9_]*$/u);
/**
 * When an encounter is looked up: the observation at the encounter's own
 * landmark (also when `at` and `priority` are left out). An encounter whose Ink
 * starts with the head tags `# at: visit <landmark>` and `# priority:` gets its
 * rule from content:build (scripts/encounter-head.ts) with `priority` instead.
 */
const momentsSchema = z.custom<["observe"]>().superRefine((value, context) => {
  if (!Array.isArray(value) || value.length !== 1 || value[0] !== "observe")
    context.addIssue({ code: "custom", message: 'Encounters written in JSON are met while observing: at must be ["observe"] (place an encounter elsewhere with the head tags of its Ink)' });
});
/**
 * The encounter's place at its landmark's visit (the unified event design, stage 1): a negative
 * number before the main part (guide, observation, battle), a positive one after it (from the
 * battle result's 「自由時間へ」), "after observe" while observing (as an encounter without it);
 * smaller numbers first, the same priority in the order of the story files' names.
 */
export const visitPrioritySchema = z.union([
  z.number().int().safe().refine((value) => value !== 0, "Priority 0 is the main part itself: write a negative or positive number"),
  z.literal("after observe"),
  // After the visit's guide or battle (stage 3b): only when that part ran in this visit.
  z.literal("after guide"),
  z.literal("after battle"),
  // After a date (before the 「交際開始」 screen) and after an arrival's logo (stage 4).
  z.literal("after date"),
  z.literal("after logo"),
  // After a tour leg's narration, before the leg moves the party (the in-car encounter; tour stage 3).
  z.literal("after leg"),
]);
export type VisitPriority = z.infer<typeof visitPrioritySchema>;
const ruleSchema = z.object({
  encounterId: id,
  at: momentsSchema.optional(),
  priority: visitPrioritySchema.optional(),
  /** When the encounter can be met (src/content/condition-schemas.ts); without it, always. */
  when: conditionSchema.optional(),
  /**
   * An encounter with a quiz that waits for the landmark's battle: it can be
   * met during the first observation, before its `when` holds (its story
   * then ends without the quiz); met after the battle was played, it goes on
   * to the quiz. No journey uses it since Milan's encounters became place
   * file scenes (2026-11-13); tests/fixtures/catalog-encounters keeps it
   * covered.
   */
  quizAfterLandmarkBattle: z.literal(true).optional(),
}).strict().refine((rule) => rule.at === undefined || rule.priority === undefined,
  "An entry rule has either at or priority");

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
    if (rule.quizAfterLandmarkBattle && typeof rule.priority === "number")
      throw new Error(`A quiz after the landmark battle is met while observing: ${rule.encounterId} has priority ${rule.priority}`);
  }
}
