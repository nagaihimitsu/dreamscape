import { isPlaceStory } from "../src/content/story-address";
import { withoutComments } from "./place-files";

// npm run content:unused (2026-11-16, on demand; never part of content:build): notes on what nothing reaches.
// (a) Scenes nothing reaches: knots of the Ink files that no scene, divert, tunnel, thread or data entry points at (and
//     functions no line calls), and the data entries that lead to scenes but that nothing uses (a date destination no
//     date names, a battle no episode or special battle puts on the map, a landmark no visit opens, a person no line names).
// (b) Data fields no screen shows: the keys of the content schemas (src/content/) whose name the game's code never reads
//     outside the schemas. Read by name only, so it is a guess (a field read through a loop over its keys, or a name
//     another schema also uses, is missed or counted as read).
// What content:build already stops or notes is not repeated here: a head without # at: or without a catalog that points
// at it, a story file nothing points at, scenes/catalog.json naming no scene (errors), and a condition never met
// (never-offered), an unused public file, sound, track or term (notes).
// Pure: the caller passes the Ink sources, the catalogs' entries and the code's text (content-unused-cli.ts reads them).

// ── (a) Knots ─────────────────────────────────────────────────────────────────

/** An Ink file: its story ID (path below stories/ without .ink), its file as messages show it, its journey and text. */
export type InkFile = { storyId: string; file: string; journey: string; source: string };
/** A knot nothing reaches. */
export type UnreachedKnot = { journey: string; file: string; line: number; knot: string; isFunction: boolean };

type Knot = { name: string; line: number; isFunction: boolean; scene: string | undefined; stitches: string[]; labels: string[]; targets: string[]; body: string };

const KNOT_LINE = /^\s*={2,}\s*(function\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*=*\s*$/u;
const STITCH_LINE = /^\s*=(?!=)\s*([A-Za-z_][A-Za-z0-9_]*)/u;
const LABEL = /^\s*(?:[*+-]\s*)+\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)/u;
const TARGET = /(?:->|<-)\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/gu;

/** The knots of an Ink source (comments left out); the lines before the first knot are the knot "" (a one-scene file's top). */
function inkKnots(source: string): Knot[] {
  const top: Knot = { name: "", line: 1, isFunction: false, scene: undefined, stitches: [], labels: [], targets: [], body: "" };
  const knots = [top];
  let current = top;
  let inHead = false;
  withoutComments(source).split("\n").forEach((line, index) => {
    const head = KNOT_LINE.exec(line);
    if (head) {
      current = { name: head[2], line: index + 1, isFunction: !!head[1], scene: undefined, stitches: [], labels: [], targets: [], body: "" };
      knots.push(current);
      inHead = true;
      return;
    }
    if (inHead && /^\s*#/u.test(line)) {
      const scene = /#\s*scene\s*:\s*([a-z_]+)/u.exec(line)?.[1];
      if (scene) current.scene = scene;
      return;
    }
    inHead = false;
    current.body += `${line}\n`;
    const stitch = STITCH_LINE.exec(line);
    if (stitch) current.stitches.push(stitch[1]);
    const label = LABEL.exec(line);
    if (label) current.labels.push(label[1]);
    for (const match of line.matchAll(TARGET)) current.targets.push(match[1]);
  });
  return knots;
}

/** A knot a data entry names by its address (`places/<file>.<knot>`), or the game reads by name (a battle's `<knot>_claim`, `<knot>_press`). */
export type NamedKnot = { storyId: string; knot: string };

/**
 * The knots of the Ink files that nothing reaches. Reached from: a place file's scenes (knots with `# scene:`), a
 * one-scene file's top, and the knots `named` (data entries, the game's names); then every divert, tunnel and thread
 * of a reached knot (`-> knot`, `-> knot.stitch`, `-> knot ->`, `<- knot`), and every function a reached knot calls.
 */
