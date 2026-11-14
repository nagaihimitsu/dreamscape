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
  episodes: readonly { id: string; cityId: string; landmarkId: string | null; battleId?: string }[];
  battles: readonly { id: string; cityId?: string; landmarkId: string | null }[];
  landmarks: readonly { id: string; cityId: string }[];
  /** The story file orders encounters of one priority; the options and repetition are read by the visit warnings. */
  encounters: readonly { id: string; cityId: string; landmarkId?: string; storyId?: string; repeatable?: boolean;
    options?: readonly { id: string; deferCompletion?: boolean }[] }[];
  items: readonly { id: string; cityId: string; carry?: "journey" }[];
  dates: readonly { id: string; chapterId: string; when?: Condition; until?: Condition }[];
  /** The declared story state (progression/story.json, stage 3a): flags are read in any city; a person belongs to a city. */
  flags?: readonly string[];
  people?: readonly { id: string; cityId: string }[];
  namedConditions?: Readonly<Record<string, Condition>>;
  /** Scenes that also run at other moments than their landmark's visit (stage 4: a `place` with a date or a finale): 「また今度」 brings them back there. */
  returningScenes?: ReadonlySet<string>;
};
/** Something that carries conditions, with the city where they are checked. */
export type ConditionOwner = { label: string; cityId: string; conditions: { field: string; condition: Condition }[] };

