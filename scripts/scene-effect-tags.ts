import { ITEM_ID, ITEM_OUT_LINE, TINT_SWITCHES, WEATHER_KINDS, WEATHER_STOP } from "../src/content/tags";
import type { CitySource, ContentSources } from "./content-sources";
import { taggedLines } from "./line-tag-text";
import { withoutComments } from "./place-files";

// content:build's checks of the scene's atmosphere tags (2026-11-13; src/content/tags.ts), read statically from the Ink
// source (so a line in a branch no walk takes counts too): a line's `# item_show:` and `# item_out:` (2026-11-15) name an
// item of the story's own journey (a journey folder must stay removable on its own), `# item_out:`'s line number one of
// the item's lines, `# weather:` and `# tint:` give one of their values. Light module (no content loading): unit tests
// use it directly. Japanese first, English after.

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
/** `# item_show`, `# item_show: <ID>`, `# item_out: <ID> [<n>]`, `# weather: <value>`, `# tint: <value>` (the value up to the next `#`). */
const TAG = /#\s*(item_show|item_out|weather|tint)(?![A-Za-z0-9_])\s*(?::([^#]*))?/gu;

/** An atmosphere tag of an Ink source: its key, the value it gives (trimmed; "" without one), its line (from 1) and knot. */
export type SceneEffectTag = { key: "item_show" | "item_out" | "weather" | "tint"; value: string; line: number; knot?: string };

/** The `# item_show:`, `# item_out:`, `# weather:` and `# tint:` tags of an Ink source, without `//` comments. */
export function sceneEffectTagsOf(source: string): SceneEffectTag[] {
  let knot: string | undefined;
  return withoutComments(source).split("\n").flatMap((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    return [...text.matchAll(TAG)].map((match): SceneEffectTag => ({ key: match[1] as SceneEffectTag["key"], value: (match[2] ?? "").trim(),
      line: index + 1, ...(knot ? { knot } : {}) }));
  });
}

/**
 * An item as a line's `# item_show:` and `# item_out:` name it: its journey, the layer of its city (none for an item whose
 * city no journey has; content:build stops that elsewhere), and how many lines are written on it (its `linesJa`, the
 * conditional ones too: any of them may show).
 */
export type SceneItem = { journey: string | undefined; lines: number };

/** Each item as the scene's tags name it (SceneItem). */
export function sceneItems(items: readonly { id: string; cityId: string; linesJa?: readonly unknown[] }[],
  cities: readonly Pick<CitySource, "id" | "layer">[]): Map<string, SceneItem> {
  return new Map(items.map((item) => [item.id, { journey: cities.find((city) => city.id === item.cityId)?.layer, lines: item.linesJa?.length ?? 0 }]));
}

/** sceneItems of the merged encounters/catalog.json as loaded (its items with an ID and a city; nothing without the catalog). */
export function catalogSceneItems(sources: Pick<ContentSources, "catalogs" | "cities">): Map<string, SceneItem> {
  const catalog = sources.catalogs["encounters/catalog.json"]?.value;
  const items = (typeof catalog === "object" && catalog !== null && Array.isArray((catalog as { items?: unknown }).items)
    ? (catalog as { items: unknown[] }).items : [])
    .filter((item): item is { id: string; cityId: string; linesJa?: unknown } => typeof item === "object" && item !== null &&
      typeof (item as { id?: unknown }).id === "string" && typeof (item as { cityId?: unknown }).cityId === "string")
    .map((item) => ({ id: item.id, cityId: item.cityId, ...(Array.isArray(item.linesJa) ? { linesJa: item.linesJa } : {}) }));
  return sceneItems(items, sources.cities);
}

const WEATHER_VALUES: readonly string[] = [...WEATHER_KINDS, WEATHER_STOP];

/**
 * Throws at the first atmosphere tag of a story of the journey `journeyId` that cannot be shown: a `# item_show:` or
 * `# item_out:` without an item, naming an item the catalogs do not have or an item of another journey, a `# item_out:`
 * with words after its line number, a line number that is not a whole number from 1 or past the item's lines, a
 * `# weather:` or `# tint:` of another value, a line with two of the same tag, and a line with both `# item_show:` and
 * `# item_out:` (also when they are written on separate lines of the source before the same line of text).
 */
