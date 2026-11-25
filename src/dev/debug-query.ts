/**
 * Debug launch URLs (the development server, or a production build with Debug mode on: src/main.tsx):
 * `?debug&city=…&scene=…&target=…` opens a scene directly. Pure and free of game content, so tests (also Playwright on
 * Node) can build and read the URLs; the scene itself is resolved and checked
 * against the content by resolveDebugLaunch in debug-state.ts.
 * The format is for development and may change without compatibility.
 */

export const debugScenes = ["tourism", "battle", "encounter", "date", "epilogue", "occasion", "tour", "free", "hotel"] as const;
export type DebugScene = (typeof debugScenes)[number];
export const debugSceneLabels: Record<DebugScene, string> = {
  tourism: "観光・場所", battle: "クイズ", encounter: "人物との交流", date: "デート", epilogue: "エピローグ", occasion: "観光地の時点（場面から始める）",
  tour: "ツアー", free: "街歩き（地図）", hotel: "宿の場面（休む）",
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
  /**
   * The day of the stay in the city (travel.day, 1 = the arrival day) and the time (minutes since midnight): free time's clock
   * (scene=free; 2026-11-15 user request), or the clock any other scene starts at (2026-11-16: a date's `cond("time night")`
   * branch, a hotel's rest at night); either left out keeps the progress's own (debug-edits.ts withDebugClock).
   */
  day?: number;
  time?: number;
  /** Story flags of the city's journey (progression/story.json) the scene's state has as obtained, besides its progress's own (any scene). */
  flags?: string[];
  /**
   * Clues of the city's journey that a scene gives in conversation (`# clue:`, `# on_done: clue`; 2026-11-18) the scene's state has
   * found, besides its progress's own (any scene; debug-edits.ts debugClueGroups). A clue an observation finds is found there.
   */
  clues?: string[];
  /**
   * Episodes of the city (not its finale; debug-edits.ts debugEpisodes) the scene's state has finished, as a player finishes them
   * (2026-11-25 user request): from 旅の進行「旅の開始時」 only (a cleared city has finished them all); the flags, clues and values
   * chosen are given after them.
   */
  episodes?: string[];
  /**
   * 恋の段階 (GameState.romanceStage; 2026-11-16 user request) the scene's state starts at (any scene); left out keeps the
   * progress's own. Debug only: set as chosen, higher or lower (debug-edits.ts withDebugStage).
   */
  stage?: DebugRomanceStage;
};

/** 恋の段階 (GameState.romanceStage) as Debug offers it. */
export const debugRomanceStages = [1, 2, 3, 4] as const;
export type DebugRomanceStage = (typeof debugRomanceStages)[number];

