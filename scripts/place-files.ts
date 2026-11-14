import type { Condition } from "../src/content/condition-schemas";
import { combineWhenUntil, parseConditionText } from "../src/content/condition-text";
import { RELATIONSHIP_AXES } from "../src/content/condition-schemas";
import { AFTER_PARTS, type AfterPart, type RelationshipDelta, type SceneAt, type SceneDone, type SceneKind, type SceneOption, type SceneThen } from "../src/content/scene-schemas";

// The place files and the tags of scenes (the unified event design, stage 3a, 3.1): one Ink file
// holds every scene of a place, each a knot whose head tags (the tag lines right below the knot
// line) say what it is and, for an inserted scene, when it runs. The file starts with
// `INCLUDE modules.ink` and `-> DONE`: nothing runs from its top, the game starts a knot by name.
// content:build reads the heads and every choice's effect tags from the source (statically, so
// a tag inside a branch the walk does not take is read too), blanks the head tags (the line
// numbers stay) and compiles the file with the game's modules.ink.
//
// The choices' effect tags (3.1 「選択肢の札」) are read the same way in the one-scene files that
// may have choices (guides, arrivals, epilogues): readFileChoices.
//
// Light module (no content loading): unit tests use it directly.

export const PLACE_HEAD_TAGS = ["scene", "title", "at", "priority", "when", "until", "repeat", "person", "on_done", "then", "sources", "hint"] as const;
export const CHOICE_EFFECT_TAGS = ["requires", "give", "use", "rel", "profile", "memory", "effect", "set", "money", "ap", "then", "later"] as const;
/**
 * Kinds a place file may hold (a hotel's place file may hold its city's arrival and epilogue knots; their moments' talks may be in any place
 * file; a tour's file, `places/<tourId>`, holds its legs' narrations, `tour_leg`).
 */
export const PLACE_KINDS: readonly SceneKind[] = ["talk", "encounter", "guide", "battle", "date", "arrival", "epilogue", "tour_leg"];
/** The game's include line and the line after it (the file's top runs nothing). */
export const PLACE_TOP = ["INCLUDE modules.ink", "-> DONE"] as const;

type Tag = { key: string; value: string; line: number };
export type PlaceChoice = {
  line: number;
  knot: string;
  optionId?: string;
  translated: boolean;
  /** The choice's text before its tags and its `# translation:` (for the data-language warning). */
  text?: string;
  translation?: string;
  /** The effect tags on the tag lines right after the choice. */
  tags: Tag[];
};
export type PlaceKnot = {
  name: string;
  line: number;
  isFunction: boolean;
  head: Tag[];
  stitches: string[];
  labels: string[];
  /** Divert, tunnel and thread targets (`-> x`, `-> x ->`, `<- x`), with their lines. */
  targets: { name: string; line: number }[];
  choices: PlaceChoice[];
  conds: string[];
};
export type PlaceFile = { storyId: string; knots: PlaceKnot[]; source: string };

const KNOT_LINE = /^\s*={2,}\s*(function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*=*\s*$/u;
const STITCH_LINE = /^\s*=(?!=)\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*$/u;
const CHOICE_LINE = /^\s*(?:[*+]\s*)+/u;
const TAG_LINE = /^\s*#/u;
const LABEL = /^\s*(?:[*+-]\s*)+\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/u;
const TARGET = /(?:->|<-)\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/gu;

/** The source with comments blanked (line numbers kept): `//` to the end of the line and `/* … *\/` blocks. */
export function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, " ")).replace(/\/\/.*$/gmu, "");
}

/** A tag line's tags (`# key: value`, `# later`), in order. */
function tagsOf(line: string, number: number): Tag[] {
  return line.trim().slice(1).split("#").map((part) => part.trim()).filter(Boolean).map((part) => {
    const separator = part.indexOf(":");
    return separator < 0 ? { key: part, value: "", line: number } : { key: part.slice(0, separator).trim(), value: part.slice(separator + 1).trim(), line: number };
  });
}
const isHeadKey = (key: string) => (PLACE_HEAD_TAGS as readonly string[]).includes(key);
const isEffectKey = (key: string) => (CHOICE_EFFECT_TAGS as readonly string[]).includes(key);

