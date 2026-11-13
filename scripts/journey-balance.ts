import { Story } from "inkjs";
import type { SceneDone, SceneEntry, SceneOption } from "../src/content/scene-schemas";
import { relationshipAxisLabels, type RelationshipAxis } from "../src/domain/relationship-change";
import { bindItemReader } from "../src/story/items";
import { bindMemoryReader } from "../src/story/memory";
import { condWalk } from "./scene-conditions";

// balance:report (the numeric balance pass, 2026-11-13): every source and sink of money, AP and the
// hidden relationship values of a journey, city by city, with where each comes from (file, scene,
// choice) and the totals a budget decision needs. A developer tool on the last content:build's data
// (src/content/generated/); it checks nothing and is never part of the game. The choices' effects are
// the build's own tables (generated/scenes.json); walkOptionPaths only finds which choices one play can
// take together (the choice points of each scene), so a scene's range is that of one path through it.

export const AXES = Object.keys(relationshipAxisLabels) as RelationshipAxis[];
export type Range = { min: number; max: number };
export type AxisRanges = Record<RelationshipAxis, Range>;

const range = (min: number, max = min): Range => ({ min, max });
const add = (left: Range, right: Range): Range => ({ min: left.min + right.min, max: left.max + right.max });
const sum = (ranges: readonly Range[]): Range => ranges.reduce(add, range(0));
const axisRanges = (make: (axis: RelationshipAxis) => Range): AxisRanges =>
  Object.fromEntries(AXES.map((axis) => [axis, make(axis)])) as AxisRanges;
const addAxes = (left: AxisRanges, right: AxisRanges): AxisRanges => axisRanges((axis) => add(left[axis], right[axis]));
const sumAxes = (items: readonly AxisRanges[]): AxisRanges => axisRanges((axis) => sum(items.map((item) => item[axis])));

/** One relationship profile (romance/response_profiles.json): the deltas of a positive and a negative reaction. */
export type BalanceProfile = { id: string; baseChance: number;
  positive: Record<RelationshipAxis, readonly [number, number]>; negative: Record<RelationshipAxis, readonly [number, number]> };

export type BalanceInput = {
  journey: { id: string; nameJa: string; cities: readonly { id: string; nameJa?: string }[]; initialBudget?: number | null;
    currency: { code: string; symbol: string }; farePartySize?: number;
    initialState?: { ap: number; affection: number; trust: number; spark: number } };
  /** The journey's cities in travel order: their travel catalog and settings (the first city's initialBudget: a journey without its own). */
  cities: readonly { cityId: string; initialBudget: number; hotelPlaceId: string; lodgingCost: number; rentals?: readonly { modeId: string; cost: number }[];
    places: readonly { id: string; nameJa: string; access?: "tour" }[];
    events: readonly { id: string; placeId: string; category: "main" | "date"; titleJa: string; admissionCost?: number }[];
    routes: readonly { fromPlaceId: string; toPlaceId: string; mode: string; cost: number }[] }[];
  tours: readonly { id: string; cityId: string; titleJa: string; offers: readonly { id: string; sellerJa: string; price: number }[];
    steps: readonly ({ kind: "leg" } | { kind: "event"; eventId: string })[] }[];
  scenes: readonly SceneEntry[];
  episodes: readonly { id: string; cityId: string }[];
  /** Every AP rule: the journey's rewards, the special battles' and the scenes' tags' (getAllRewardRules). */
  rewards: readonly { id: string; episodeId?: string; battleId?: string; sceneId?: string; trigger: string; ap: number; titleJa: string }[];
  dates: readonly { id: string; chapterId: string; kind: string; apCost: number; titleJa: string }[];
  romance: { stages: readonly ({ stage: number; minCompletedDates: number } & Record<`min${Capitalize<RelationshipAxis>}`, number>)[];
    confession: { minCompletedDates: number } & Record<`min${Capitalize<RelationshipAxis>}`, number> };
  profiles: readonly BalanceProfile[];
  apCap: number;
  items: readonly { id: string; nameJa: string }[];
  /** Each walked scene's paths (walkOptionPaths): the option IDs one play takes, in order. Without one, its options are one choice point. */
  paths: Readonly<Record<string, { paths: readonly (readonly string[])[]; truncated?: boolean }>>;
};