/** Free time's clock in Debug: 9:00 (the day's start) to 21:00 (the day's end, whose night follows as in play). */
export const debugTimeRange = [9 * 60, 21 * 60] as const;
/** The days of a stay Debug's free time offers. */
export const debugDayRange = [1, 30] as const;
/** The quick choices of free time's clock (night is from 18:00: `time night`). */
export const debugClockPresets = [
  { labelJa: "朝", minute: 9 * 60 }, { labelJa: "昼", minute: 12 * 60 }, { labelJa: "夕方", minute: 17 * 60 }, { labelJa: "夜", minute: 19 * 60 },
] as const;
/** `minute` (since midnight) as 「HH:MM」, the form of a time field and of the URL's `time`. */
export function clockText(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
/** 「HH:MM」 (or 「H:MM」) as minutes since midnight; null for anything else. */
export function parseClockText(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/u.exec(text);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

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
  day?: number;
  time?: number;
  flags?: string[];
  clues?: string[];
  episodes?: string[];
  stage?: DebugRomanceStage;
  /**
   * 撮影の形 (shot mode, 2026-11-16): the page opens with Debug's own marks hidden (its bar, the relationship-change strip, the
   * locked cards…), so that a screenshot looks like play. For this page only, never stored (the device's own setting:
   * src/app/debug-mode.ts readDebugShot).
   */
  shot?: true;
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
export const debugQueryKeys = ["data", "city", "scene", "target", "progress", "ap", "affection", "trust", "spark", "stage", "roll", "from", "prep", "step", "without",
  "before", "day", "time", "episodes", "flags", "clues", "shot"] as const;
type QueryKey = (typeof debugQueryKeys)[number];
const idPattern = /^[a-z][a-z0-9_]*$/;
const listNames = { prep: "場面", without: "品物", episodes: "エピソード", flags: "フラグ", clues: "手がかり" } as const;

function parseValue(key: QueryKey, value: string): string | number {
  if (key === "prep" || key === "without" || key === "episodes" || key === "flags" || key === "clues") {
    const ids = value.split(",");
    if (ids.some((id) => !idPattern.test(id))) throw new Error(`「${key}=${value}」はIDの形ではありません（${listNames[key]}のIDを , で区切ります）。`);
    return value;
  }
  if (key === "time") {
    const minute = parseClockText(value);
    if (minute === null || minute < debugTimeRange[0] || minute > debugTimeRange[1])
      throw new Error(`「time=${value}」は使えません。time には ${clockText(debugTimeRange[0])}〜${clockText(debugTimeRange[1])} の時刻を 19:00 のように書きます。`);
    return minute;
  }
  if (key === "stage") {
    const stage = debugRomanceStages.find((item) => String(item) === value);
    if (stage === undefined)
      throw new Error(`「stage=${value}」は使えません。stage には恋の段階 ${debugRomanceStages[0]}〜${debugRomanceStages.at(-1)} の整数を書きます。`);
    return stage;
  }
  if (key === "shot") {
    if (value !== "1") throw new Error(`「shot=${value}」は使えません。shot には 1 を書きます（撮影の形：Debugの帯や印を隠して開きます）。`);
    return value;
  }
  if (key === "day") {
    const number = /^\d+$/u.test(value) ? Number(value) : NaN;
    if (!Number.isInteger(number) || number < debugDayRange[0] || number > debugDayRange[1])
      throw new Error(`「day=${value}」は使えません。day には ${debugDayRange[0]}〜${debugDayRange[1]} の整数（滞在の何日目か）を書きます。`);
    return number;
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
    if (values.day !== undefined) query.day = values.day as number;
    if (values.time !== undefined) query.time = values.time as number;
    if (values.episodes !== undefined) query.episodes = (values.episodes as string).split(",");
    if (values.flags !== undefined) query.flags = (values.flags as string).split(",");
    if (values.clues !== undefined) query.clues = (values.clues as string).split(",");
    if (values.stage !== undefined) query.stage = values.stage as DebugRomanceStage;
    if (values.shot !== undefined) query.shot = true;
    if ((query.from || query.prep) && query.scene !== "occasion") throw new Error("from と prep は scene=occasion（場面から始める）で使います。");
    if (query.step && query.scene !== "tour") throw new Error("step は scene=tour（ツアー）で使います。");
    if ((query.without || query.before) && query.scene !== "date") throw new Error("without と before は scene=date（デート）で使います。");
    // The map check shows a prototype city's data, without a game state or Debug's marks.
    const sceneOnly = (["day", "time", "episodes", "flags", "clues", "stage", "shot"] as const).filter((key) => values[key] !== undefined);
    if (sceneOnly.length && query.scene === "map")
      throw new Error(`${sceneOnly.join(" と ")} は scene=map（地図・交通の確認）では使えません。物語のある場面で使います。`);
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
    trust: query.trust, spark: query.spark, stage: query.stage, roll: query.roll, from: query.from, prep: query.prep?.join(","), step: query.step,
    without: query.without?.join(","), before: query.before, day: query.day,
    time: query.time === undefined ? undefined : clockText(query.time), episodes: query.episodes?.join(","), flags: query.flags?.join(","), clues: query.clues?.join(","),
    shot: query.shot ? 1 : undefined,
  };
  // A time keeps its colon (allowed in a query), so that the URL reads time=19:00.
  return ["?debug", ...debugQueryKeys.flatMap((key) =>
    values[key] === undefined ? [] : [`${key}=${encodeURIComponent(String(values[key])).replace(/%3A/gu, ":")}`])].join("&");
}

/** Every item of the settings, so the URL opens the same scene even if a default changes later. */
export function settingsQuery(dataMode: DebugDataMode, settings: DebugSettings): DebugQuery {
  return { dataMode, cityId: settings.cityId, scene: settings.scene, target: settings.id || undefined, progress: settings.progress,
    ap: settings.ap, affection: settings.affection, trust: settings.trust, spark: settings.spark, roll: settings.roll,
    ...(settings.from ? { from: settings.from } : {}), ...(settings.prep?.length ? { prep: settings.prep } : {}), ...(settings.step ? { step: settings.step } : {}),
    ...(settings.without?.length ? { without: settings.without } : {}), ...(settings.before ? { before: settings.before } : {}),
    ...(settings.day !== undefined ? { day: settings.day } : {}), ...(settings.time !== undefined ? { time: settings.time } : {}),
    ...(settings.episodes?.length ? { episodes: settings.episodes } : {}),
    ...(settings.flags?.length ? { flags: settings.flags } : {}), ...(settings.clues?.length ? { clues: settings.clues } : {}),
    ...(settings.stage !== undefined ? { stage: settings.stage } : {}) };
}
