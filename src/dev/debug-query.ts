/**
 * Debug launch URLs (the development server, or a production build with Debug mode on: src/main.tsx):
 * `?debug&city=…&scene=…&target=…` opens a scene directly. Pure and free of game content, so tests (also Playwright on
 * Node) can build and read the URLs; the scene itself is resolved and checked
 * against the content by resolveDebugLaunch in debug-state.ts.
 * The format is for development and may change without compatibility.
 */

export const debugScenes = ["tourism", "battle", "encounter", "date", "epilogue", "occasion", "tour"] as const;
export type DebugScene = (typeof debugScenes)[number];
export const debugSceneLabels: Record<DebugScene, string> = {
  tourism: "観光・場所", battle: "バトル", encounter: "人物との交流", date: "デート", epilogue: "エピローグ", occasion: "観光地の時点（場面から始める）",
  tour: "ツアー",
};
export type DebugDataMode = "real" | "fixture";

/** What Debug opens: a scene of a city, its progress, AP, relationship and the saved reaction ticket. */
export type DebugSettings = {
  cityId?: string;
  scene: DebugScene;
  id: string;
  progress: "initial" | "completed";
  ap: number;
  affection: number;
  trust: number;
  spark: number;
  roll: "positive" | "negative";
  /** 「場面から始める」 (scene=occasion; the unified event design 4.8): the scene to stop at, and the scenes played first. */
  from?: string;
  prep?: string[];
  /** A tour (scene=tour; tour stage 2a): the event step to open (its morning played to there); without it, the tour booked. */
  step?: string;
  /**
   * A date (scene=date): items Debug's state holds that the date starts without, for the branch of a player who never got
   * them (a story that asks `cond("item <id> held")`; Debug's 「ミニゲームの見本」 links a use there).
   */
  without?: string[];
  /**
   * A date (scene=date): an episode of the city its story asks about (`cond("episode <id>")`), not yet done. The date
   * opens from the city's start with the city's other episodes finished one by one until it can start (Lodhi Garden
   * before Humayun's Tomb); `progress` is not read.
   */
  before?: string;
};

/** The value range the scene picker (場面の確認) offers (AP is also capped by the game's AP limit). */
export const debugValueRanges = {
  ap: [0, 12], affection: [-20, 20], trust: [-20, 20], spark: [-20, 20],
} as const satisfies Record<"ap" | "affection" | "trust" | "spark", readonly [number, number]>;

/** A launch URL's values; omitted ones take the scene picker's defaults. `map` shows a prototype city's map. */
export interface DebugQuery {
  dataMode: DebugDataMode;
  cityId?: string;
  scene: DebugScene | "map";
  target?: string;
  progress?: DebugSettings["progress"];
  ap?: number;
  affection?: number;
  trust?: number;
  spark?: number;
  roll?: DebugSettings["roll"];
  from?: string;
  prep?: string[];
  step?: string;
  without?: string[];
  before?: string;
}

export type ParsedDebugQuery =
  | { kind: "panel" }
  | { kind: "launch"; query: DebugQuery }
  | { kind: "error"; message: string };

type NumberKey = keyof typeof debugValueRanges;
const choices = {
  data: ["real", "fixture"],
  scene: [...debugScenes, "map"],
  progress: ["completed", "initial"],
  roll: ["positive", "negative"],
} as const;
/** URL items in the order a copied URL lists them. */
export const debugQueryKeys = ["data", "city", "scene", "target", "progress", "ap", "affection", "trust", "spark", "roll", "from", "prep", "step", "without", "before"] as const;
type QueryKey = (typeof debugQueryKeys)[number];
const idPattern = /^[a-z][a-z0-9_]*$/;

function parseValue(key: QueryKey, value: string): string | number {
  if (key === "prep" || key === "without") {
    const ids = value.split(",");
    if (ids.some((id) => !idPattern.test(id))) throw new Error(`「${key}=${value}」はIDの形ではありません（${key === "prep" ? "場面" : "品物"}のIDを , で区切ります）。`);
    return value;
  }
  if (key === "city" || key === "target" || key === "from" || key === "step" || key === "before") {
    // A moment's target may say its kind (target=visit:<landmark>).
    if (key === "target" && value.startsWith("visit:")) value = value.slice("visit:".length);
    if (!idPattern.test(value)) throw new Error(`「${key}=${value}」はIDの形ではありません（小文字の英字で始まり、小文字の英数字と _ だけ）。`);
    return value;
  }
  if (key in debugValueRanges) {
    const [min, max] = debugValueRanges[key as NumberKey];
    const number = /^-?\d+$/.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(number) || number < min || number > max)
      throw new Error(`「${key}=${value}」は使えません。${key} には ${min}〜${max} の整数を書きます。`);
    return number;
  }
  const allowed: readonly string[] = choices[key as keyof typeof choices];
  if (!allowed.includes(value)) throw new Error(`「${key}=${value}」は使えません。${key} には ${allowed.join(" / ")} のどれかを書きます。`);
  return value;
}

