import { conditionIssues, ITEM_STATUSES, RELATIONSHIP_AXES, type Condition } from "./condition-schemas";

/**
 * The text form of a condition, as Ink's head tags (`# when: item smp_x held`) and a scene's
 * `cond("…")` write it: one part, optionally after `not`. It becomes the JSON condition of
 * condition-schemas.ts. The unified event design's stages 1 and 2a read the parts today's
 * records answer; the parts of later stages are refused with their stage, since they could
 * never be true until then.
 *
 * | text | JSON leaf |
 * |---|---|
 * | `item <item> held` (`obtained`・`gifted`・`used`・`left_behind`) | `item` |
 * | `seen <scene>` / `done <scene>` (an encounter's or, from 3a, a talk's) | `encounterSeen` / `encounterCompleted` |
 * | `visited <landmark>` / `guide <landmark>` | `landmarkVisited` / `guideRead` |
 * | `battle <battle>` / `episode <episode>` / `city <city>` | `battlePlayed` / `episodeCompleted` / `cityCompleted` |
 * | `episodes <city> >= 1` | `episodesCompleted` |
 * | `date <date>` / `epilogue <city>` | `datePlayed` / `epilogueViewed` |
 * | `time day` / `time night` | `time` |
 * | `day >= 2` / `day <= 3` | `cityDay` |
 * | `journey_day >= 5` / `journey_day <= 7` | `journeyDay` |
 * | `weekday 5,6` | `weekday` |
 * | `rides <mode> >= 1` / `rented <mode>` | `rides` / `rented` |
 * | `battles <city> >= 2` (2a) | `battlesPlayed` |
 * | `rel affection >= 3` / `rel trust <= -1` (`affection`・`trust`・`spark`; 2a) | `relationship` |
 * | `money >= 300` / `money <= 0` (2a) | `money` |
 * | `stage >= 2` / `stage <= 3` (2a) | `romanceStage` |
 * | `couple` (2a) | `couple` |
 * | `ap >= 2` / `ap <= 0` (3a) | `ap` |
 * | `flag <flag>` (3a) | `flag` |
 * | `met <person>` (3a) | `met` |
 * | `condition <name>` (3a) | `condition` |
 */
const LATER_PARTS: Record<string, number> = {};

const whole = (value: string) => (/^[1-9][0-9]*$/u.test(value) ? Number(value) : undefined);
/** A whole number as written: 0, or with a sign for a negative relationship value. */
const integer = (value: string) => (/^(?:0|-?[1-9][0-9]*)$/u.test(value) ? Number(value) : undefined);

function leafOf(words: string[]): Condition {
  const [part, ...rest] = words;
  const fail = (form: string): never => { throw new Error(`Write the condition part "${part}" as: ${form}`); };
  const one = (form: string) => (rest.length === 1 ? rest[0] : fail(form));
  const compared = (form: string, start: number, read = whole) => {
    const [operator, number] = rest.slice(start);
    const value = read(number ?? "");
    if (rest.length !== start + 2 || (operator !== ">=" && operator !== "<=") || value === undefined) return fail(form);
    return operator === ">=" ? { atLeast: value } as { atLeast: number } : { atMost: value } as { atMost: number };
  };
  switch (part) {
    case "item": {
      const [id, status] = rest;
      if (rest.length !== 2 || !(ITEM_STATUSES as readonly string[]).includes(status))
        return fail(`item <item> ${ITEM_STATUSES.join("|")}`);
      return { item: { id, is: status as (typeof ITEM_STATUSES)[number] } };
    }
    case "seen": return { encounterSeen: one("seen <encounter>") };
    case "done": return { encounterCompleted: one("done <encounter>") };
    case "visited": return { landmarkVisited: one("visited <landmark>") };
    case "guide": return { guideRead: one("guide <landmark>") };
    case "battle": return { battlePlayed: one("battle <battle>") };
    case "episode": return { episodeCompleted: one("episode <episode>") };
    case "city": return { cityCompleted: one("city <city>") };
    case "date": return { datePlayed: one("date <date>") };
    case "epilogue": return { epilogueViewed: one("epilogue <city>") };
    case "rented": return { rented: one("rented <mode>") };
    case "time": {
      const period = one("time day|night");
      return period === "day" || period === "night" ? { time: period } : fail("time day|night");
    }
    case "episodes": {
      const range = compared("episodes <city> >= N", 1);
      return "atLeast" in range ? { episodesCompleted: { city: rest[0], atLeast: range.atLeast } } : fail("episodes <city> >= N");
    }
    case "rides": {
      const range = compared("rides <mode> >= N", 1);
      return "atLeast" in range ? { rides: { mode: rest[0], atLeast: range.atLeast } } : fail("rides <mode> >= N");
    }
    case "day": return { cityDay: compared("day >= N (or <= N)", 0) };
    case "journey_day": return { journeyDay: compared("journey_day >= N (or <= N)", 0) };
    case "battles": {
      const range = compared("battles <city> >= N", 1);
      return "atLeast" in range ? { battlesPlayed: { city: rest[0], atLeast: range.atLeast } } : fail("battles <city> >= N");
    }
    case "rel": {
      const axis = rest[0] as (typeof RELATIONSHIP_AXES)[number];
      if (!RELATIONSHIP_AXES.includes(axis)) return fail(`rel ${RELATIONSHIP_AXES.join("|")} >= N (or <= N)`);
      return { relationship: { axis, ...compared(`rel ${axis} >= N (or <= N)`, 1, integer) } };
    }
    case "money": return { money: compared("money >= N (or <= N)", 0, integer) };
    case "stage": return { romanceStage: compared("stage >= N (or <= N), N from 1 to 4", 0) };
    case "couple": return rest.length ? fail("couple") : { couple: true };
    case "ap": return { ap: compared("ap >= N (or <= N)", 0, integer) };
    case "flag": return { flag: one("flag <flag>") };
    case "met": return { met: one("met <person>") };
    case "condition": return { condition: one("condition <name>") };
    case "weekday": {
      const days = one("weekday 5,6 (Monday is 0)").split(",").map((day) => (/^[0-6]$/u.test(day) ? Number(day) : NaN));
      return days.some(Number.isNaN) ? fail("weekday 5,6 (Monday is 0)") : { weekday: days };
    }
  }
  if (part in LATER_PARTS)
    throw new Error(`Condition part "${part}" is not available yet (stage ${LATER_PARTS[part]}): until then it is never recorded, so it could never be true`);
  throw new Error(`Unknown condition part: ${part}`);
}

/** The JSON condition a condition text stands for; throws with the reason when it is not one. */
export function parseConditionText(text: string): Condition {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) throw new Error("Empty condition");
  const negated = words[0] === "not";
  if (negated && words.length === 1) throw new Error("Empty condition after not");
  const leaf = leafOf(negated ? words.slice(1) : words);
  const condition: Condition = negated ? { not: leaf } : leaf;
  const issues = conditionIssues(condition);
  if (issues.length) throw new Error(`Invalid condition "${text.trim()}": ${issues.map((issue) => issue.message).join("; ")}`);
  return condition;
}

/** All of the `when` conditions and none of the `until` ones (undefined when there is neither). */
export function combineWhenUntil(when: readonly Condition[], until: readonly Condition[]): Condition | undefined {
  const parts = [...when, ...(until.length ? [{ not: until.length === 1 ? until[0] : { any: [...until] } }] : [])];
  return parts.length === 0 ? undefined : parts.length === 1 ? parts[0] : { all: parts };
}