export type SceneGroup = "main" | "date" | "special_date" | "inserted";
/**
 * What one scene can do in one play: the net money (+ gained, − paid), the AP and each axis, over its paths; `expected`:
 * each path's mean change with every profile at its starting chance (baseChance; the chance rises as the values rise).
 */
export type SceneBalance = { scene: SceneEntry; group: SceneGroup; money: Range; ap: Range; rel: AxisRanges; expected: AxisRanges; paths: number; truncated: boolean };
/** A map event's visit from the hotel and back: its admission and the fares (cheapest, dearest), or a tour's offers. */
export type EventBalance = { id: string; titleJa: string; category: "main" | "date"; dateKind?: string; placeId: string; admission: number;
  trip?: Range; tour?: { id: string; titleJa: string; first: boolean; offers: readonly { id: string; sellerJa: string; price: number }[] }; cost: Range; apCost: number };
export type CityBalance = {
  cityId: string; nameJa: string;
  events: EventBalance[];
  scenes: SceneBalance[];
  /** Money paid (positive) at the least and at the most: visits (admission and fares, or a tour), the scenes' own money, rentals (none to all). */
  spend: { mainVisits: Range; dateVisits: Range; mainScenes: Range; dateScenes: Range; inserted: Range; rentals: Range; total: Range };
  ap: { rewards: BalanceInput["rewards"]; gained: Range; dates: number; specialDates: number; scenes: Range; left: Range };
  rel: { main: AxisRanges; inserted: AxisRanges; dates: AxisRanges; specialDates: AxisRanges };
  /** The expected change of the main parts, inserted scenes and normal dates (SceneBalance's `expected`). */
  expected: AxisRanges;
  normalDates: number;
  /** After this city: without dates (main parts and inserted scenes), with every normal date, and that one's expected change. */
  cumulative: { withoutDates: AxisRanges; withDates: AxisRanges; expected: AxisRanges; dates: number; spend: Range; ap: Range };
};
export type JourneyBalance = { journeyId: string; cities: CityBalance[]; budget: number | null; spend: Range;
  /** Each threshold (a romance stage, the confession) and, with every normal date played, where it can be met and where it always is. */
  thresholds: { label: string; need: Record<RelationshipAxis, number> & { dates: number }; reachableIn?: string; alwaysIn?: string;
    /** Where the expected change meets it, choosing the best path of every scene (best) or the worst (worst). */
    expectedBestIn?: string; expectedWorstIn?: string }[] };

const OPTION_TAG = /^\s*option\s*:\s*([a-z][a-z0-9_]*)\s*$/u;

/**
 * The option IDs of every path through a scene: its knot (or the file's top) to its end, every choice taken, its cond("…")
 * texts read as content:build reads them (condWalk: all false, all true, each alone true) and a profile's `romance_result`
 * both ways. Identical option sequences count once; at most `maxPaths` ends a walk (`truncated`).
 */
export function walkOptionPaths(input: { compiled: string; start?: string; conds: readonly string[]; romance: boolean;
  itemIds: readonly string[]; memoryIds: readonly string[]; maxPaths?: number }): { paths: string[][]; truncated: boolean } {
  const maxPaths = input.maxPaths ?? 2000;
  const found = new Map<string, string[]>();
  let truncated = false;
  for (const assignment of condWalk(input.conds).assignments) for (const result of input.romance ? ["positive", "negative"] : [undefined]) {
    const story = new Story(input.compiled);
    story.onError = (message) => { throw new Error(message); };
    story.BindExternalFunction("cond", (text: unknown) => typeof text === "string" && assignment[text] === true, true);
    bindItemReader(story, {}, input.itemIds);
    bindMemoryReader(story, [], input.memoryIds);
    if (result && story.variablesState.GlobalVariableExistsWithName("romance_result")) story.variablesState.$("romance_result", result);
    if (input.start) story.ChoosePathString(input.start);
    let ends = 0;
    const walk = (taken: string[], depth: number) => {
      if (ends >= maxPaths) { truncated = true; return; }
      for (let guard = 0; story.canContinue && guard < 1000; guard++) story.Continue();
      const choices = story.currentChoices.map((choice) => ({ index: choice.index, tags: choice.tags ?? [] }));
      if (!choices.length || depth > 40) {
        ends++;
        found.set(taken.join(" "), taken);
        return;
      }
      const checkpoint = story.state.ToJson();
      for (const choice of choices) {
        story.state.LoadJson(checkpoint);
        story.ChooseChoiceIndex(choice.index);
        const id = choice.tags.map((tag) => OPTION_TAG.exec(tag)?.[1]).find(Boolean);
        walk(id ? [...taken, id] : taken, depth + 1);
      }
    };
    walk([], 0);
  }
  return { paths: [...found.values()], truncated };
}