/** Read `location.search`: only `?debug` opens the scene picker (場面の確認); any other item makes it a launch URL. */
export function parseDebugQuery(search: string): ParsedDebugQuery {
  const params = [...new URLSearchParams(search)].filter(([key]) => key !== "debug");
  if (!params.length) return { kind: "panel" };
  try {
    const values: Partial<Record<QueryKey, string | number>> = {};
    for (const [key, value] of params) {
      if (!(debugQueryKeys as readonly string[]).includes(key))
        throw new Error(`URLの項目「${key}」は使えません。使える項目: ${debugQueryKeys.join(", ")}`);
      if (key in values) throw new Error(`URLの項目「${key}」が2回以上あります。`);
      if (value === "") throw new Error(`URLの項目「${key}」に値がありません。`);
      values[key as QueryKey] = parseValue(key as QueryKey, value);
    }
    if (values.scene === undefined)
      throw new Error("場面（scene）がありません。scene=battle のように場面を指定するか、?debug だけで場面の確認を開いてください。");
    const query: DebugQuery = { dataMode: (values.data as DebugDataMode | undefined) ?? "real", scene: values.scene as DebugQuery["scene"] };
    if (values.city !== undefined) query.cityId = values.city as string;
    if (values.target !== undefined) query.target = values.target as string;
    if (values.progress !== undefined) query.progress = values.progress as DebugSettings["progress"];
    for (const key of Object.keys(debugValueRanges) as NumberKey[])
      if (values[key] !== undefined) query[key] = values[key] as number;
    if (values.roll !== undefined) query.roll = values.roll as DebugSettings["roll"];
    if (values.from !== undefined) query.from = values.from as string;
    if (values.prep !== undefined) query.prep = (values.prep as string).split(",");
    if (values.step !== undefined) query.step = values.step as string;
    if (values.without !== undefined) query.without = (values.without as string).split(",");
    if (values.before !== undefined) query.before = values.before as string;
    if ((query.from || query.prep) && query.scene !== "occasion") throw new Error("from と prep は scene=occasion（場面から始める）で使います。");
    if (query.step && query.scene !== "tour") throw new Error("step は scene=tour（ツアー）で使います。");
    if ((query.without || query.before) && query.scene !== "date") throw new Error("without と before は scene=date（デート）で使います。");
    return { kind: "launch", query };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : String(error) };
  }
}

/** The search part of a launch URL (`?debug&…`), items in a fixed order; `data` only for the fixture data. */
export function debugQueryString(query: DebugQuery): string {
  const values: Record<QueryKey, string | number | undefined> = {
    data: query.dataMode === "fixture" ? "fixture" : undefined, city: query.cityId, scene: query.scene,
    target: query.target, progress: query.progress, ap: query.ap, affection: query.affection,
    trust: query.trust, spark: query.spark, roll: query.roll, from: query.from, prep: query.prep?.join(","), step: query.step,
    without: query.without?.join(","), before: query.before,
  };
  return ["?debug", ...debugQueryKeys.flatMap((key) =>
    values[key] === undefined ? [] : [`${key}=${encodeURIComponent(String(values[key]))}`])].join("&");
}

/** Every item of the settings, so the URL opens the same scene even if a default changes later. */
export function settingsQuery(dataMode: DebugDataMode, settings: DebugSettings): DebugQuery {
  return { dataMode, cityId: settings.cityId, scene: settings.scene, target: settings.id || undefined, progress: settings.progress,
    ap: settings.ap, affection: settings.affection, trust: settings.trust, spark: settings.spark, roll: settings.roll,
    ...(settings.from ? { from: settings.from } : {}), ...(settings.prep?.length ? { prep: settings.prep } : {}), ...(settings.step ? { step: settings.step } : {}),
    ...(settings.without?.length ? { without: settings.without } : {}), ...(settings.before ? { before: settings.before } : {}) };
}