/** The texts of `cond("…")` on a line (readSceneConditions checks their form for the whole file). */
function condTexts(line: string): string[] {
  return [...line.matchAll(/\bcond\s*\(\s*"([^"\\]*)"\s*\)/gu)].map((match) => match[1]);
}

/**
 * Read a place file: its top, its knots with their heads, choices, targets and conds. Returns the
 * source with the head tags blanked (what content:build compiles). Throws, with the line, for a
 * file that does not start with the two lines, a VAR, a head tag outside a head (`# then:` may
 * also follow a choice), an effect tag on a line that does not follow a choice (A7), and a
 * stitch right after a head.
 */
export function readPlaceFile(storyId: string, raw: string): PlaceFile {
  const lines = raw.split("\n");
  const code = withoutComments(raw).split("\n");
  const at = (index: number) => `line ${index + 1}`;
  const meaningful = code.map((line, index) => ({ line: line.trim(), index })).filter((item) => item.line);
  if (meaningful[0]?.line !== PLACE_TOP[0] || meaningful[1]?.line !== PLACE_TOP[1])
    throw new Error(`A place file starts with the two lines "${PLACE_TOP[0]}" and "${PLACE_TOP[1]}" (the game starts each scene's knot by name; ` +
      `to preview one in Inky, change -> DONE to -> <knot> for a moment)`);
  const variable = code.findIndex((line) => /^\s*VAR\s/u.test(line));
  if (variable >= 0)
    throw new Error(`A place file declares no VAR (${at(variable)}): the game declares every variable it sets in modules.ink`);
  const kept = [...lines];
  const knots: PlaceKnot[] = [];
  let current: PlaceKnot | undefined;
  // The choice whose effect tag lines may follow (until the first other line).
  let openChoice: PlaceChoice | undefined;
  let inHead = false;
  let afterHead = false;
  for (let index = meaningful[1].index + 1; index < code.length; index++) {
    const line = code[index];
    if (!line.trim()) { inHead = false; continue; }
    const knot = KNOT_LINE.exec(line);
    if (knot) {
      current = { name: knot[2], line: index + 1, isFunction: !!knot[1], head: [], stitches: [], labels: [], targets: [], choices: [], conds: [] };
      knots.push(current);
      openChoice = undefined;
      inHead = !knot[1];
      afterHead = false;
      continue;
    }
    if (!current) throw new Error(`Write a place file's scenes in knots (=== name ===) after ${PLACE_TOP[1]} (${at(index)}): ${line.trim()}`);
    if (TAG_LINE.test(line)) {
      const tags = tagsOf(line, index + 1);
      const heads = tags.filter((tag) => isHeadKey(tag.key));
      if (inHead && heads.length) {
        if (heads.length !== tags.length) throw new Error(`Write each head tag on its own line (${at(index)}): ${line.trim()}`);
        for (const tag of tags) {
          if (/[{}]/u.test(tag.value)) throw new Error(`A head tag is plain text, without {…} (${at(index)}): # ${tag.key}: ${tag.value}`);
          if (!tag.value) throw new Error(`Empty head tag (${at(index)}): # ${tag.key}:`);
        }
        current.head.push(...heads);
        kept[index] = "";
        afterHead = true;
        continue;
      }
      if (openChoice) {
        for (const tag of tags) if (isEffectKey(tag.key)) openChoice.tags.push(tag);
        continue;
      }
      const misplaced = tags.find((tag) => isHeadKey(tag.key) || isEffectKey(tag.key));
      if (misplaced) {
        if (isHeadKey(misplaced.key) && misplaced.key !== "then")
          throw new Error(`Head tag outside the head (${at(index)}): write # ${misplaced.key}: right below the knot line (=== ${current.name} ===)`);
        throw new Error(`An effect tag follows a choice (${at(index)}): # ${misplaced.key}${misplaced.value ? `: ${misplaced.value}` : ""} ` +
          `is on an ordinary line of ${current.name}; write it on the line right after a choice, or as # on_done: in the knot's head (A7)`);
      }
      continue;
    }
    inHead = false;
    openChoice = undefined;
    const stitch = STITCH_LINE.exec(line);
    if (stitch) {
      if (afterHead) throw new Error(`A stitch right after the head of ${current.name} (${at(index)}): write the scene's first line before = ${stitch[1]} ` +
        `(a battle: the head, then -> DONE, then its stitches)`);
      current.stitches.push(stitch[1]);
      continue;
    }
    afterHead = false;
    const label = LABEL.exec(line);
    if (label) current.labels.push(label[1]);
    for (const match of line.matchAll(TARGET)) current.targets.push({ name: match[1], line: index + 1 });
    current.conds.push(...condTexts(line).filter((text) => !current!.conds.includes(text)));
    if (CHOICE_LINE.test(line) && !/^\s*-/u.test(line)) {
      const bracket = /\[([^\]]*)\]/u.exec(line)?.[1] ?? "";
      const option = /#\s*option\s*:\s*([^#\]]+)/u.exec(bracket)?.[1].trim();
      if (bracket.includes("#")) for (const tag of tagsOf(`#${bracket.slice(bracket.indexOf("#") + 1)}`, index + 1))
        if (isEffectKey(tag.key)) throw new Error(`Write a choice's effect tags on the line after the choice, not inside [ ] (${at(index)}): # ${tag.key}`);
      openChoice = { line: index + 1, knot: current.name, ...(option ? { optionId: option } : {}), translated: /#\s*translation\s*:/u.test(bracket), ...choiceTexts(bracket), tags: [] };
      current.choices.push(openChoice);
    }
  }
  return { storyId, knots, source: kept.join("\n") };
}

/** The knots of the game's modules.ink a scene may call (a battle's calls, stage 5): `-> quiz(n) ->`, `-> reasoning ->`. */
export const MODULE_KNOTS = ["quiz", "reasoning"] as const;

/** Whether a story file includes the game's modules.ink (a place file, or a one-scene battle; stage 5). */
export const includesModules = (source: string) => /^\s*INCLUDE\s+modules\.ink\s*$/mu.test(withoutComments(source));

/**
 * Where a target goes from a knot: another knot, inside the knot (its stitch, label, a stitch's label), the end, a knot
 * of modules.ink (a battle's call), or nowhere known.
 */
export function resolveTarget(file: Pick<PlaceFile, "knots">, from: PlaceKnot, target: string): { knot: string } | { module: string } | "inside" | "end" | undefined {
  if (target === "DONE" || target === "END") return "end";
  const [first, second] = target.split(".");
  const knot = file.knots.find((item) => item.name === first);
  if (knot) {
    if (second !== undefined && !knot.stitches.includes(second) && !knot.labels.includes(second)) return undefined;
    return { knot: knot.name };
  }
  if (from.stitches.includes(first) || from.labels.includes(first)) return "inside";
  if (second === undefined && (MODULE_KNOTS as readonly string[]).includes(first)) return { module: first };
  return undefined;
}

/** The modules.ink knots the given knots call (they join a scene's fingerprint: editing modules.ink refuses a save inside it). */
export function moduleCalls(file: Pick<PlaceFile, "knots">, knots: readonly PlaceKnot[]): string[] {
  const called = new Set<string>();
  for (const knot of knots) for (const target of knot.targets) {
    const resolved = resolveTarget(file, knot, target.name);
    if (resolved && typeof resolved === "object" && "module" in resolved) called.add(resolved.module);
  }
  return [...called];
}

/** The knots a knot reaches (itself first), following knot targets; throws for a target that is not a knot, stitch, label or end (A2). */
export function reachableKnots(file: Pick<PlaceFile, "knots" | "storyId">, start: string): PlaceKnot[] {
  const seen: PlaceKnot[] = [];
  const queue = [start];
  while (queue.length) {
    const name = queue.shift()!;
    if (seen.some((item) => item.name === name)) continue;
    const knot = file.knots.find((item) => item.name === name);
    if (!knot) throw new Error(`Unknown knot ${name} in ${file.storyId}`);
    seen.push(knot);
    for (const target of knot.targets) {
      const resolved = resolveTarget(file, knot, target.name);
      if (resolved === undefined)
        throw new Error(`A divert goes to no knot, stitch or label: -> ${target.name} (line ${target.line} of ${knot.name}); ` +
          `write the knot's name (a variable target cannot be followed by the build's AP rules and fingerprints, A2)`);
      if (typeof resolved === "object" && "knot" in resolved) queue.push(resolved.knot);
    }
  }
  return seen;
}

const signedInteger = (value: string, what: string): number => {
  if (!/^[+-](?:0|[1-9][0-9]*)$/u.test(value.trim())) throw new Error(`${what} takes a whole number with its sign, like +1 or -300: ${value}`);
  const number = Number(value.trim());
  if (!Number.isSafeInteger(number)) throw new Error(`${what} is too large: ${value}`);
  return number;
};

/** `affection +1, trust -1`: each axis with a signed whole number; the same axis twice adds up. */
export function parseRelationship(value: string, into: RelationshipDelta = {}): RelationshipDelta {
  const result: RelationshipDelta = { ...into };
  for (const part of value.split(",").map((item) => item.trim()).filter(Boolean)) {
    const [axis, amount, ...rest] = part.split(/\s+/u);
    if (!(RELATIONSHIP_AXES as readonly string[]).includes(axis) || amount === undefined || rest.length)
      throw new Error(`# rel: takes ${RELATIONSHIP_AXES.join("|")} with a signed number, like affection +1, trust -1: ${value}`);
    const key = axis as (typeof RELATIONSHIP_AXES)[number];
    result[key] = (result[key] ?? 0) + signedInteger(amount, `# rel: ${axis}`);
  }
  return result;
}

/** `move <place> [by <mode>]` or `epilogue`. */
/** A choice's English text and its `# translation:`, from its bracket. */
function choiceTexts(bracket: string): { text?: string; translation?: string } {
  const translation = /#\s*translation\s*:\s*([^#]+)/u.exec(bracket)?.[1].trim();
  return translation ? { text: bracket.split("#")[0].trim(), translation } : {};
}

export function parseThen(value: string): SceneThen {
  const words = value.trim().split(/\s+/u);
  if (words.length === 1 && words[0] === "epilogue") return { epilogue: true };
  if (words[0] === "move" && /^[a-z][a-z0-9_]*$/u.test(words[1] ?? "") && (words.length === 2 || (words.length === 4 && words[2] === "by" && /^[a-z][a-z0-9_]*$/u.test(words[3]))))
    return { move: words[1], ...(words[3] ? { by: words[3] } : {}) };
  throw new Error(`# then: takes move <place>, move <place> by <mode> or epilogue: ${value}`);
}

const condition = (text: string, tag: string): Condition => {
  try { return parseConditionText(text); }
  catch (error) { throw new Error(`# ${tag}: ${text}: ${error instanceof Error ? error.message : String(error)}`, { cause: error }); }
};
const ident = (value: string, what: string) => {
  if (!/^[a-z][a-z0-9_]*$/u.test(value)) throw new Error(`${what} takes an ID (lowercase letters, digits and _): ${value}`);
  return value;
};

/** The effects of one choice's tags (3.1 「選択肢の札」). `apCap`: the most AP one tag may give. */
export function choiceOption(choice: PlaceChoice, apCap: number, onWarning?: (message: string) => void): SceneOption | undefined {
  const option: SceneOption = { id: choice.optionId ?? "", knot: choice.knot, ...(choice.translated ? { translated: true as const } : {}) };
  let ap = 0;
  let hasAp = false;
  for (const tag of choice.tags) {
    const where = `(line ${tag.line})`;
    switch (tag.key) {
      case "requires": option.requires = [...(option.requires ?? []), condition(tag.value, "requires")]; break;
      case "give": {
        const [item, to, ...rest] = tag.value.split(/\s+/u);
        if (!item || !to || rest.length) throw new Error(`# give: takes <item> <person or heroine> ${where}: ${tag.value}`);
        if (option.give) throw new Error(`One # give: per choice ${where}`);
        option.give = { item: ident(item, "# give:"), to: ident(to, "# give:") };
        break;
      }
      case "use": if (option.use) throw new Error(`One # use: per choice ${where}`); option.use = ident(tag.value, "# use:"); break;
      case "rel": option.rel = parseRelationship(tag.value, option.rel); break;
      case "money": option.money = (option.money ?? 0) + signedInteger(tag.value, `# money: ${where}`); break;
      case "ap": {
        const amount = signedInteger(tag.value, `# ap: ${where}`);
        if (amount === 0) throw new Error(`# ap: 0 does nothing; write a signed number from 1 ${where}`);
        ap += amount;
        hasAp = true;
        break;
      }
      case "set": option.set = [...(option.set ?? []), ident(tag.value, "# set:")]; break;
      case "memory": option.memory = [...(option.memory ?? []), ident(tag.value, "# memory:")]; break;
      case "profile": if (option.profile) throw new Error(`One # profile: per choice ${where}`); option.profile = ident(tag.value, "# profile:"); break;
      case "effect": if (option.effect) throw new Error(`One # effect: per choice ${where}`); option.effect = ident(tag.value, "# effect:"); break;
      case "later": if (tag.value) throw new Error(`# later takes no value ${where}`); option.later = true; break;
      case "then": if (option.then) throw new Error(`One # then: per choice ${where}`); option.then = parseThen(tag.value); break;
    }
  }
  if (hasAp) {
    if (ap === 0) throw new Error(`The # ap: lines of a choice add up to 0 (line ${choice.line})`);
    if (ap > apCap) throw new Error(`A choice gives ${ap} AP (line ${choice.line}): at most ${apCap} (the AP cap; stored AP holds no more)`);
    if (-ap > apCap) onWarning?.(`A choice spends ${-ap} AP (line ${choice.line}), more than the AP cap ${apCap}: it can never be chosen (always greyed out)`);
    option.ap = ap;
  }
  if (option.money === 0) delete option.money;
  const effects = Object.keys(option).filter((key) => !["id", "knot", "translated"].includes(key));
  if (!choice.optionId) {
    if (effects.length) throw new Error(`A choice with effects needs # option: <id> inside its [ ] (line ${choice.line}): the save and the AP rules name it (A6)`);
    return undefined;
  }
  ident(choice.optionId, "# option:");
  return option;
}

/** A head's `# on_done:` lines: what the scene does when it is done (main parts: the first time). */
export function parseDone(values: readonly string[], apCap: number): SceneDone {
  const done: SceneDone = {};
  let ap = 0;
  for (const value of values) {
    const [part, ...rest] = value.trim().split(/\s+/u);
    const one = () => {
      if (rest.length !== 1) throw new Error(`# on_done: ${part} takes one ID: ${value}`);
      return ident(rest[0], `# on_done: ${part}`);
    };
    if (part === "item") done.items = [...(done.items ?? []), one()];
    else if (part === "use") done.use = [...(done.use ?? []), one()];
    else if (part === "set") done.set = [...(done.set ?? []), one()];
    else if (part === "rel") done.rel = parseRelationship(rest.join(" "), done.rel);
    else if (part === "money") done.money = (done.money ?? 0) + signedInteger(rest.join(" "), "# on_done: money");
    else if (part === "reward") {
      if (done.reward !== undefined) throw new Error(`Write # on_done: reward once: ${done.reward} and ${rest.join(" ")}`);
      done.reward = one();
    } else if (part === "ap") {
      const amount = signedInteger(rest.join(" "), "# on_done: ap");
      if (amount === 0) throw new Error("# on_done: ap 0 does nothing");
      ap += amount;
    } else throw new Error(`Unknown # on_done: ${value} (item, use, set, rel, money, ap or reward)`);
  }
  if (ap) {
    if (ap > apCap) throw new Error(`# on_done: gives ${ap} AP: at most ${apCap} (the AP cap)`);
    done.ap = ap;
  }
  if (done.money === 0) delete done.money;
  return done;
}

/** The moments of 2.3 (stage 4 added all but the visits; tour stages 2b and 3 add a tour's steps). */
const AT_FORMS: { pattern: RegExp; read: (match: RegExpExecArray) => SceneAt }[] = [
  { pattern: /^visit\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ visit: match[1] }) },
  { pattern: /^place\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ place: match[1] }) },
  { pattern: /^date\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ date: match[1] }) },
  { pattern: /^finale\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ finale: match[1] }) },
  { pattern: /^epilogue\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ epilogue: match[1] }) },
  { pattern: /^depart\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ depart: match[1] }) },
  { pattern: /^arrive\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ arrive: match[1] }) },
  { pattern: /^hotel(?:\s+([a-z][a-z0-9_]*))?$/u, read: (match) => ({ hotel: match[1] ?? "any" }) },
  { pattern: /^ticket\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ ticket: match[1] }) },
  { pattern: /^tour\s+([a-z][a-z0-9_]*)\s+([a-z][a-z0-9_]*)$/u, read: (match) => ({ tour: match[1], step: match[2] }) },
  { pattern: /^trip\s+([a-z][a-z0-9_]*)((?:\s+(?:from|to)\s+[a-z][a-z0-9_]*)*)$/u, read: (match) => {
    const words = match[2].trim().split(/\s+/u).filter(Boolean);
    const at: SceneAt = { trip: match[1] };
    for (let index = 0; index < words.length; index += 2) {
      const key = words[index] as "from" | "to";
      if (key in at) throw new Error(`# at: trip names ${key} once: ${match[0]}`);
      Object.assign(at, { [key]: words[index + 1] });
    }
    return at;
  } },
];