export function unreachedKnots(files: readonly InkFile[], named: readonly NamedKnot[]): UnreachedKnot[] {
  return files.flatMap((file) => {
    const knots = inkKnots(file.source);
    const byName = new Map(knots.map((knot) => [knot.name, knot]));
    const roots = isPlaceStory(file.storyId) ? knots.filter((knot) => knot.scene !== undefined).map((knot) => knot.name) : [""];
    roots.push(...named.filter((item) => item.storyId === file.storyId).map((item) => item.knot));
    const reached = new Set<string>();
    const queue = roots.filter((name) => byName.has(name));
    const functions = knots.filter((knot) => knot.isFunction);
    while (queue.length) {
      const knot = byName.get(queue.shift()!)!;
      if (reached.has(knot.name)) continue;
      reached.add(knot.name);
      for (const target of knot.targets) {
        const [first] = target.split(".");
        if (byName.has(first) && !knot.stitches.includes(first) && !knot.labels.includes(first)) queue.push(first);
      }
      for (const fn of functions) if (!reached.has(fn.name) && new RegExp(`\\b${fn.name}\\s*\\(`, "u").test(knot.body)) queue.push(fn.name);
    }
    return knots.filter((knot) => knot.name && !reached.has(knot.name))
      .map((knot) => ({ journey: file.journey, file: file.file, line: knot.line, knot: knot.name, isFunction: knot.isFunction }));
  });
}

// ── (a) Data entries ──────────────────────────────────────────────────────────

/** An entry of a merged catalog: its value, the file it comes from (as messages show it), its journey and its position there. */
export type CatalogEntry = { value: Record<string, unknown>; file: string; journey: string; where: string };
/** A data entry that leads to scenes but that nothing uses. */
export type UnusedEntry = { journey: string; file: string; where: string; id: string; reasonJa: string };

/** What the entry checks read: the entries of the catalogs (each with its file), and every Ink source and JSON text. */
export type EntryInput = {
  destinations: readonly CatalogEntry[];
  dates: readonly CatalogEntry[];
  battles: readonly CatalogEntry[];
  episodes: readonly CatalogEntry[];
  storyBattles: readonly CatalogEntry[];
  landmarks: readonly CatalogEntry[];
  people: readonly CatalogEntry[];
  /** Every Ink source (a person is named by `# speaker:`, `# person:`, `# together:`, `# leave:`, `# give:` or `cond("met …")`). */
  inkSources: readonly string[];
};

const idOf = (entry: CatalogEntry) => (typeof entry.value.id === "string" ? entry.value.id : undefined);
const fieldOf = (entry: CatalogEntry, key: string) => (typeof entry.value[key] === "string" ? entry.value[key] as string : undefined);

/** The data entries that lead to scenes but that nothing uses (none of these stops content:build or is in its notes). */
export function unusedEntries(input: EntryInput): UnusedEntry[] {
  const unused = (entries: readonly CatalogEntry[], used: ReadonlySet<string>, reasonJa: string) => entries.flatMap((entry) => {
    const id = idOf(entry);
    return id === undefined || used.has(id) ? [] : [{ journey: entry.journey, file: entry.file, where: entry.where, id, reasonJa }];
  });
  const names = (entries: readonly CatalogEntry[], key: string) => new Set(entries.map((entry) => fieldOf(entry, key)).filter((id): id is string => !!id));
  const inkWords = new Set(input.inkSources.flatMap((source) => withoutComments(source).match(/[a-z][a-z0-9_]*/gu) ?? []));
  return [
    ...unused(input.destinations, names(input.dates, "destinationId"),
      "どのデートの destinationId にもない行き先です（街歩きにデートとして出ません。デートを書くか、要らなければ消します）"),
    ...unused(input.battles, new Set([...names(input.episodes, "battleId"), ...names(input.storyBattles, "battleId")]),
      "どのエピソードの battleId にも、特殊戦（storyBattles）にもないクイズです（地図に出ません）"),
    ...unused(input.landmarks, new Set([...names(input.episodes, "landmarkId"), ...names(input.battles, "landmarkId")]),
      "どのエピソードの landmarkId にも、クイズの landmarkId にもない観光地です（訪ねる場面がなく、案内も出ません）"),
    ...input.people.flatMap((entry) => {
      const id = idOf(entry);
      return id === undefined || inkWords.has(id) ? [] : [{ journey: entry.journey, file: entry.file, where: entry.where, id,
        reasonJa: "どの Ink の行も名前を出さない人物です（# speaker:・# person: などに一度も出ません。旅の記録の「出会った人」にも出ません）" }];
    }),
  ];
}