/** Whether a choice changes money, AP or the relationship (or ends the scene undone): the scenes worth walking. */
export const optionMatters = (option: SceneOption) => option.money !== undefined || option.ap !== undefined || !!option.rel || !!option.profile || !!option.later;

/** A profile's widest delta on an axis: a reaction's lowest to its highest, either result. */
function profileRange(profile: BalanceProfile | undefined, axis: RelationshipAxis): Range {
  if (!profile) return range(0);
  return range(Math.min(profile.positive[axis][0], profile.negative[axis][0]), Math.max(profile.positive[axis][1], profile.negative[axis][1]));
}

/** A profile's mean delta on an axis at its starting chance: chance × the positive range's middle + the rest × the negative's. */
function profileMean(profile: BalanceProfile | undefined, axis: RelationshipAxis): number {
  if (!profile) return 0;
  const middle = ([low, high]: readonly [number, number]) => (low + high) / 2;
  const chance = profile.baseChance / 100;
  return chance * middle(profile.positive[axis]) + (1 - chance) * middle(profile.negative[axis]);
}

/** One path's money, AP and relationship: its options' tags, then the scene's `# on_done:` (not after 「また今度」). */
function pathEffect(options: readonly SceneOption[], done: SceneDone, profiles: readonly BalanceProfile[]) {
  const finished = !options.some((option) => option.later);
  const money = options.reduce((total, option) => total + (option.money ?? 0), finished ? done.money ?? 0 : 0);
  const ap = options.reduce((total, option) => total + (option.ap ?? 0), finished ? done.ap ?? 0 : 0);
  const profileOf = (option: SceneOption) => profiles.find((profile) => profile.id === option.profile);
  const fixed = (axis: RelationshipAxis) => options.reduce((total, option) => total + (option.rel?.[axis] ?? 0), finished ? done.rel?.[axis] ?? 0 : 0);
  const rel = axisRanges((axis) => sum([range(fixed(axis)), ...options.map((option) => profileRange(profileOf(option), axis))]));
  const expected = axisRanges((axis) => range(options.reduce((total, option) => total + profileMean(profileOf(option), axis), fixed(axis))));
  return { money, ap, rel, expected };
}

/** A scene's range over its paths (without walked paths: its options as one choice point, or none taken). */
export function sceneBalance(scene: SceneEntry, group: SceneGroup, input: Pick<BalanceInput, "paths" | "profiles">): SceneBalance {
  const walked = input.paths[scene.id];
  const byId = new Map(scene.options.map((option) => [option.id, option]));
  const paths = walked?.paths.length ? walked.paths.map((ids) => ids.flatMap((id) => byId.get(id) ?? []))
    : scene.options.length ? scene.options.map((option) => [option]) : [[]];
  const effects = paths.map((path) => pathEffect(path, scene.done, input.profiles));
  const span = (values: number[]) => range(Math.min(...values), Math.max(...values));
  const over = (pick: (effect: (typeof effects)[number]) => AxisRanges) =>
    axisRanges((axis) => range(Math.min(...effects.map((effect) => pick(effect)[axis].min)), Math.max(...effects.map((effect) => pick(effect)[axis].max))));
  return { scene, group, money: span(effects.map((effect) => effect.money)), ap: span(effects.map((effect) => effect.ap)),
    rel: over((effect) => effect.rel), expected: over((effect) => effect.expected), paths: paths.length, truncated: !!walked?.truncated };
}