/** One `# at:` value (2.3). */
export function parseAt(value: string): SceneAt {
  for (const form of AT_FORMS) {
    const match = form.pattern.exec(value.trim());
    if (match) return form.read(match);
  }
  throw new Error(`# at: takes visit <landmark>, visit any, place <place>, date <date>, finale <city>, epilogue <city>, depart <city>, ` +
    `arrive <city>, hotel [<place>], trip <mode> [from <place>] [to <place>], ticket <place> or tour <tour> <step>: ${value}`);
}

/**
 * The positions each moment has (2.3): which `after <part>`, and whether it has a positive side. A2: a position the moment lacks stops.
 * A tour step's `after leg` is a leg's only (the scene table knows the step's kind).
 */
export function positionProblem(at: SceneAt, priority: number | `after ${AfterPart}` | undefined): string | undefined {
  const kind = Object.keys(at)[0] as string;
  const afters: Record<string, readonly AfterPart[]> = {
    visit: ["guide", "observe", "battle"], place: ["guide", "observe", "battle", "date"], date: ["date"], finale: ["battle"], arrive: ["logo"],
    epilogue: [], depart: [], hotel: [], trip: [], ticket: [], tour: ["leg"],
  };
  const name = Object.entries(at).map(([key, value]) => `${key} ${value}`).join(" ");
  if (typeof priority === "string") {
    const part = priority.slice("after ".length) as AfterPart;
    if (!afters[kind].includes(part)) return `# at: ${name} has no ${priority} (A2; ${afters[kind].length ? `it has ${afters[kind].map((item) => `after ${item}`).join(", ")}` : "write a negative or a positive number"})`;
  }
  if (typeof priority === "number" && priority > 0 && (kind === "trip" || kind === "ticket" || kind === "depart"))
    return `# at: ${name} has no positive priority (A2; the scenes after it are written at the next moment's negative priority: the arrival's, the visit's)`;
  return undefined;
}