const KIND_LABELS: Record<LeafReference["kind"], string> = {
  episode: "episode", city: "city", battle: "battle", landmark: "landmark", encounter: "encounter", date: "date", item: "item", mode: "transport mode",
  flag: "flag (progression/story.json)", person: "person (progression/story.json)", condition: "named condition (progression/story.json)",
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

/**
 * The map conditions (`when`) of episodes and special battles (stage 2b, progression/journey.json),
 * checked in the city of each one (a special battle's: its landmark's).
 */
export function mapConditionOwners(content: Pick<ConditionContent, "episodes" | "battles" | "landmarks">,
  journey: { episodes: readonly { id: string; cityId: string; when?: Condition }[]; storyBattles: readonly { battleId: string; when?: Condition }[] }): ConditionOwner[] {
  const battleCity = (id: string) => {
    const battle = content.battles.find((item) => item.id === id);
    return battle?.cityId ?? content.landmarks.find((item) => item.id === battle?.landmarkId)?.cityId;
  };
  return [
    ...journey.episodes.flatMap((episode) => episode.when
      ? [{ label: `the map condition of episode ${episode.id}`, cityId: episode.cityId, conditions: [{ field: "when", condition: episode.when }] }] : []),
    ...journey.storyBattles.flatMap((battle) => {
      const cityId = battleCity(battle.battleId);
      return battle.when && cityId
        ? [{ label: `the map condition of special battle ${battle.battleId}`, cityId, conditions: [{ field: "when", condition: battle.when }] }] : [];
    }),
  ];
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
    case "person": return content.people?.find((item) => item.id === reference.id)?.cityId;
    case "mode": case "flag": case "condition": return undefined;
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
    case "flag": return !!content.flags?.includes(reference.id);
    case "person": return !!content.people?.some((item) => item.id === reference.id);
    case "condition": return !!content.namedConditions && Object.hasOwn(content.namedConditions, reference.id);
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
  // A named condition is declared once for the journey: only its names are checked (each use is read in its own city).
  if (!owner.cityId) return [];
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
    // An item carried through the journey is held in the journey's later cities too; never left behind (the item design §2.5).
    const carried = content.items.find((item) => item.id === leaf.item.id)?.carry === "journey";
    const laterCity = journeyOfCity(content, itemCity) === journey && cityOrder(content, itemCity) < cityOrder(content, owner.cityId);
    if (leaf.item.is === "held" && itemCity !== owner.cityId && !(carried && laterCity))
      return [`An item of another city is never held in ${where}: ${leaf.item.id} belongs to ${itemCity}, the condition is read in ${owner.cityId}` +
        `${carried ? " (a carried item is held in its city and the journey's later cities)" : ""}`];
    if (leaf.item.is === "left_behind" && carried)
      return [`An item carried through the journey is never left behind, ${where}: ${leaf.item.id}`];
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
export type ConditionWarning = {
  kind: "never-offered" | "date-condition-trip" | "later-never-again" | "same-priority" | "repeat-without-until";
  message: string;
};
type EntryRule = { encounterId: string; at?: readonly string[]; priority?: number | `after ${string}`; when?: Condition; quizAfterLandmarkBattle?: true };

/**
 * An entry rule looked up while observing or before the landmark's main part whose `when` needs
 * its own landmark's episode or battle: those come only after the observation (the first visit),
 * and then the map no longer leads to the landmark, so it is never offered (the Milan case). A
 * quiz that waits for the landmark's battle is skipped: its observation ignores `when`.
 */
function ownLandmarkWarnings(content: ConditionContent, rules: readonly EntryRule[]): ConditionWarning[] {
  return rules.flatMap((rule): ConditionWarning[] => {
    const encounter = content.encounters.find((item) => item.id === rule.encounterId);
    if (!encounter?.landmarkId || !rule.when || rule.quizAfterLandmarkBattle || (rule.at && rule.at.some((moment) => moment !== "observe")) ||
        (typeof rule.priority === "number" && rule.priority > 0)) return [];
    const own = requiredLeaves(rule.when).flatMap((leaf) => {
      if ("episodeCompleted" in leaf && content.episodes.find((item) => item.id === leaf.episodeCompleted)?.landmarkId === encounter.landmarkId)
        return [`episode ${leaf.episodeCompleted}`];
      if ("battlePlayed" in leaf && content.battles.find((item) => item.id === leaf.battlePlayed)?.landmarkId === encounter.landmarkId)
        return [`battle ${leaf.battlePlayed}`];
      return [];
    });
    const where = typeof rule.priority === "number" ? `before the main part of ${encounter.landmarkId}'s visit` : `while observing ${encounter.landmarkId}`;
    return own.length ? [{ kind: "never-offered", message: `Encounter never offered: ${encounter.id} is looked up only ${where}, ` +
      `but its entry rule's when needs ${own.join(" and ")} of that same landmark, which is played only after the observation ` +
      `(read another place's progress, or look it up later: after the visit's main part with a positive # priority:, ` +
      `or at a later moment such as a trip (# at: trip) or the finale's after battle)` }] : [];
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

/** Time, rides and money change on the way to a date: the map lists the date by the state before the trip, the start re-checks it on arrival. */
function dateTripWarnings(content: ConditionContent): ConditionWarning[] {
  return dateConditionOwners(content).flatMap((owner) => owner.conditions.flatMap(({ field, condition }): ConditionWarning[] =>
    conditionLeaves(condition).some((leaf) => "time" in leaf || "rides" in leaf || "money" in leaf)
      ? [{ kind: "date-condition-trip", message: `Date condition read before and after the trip: ${owner.label} (${field}) reads time, rides or money, ` +
        `which the trip to the date changes; the map may offer the date and the start refuse it on arrival (prefer the place's opening windows)` }]
      : []));
}

/**
 * Warnings of the encounters placed at a landmark's visit by their head tags (a `priority`):
 * - 「また今度」 leads to no later moment: the encounter can be ended with 「また今度」 (an option with
 *   deferCompletion), but the map leads to its landmark only once (one sightseeing episode or special
 *   battle there), so it is never met again;
 * - two story files share a priority at one landmark's visit: they run in file-name order;
 * - an encounter repeated always (repeatable) without `# until:`: it is met at every visit.
 */
function visitWarnings(content: ConditionContent, rules: readonly EntryRule[]): ConditionWarning[] {
  const shown = (priority: number | string) => (typeof priority === "number" && priority > 0 ? `+${priority}` : String(priority));
  const placed = rules.flatMap((rule) => {
    const encounter = content.encounters.find((item) => item.id === rule.encounterId);
    // A scene at a moment other than a visit (stage 4) has no landmark: the visit's warnings do not read it.
    return encounter?.landmarkId && rule.priority !== undefined ? [{ rule, encounter: { ...encounter, landmarkId: encounter.landmarkId }, priority: rule.priority }] : [];
  });
  // Map events that visit the landmark: its sightseeing episodes and the special battles held there.
  const visitsOf = (landmarkId: string) => content.episodes.filter((episode) => episode.landmarkId === landmarkId).length +
    content.battles.filter((battle) => battle.landmarkId === landmarkId && !content.episodes.some((episode) => episode.battleId === battle.id)).length;
  const later = placed.flatMap(({ encounter, priority }): ConditionWarning[] => {
    const deferred = encounter.options?.find((option) => option.deferCompletion);
    return deferred && visitsOf(encounter.landmarkId) <= 1 && !content.returningScenes?.has(encounter.id)
      ? [{ kind: "later-never-again", message: `「また今度」 leads to no later moment: ${encounter.id} (priority ${shown(priority)} at the visit of ${encounter.landmarkId}) ` +
        `can be ended with 「また今度」 (option ${deferred.id}), but the map leads to ${encounter.landmarkId} only once, so it is never met again there ` +
        `(write it as a place file's scene with another moment where it can come back)` }]
      : [];
  });
  const groups = new Map<string, typeof placed>();
  for (const entry of placed) {
    const key = `${entry.encounter.landmarkId} ${entry.priority}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  // Only scenes of different story files: within one place file the written order decides (no warning).
  const fileOf = (storyId: string | undefined) => (storyId ?? "").split(".")[0];
  const same = [...groups.values()].filter((group) => new Set(group.map((entry) => fileOf(entry.encounter.storyId))).size > 1).map((group): ConditionWarning => ({ kind: "same-priority",
    message: `Encounters share a priority: ${group.map((entry) => entry.encounter.id).join(", ")} have priority ${shown(group[0].priority)} ` +
      `at the visit of ${group[0].encounter.landmarkId}; they run in the order of their story files' names (${[...new Set(group.map((entry) => fileOf(entry.encounter.storyId)))].join(", ")})` }));
  // `# until:` becomes a `not` in the rule's when (encounter-head.ts), like a `# when: not …`: either closes the repetition.
  const closes = (condition: Condition | undefined): boolean => !!condition &&
    ("not" in condition || ("all" in condition && condition.all.some(closes)));
  const repeated = placed.flatMap(({ rule, encounter }): ConditionWarning[] => encounter.repeatable && !closes(rule.when)
    ? [{ kind: "repeat-without-until", message: `Repeated encounter without until: ${encounter.id} (# repeat: always) has no # until:, so it is met at every visit of ${encounter.landmarkId}` }]
    : []);
  return [...later, ...same, ...repeated];
}

/** Every warning of the dates', entry rules' and scenes' (`cond("…")`, `sceneOwners`) conditions. */
export function conditionWarnings(content: ConditionContent, rules: readonly EntryRule[], sceneOwners: readonly ConditionOwner[] = []): ConditionWarning[] {
  const owners = [...dateConditionOwners(content), ...entryRuleConditionOwners(content, rules), ...sceneOwners];
  return [...ownLandmarkWarnings(content, rules), ...laterCityWarnings(content, owners), ...calendarWarnings(content, owners),
    ...cyclicDateWarnings(content), ...dateTripWarnings(content), ...visitWarnings(content, rules)];
}
