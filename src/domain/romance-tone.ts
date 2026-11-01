import type { RelationshipValues } from "./romance-random";

/** A descriptive, transient view of the current relationship, not a stage. */
export const RELATIONSHIP_TONES = [
  "reserved",
  "strained",
  "comfortable",
  "guarded_attraction",
  "warm",
  "romantic_tension",
] as const;

export type RelationshipTone = (typeof RELATIONSHIP_TONES)[number];

/**
 * Order matters: attraction without trust is guarded, even if affection is
 * high. Strongly negative trust indicates strain even with high spark; a new
 * neutral relationship is reserved. Thresholds reflect the existing scale.
 */
export function deriveRelationshipTone({ affection, trust, spark }: RelationshipValues): RelationshipTone {
  if (trust <= -2) return "strained";
  if (trust <= 1 && spark >= 3) return "guarded_attraction";
  if (trust < 0 || (trust <= 1 && affection >= 3)) return "strained";
  if (affection >= 6 && trust >= 4 && spark >= 4) return "romantic_tension";
  if (trust >= 3 && spark <= 1) return "comfortable";
  if (affection >= 4 && trust >= 3) return "warm";
  return "reserved";
}