/** The fares of a round trip from the hotel: the cheapest and the dearest route each way (undefined: no route there or back). */
export function hotelRoundTrip(city: BalanceInput["cities"][number], placeId: string): Range | undefined {
  if (placeId === city.hotelPlaceId) return range(0);
  const fares = (from: string, to: string) => city.routes.filter((route) => route.fromPlaceId === from && route.toPlaceId === to).map((route) => route.cost);
  const out = fares(city.hotelPlaceId, placeId), back = fares(placeId, city.hotelPlaceId);
  if (!out.length || !back.length) return undefined;
  return range(Math.min(...out) + Math.min(...back), Math.max(...out) + Math.max(...back));
}

/** What a scene's net money (+ gained, − paid) costs: least to most paid (a gain is a negative cost). */
const paid = (money: Range): Range => range(-money.max, -money.min);

function cityBalance(input: BalanceInput, city: BalanceInput["cities"][number]): Omit<CityBalance, "cumulative"> {
  const nameJa = input.journey.cities.find((item) => item.id === city.cityId)?.nameJa ?? city.cityId;
  const dateOf = (id: string) => input.dates.find((date) => date.id === id);
  const events = city.events.map((event): EventBalance => {
    const place = city.places.find((item) => item.id === event.placeId);
    const tour = input.tours.find((item) => item.cityId === city.cityId && item.steps.some((step) => step.kind === "event" && step.eventId === event.id));
    const date = event.category === "date" ? dateOf(event.id) : undefined;
    const base = { id: event.id, titleJa: event.titleJa, category: event.category, placeId: event.placeId, admission: event.admissionCost ?? 0,
      apCost: date?.apCost ?? 0, ...(date && date.kind !== "normal" ? { dateKind: date.kind } : {}) };
    if (place?.access === "tour" && tour) {
      // A tour's price includes its admissions and rides: counted once, at its first event step.
      const first = tour.steps.find((step): step is { kind: "event"; eventId: string } => step.kind === "event")?.eventId === event.id;
      const prices = tour.offers.map((offer) => offer.price);
      return { ...base, tour: { id: tour.id, titleJa: tour.titleJa, first, offers: tour.offers },
        cost: first ? range(Math.min(...prices), Math.max(...prices)) : range(0) };
    }
    const trip = hotelRoundTrip(city, event.placeId);
    return { ...base, ...(trip ? { trip } : {}), cost: add(range(base.admission), trip ?? range(0)) };
  });
  const groupOf = (scene: SceneEntry): SceneGroup => scene.kind === "date"
    ? (dateOf(scene.main && "date" in scene.main ? scene.main.date : "")?.kind ?? "normal") === "normal" ? "date" : "special_date"
    : scene.kind === "talk" || scene.kind === "encounter" || scene.kind === "tour_leg" ? "inserted" : "main";
  const scenes = input.scenes.filter((scene) => scene.cityId === city.cityId).map((scene) => sceneBalance(scene, groupOf(scene), input));
  const scenesOf = (...groups: SceneGroup[]) => scenes.filter((scene) => groups.includes(scene.group));
  const spendOf = (items: readonly SceneBalance[]) => sum(items.map((item) => paid(item.money)));
  const mainVisits = sum(events.filter((event) => event.category === "main").map((event) => event.cost));
  const dateVisits = sum(events.filter((event) => event.category === "date").map((event) => event.cost));
  const spend = { mainVisits, dateVisits, mainScenes: spendOf(scenesOf("main")), dateScenes: spendOf(scenesOf("date", "special_date")), inserted: spendOf(scenesOf("inserted")),
    rentals: range(0, (city.rentals ?? []).reduce((total, rental) => total + rental.cost, 0)) };
  const total = sum(Object.values(spend));
  // AP: the rules of the city's episodes, special battles and scenes; a score reward may be missed (the least leaves it out).
  const sceneIds = new Set(scenes.map((item) => item.scene.id));
  const battleIds = new Set(scenes.flatMap((item) => item.scene.main && "battle" in item.scene.main ? [item.scene.main.battle] : []));
  const rewards = input.rewards.filter((rule) => (rule.episodeId && input.episodes.some((episode) => episode.id === rule.episodeId && episode.cityId === city.cityId)) ||
    (rule.battleId && battleIds.has(rule.battleId)) || (rule.sceneId && sceneIds.has(rule.sceneId)));
  const once = rewards.reduce((total, rule) => total + rule.ap, 0);
  const sure = rewards.filter((rule) => rule.trigger !== "battle_score" && rule.trigger !== "scene_tag").reduce((total, rule) => total + rule.ap, 0);
  const firstCity = input.journey.cities[0]?.id === city.cityId ? input.journey.initialState?.ap ?? 0 : 0;
  const gained = range(firstCity + sure, firstCity + once);
  const cityDates = input.dates.filter((date) => date.chapterId === city.cityId);
  const dates = cityDates.filter((date) => date.kind === "normal").reduce((total, date) => total + date.apCost, 0);
  const specialDates = cityDates.filter((date) => date.kind !== "normal").reduce((total, date) => total + date.apCost, 0);
  // The scenes' own AP (# ap: and # on_done: ap); the gains of scene_tag rules are counted in the rewards above.
  const sceneAp = sum(scenes.map((item) => range(Math.min(0, item.ap.min), Math.min(0, item.ap.max))));
  const relOf = (...groups: SceneGroup[]) => sumAxes(scenesOf(...groups).map((item) => item.rel));
  return {
    cityId: city.cityId, nameJa, events, scenes, spend: { ...spend, total },
    ap: { rewards, gained, dates, specialDates, scenes: sceneAp, left: range(gained.min - dates + sceneAp.min, gained.max - dates + sceneAp.max) },
    rel: { main: relOf("main"), inserted: relOf("inserted"), dates: relOf("date"), specialDates: relOf("special_date") },
    expected: sumAxes(scenesOf("main", "inserted", "date").map((item) => item.expected)),
    normalDates: cityDates.filter((date) => date.kind === "normal").length,
  };
}

