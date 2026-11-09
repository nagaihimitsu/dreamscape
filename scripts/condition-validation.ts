import {
  conditionLeaves, leafReference, requiredLeaves, type Condition, type Leaf, type LeafReference,
} from "../src/content/condition-schemas";
import { WALK_MODE_ID } from "../src/content/transport-schemas";

// Build checks of conditions (the common condition system, stage 1; pure, on parsed content).
// The schema (src/content/condition-schemas.ts) already refused malformed conditions. These
// checks stop only what would break the game: a condition naming something that does not
// exist, a transport mode the journey does not declare, an item status that can never be read
// where the condition is checked. Conditions that are merely never true are warnings
// (conditionWarnings): content:build lists them and goes on.

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

/** The entry rules' `when`, checked in each encounter's city. Rules naming an unknown encounter are refused elsewhere. */
export function entryRuleConditionOwners(content: Pick<ConditionContent, "encounters">,
  rules: readonly { encounterId: string; when?: Condition }[]): ConditionOwner[] {
  return rules.flatMap((rule) => {
    const encounter = content.encounters.find((item) => item.id === rule.encounterId);
    return encounter && rule.when
      ? [{ label: `the entry rule of encounter ${rule.encounterId}`, cityId: encounter.cityId, conditions: [{ field: "when", condition: rule.when }] }]
      : [];
  });
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

/** Warnings of conditions: probable mistakes that break nothing (content:build lists them). */
export type ConditionWarning = { kind: "never-offered" | "date-condition-trip"; message: string };
type EntryRule = { encounterId: string; at?: readonly string[]; when?: Condition; quizAfterLandmarkBattle?: true };

/**
 * An observation-only entry rule whose `when` needs its own landmark's episode or battle: the
 * observation opens before that battle (the first visit) and the encounter is looked up only
 * then, so it is never offered (the Milan case). A quiz that waits for the landmark's battle is
 * skipped: its observation ignores `when`.
 */
function ownLandmarkWarnings(content: ConditionContent, rules: readonly EntryRule[]): ConditionWarning[] {
  return rules.flatMap((rule): ConditionWarning[] => {
    const encounter = content.encounters.find((item) => item.id === rule.encounterId);
    if (!encounter || !rule.when || rule.quizAfterLandmarkBattle || (rule.at && rule.at.some((moment) => moment !== "observe"))) return [];
    const own = requiredLeaves(rule.when).flatMap((leaf) => {
      if ("episodeCompleted" in leaf && content.episodes.find((item) => item.id === leaf.episodeCompleted)?.landmarkId === encounter.landmarkId)
        return [`episode ${leaf.episodeCompleted}`];
      if ("battlePlayed" in leaf && content.battles.find((item) => item.id === leaf.battlePlayed)?.landmarkId === encounter.landmarkId)
        return [`battle ${leaf.battlePlayed}`];
      return [];
    });
    return own.length ? [{ kind: "never-offered", message: `Encounter never offered: ${encounter.id} is looked up only while observing ${encounter.landmarkId}, ` +
      `but its entry rule's when needs ${own.join(" and ")} of that same landmark, which is played only after the observation ` +
      `(read another place's progress, or wait for the later moments of stage 3)` }] : [];
  });
}

/** Required leaves that name something of a later city of the owner's journey: never true where the condition is checked. */
function laterCityWarnings(content: ConditionContent, owners: readonly ConditionOwner[]): ConditionWarning[] {
  return owners.flatMap((owner) => owner.conditions.flatMap(({ field, condition }): ConditionWarning[] => {
    const journey = journeyOfCity(content, owner.cityId);
    const order = cityOrder(content, owner.cityId);
    return requiredLeaves(condition).flatMap((leaf): ConditionWarning[] => {
      const reference = leafReference(leaf);
      const city = reference && referenceCity(content, reference);
      if (!city || !journey || journeyOfCity(content, city) !== journey || cityOrder(content, city) <= order) return [];
      return [{ kind: "never-offered", message: `Condition never met where it is checked: ${owner.label} (${field}) is read in ${owner.cityId} but needs ` +
        `${KIND_LABELS[reference.kind]} ${reference.id} of the later city ${city}` }];
    });
  }));
}

/** Journey days and weekdays in a journey without a calendar (startWeekday): those parts are never true. */
function calendarWarnings(content: ConditionContent, owners: readonly ConditionOwner[]): ConditionWarning[] {
  return owners.flatMap((owner) => {
    const journey = journeyOfCity(content, owner.cityId);
    if (!journey || journey.startWeekday !== undefined) return [];
    return owner.conditions.flatMap(({ field, condition }): ConditionWarning[] =>
      conditionLeaves(condition).some((leaf) => "journeyDay" in leaf || "weekday" in leaf)
        ? [{ kind: "never-offered", message: `Calendar condition without a calendar: ${owner.label} (${field}) reads journeyDay or weekday, ` +
          `but ${journey.id} has no startWeekday, so they are never true (give the journey a startWeekday or use cityDay)` }]
        : []);
  });
}

/** Dates that wait for each other (required datePlayed in a cycle): none of them can open. */
function cyclicDateWarnings(content: ConditionContent): ConditionWarning[] {
  const needs = new Map(content.dates.map((date) => [date.id, date.when ? requiredLeaves(date.when)
    .flatMap((leaf) => ("datePlayed" in leaf ? [leaf.datePlayed] : [])) : []]));
  const inCycle = (start: string) => {
    const seen = new Set<string>();
    const stack = [...(needs.get(start) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === start) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(needs.get(id) ?? []));
    }
    return false;
  };
  return content.dates.filter((date) => inCycle(date.id)).map((date) => ({ kind: "never-offered",
    message: `Date never offered: ${date.id} waits (datePlayed) for dates that wait for it in turn` }));
}

/** Time and rides change on the way to a date: the map lists the date by the state before the trip, the start re-checks it on arrival. */
function dateTripWarnings(content: ConditionContent): ConditionWarning[] {
  return dateConditionOwners(content).flatMap((owner) => owner.conditions.flatMap(({ field, condition }): ConditionWarning[] =>
    conditionLeaves(condition).some((leaf) => "time" in leaf || "rides" in leaf)
      ? [{ kind: "date-condition-trip", message: `Date condition read before and after the trip: ${owner.label} (${field}) reads time or rides, ` +
        `which the trip to the date changes; the map may offer the date and the start refuse it on arrival (prefer the place's opening windows)` }]
      : []));
}

/** Every warning of the dates' and entry rules' conditions. */
export function conditionWarnings(content: ConditionContent, rules: readonly EntryRule[]): ConditionWarning[] {
  const owners = [...dateConditionOwners(content), ...entryRuleConditionOwners(content, rules)];
  return [...ownLandmarkWarnings(content, rules), ...laterCityWarnings(content, owners), ...calendarWarnings(content, owners),
    ...cyclicDateWarnings(content), ...dateTripWarnings(content)];
}
