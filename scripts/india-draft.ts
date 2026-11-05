import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { citySchema } from "../src/content/schemas";
import { travelCatalogSchema, travelSettingsSchema } from "../src/content/travel-schemas";
import { readJourneyCatalog } from "./content-sources";
import { tourismSourceSchema } from "../src/content/tourism-schemas";
import { readResearchCsv } from "./india-research-csv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const research = "authoring/research/golden-triangle-20261103/source";
const latest = "authoring/research/golden-triangle-all-research-20261103/source/canonical";
const followup = "authoring/research/golden-triangle-followup-20261103";
export const indiaDraftDirectory = path.join(root, "authoring/drafts/golden-triangle");
const readJson = (file: string): unknown => JSON.parse(readFileSync(path.join(root, file), "utf8"));
const fail = (message: string): never => { throw new Error(`India draft: ${message}`); };
const followupSchema = z.object({
  records: z.array(z.object({ placeId: z.string().regex(/^[a-z][a-z0-9_]*$/), cityId: z.string().optional(),
    sources: z.array(tourismSourceSchema).min(1) }).passthrough()),
}).passthrough();

type Source = z.infer<typeof tourismSourceSchema>;
/** Deduplicate identical statements while preserving distinct claims from the same URL. */
function uniqueSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = JSON.stringify([source.publisher, source.title, source.url, source.checkedAt, source.claimType, source.claimJa]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Build reproducible authoring files; these are never registered by the game. */
export function buildIndiaDraft(): Record<string, unknown> {
  const journey = readJourneyCatalog(root).journeys.find((item) => item.id === "golden_triangle");
  if (!journey || !journey.cityPlan) return fail("missing journey plan");
  if (journey.initialBudget == null) return fail("missing initial journey budget");
  const sequence = ["delhi", "agra", "jaipur"];
  if (journey.cities.slice(0, 3).map((city) => city.id).join(",") !== sequence.join(",")) return fail("unexpected city order");
  const accessRows = readResearchCsv(path.join(root, latest), "01_PLACES_AND_ACCESS_33.csv");
  const hourRows = readResearchCsv(path.join(root, latest), "08_OPENING_HOURS_30.csv");
  const followupRecords = ["venues", "access"].flatMap((name) => followupSchema.parse(readJson(`${followup}/${name}.json`)).records);
  const access = new Map(accessRows.map((row) => [row.placeId, row]));
  const hours = new Map(hourRows.map((row) => [row.placeId, row]));
  if (access.size !== accessRows.length || hours.size !== hourRows.length) return fail("duplicate current research place");
  const minute = (value: string): number => {
    if (!/^\d\d:\d\d$/.test(value)) return fail(`invalid game window ${value}`);
    const [hour, minutes] = value.split(":").map(Number);
    if (hour > 23 || minutes > 59) return fail(`invalid game window ${value}`);
    return hour * 60 + minutes;
  };
  const files: Record<string, unknown> = {};
  const usedPlaceIds = new Set<string>();
  const usedEventIds = new Set<string>();
  for (const [index, id] of sequence.entries()) {
    const sourceCity = citySchema.parse(readJson(`${research}/cities/${id}.json`));
    // This old compatibility field is NOT the city-clear reward. Until the
    // episode has been authored, use an explicit unpublished placeholder.
    const city = citySchema.parse({ ...sourceCity, firstClearReward: { rewardSourceId: `${id}_legacy_episode_placeholder`, ap: 0 } });
    const original = travelCatalogSchema.parse(readJson(`${research}/travel/${id}.json`));
    const originalSettings = travelSettingsSchema.parse(readJson(`${research}/travel/${id}-settings.json`));
    const settings = travelSettingsSchema.parse({ ...originalSettings, initialBudget: index === 0 ? journey.initialBudget : 0,
      lodgingCost: journey.cityPlan.lodgingCost,
      notes: "非公開のゲーム用ドラフト。開始資金は旅行編の開始時のみ、都市間で残額を引き継ぐ。宿泊費はゲーム仕様で現実の費用ではない。タクシーは2人用の推定で、異地点の徒歩経路は未検証のため含まない。イベントと背景は未制作・未接続。" });
    if (city.id !== id || original.cityId !== id || city.productionStatus !== "prototype") return fail(`${id} identity or status`);
    if (city.nextCityId !== sequence[index + 1]) return fail(`${id} next city`);
    if (settings.hotelPlaceId !== `${id}_hotel_hub` || !original.places.some((place) => place.id === settings.hotelPlaceId)) return fail(`${id} hotel`);
    if (settings.lodgingCost !== journey.cityPlan.lodgingCost || settings.initialBudget !== (index === 0 ? journey.initialBudget : 0)) return fail(`${id} budget or lodging`);
    const main = original.events.filter((event) => event.category === "main");
    const dates = original.events.filter((event) => event.category === "date");
    if (main.length !== journey.cityPlan.mainTourismCount || dates.length !== journey.cityPlan.dateCount) return fail(`${id} candidate counts`);
    if (main.some((event) => event.apCost !== 0) || dates.some((event) => event.apCost !== 2)) return fail(`${id} candidate AP`);
    if (new Set(main.map((event) => event.placeId)).size !== main.length || main.some((event) => !city.landmarkIdsPlanned.includes(event.placeId))) return fail(`${id} candidate place`);
    for (const place of original.places) {
      if (usedPlaceIds.has(place.id)) return fail(`duplicate place ${place.id}`);
      usedPlaceIds.add(place.id);
    }
    for (const event of original.events) {
      if (usedEventIds.has(event.id)) return fail(`duplicate event ${event.id}`);
      usedEventIds.add(event.id);
    }
    // No modelled straight-line walking duration is promoted into the draft.
    // A same-place route is a zero-time game operation, not a claim about
    // entrances, paths or the time needed within a real attraction.
    const routes = original.routes.filter((route) => route.mode !== "walk" || route.fromPlaceId === route.toPlaceId)
      .map((route) => route.mode === "walk" ? { ...route, sources: route.sources.map((source) => ({ ...source,
        title: "同一地点での移動なし",
        claimJa: "同一地点での移動を伴わないゲーム内操作。実際の施設内の距離や所要時間ではない。" })) } : route);
    const identity = routes.find((route) => route.mode === "walk" && route.fromPlaceId === route.toPlaceId);
    if (!identity) return fail(`${id} missing identity route template`);
    for (const place of original.places) {
      if (!routes.some((route) => route.mode === "walk" && route.fromPlaceId === place.id && route.toPlaceId === place.id)) {
        routes.push({ ...identity, fromPlaceId: place.id, toPlaceId: place.id,
          sources: identity.sources.map((source) => ({ ...source, claimJa: "同一地点での移動を伴わないゲーム内操作。実際の施設内の距離や所要時間ではない。" })) });
      }
    }
    const places = original.places.map((place) => {
      const row = access.get(place.id);
      if (!row || row.cityId !== id || !row.routingAnchorLat_UNVERIFIED || !row.routingAnchorLon_UNVERIFIED) return fail(`missing candidate point ${place.id}`);
      const latitude = Number(row.routingAnchorLat_UNVERIFIED);
      const longitude = Number(row.routingAnchorLon_UNVERIFIED);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return fail(`invalid candidate point ${place.id}`);
      const additional = followupRecords.filter((record) => record.placeId === place.id);
      if (additional.some((record) => record.cityId && record.cityId !== id)) return fail(`research city mismatch ${place.id}`);
      const sources = uniqueSources([...place.sources, {
        publisher: "Dreamscape 統合調査", title: `${place.nameJa} ゲーム用代表点`,
        url: row.sourceURLs.split("|")[0], checkedAt: row.reviewDate, claimType: "hypothesis" as const,
        claimJa: "統合調査台帳に記載されたゲーム用の代表点であり、実際の入口・通行経路・宿泊施設を保証しない。"
      }, ...additional.flatMap((record) => record.sources)]);
      const hour = hours.get(place.id);
      if (!hour) {
        if (place.id !== settings.hotelPlaceId) return fail(`missing candidate game window ${place.id}`);
        return { ...place, latitude, longitude, sources };
      }
      if (hour.cityId !== id) return fail(`game window city mismatch ${place.id}`);
      const start = minute(hour.gameWindowStart_NOT_REAL_WORLD_CLAIM);
      const end = minute(hour.gameWindowEnd_NOT_REAL_WORLD_CLAIM);
      if (start >= end || end > 21 * 60) return fail(`out-of-range game window ${place.id}`);
      return { ...place, latitude, longitude, openingWindows: [{ start, end }], sources: uniqueSources([...sources, {
        publisher: "Dreamscape 調査資料", title: `${place.nameJa} ゲーム用時間枠の候補`, url: hour.sourceUrl,
        checkedAt: hour.checkedAt, claimType: "hypothesis" as const,
        claimJa: "制作資料に基づくゲーム用時間枠の候補で、現地の営業時間を保証しない。曜日や特別日の扱いは未実装。"
      }]) };
    });
    const travel = travelCatalogSchema.parse({ ...original, places, routes });
    for (const route of travel.routes) {
      if (route.mode === "walk" && route.fromPlaceId !== route.toPlaceId) return fail(`${id} unverified walking route`);
      if (route.mode === "taxi" && route.sources.some((source) => source.claimType !== "hypothesis")) return fail(`${id} taxi model not labelled as hypothesis`);
    }
    files[`cities/${id}.json`] = city;
    files[`travel/${id}.json`] = travel;
    files[`travel/${id}-settings.json`] = settings;
  }
  for (const record of followupRecords) if (!usedPlaceIds.has(record.placeId)) return fail(`unknown research place ${record.placeId}`);
  files["manifest.json"] = {
    schemaVersion: 1, journeyId: "golden_triangle", status: "authoring_draft_only",
    cityOrder: sequence, currency: journey.currency.code,
    initialBudget: journey.initialBudget, cityPlan: journey.cityPlan,
    source: research,
    latestResearch: "authoring/research/golden-triangle-all-research-20261103/source/canonical",
    followupResearch: ["venues", "access", "transit", "images"].map((name) => `authoring/research/golden-triangle-followup-20261103/${name}.json`),
    warnings: [
      "候補イベント・背景IDは実コンテンツ未接続。クリア条件として使わない。",
      "firstClearRewardは旧互換episode_clear用の0 AP仮欄で、本来の初回報酬は未決定。都市クリア4APは別のcity_clear報酬。",
      "座標は入口の実測ではない。営業時間はゲーム試作で現地開館時刻ではない。",
      "タクシーは2人分のゲーム推定。異地点の徒歩は未検証のため出力しない。",
      "この制作ドラフトには画像を含みません。登録済み画像の出典と利用条件は content/tourism/catalog.json を確認してください。"
    ]
  };
  return files;
}

export function serializeIndiaDraft(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