/** The journey's report: each city, the running totals after it, and where each romance threshold can (and must) be met. */
export function journeyBalance(input: BalanceInput): JourneyBalance {
  const start = input.journey.initialState;
  let withoutDates = axisRanges((axis) => range(start?.[axis] ?? 0));
  let withDates = withoutDates;
  let expected = withoutDates;
  let dates = 0;
  let spend = range(0);
  let ap = range(0);
  const cities = input.cities.map((city): CityBalance => {
    const balance = cityBalance(input, city);
    withoutDates = addAxes(withoutDates, addAxes(balance.rel.main, balance.rel.inserted));
    withDates = addAxes(withDates, addAxes(addAxes(balance.rel.main, balance.rel.inserted), balance.rel.dates));
    expected = addAxes(expected, balance.expected);
    dates += balance.normalDates;
    spend = add(spend, balance.spend.total);
    ap = add(ap, balance.ap.left);
    return { ...balance, cumulative: { withoutDates, withDates, expected, dates, spend, ap } };
  });
  const needOf = (item: BalanceInput["romance"]["confession"]) => ({ affection: item.minAffection, trust: item.minTrust, spark: item.minSpark, dates: item.minCompletedDates });
  const thresholds = [...input.romance.stages.filter((stage) => stage.stage > 1).map((stage) => ({ label: `段階${stage.stage}`, need: needOf(stage) })),
    { label: "告白の成功", need: needOf(input.romance.confession) }].map((threshold) => {
    const meets = (city: CityBalance, values: "withDates" | "expected", end: "min" | "max") => city.cumulative.dates >= threshold.need.dates &&
      AXES.every((axis) => city.cumulative[values][axis][end] >= threshold.need[axis]);
    const where = (values: "withDates" | "expected", end: "min" | "max") => cities.find((city) => meets(city, values, end))?.cityId;
    return { ...threshold, reachableIn: where("withDates", "max"), alwaysIn: where("withDates", "min"),
      expectedBestIn: where("expected", "max"), expectedWorstIn: where("expected", "min") };
  });
  return { journeyId: input.journey.id, cities, budget: input.journey.initialBudget ?? input.cities[0]?.initialBudget ?? null, spend, thresholds };
}

