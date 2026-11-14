import { z } from "zod";
import { contentId as id } from "./content-id";

/**
 * Conditions (the common condition system): JSON written by authors in date catalogs
 * (`when`/`until`) and encounter entry rules (`when`), and made by content:build from the
 * text of Ink's head tags and of a scene's `cond("…")` (condition-text.ts), judged only by
 * `meets` (src/domain/conditions.ts). Light module (zod only): the runtime parses
 * the generated catalogs with it.
 *
 * A condition is an object with exactly one key: a combinator (`all`, `any`, `not`,
 * `atLeast`) or a leaf, which reads one existing record of the game state.
 */

const positive = z.number().int().min(1);
const range = z.object({ atLeast: positive.optional(), atMost: positive.optional() }).strict()
  .refine((value) => value.atLeast !== undefined || value.atMost !== undefined, "A range needs atLeast or atMost")
  .refine((value) => value.atLeast === undefined || value.atMost === undefined || value.atLeast <= value.atMost,
    "A range's atLeast is greater than its atMost");
/** A range's checks: at least one bound, in order. */
const ordered = <T extends { atLeast?: number; atMost?: number }>(schema: z.ZodType<T>) => schema
  .refine((value) => value.atLeast !== undefined || value.atMost !== undefined, "A range needs atLeast or atMost")
  .refine((value) => value.atLeast === undefined || value.atMost === undefined || value.atLeast <= value.atMost,
    "A range's atLeast is greater than its atMost");
export const RELATIONSHIP_AXES = ["affection", "trust", "spark"] as const;
export const ITEM_STATUSES = ["obtained", "held", "gifted", "used", "left_behind"] as const;

/** The value each leaf takes. */
export type LeafValues = {
  /** The episode is in completedEpisodeIds. */
  episodeCompleted: string;
  /** At least `atLeast` episodes (the finale included) of the city are completed. */
  episodesCompleted: { city: string; atLeast: number };
  cityCompleted: string;
  /** The battle has a record with at least one attempt (won or lost). */
  battlePlayed: string;
  landmarkVisited: string;
  /** The landmark's guide was read to its end (completedGuideIds). */
  guideRead: string;
  /** The encounter was finished with another option than 「また今度」. */
  encounterCompleted: string;
  /** The encounter was finished with any option, 「また今度」 included. */
  encounterSeen: string;
  datePlayed: string;
  epilogueViewed: string;
  /** `obtained`: the item was ever obtained; the other statuses: its current status. */
  item: { id: string; is: (typeof ITEM_STATUSES)[number] };
  /** `day` 9:00–17:59; `night` from 18:00 until the party sleeps (a rest at 21:00 or a late return counts as night). */
  time: "day" | "night";
  /** The day of the stay in the current city (travel.day, 1 = arrival day). */
  cityDay: { atLeast?: number; atMost?: number };
  /** The day of the journey (journeys with a calendar only; false without one). */
  journeyDay: { atLeast?: number; atMost?: number };
  /** The game weekday, Monday = 0 (journeys with a calendar only; false without one). */
  weekday: number[];
  /** Rides by the mode in the current city so far (walking is not counted). */
  rides: { mode: string; atLeast: number };
  /** The mode was rented in the current city. */
  rented: string;
  /** At least `atLeast` battles of the city were played (won or lost; the city finale's battle is not counted). Stage 2a. */
  battlesPlayed: { city: string; atLeast: number };
  /** A hidden relationship value (docs/03): written by the author, never shown to the player. Stage 2a. */
  relationship: { axis: (typeof RELATIONSHIP_AXES)[number]; atLeast?: number; atMost?: number };
  /** The money that can be spent: the travel budget less the fare home kept back (travel.returnReserve). Stage 2a. */
  money: { atLeast?: number; atMost?: number };
  /** The romance stage (1–4). Stage 2a. */
  romanceStage: { atLeast?: number; atMost?: number };
  /** The confession was accepted (the two are a couple). Stage 2a. */
  couple: true;
  /** The AP that can be spent: the AP less the AP kept back for a main part (stored AP not counted). Stage 3a. */
  ap: { atLeast?: number; atMost?: number };
  /** A story flag (progression/story.json) was set by a scene's `# set:`; flags never clear. Stage 3a. */
  flag: string;
  /** A scene with the person in its `# person:` was seen (any ending, 「また今度」 included; decision 42). Stage 3a. */
  met: string;
  /** A named condition of progression/story.json holds. Stage 3a. */
  condition: string;
};
export type LeafKind = keyof LeafValues;
export type Leaf = { [K in LeafKind]: { [P in K]: LeafValues[K] } }[LeafKind];
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { atLeast: { count: number; of: Condition[] } }
  | Leaf;

