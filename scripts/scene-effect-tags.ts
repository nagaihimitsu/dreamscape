import { ITEM_ID, TINT_SWITCHES, WEATHER_KINDS, WEATHER_STOP } from "../src/content/tags";
import type { CitySource, ContentSources } from "./content-sources";
import { withoutComments } from "./place-files";

// content:build's checks of the scene's atmosphere tags (2026-11-13; src/content/tags.ts), read statically from the Ink
// source (so a line in a branch no walk takes counts too): a line's `# item_show:` names an item of the story's own
// journey (a journey folder must stay removable on its own), `# weather:` and `# tint:` give one of their values.
// Light module (no content loading): unit tests use it directly. Japanese first, English after.

const KNOT_LINE = /^\s*={2,}\s*(?:function\s+)?([A-Za-z_][A-Za-z0-9_]*)/u;
/** `# item_show`, `# item_show: <ID>`, `# weather: <value>`, `# tint: <value>` (the value up to the next `#`). */
const TAG = /#\s*(item_show|weather|tint)(?![A-Za-z0-9_])\s*(?::([^#]*))?/gu;

/** An atmosphere tag of an Ink source: its key, the value it gives (trimmed; "" without one), its line (from 1) and knot. */
export type SceneEffectTag = { key: "item_show" | "weather" | "tint"; value: string; line: number; knot?: string };

/** The `# item_show:`, `# weather:` and `# tint:` tags of an Ink source, without `//` comments. */
export function sceneEffectTagsOf(source: string): SceneEffectTag[] {
  let knot: string | undefined;
  return withoutComments(source).split("\n").flatMap((text, index) => {
    const head = KNOT_LINE.exec(text);
    if (head) knot = head[1];
    return [...text.matchAll(TAG)].map((match): SceneEffectTag => ({ key: match[1] as SceneEffectTag["key"], value: (match[2] ?? "").trim(),
      line: index + 1, ...(knot ? { knot } : {}) }));
  });
}

/** Each item's journey: the layer of its city (none for an item whose city no journey has; content:build stops that elsewhere). */
export function itemJourneys(items: readonly { id: string; cityId: string }[], cities: readonly Pick<CitySource, "id" | "layer">[]): Map<string, string | undefined> {
  return new Map(items.map((item) => [item.id, cities.find((city) => city.id === item.cityId)?.layer]));
}

/** itemJourneys of the merged encounters/catalog.json as loaded (its items with an ID and a city; nothing without the catalog). */
export function catalogItemJourneys(sources: Pick<ContentSources, "catalogs" | "cities">): Map<string, string | undefined> {
  const catalog = sources.catalogs["encounters/catalog.json"]?.value;
  const items = (typeof catalog === "object" && catalog !== null && Array.isArray((catalog as { items?: unknown }).items)
    ? (catalog as { items: unknown[] }).items : [])
    .filter((item): item is { id: string; cityId: string } => typeof item === "object" && item !== null &&
      typeof (item as { id?: unknown }).id === "string" && typeof (item as { cityId?: unknown }).cityId === "string");
  return itemJourneys(items, sources.cities);
}

const WEATHER_VALUES: readonly string[] = [...WEATHER_KINDS, WEATHER_STOP];

/**
 * Throws at the first atmosphere tag of a story of the journey `journeyId` that cannot be shown: a `# item_show:`
 * without an item, naming an item the catalogs do not have or an item of another journey, a `# weather:` or `# tint:`
 * of another value, and a line with two of the same tag.
 */
export function checkSceneEffectTags(source: string, journeyId: string, items: ReadonlyMap<string, string | undefined>): void {
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
    if (!value)
      throw new Error(`品物の ID がありません：${where}。# item_show: <品物のID>（encounters/catalog.json の items）と書いてください` +
        "（# item_show: without an item）。");
    if (!ITEM_ID.test(value) || !items.has(value))
      throw new Error(`品物がありません：${where} の品物が、どの旅行編の encounters/catalog.json の items にもありません` +
        `（Unknown item in # item_show: ${value}）。`);
    const owner = items.get(value);
    if (owner !== journeyId)
      throw new Error(`ほかの旅行編の品物です：${where} は、旅行編 ${owner ?? "（なし）"} の品物です。この旅行編の品物を書いてください` +
        `（Item of another journey in # item_show: ${value} is an item of ${owner ?? "no journey"}）。`);
  }
}