// ── The Markdown report ──

const signed = (value: number) => (value > 0 ? `+${value}` : value < 0 ? `−${-value}` : "0");
const decimal = (value: number) => signed(Math.round(value * 10) / 10);
const rangeText = (value: Range, format: (value: number) => string = signed) =>
  value.min === value.max ? format(value.min) : `${format(value.min)}〜${format(value.max)}`;
const relText = (rel: AxisRanges) => AXES.map((axis) => rangeText(rel[axis])).join(" | ");
const sceneWhere = (scene: SceneEntry) => `stories/${scene.story.storyId}.ink${scene.story.knot ? `（${scene.story.knot}）` : ""}`;

/** The report as Markdown lines (Japanese; IDs and file paths as they are). */
export function formatJourneyBalance(input: BalanceInput, report: JourneyBalance): string[] {
  const { symbol } = input.journey.currency;
  const money = (value: number) => `${value < 0 ? "−" : ""}${symbol}${Math.abs(value).toLocaleString("en-US")}`;
  const moneyRange = (value: Range) => rangeText(value, money);
  const itemName = (id: string) => input.items.find((item) => item.id === id)?.nameJa ?? id;
  const out: string[] = [];
  const table = (head: readonly string[], rows: readonly (readonly string[])[]) => {
    if (!rows.length) return out.push("（なし）", "");
    out.push(`| ${head.join(" | ")} |`, `|${head.map(() => " --- ").join("|")}|`, ...rows.map((row) => `| ${row.join(" | ")} |`), "");
  };
  const relHead = AXES.map((axis) => relationshipAxisLabels[axis]);
  out.push(`# お金・AP・関係値のまとめ：${input.journey.nameJa}（${input.journey.id}）`, "",
    "最後の content:build の出力（src/content/generated/）から作った開発用の表です。関係値はプレイヤーに見せない値です。ゲームと公開ビルドには入りません。", "",
    "- お金の「払う」は正の数。範囲は「いちばん少なく払う遊び方〜いちばん多く払う遊び方」。",
    "- 訪問の交通費は、宿から行って宿へ戻る往復で数えます（最安＝各方向の最も安い経路、最高＝各方向の最も高い経路。乗り物が走る所は全部乗ったとき）。",
    "- ツアーの場所（access: tour）は、ツアーの料金（入場料・車込み）で数えます。貸し出しの乗り物は、借りない〜全部借りるの幅で別に数えます。",
    "- 宿泊費（lodgingCost）・都市間の移動・同じ場所への2回目の入場は数えません。",
    "- 関係値の範囲は、場面ごとに一つの道（選択肢の組み合わせ）を通ったときの最小〜最大。噛み合い（# profile:）は、噛み合った・噛み合わなかったのどちらかの幅の端を使います。",
    "- 何度でも起きる場面（repeat: always）や、条件で片方しか起きない場面も、一度ずつ足しています（上限の目安）。", "");

  out.push("## 旅全体", "");
  const budget = report.budget;
  out.push(`- 通貨：${input.journey.currency.code}（${symbol.trim()}）。開始時の旅行予算：${budget === null ? "なし" : money(budget)}。運賃の人数：${input.journey.farePartySize ?? "未設定"}`);
  out.push(`- 開始時のAP：${input.journey.initialState?.ap ?? 0}。APの上限：${input.apCap}（超えた分は保留APになり、減ったときに入ります）`);
  out.push(`- 関係値の初期値：${AXES.map((axis) => `${relationshipAxisLabels[axis]} ${input.journey.initialState?.[axis] ?? 0}`).join("、")}`, "");
  out.push("### お金（払う額）", "");
  table(["都市", "本筋の訪問", "本筋の場面", "デートの訪問", "デートの場面", "差し込みの場面", "貸し出し", "都市の計", "旅の累計", "予算の残り"],
    report.cities.map((city) => [city.nameJa, moneyRange(city.spend.mainVisits), moneyRange(city.spend.mainScenes), moneyRange(city.spend.dateVisits),
      moneyRange(city.spend.dateScenes), moneyRange(city.spend.inserted), moneyRange(city.spend.rentals), moneyRange(city.spend.total), moneyRange(city.cumulative.spend),
      budget === null ? "—" : moneyRange(range(budget - city.cumulative.spend.max, budget - city.cumulative.spend.min))]));
  const mainOnly = sum(report.cities.map((city) => add(city.spend.mainVisits, city.spend.mainScenes)));
  out.push(`- 本筋だけ（デート・差し込みの支払いなし）：${moneyRange(mainOnly)}。全部遊んだとき：${moneyRange(report.spend)}。`);
  if (budget !== null) {
    const left = (spent: number) => (budget >= spent ? `${money(budget - spent)} 残ります` : `${money(spent - budget)} 足りません`);
    out.push(`- 予算 ${money(budget)} に対して、全部をいちばん高く遊ぶと ${left(report.spend.max)}（予算の ${(100 * report.spend.max / Math.max(1, budget)).toFixed(1)}%）。` +
      `いちばん安く遊ぶと ${left(report.spend.min)}。`);
  }
  out.push("");
  out.push("### AP", "");
  table(["都市", "得るAP（得点の報酬なし〜全部）", "デートのAP", "特別なデートのAP", "場面の札のAP", "都市の差し引き", "旅の累計の残り"],
    report.cities.map((city) => [city.nameJa, rangeText(city.ap.gained, String), String(city.ap.dates), String(city.ap.specialDates),
      rangeText(city.ap.scenes), rangeText(city.ap.left), rangeText(city.cumulative.ap)]));
  out.push("### 関係値（累計）", "");
  table(["都市のあと", "通常デートの数", ...relHead.map((label) => `${label}（デートなし）`), ...relHead.map((label) => `${label}（デート全部）`),
    ...relHead.map((label) => `${label}（デート全部の期待値）`)],
    report.cities.map((city) => [city.nameJa, String(city.cumulative.dates), ...AXES.map((axis) => rangeText(city.cumulative.withoutDates[axis])),
      ...AXES.map((axis) => rangeText(city.cumulative.withDates[axis])), ...AXES.map((axis) => rangeText(city.cumulative.expected[axis], decimal))]));
  out.push("期待値：噛み合いをはじめの確率（関係値0のとき）で数えた平均。範囲は、どの場面でもいちばん悪い道〜いちばん良い道を選んだとき。関係値が上がると確率も上がるので、実際はこれより少し高めになります。", "");
  const cityName = (id?: string) => (id ? report.cities.find((city) => city.cityId === id)?.nameJa ?? id : "どの都市でも届かない");
  table(["しきい値", ...relHead, "通常デート", "届きうる（最大で）", "期待値で届く（良い道）", "期待値で届く（悪い道）", "必ず届く（最小でも）"],
    report.thresholds.map((item) => [item.label, ...AXES.map((axis) => String(item.need[axis])), String(item.need.dates), cityName(item.reachableIn),
      cityName(item.expectedBestIn), cityName(item.expectedWorstIn), item.alwaysIn ? cityName(item.alwaysIn) : "なし"]));
  out.push("噛み合いの幅（romance/response_profiles.json）：", "");
  table(["噛み合い", "はじめの確率", ...relHead.map((label) => `${label}（噛み合った／噛み合わなかった）`)],
    input.profiles.map((profile) => [profile.id, `${profile.baseChance}%`,
      ...AXES.map((axis) => `${profile.positive[axis].join("〜")}／${profile.negative[axis].join("〜")}`)]));

  for (const city of report.cities) {
    out.push(`## ${city.nameJa}（${city.cityId}）`, "");
    out.push(`### 訪問（travel/${city.cityId}.json、tours/）`, "");
    table(["イベント", "種類", "入場料", "往復の運賃", "ツアー", "訪問の計", "AP"], city.events.map((event) => [
      `${event.titleJa}（${event.id}）`, event.category === "main" ? "本筋" : event.dateKind ? `デート（${event.dateKind}）` : "デート",
      money(event.admission), event.tour ? "（ツアー）" : event.trip ? moneyRange(event.trip) : "経路なし",
      event.tour ? `${event.tour.id}：${event.tour.offers.map((offer) => `${offer.sellerJa} ${money(offer.price)}`).join("、")}${event.tour.first ? "" : "（最初の見学で数える）"}` : "",
      moneyRange(event.cost), event.apCost ? `−${event.apCost}` : ""]));
    const settings = input.cities.find((item) => item.cityId === city.cityId)!;
    if (settings.lodgingCost || settings.rentals?.length)
      out.push(`宿泊費：1泊 ${money(settings.lodgingCost)}。貸し出し：${settings.rentals?.map((rental) => `${rental.modeId} ${money(rental.cost)}`).join("、") || "なし"}`, "");
    out.push("### 場面のお金と品物", "");
    table(["場面", "場所（ファイル）", "選択肢・終わり", "お金", "AP", "得る品物"], city.scenes.flatMap((item) => {
      const rows = item.scene.options.filter((option) => option.money !== undefined || option.ap !== undefined).map((option) => [
        `${item.scene.id}（${item.scene.kind}）`, sceneWhere(item.scene), `# option: ${option.id}${option.later ? "（また今度）" : ""}`,
        option.money !== undefined ? money(option.money) : "", option.ap !== undefined ? signed(option.ap) : "", ""]);
      const done = item.scene.done;
      if (done.money !== undefined || done.ap !== undefined || done.items?.length)
        rows.push([`${item.scene.id}（${item.scene.kind}）`, sceneWhere(item.scene), "# on_done:", done.money !== undefined ? money(done.money) : "",
          done.ap !== undefined ? signed(done.ap) : "", (done.items ?? []).map(itemName).join("、")]);
      return rows;
    }));
    out.push("### AP の報酬", "");
    table(["報酬", "きっかけ", "AP", "出典"], city.ap.rewards.map((rule) => [`${rule.titleJa}（${rule.id}）`, rule.trigger, `+${rule.ap}`,
      rule.sceneId ? `scenes.json（${rule.sceneId}）` : "progression/journey.json"]));
    out.push("### 関係値の増減（場面ごと、一つの道の範囲）", "");
    const groupLabel: Record<SceneGroup, string> = { main: "本筋", date: "デート", special_date: "特別なデート", inserted: "差し込み" };
    table(["場面", "まとまり", "道の数", ...relHead, "期待値", "選択肢の札（# rel: / # profile:）"], city.scenes
      .filter((item) => item.scene.done.rel || item.scene.options.some((option) => option.rel || option.profile))
      .map((item) => [`${item.scene.id}（${sceneWhere(item.scene)}）`, groupLabel[item.group], `${item.paths}${item.truncated ? "+（打ち切り）" : ""}`,
        ...AXES.map((axis) => rangeText(item.rel[axis])), AXES.map((axis) => rangeText(item.expected[axis], decimal)).join(" / "),
        [...item.scene.options.filter((option) => option.rel || option.profile).map((option) => `${option.id}: ${[
          ...(option.rel ? AXES.filter((axis) => option.rel![axis]).map((axis) => `${relationshipAxisLabels[axis]}${signed(option.rel![axis]!)}`) : []),
          ...(option.profile ? [`噛み合い ${option.profile}`] : [])].join(" ")}`),
        ...(item.scene.done.rel ? [`on_done: ${AXES.filter((axis) => item.scene.done.rel![axis]).map((axis) => `${relationshipAxisLabels[axis]}${signed(item.scene.done.rel![axis]!)}`).join(" ")}`] : [])].join("<br>")]));
    out.push(`都市の計：本筋 ${relText(city.rel.main)}、差し込み ${relText(city.rel.inserted)}、通常デート全部 ${relText(city.rel.dates)}、特別なデート ${relText(city.rel.specialDates)}（${relHead.join(" | ")}）`, "");
  }
  return out;
}
