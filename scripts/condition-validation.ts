import {
  conditionLeaves, leafReference, type Condition, type Leaf, type LeafReference,
} from "../src/content/condition-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";

// Build checks of conditions (the common condition system, stage 1; pure, on parsed content).
// The schema (src/content/condition-schemas.ts) already refused malformed conditions. These
// checks stop only what would break the game: a condition naming something that does not
// exist, a transport mode the journey does not declare, an item status that can never be read
// where the condition is checked. Conditions that are merely never true are left to warnings.

/** The content a condition can name. */
export type ConditionContent = {
  /** Journeys in catalog order; each one's cities in travel order. */
  journeys: readonly { id: string; cities: readonly { id: string }[]; transportModes: readonly { id: string }[]; startWeekday?: number }[];
  cities: readonly { id: string }[];
  episodes: readonly { id: string; cityId: string; landmarkId: string | null }[];
  battles: readonly { id: string; cityId?: string; landmarkId: string | null }[];
  landmarks: readonly { id: string; cityId: string }[];
  encounters: readonly { id: string; cityId: string; landmarkId: string }[];
  items: readonly { id: string; cityId: string }[];
  dates: readonly { id: string; chapterId: string; when?: Condition; until?: Condition }[];
};
/** Something that carries conditions, with the city where they are checked. */
export type ConditionOwner = { label: string; cityId: string; conditions: { field: string; condition: Condition }[] };

const KIND_LABELS: Record<LeafReference["kind"], string> = {
  episode: "episode", city: "city", battle: "battle", landmark: "landmark", encounter: "encounter", date: "date", item: "item", mode: "transport mode",
};

/** The dates' `when` and `until`, checked in each date's city (its chapterId). */
export function dateConditionOwners(content: Pick<ConditionContent, "dates">): ConditionOwner[] {
  return content.dates.map((date) => ({
    label: `date ${date.id}`, cityId: date.chapterId,
    conditions: [
      ...(date.when ? [{ field: "when", condition: date.when }] : []),
      ...(date.until ? [{ field: "until", condition: date.until }] : []),
    ],
  }));
}

/** The city that owns what a leaf names, when it has one. */
export function referenceCity(content: ConditionContent, reference: LeafReference): string | undefined {
  switch (reference.kind) {
    case "episode": return content.episodes.find((item) => item.id === reference.id)?.cityId;
    case "city": return content.cities.some((item) => item.id === reference.id) ? reference.id : undefined;
    case "battle": {
      const battle = content.battles.find((item) => item.id === reference.id);
      return battle?.cityId ?? content.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId;
    }
    case "landmark": return content.landmarks.find((item) => item.id === reference.id)?.cityId;
    case "encounter": return content.encounters.find((item) => item.id === reference.id)?.cityId;
    case "date": return content.dates.find((item) => item.id === reference.id)?.chapterId;
    case "item": return content.items.find((item) => item.id === reference.id)?.cityId;
    case "mode": return undefined;
  }
}

function exists(content: ConditionContent, reference: LeafReference): boolean {
  switch (reference.kind) {
    case "episode": return content.episodes.some((item) => item.id === reference.id);
    case "city": return content.cities.some((item) => item.id === reference.id);
    case "battle": return content.battles.some((item) => item.id === reference.id);
    case "landmark": return content.landmarks.some((item) => item.id === reference.id);
    case "encounter": return content.encounters.some((item) => item.id === reference.id);
    case "date": return content.dates.some((item) => item.id === reference.id);
    case "item": return content.items.some((item) => item.id === reference.id);
    case "mode": return true;
  }
}

export const journeyOfCity = (content: Pick<ConditionContent, "journeys">, cityId: string) =>
  content.journeys.find((journey) => journey.cities.some((city) => city.id === cityId));
/** A city's place in its journey's travel order (-1 when it is in no journey). */
export const cityOrder = (content: Pick<ConditionContent, "journeys">, cityId: string) =>
  journeyOfCity(content, cityId)?.cities.findIndex((city) => city.id === cityId) ?? -1;

/** The errors of one leaf read in `owner`'s city. */
function leafErrors(content: ConditionContent, owner: ConditionOwner, field: string, leaf: Leaf): string[] {
  const where = `a condition of ${owner.label} (${field})`;
  const reference = leafReference(leaf);
  if (!reference) return [];
  if (!exists(content, reference)) return [`Unknown ${KIND_LABELS[reference.kind]} in ${where}: ${reference.id}`];
  const journey = journeyOfCity(content, owner.cityId);
  if (reference.kind === "mode") {
    if (reference.id === WALK_MODE_ID)
      return [`Walking is not counted or rented in ${where}: name a transport mode the journey declares`];
    if (!journey?.transportModes.some((mode) => mode.id === reference.id))
      return [`Undeclared transport mode in ${where}: ${reference.id} (declare it in the journey's transportModes)`];
    return [];
  }
  if ("item" in leaf) {
    const itemCity = referenceCity(content, reference)!;
    if (leaf.item.is === "held" && itemCity !== owner.cityId)
      return [`An item of another city is never held in ${where}: ${leaf.item.id} belongs to ${itemCity}, the condition is read in ${owner.cityId}`];
    if (leaf.item.is === "left_behind" &&
        (journeyOfCity(content, itemCity) !== journey || cityOrder(content, itemCity) >= cityOrder(content, owner.cityId)))
      return [`An item is left behind only after leaving its city, ${where}: ${leaf.item.id} belongs to ${itemCity}, ` +
        `the condition is read in ${owner.cityId} (use it only in a later city of the same journey)`];
  }
  return [];
}

/** Every error of the owners' conditions (empty when they can all be read where they are checked). */
export function conditionErrors(content: ConditionContent, owners: readonly ConditionOwner[]): string[] {
  return owners.flatMap((owner) => owner.conditions.flatMap(({ field, condition }) =>
    conditionLeaves(condition).flatMap((leaf) => leafErrors(content, owner, field, leaf))));
}

/** Throw one error listing every problem of the owners' conditions. */
export function checkConditions(content: ConditionContent, owners: readonly ConditionOwner[]): void {
  const errors = [...new Set(conditionErrors(content, owners))];
  if (errors.length) throw new Error(errors.join("\n"));
}