/** A knot head, read. */
export type PlaceHead = {
  kind: SceneKind;
  title?: string;
  at: SceneAt[];
  priority?: number | `after ${AfterPart}`;
  when?: Condition;
  whenTexts: string[];
  untilTexts: string[];
  repeat?: "once" | "always";
  people: string[];
  done: SceneDone;
  then?: SceneThen;
  sources?: "none";
  /** A date's `# hint:` (2026-11-13): its locked card's words in free time while its map condition does not hold. */
  hint?: string;
};

/** Read a knot's head tags; throws for a value of the wrong form and for a position its moment lacks (A2, positionProblem). */
export function readHead(knot: PlaceKnot, apCap: number): PlaceHead | undefined {
  if (!knot.head.length) return undefined;
  const values = (key: string) => knot.head.filter((tag) => tag.key === key).map((tag) => tag.value);
  const single = (key: string) => {
    const found = values(key);
    if (found.length > 1) throw new Error(`Write # ${key}: once in the head of ${knot.name}`);
    return found[0];
  };
  const kind = single("scene");
  if (!kind) throw new Error(`The head of ${knot.name} needs # scene: (${PLACE_KINDS.join(", ")}); a knot without a head is a helper knot`);
  if (!(PLACE_KINDS as readonly string[]).includes(kind))
    throw new Error(`# scene: ${kind} is not available in a place file (${PLACE_KINDS.join(", ")})`);
  const at = values("at").map((value) => parseAt(value));
  const priorityText = single("priority");
  let priority: PlaceHead["priority"];
  if (priorityText !== undefined) {
    const after = /^after\s+([a-z]+)$/u.exec(priorityText);
    if (after && (AFTER_PARTS as readonly string[]).includes(after[1])) priority = priorityText as PlaceHead["priority"];
    else if (/^[+-]?[0-9]+$/u.test(priorityText)) {
      priority = Number(priorityText);
      if (priority === 0) throw new Error(`# priority: 0 is the main part itself (${knot.name}); write a negative or a positive number`);
      if (!Number.isSafeInteger(priority)) throw new Error(`# priority: ${priorityText} is too large`);
    } else throw new Error(`# priority: takes a whole number or after <part> (${AFTER_PARTS.join(", ")}) (${knot.name}): ${priorityText}`);
  }
  for (const moment of at) {
    const problem = positionProblem(moment, priority);
    if (problem) throw new Error(`${problem} (${knot.name})`);
  }
  const repeat = single("repeat");
  if (repeat !== undefined && repeat !== "once" && repeat !== "always") throw new Error(`Unknown # repeat: ${repeat} (once or always)`);
  const whenTexts = values("when");
  const untilTexts = values("until");
  const when = combineWhenUntil(whenTexts.map((text) => condition(text, "when")), untilTexts.map((text) => condition(text, "until")));
  const sources = single("sources");
  if (sources !== undefined && sources !== "none") throw new Error(`# sources: takes none (list a scene's sources in scenes/catalog.json): ${sources}`);
  const then = single("then");
  const hint = single("hint");
  if (hint !== undefined && kind !== "date")
    throw new Error(`# hint: は、デートの頭の札です：${knot.name} は # scene: ${kind} です。デートの knot に書いてください` +
      `（# hint: is a date's head tag; ${knot.name} is a ${kind}）。`);
  return {
    kind: kind as SceneKind,
    ...(single("title") ? { title: single("title") } : {}),
    at, ...(priority !== undefined ? { priority } : {}),
    ...(when ? { when } : {}), whenTexts, untilTexts,
    ...(repeat ? { repeat } : {}),
    people: values("person").map((value) => ident(value, "# person:")),
    done: parseDone(values("on_done"), apCap),
    ...(then ? { then: parseThen(then) } : {}),
    ...(sources ? { sources } : {}),
    ...(hint ? { hint } : {}),
  };
}

