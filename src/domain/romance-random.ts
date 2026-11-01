/** The game stores integer tickets rather than drawing while applying a choice. */
export const ROMANCE_ROLL_SCALE = 10_000;

export type RelationshipValues = {
  affection: number;
  trust: number;
  spark: number;
};

export type RomanceRollTicket = {
  reaction: number;
  affection: number;
  trust: number;
  spark: number;
};

type DeltaRanges = {
  affection: readonly [number, number];
  trust: readonly [number, number];
  spark: readonly [number, number];
};

export type ResponseProfile = {
  id: string;
  baseChance: number;
  minChance: number;
  maxChance: number;
  relationshipWeights: RelationshipValues;
  chancePerRelationshipPoint: number;
  positive: DeltaRanges;
  negative: DeltaRanges;
};

export type RomanceResolution = {
  result: "positive" | "negative";
  chance: number;
  deltas: RelationshipValues;
};

function checkedRoll(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value >= ROMANCE_ROLL_SCALE) {
    throw new RangeError("恋愛リアクションの乱数値が不正です。");
  }
  return value;
}

/**
 * A caller supplies the numbers. Creating the plan at event start and saving
 * it with the event makes each subsequent resolution reproducible.
 */
export function createRomanceRollPlan(
  choiceCount: number,
  nextRoll: () => number,
): RomanceRollTicket[] {
  if (!Number.isSafeInteger(choiceCount) || choiceCount < 0) {
    throw new RangeError("選択回数が不正です。");
  }
  return Array.from({ length: choiceCount }, () => ({
    reaction: checkedRoll(nextRoll()),
    affection: checkedRoll(nextRoll()),
    trust: checkedRoll(nextRoll()),
    spark: checkedRoll(nextRoll()),
  }));
}

/** Chance is computed from the values just before this choice, never stage. */
export function romanceSuccessChance(
  profile: ResponseProfile,
  values: RelationshipValues,
): number {
  const weights = profile.relationshipWeights;
  const weighted = values.affection * weights.affection +
    values.trust * weights.trust + values.spark * weights.spark;
  const chance = profile.baseChance + weighted * profile.chancePerRelationshipPoint;
  return Math.min(profile.maxChance, Math.max(profile.minChance, chance));
}

function deltaForRange(range: readonly [number, number], roll: number): number {
  const [minimum, maximum] = range;
  // Both ends are inclusive; floor always yields a value in the range.
  return minimum + Math.floor((checkedRoll(roll) * (maximum - minimum + 1)) / ROMANCE_ROLL_SCALE);
}

/** No random APIs or state mutation: the saved ticket fixes this resolution. */
export function resolveRomanceChoice(
  profile: ResponseProfile,
  values: RelationshipValues,
  ticket: RomanceRollTicket,
): RomanceResolution {
  const chance = romanceSuccessChance(profile, values);
  const result = checkedRoll(ticket.reaction) < chance * (ROMANCE_ROLL_SCALE / 100)
    ? "positive" : "negative";
  const ranges = profile[result];
  return {
    result,
    chance,
    deltas: {
      affection: deltaForRange(ranges.affection, ticket.affection),
      trust: deltaForRange(ranges.trust, ticket.trust),
      spark: deltaForRange(ranges.spark, ticket.spark),
    },
  };
}