/** The knots a data entry names by address (`places/<file>.<knot>` in any string of the catalogs), and each battle's claim and press. */
export function namedKnots(strings: readonly string[], battleStoryIds: readonly string[]): NamedKnot[] {
  const found: NamedKnot[] = [];
  for (const text of strings) {
    const match = /^([a-z][a-z0-9_]*(?:\/[a-z][a-z0-9_]*)+)\.([a-z][a-z0-9_]*)(?:\.[a-z][a-z0-9_]*)?$/u.exec(text);
    if (match) found.push({ storyId: match[1], knot: match[2] });
  }
  for (const address of battleStoryIds) {
    const [storyId, knotPath] = address.split(".");
    const knot = knotPath ?? storyId.split("/").at(-1)!;
    found.push({ storyId, knot: `${knot}_claim` }, { storyId, knot: `${knot}_press` });
  }
  return found;
}

// ── (b) Schema keys ───────────────────────────────────────────────────────────

/**
 * A TypeScript source with its comments (and, with `strings`, its strings, template literals and regular expressions)
 * as spaces, the line breaks kept: the brackets of the code can then be matched.
 */
export function maskCode(source: string, options: { strings: boolean }): string {
  const out = source.split("");
  const blank = (from: number, to: number) => { for (let index = from; index < to; index++) if (out[index] !== "\n") out[index] = " "; };
  let index = 0;
  let last = "";
  // The brace depths at which a template literal's `${` opened: its `}` goes back into the template.
  const templates: number[] = [];
  let depth = 0;
  const template = (start: number) => {
    // From after a backtick or a `}` that closes `${`: to the closing backtick, or to a `${`.
    let at = start;
    while (at < source.length && source[at] !== "`") {
      if (source[at] === "\\") at += 2;
      else if (source[at] === "$" && source[at + 1] === "{") { if (options.strings) blank(start, at); templates.push(depth); depth++; return at + 2; }
      else at++;
    }
    if (options.strings) blank(start, at);
    return at + 1;
  };
  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];
    if (char === "/" && next === "/") {
      const end = source.indexOf("\n", index);
      blank(index, end < 0 ? source.length : end);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      blank(index, end < 0 ? source.length : end + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    if (char === "\"" || char === "'") {
      let at = index + 1;
      while (at < source.length && source[at] !== char && source[at] !== "\n") at += source[at] === "\\" ? 2 : 1;
      if (options.strings) blank(index + 1, at);
      index = at + 1;
      last = "a";
      continue;
    }
    if (char === "`") { index = template(index + 1); last = "a"; continue; }
    if (char === "/" && (last === "" || /[(,=:[!&|?{};+\-*%<>~^]/u.test(last))) {
      // A regular expression (where an operand starts), to its closing slash outside a character class.
      let at = index + 1;
      let inClass = false;
      while (at < source.length && source[at] !== "\n" && (inClass || source[at] !== "/")) {
        if (source[at] === "\\") at++;
        else if (source[at] === "[") inClass = true;
        else if (source[at] === "]") inClass = false;
        at++;
      }
      if (options.strings) blank(index + 1, at);
      index = at + 1;
      last = "a";
      continue;
    }
    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (templates.length && templates.at(-1) === depth) { templates.pop(); index = template(index + 1); last = "a"; continue; }
    }
    if (!/\s/u.test(char)) last = /[\w$]/u.test(char) ? "a" : char;
    index++;
  }
  return out.join("");
}

/** A key of a schema's object literal: its file, its schema (the nearest `const` before it), the key and its line. */
export type SchemaKey = { file: string; schema?: string; key: string; line: number };

const OBJECT_START = /\b(?:z\s*\.\s*(?:object|strictObject|looseObject)|\.extend)\s*\(\s*\{/gu;

/** The spans of the object literals of `z.object({…})`, `z.strictObject({…})` and `.extend({…})`: from `{` to its `}`. */
function objectSpans(masked: string): [number, number][] {
  const spans: [number, number][] = [];
  for (const match of masked.matchAll(OBJECT_START)) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let at = open; at < masked.length; at++) {
      if ("([{".includes(masked[at])) depth++;
      else if (")]}".includes(masked[at]) && --depth === 0) { spans.push([open, at]); break; }
    }
  }
  return spans;
}

/** The keys of every schema object literal of a source (`key: …`, `"key": …`, shorthand `key,`; spreads and computed keys left out). */
export function schemaKeys(file: string, source: string): SchemaKey[] {
  const masked = maskCode(source, { strings: true });
  const lineAt = (position: number) => source.slice(0, position).split("\n").length;
  const keys: SchemaKey[] = [];
  for (const [open, close] of objectSpans(masked)) {
    const schema = [...source.slice(0, open).matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=/gu)].at(-1)?.[1];
    // Entry starts: after the brace and after each comma at the literal's own depth.
    const starts = [open + 1];
    let depth = 0;
    for (let at = open + 1; at < close; at++) {
      if ("([{".includes(masked[at])) depth++;
      else if (")]}".includes(masked[at])) depth--;
      else if (masked[at] === "," && depth === 0) starts.push(at + 1);
    }
    for (const start of starts) {
      let at = start;
      while (at < close && /\s/u.test(masked[at])) at++;
      const key = /^(["']?)([A-Za-z_$][\w$]*)\1\s*([:,}]|$)/u.exec(source.slice(at, close + 1));
      if (!key || source.startsWith("...", at)) continue;
      keys.push({ file, ...(schema ? { schema } : {}), key: key[2], line: lineAt(at) });
    }
  }
  return keys;
}

/** A source of the game's code, without its comments and (when it is a module that also defines schemas) without its schema literals. */
export function readingText(source: string): string {
  const comments = maskCode(source, { strings: false });
  const out = comments.split("");
  for (const [open, close] of objectSpans(maskCode(source, { strings: true }))) for (let at = open; at <= close; at++) if (out[at] !== "\n") out[at] = " ";
  return out.join("");
}

/** The words of code (identifiers and the words inside its strings): a key is read where its name is one of them. */
export const codeWords = (texts: readonly string[]) => new Set(texts.flatMap((text) => text.match(/[A-Za-z_$][\w$]*/gu) ?? []));

/** Keys that are never read on screen by design: the files' version. */
const NOT_SHOWN_BY_DESIGN = new Set(["schemaVersion"]);

/** A key no screen reads (by name), where its schemas define it, whether the build or a tool reads it, and which data uses it. */
export type UnreadKey = { key: string; defined: SchemaKey[]; readByTools: boolean; dataUses: { journey: string; count: number }[] };

/**
 * The schema keys whose name `gameWords` (the game's code outside its schemas, codeWords of readingText) lacks, with
 * whether `toolWords` (the build and the tools) has it and how often each journey's data (`dataKeys`: journey → key → count) uses it.
 */
export function unreadSchemaKeys(keys: readonly SchemaKey[], gameWords: ReadonlySet<string>, toolWords: ReadonlySet<string>,
  dataKeys: ReadonlyMap<string, ReadonlyMap<string, number>>): UnreadKey[] {
  const byKey = new Map<string, SchemaKey[]>();
  for (const key of keys) if (!gameWords.has(key.key) && !NOT_SHOWN_BY_DESIGN.has(key.key)) byKey.set(key.key, [...(byKey.get(key.key) ?? []), key]);
  return [...byKey].map(([key, defined]) => ({
    key, defined, readByTools: toolWords.has(key),
    dataUses: [...dataKeys].flatMap(([journey, counts]) => (counts.get(key) ? [{ journey, count: counts.get(key)! }] : [])),
  }));
}

/** How often each key of a parsed JSON value is used (at any depth). */
export function jsonKeyCounts(value: unknown, into = new Map<string, number>()): Map<string, number> {
  if (Array.isArray(value)) for (const item of value) jsonKeyCounts(item, into);
  else if (typeof value === "object" && value !== null)
    for (const [key, item] of Object.entries(value)) { into.set(key, (into.get(key) ?? 0) + 1); jsonKeyCounts(item, into); }
  return into;
}

// ── The report ────────────────────────────────────────────────────────────────

/** A journey as the report heads it. */
export type JourneyLabel = { id: string; nameJa?: string; status?: string };
/** The core layer (content/ without the journey folders), as a journey of the report. */
export const CORE = "core";

export type UnusedReport = {
  journeys: readonly JourneyLabel[];
  knots: readonly UnreachedKnot[];
  entries: readonly UnusedEntry[];
  keys: readonly UnreadKey[];
};

const journeyName = (journey: JourneyLabel) => journey.id === CORE ? "共通（content/ の旅行編フォルダの外）"
  : `${journey.nameJa ? `${journey.nameJa}（${journey.id}）` : journey.id}${journey.status ? `、${journey.status}` : ""}`;

/** The report in Japanese: what it does not repeat, the counts per journey, then each note with its file and line. */
export function formatUnusedReport(report: UnusedReport): string[] {
  const out = [
    "使われていない場面とデータの点検（content:unused）：注意だけで、どのファイルも変えません。消すかどうかは書く人が決めます。",
    "content:build がもう止めるもの（# at: のない差し込みの場面、どのカタログも指さない本筋の場面、どこからも指されない Ink のファイル、" +
      "scenes/catalog.json の場面のない ID）と、注意に出すもの（条件がいつも偽の場面 never-offered、使われていない公開ファイル・効果音・曲・環境音・図鑑の語）は、ここでは繰り返しません。",
    "",
    "旅行編ごとの数：",
  ];
  for (const journey of report.journeys) {
    const knots = report.knots.filter((item) => item.journey === journey.id).length;
    const entries = report.entries.filter((item) => item.journey === journey.id).length;
    const keys = report.keys.filter((item) => item.dataUses.some((use) => use.journey === journey.id)).length;
    out.push(`- ${journeyName(journey)}：届かない knot ${knots}、場面に届かないデータ ${entries}、画面が読まないかもしれない欄（データで使っている欄）${keys}`);
  }
  out.push(`- 画面が読まないかもしれない欄（下の一覧の数。スキーマの欄の名前ごと）：${report.keys.length}（どのデータも使っていない欄 ${report.keys.filter((item) => !item.dataUses.length).length} を含む）`);
  out.push("", `■ (a) どこからも届かない knot（${report.knots.length}件）`);
  if (!report.knots.length) out.push("  ありません。");
  for (const item of report.knots)
    out.push(`  ${item.file}:${item.line} ${item.isFunction ? "関数" : "knot"} ${item.knot}：${item.isFunction ? "どの行からも呼ばれていません" :
      "頭の札（# scene:）がなく、どの場面の -> からも、データからも指されていません"}`);
  out.push("", `■ (a) 場面に届かないデータの項目（${report.entries.length}件）`);
  if (!report.entries.length) out.push("  ありません。");
  for (const item of report.entries) out.push(`  ${item.file} ${item.where} ${item.id}：${item.reasonJa}`);
  out.push("", `■ (b) 画面が読まないかもしれない欄（${report.keys.length}件）`,
    "  推定です：欄の名前が、src/ のコード（スキーマとテストを除く）に一度も出ないものを挙げます。名前を組み立てて読む欄や、" +
      "ほかのスキーマの同じ名前の欄が読まれているものは見落とします。消す前に、その欄を使う画面がないか確かめます。");
  if (!report.keys.length) out.push("  ありません。");
  for (const item of report.keys) {
    const uses = item.dataUses.length ? `この名前の欄をデータで使う：${item.dataUses.map((use) => `${use.journey === CORE ? "共通" : use.journey} ${use.count}か所`).join("、")}`
      : "この名前の欄はどのデータも使っていない";
    for (const place of item.defined)
      out.push(`  ${place.file}:${place.line}${place.schema ? `（${place.schema}）` : ""} ${item.key}：${uses}。${item.readByTools ? "content:build か制作の道具（scripts/）は読む。" : "scripts/ も読まない。"}`);
  }
  return out;
}