/**
 * The head of a one-scene file of a main part (arrival, guide, battle, epilogue, date; 3.1): the
 * `# on_done:`, `# then:` and (a date's, 2026-11-13) `# hint:` lines after the VAR lines and before the first
 * other line. Returns the source with them blanked (the story compiles as before) and their values.
 */
export function readMainFileHead(source: string): { source: string; onDone: string[]; then?: string; hint?: string } {
  const lines = source.split("\n");
  const code = withoutComments(source).split("\n");
  let index = 0;
  while (index < code.length && /^\s*(?:$|(?:VAR|CONST|INCLUDE|EXTERNAL)\s)/u.test(code[index])) index++;
  const onDone: string[] = [];
  let then: string | undefined;
  let hint: string | undefined;
  for (; index < code.length && TAG_LINE.test(code[index]); index++) {
    const tags = tagsOf(code[index], index + 1);
    const heads = tags.filter((tag) => tag.key === "on_done" || tag.key === "then" || tag.key === "hint");
    if (!heads.length) continue;
    if (heads.length !== tags.length) throw new Error(`Write # on_done:, # then: and # hint: on their own lines (line ${index + 1})`);
    for (const tag of heads) {
      if (tag.key === "on_done") onDone.push(tag.value);
      else if (tag.key === "hint") {
        if (hint !== undefined) throw new Error("Write # hint: once at the top of the file");
        if (!tag.value) throw new Error(`# hint: の一言がありません（${index + 1}行目）。# hint: <一言> と書いてください（Empty head tag: # hint:）。`);
        hint = tag.value;
      } else if (then !== undefined) throw new Error("Write # then: once at the top of the file");
      else then = tag.value;
    }
    lines[index] = "";
  }
  return { source: lines.join("\n"), onDone, ...(then !== undefined ? { then } : {}), ...(hint !== undefined ? { hint } : {}) };
}