const LEAF_VALUE_SCHEMAS: { [K in LeafKind]: z.ZodType<LeafValues[K]> } = {
  episodeCompleted: id,
  episodesCompleted: z.object({ city: id, atLeast: positive }).strict(),
  cityCompleted: id,
  battlePlayed: id,
  landmarkVisited: id,
  guideRead: id,
  encounterCompleted: id,
  encounterSeen: id,
  datePlayed: id,
  epilogueViewed: id,
  item: z.object({ id, is: z.enum(ITEM_STATUSES) }).strict(),
  time: z.enum(["day", "night"]),
  cityDay: range,
  journeyDay: range,
  weekday: z.array(z.number().int().min(0).max(6)).min(1)
    .refine((days) => new Set(days).size === days.length, "A weekday is listed twice"),
  rides: z.object({ mode: id, atLeast: positive }).strict(),
  rented: id,
  battlesPlayed: z.object({ city: id, atLeast: positive }).strict(),
  // Relationship values may be negative; money may be 0.
  relationship: ordered(z.object({ axis: z.enum(RELATIONSHIP_AXES), atLeast: z.number().int().optional(), atMost: z.number().int().optional() }).strict()),
  money: ordered(z.object({ atLeast: z.number().int().min(0).optional(), atMost: z.number().int().min(0).optional() }).strict()),
  romanceStage: ordered(z.object({ atLeast: z.number().int().min(1).max(4).optional(), atMost: z.number().int().min(1).max(4).optional() }).strict()),
  couple: z.literal(true),
  ap: ordered(z.object({ atLeast: z.number().int().min(0).optional(), atMost: z.number().int().min(0).optional() }).strict()),
  flag: id,
  met: id,
  condition: id,
};
export const LEAF_KINDS = Object.keys(LEAF_VALUE_SCHEMAS) as LeafKind[];
const COMBINATORS = ["all", "any", "not", "atLeast"] as const;
/** Parts planned for later stages of the condition system (docs: the unified event design's condition table). */
const LATER_PARTS: Record<string, number> = {};

type Issue = { message: string; path: (string | number)[] };
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function checkList(value: unknown, path: (string | number)[], issues: Issue[]): void {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ message: "A condition list must be a non-empty array", path });
    return;
  }
  value.forEach((child, index) => checkCondition(child, [...path, index], issues));
}

function checkCondition(value: unknown, path: (string | number)[], issues: Issue[]): void {
  if (!isObject(value) || Object.keys(value).length !== 1) {
    issues.push({ message: "A condition node has exactly one key", path });
    return;
  }
  const [key] = Object.keys(value);
  const inner = value[key];
  const at = [...path, key];
  if (key === "all" || key === "any") return checkList(inner, at, issues);
  if (key === "not") return checkCondition(inner, at, issues);
  if (key === "atLeast") {
    if (!isObject(inner) || Object.keys(inner).some((name) => name !== "count" && name !== "of")) {
      issues.push({ message: "atLeast takes { count, of }", path: at });
      return;
    }
    checkList(inner.of, [...at, "of"], issues);
    const count = inner.count;
    if (typeof count !== "number" || !Number.isInteger(count) || count < 1 ||
        (Array.isArray(inner.of) && count > inner.of.length))
      issues.push({ message: "atLeast.count must be a whole number from 1 to the number of conditions in of", path: [...at, "count"] });
    return;
  }
  if (!(key in LEAF_VALUE_SCHEMAS)) {
    issues.push({
      message: key in LATER_PARTS
        ? `Condition part "${key}" is not available yet (stage ${LATER_PARTS[key]})`
        : `Unknown condition part: ${key}`,
      path: at,
    });
    return;
  }
  const parsed = LEAF_VALUE_SCHEMAS[key as LeafKind].safeParse(inner);
  if (!parsed.success)
    for (const issue of parsed.error.issues)
      issues.push({ message: `${key}: ${issue.message}`, path: [...at, ...issue.path.map((part) => (typeof part === "symbol" ? String(part) : part))] });
}

/** Problems of a condition, as messages with their positions (empty when it is well formed). */
export function conditionIssues(value: unknown): Issue[] {
  const issues: Issue[] = [];
  checkCondition(value, [], issues);
  return issues;
}