export function checkSceneEffectTags(source: string, journeyId: string, items: ReadonlyMap<string, SceneItem>): void {
  const seen = new Set<string>();
  for (const { key, value, line, knot } of sceneEffectTagsOf(source)) {
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # ${key}${value ? `: ${value}` : ""}`;
    if (seen.has(`${line}:${key}`))
      throw new Error(`1つの行に # ${key}: が2つあります：${where}。1つにしてください（Duplicate ${key} tag on line ${line}）。`);
    seen.add(`${line}:${key}`);
    if (key === "weather") {
      if (!WEATHER_VALUES.includes(value))
        throw new Error(`天気の札の値が使えません：${where}。${WEATHER_VALUES.join("・")} のどれかを書いてください（Invalid weather tag: ${value}）。`);
      continue;
    }
    if (key === "tint") {
      if (!(TINT_SWITCHES as readonly string[]).includes(value))
        throw new Error(`時刻の色の札の値が使えません：${where}。off か on を書いてください（Invalid tint tag: ${value}）。`);
      continue;
    }
    const out = key === "item_out";
    const form = out ? "# item_out: <品物のID> か # item_out: <品物のID> <行の番号>" : "# item_show: <品物のID>";
    if (!value)
      throw new Error(`品物の ID がありません：${where}。${form}（品物は encounters/catalog.json の items）と書いてください` +
        `（# ${key}: without an item）。`);
    const [itemId, number, ...extra] = out ? value.split(/\s+/u) : [value];
    if (extra.length)
      throw new Error(`# item_out: に書けるのは、品物の ID と行の番号だけです：${where}。${form} と書いてください` +
        `（Extra words in # item_out: ${extra.join(" ")}）。`);
    if (!ITEM_ID.test(itemId) || !items.has(itemId))
      throw new Error(`品物がありません：${where} の品物が、どの旅行編の encounters/catalog.json の items にもありません` +
        `（Unknown item in # ${key}: ${itemId}）。`);
    const item = items.get(itemId)!;
    if (item.journey !== journeyId)
      throw new Error(`ほかの旅行編の品物です：${where} は、旅行編 ${item.journey ?? "（なし）"} の品物です。この旅行編の品物を書いてください` +
        `（Item of another journey in # ${key}: ${itemId} is an item of ${item.journey ?? "no journey"}）。`);
    if (number === undefined) continue;
    if (!ITEM_OUT_LINE.test(number))
      throw new Error(`行の番号が使えません：${where}。品物に書かれた何行目かを、1 から始まる整数（1、2、3…）で書いてください` +
        `（Invalid line number in # item_out: ${number}）。`);
    if (Number(number) > item.lines)
      throw new Error(item.lines
        ? `品物にその行がありません：${where}。${itemId} に書かれた行（linesJa。条件つきの行も数えます）は ${item.lines} 行です。` +
          `1 から ${item.lines} の番号を書いてください（Line ${number} of # item_out: ${itemId} is past its ${item.lines} lines）。`
        : `品物に書かれた行がありません：${where}。${itemId} には linesJa がないので、札には説明が出ます。行の番号を外してください` +
          `（# item_out: ${itemId} has no lines to number）。`);
  }
  // A line of text with its tags, wherever they are written before it (taggedLines): one item card at a time.
  const lines = new Map<number, string>();
  for (const { key, value, line, knot, textLine } of taggedLines(source, ["item_show", "item_out"])) {
    if (textLine === null) continue;
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # ${key}${value ? `: ${value}` : ""}`;
    const before = lines.get(textLine);
    if (before === key)
      throw new Error(`1つの行に # ${key}: が2つあります：${where}。1つにしてください（Duplicate ${key} tag on line ${textLine}）。`);
    if (before)
      throw new Error(`1つの行に # item_show: と # item_out: の両方があります：${where}。品物を見せる（# item_show:）か、取り出す` +
        `（# item_out:）か、どちらか1つにしてください（# item_show: and # item_out: on one line, ${textLine}）。`);
    lines.set(textLine, key);
  }
}