/**
 * The choices of a one-scene file and their effect tags (guides, arrivals and epilogues may have
 * choices from stage 3a). Read with the place-file reader's rules, as one knot named after the file.
 */
export function readFileChoices(storyId: string, source: string): PlaceChoice[] {
  const code = withoutComments(source).split("\n");
  const knot = storyId.split("/").at(-1)!;
  const choices: PlaceChoice[] = [];
  let open: PlaceChoice | undefined;
  code.forEach((line, index) => {
    if (!line.trim()) return;
    if (TAG_LINE.test(line)) {
      const tags = tagsOf(line, index + 1);
      if (open) for (const tag of tags) if (isEffectKey(tag.key)) open.tags.push(tag);
      else if (tags.some((tag) => isEffectKey(tag.key) && tag.key !== "effect" && tag.key !== "then"))
        throw new Error(`An effect tag follows a choice (line ${index + 1}): write it on the line right after a choice (A7)`);
      return;
    }
    open = undefined;
    if (CHOICE_LINE.test(line) && !/^\s*-/u.test(line)) {
      const bracket = /\[([^\]]*)\]/u.exec(line)?.[1] ?? "";
      const option = /#\s*option\s*:\s*([^#\]]+)/u.exec(bracket)?.[1].trim();
      open = { line: index + 1, knot, ...(option ? { optionId: option } : {}), translated: /#\s*translation\s*:/u.test(bracket), ...choiceTexts(bracket), tags: [] };
      choices.push(open);
    }
  });
  return choices;
}