export const conditionSchema: z.ZodType<Condition> = z.custom<Condition>().superRefine((value, context) => {
  for (const issue of conditionIssues(value)) context.addIssue({ code: "custom", message: issue.message, path: issue.path });
});

/** content:build's list of the scenes' `cond("…")`: each text's condition, and each story's texts in the order written. */
export const sceneConditionsSchema = z.object({
  conditions: z.record(z.string(), conditionSchema),
  stories: z.record(z.string(), z.array(z.string())),
}).strict();

/** A leaf, not a combinator (all, any, not, atLeast). */
export const isLeaf = (condition: Condition): condition is Leaf =>
  !(COMBINATORS as readonly string[]).includes(Object.keys(condition)[0]);
const isCombinator = (condition: Condition): condition is Exclude<Condition, Leaf> => !isLeaf(condition);
export const leafKind = (leaf: Leaf): LeafKind => Object.keys(leaf)[0] as LeafKind;

function children(condition: Exclude<Condition, Leaf>): Condition[] {
  if ("all" in condition) return condition.all;
  if ("any" in condition) return condition.any;
  if ("not" in condition) return [condition.not];
  return condition.atLeast.of;
}

/** Every leaf of a condition, whatever its polarity. */
export function conditionLeaves(condition: Condition): Leaf[] {
  return isCombinator(condition) ? children(condition).flatMap(conditionLeaves) : [condition];
}

const sameLeaf = (left: Leaf, right: Leaf) => JSON.stringify(left) === JSON.stringify(right);
const union = (lists: Leaf[][]) => lists.flat().filter((leaf, index, all) => all.findIndex((other) => sameLeaf(other, leaf)) === index);
const intersection = (lists: Leaf[][]) =>
  union(lists).filter((leaf) => lists.every((list) => list.some((other) => sameLeaf(other, leaf))));

/**
 * Leaves that must be true for the condition to be true: all → every child's;
 * any → those every child requires; not → none; atLeast → every child's when
 * all of them are needed, else those every child requires.
 */
export function requiredLeaves(condition: Condition): Leaf[] {
  if (!isCombinator(condition)) return [condition];
  if ("not" in condition) return [];
  if ("all" in condition) return union(condition.all.map(requiredLeaves));
  if ("any" in condition) return intersection(condition.any.map(requiredLeaves));
  const lists = condition.atLeast.of.map(requiredLeaves);
  return condition.atLeast.count === lists.length ? union(lists) : intersection(lists);
}

export type LeafReference = {
  kind: "episode" | "city" | "battle" | "landmark" | "encounter" | "date" | "item" | "mode" | "flag" | "person" | "condition";
  id: string;
};
/** What a leaf names (situational leaves such as time and days name nothing). */
export function leafReference(leaf: Leaf): LeafReference | undefined {
  if ("episodeCompleted" in leaf) return { kind: "episode", id: leaf.episodeCompleted };
  if ("episodesCompleted" in leaf) return { kind: "city", id: leaf.episodesCompleted.city };
  if ("cityCompleted" in leaf) return { kind: "city", id: leaf.cityCompleted };
  if ("battlePlayed" in leaf) return { kind: "battle", id: leaf.battlePlayed };
  if ("landmarkVisited" in leaf) return { kind: "landmark", id: leaf.landmarkVisited };
  if ("guideRead" in leaf) return { kind: "landmark", id: leaf.guideRead };
  if ("encounterCompleted" in leaf) return { kind: "encounter", id: leaf.encounterCompleted };
  if ("encounterSeen" in leaf) return { kind: "encounter", id: leaf.encounterSeen };
  if ("datePlayed" in leaf) return { kind: "date", id: leaf.datePlayed };
  if ("epilogueViewed" in leaf) return { kind: "city", id: leaf.epilogueViewed };
  if ("item" in leaf) return { kind: "item", id: leaf.item.id };
  if ("rides" in leaf) return { kind: "mode", id: leaf.rides.mode };
  if ("rented" in leaf) return { kind: "mode", id: leaf.rented };
  if ("battlesPlayed" in leaf) return { kind: "city", id: leaf.battlesPlayed.city };
  if ("flag" in leaf) return { kind: "flag", id: leaf.flag };
  if ("met" in leaf) return { kind: "person", id: leaf.met };
  if ("condition" in leaf) return { kind: "condition", id: leaf.condition };
  return undefined;
}
