import { z } from "zod";
import { balance } from "../content";
import { getJourney, journeys } from "../content/journeys";
import { createGame, validateGameState } from "../domain/game";
import { SAVE_KEY, writeIfUnchanged, type SaveResult, type StorageLike } from "./index";
import { storagePhysicalKey } from "./journey-storage";

// This is a preparation snapshot, not a playable GameState. Story and quiz
// content are unfinished and the configured budget is issued only on start.
const draftSchema = z.object({
  kind: z.literal("journey_preparation"),
  schemaVersion: z.literal(1),
  journeyId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  currentCityId: z.string().regex(/^[a-z][a-z0-9_]*$/),
  playerName: z.string().trim().min(1).max(balance.maxNameLength),
  heroineName: z.string().trim().min(1).max(balance.maxNameLength),
  ap: z.number().int().min(0).max(balance.apCap),
  pendingApRewards: z.tuple([]),
  travelBudget: z.null(),
  affection: z.number().int(),
  trust: z.number().int(),
  spark: z.number().int(),
  romanceStage: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  confessionStatus: z.literal("none"),
  memories: z.tuple([]),
  claimedRewardIds: z.tuple([]),
  completedCityIds: z.tuple([]),
  completedEpisodeIds: z.tuple([]),
  visitedLandmarkIds: z.tuple([]),
  completedEncounterIds: z.tuple([]),
  playedDateIds: z.tuple([]),
  battleRecords: z.tuple([]),
  inventory: z.object({}).strict(),
  travel: z.object({ day: z.literal(1), minute: z.literal(540), currentPlaceId: z.null(), hotelPlaceId: z.null() }).strict(),
}).strict().refine((draft) => {
  const journey = getJourney(draft.journeyId);
  return !!journey?.initialState && journey.cities[0]?.id === draft.currentCityId;
}, "Unknown preparation journey or starting city");
export type JourneyDraft = z.infer<typeof draftSchema>;
export type JourneyDraftLoadResult =
  | { status: "empty" }
  | { status: "loaded"; draft: JourneyDraft; raw: string }
  | { status: "invalid"; message: string; raw: string | null };

const invalidMessage = "準備中のセーブを読み込めませんでした。元のデータは残っています。";
function preparationJourney(storage: StorageLike) {
  return journeys.find((journey) => journey.initialState && journey.id !== "milano" &&
    storagePhysicalKey(storage, SAVE_KEY) === `dreamscape.journey.${journey.id}.save.v1`);
}

export function loadJourneyDraft(storage: StorageLike): JourneyDraftLoadResult {
  const journey = preparationJourney(storage);
  if (!journey) return { status: "invalid", message: invalidMessage, raw: null };
  let raw: string | null;
  try { raw = storage.getItem(SAVE_KEY); }
  catch { return { status: "invalid", message: invalidMessage, raw: null }; }
  if (raw === null) return { status: "empty" };
  try {
    const draft = draftSchema.parse(JSON.parse(raw));
    if (draft.journeyId !== journey.id) return { status: "invalid", message: invalidMessage, raw };
    return { status: "loaded", draft, raw };
  }
  catch { return { status: "invalid", message: invalidMessage, raw }; }
}

/** Names survive the eventual transition into a formally registered journey. */
export function journeyDraftStartParameters(draft: JourneyDraft) {
  const valid = draftSchema.parse(draft);
  return { journeyId: valid.journeyId, cityId: valid.currentCityId, playerName: valid.playerName, heroineName: valid.heroineName,
    initialState: { ap: valid.ap, pendingAp: 0 as const, affection: valid.affection, trust: valid.trust,
      spark: valid.spark, romanceStage: valid.romanceStage, confessionStatus: valid.confessionStatus } };
}

/** Only initialize an empty slot; an unreadable or concurrently-created save is never replaced. */
export function saveJourneyDraft(storage: StorageLike, playerName: string, heroineName: string): SaveResult {
  try {
    const journey = preparationJourney(storage);
    if (!journey || journey.status !== "preparing") return { ok: false, message: "旅行編の保存先を確認できません。" };
    const initial = journey.initialState;
    if (!initial) return { ok: false, message: "旅行編の初期設定を確認できません。" };
    const draft = draftSchema.parse({
      kind: "journey_preparation", schemaVersion: 1, journeyId: journey.id, currentCityId: journey.cities[0].id,
      playerName, heroineName, ap: initial.ap, affection: initial.affection, trust: initial.trust, spark: initial.spark,
      romanceStage: initial.romanceStage, confessionStatus: initial.confessionStatus, pendingApRewards: [], travelBudget: null,
      memories: [], claimedRewardIds: [], completedCityIds: [], completedEpisodeIds: [],
      visitedLandmarkIds: [], completedEncounterIds: [], playedDateIds: [], battleRecords: [], inventory: {},
      travel: { day: 1, minute: 540, currentPlaceId: null, hotelPlaceId: null },
    });
    if (!writeIfUnchanged(storage, SAVE_KEY, null, JSON.stringify(draft)))
      return { ok: false, message: "すでにセーブがあります。元のデータを保護するため上書きしませんでした。" };
    return { ok: true };
  } catch {
    return { ok: false, message: "保存できませんでした。名前とブラウザの保存設定を確認してください。" };
  }
}

/** Promote the same snapshot only after real city data and pricing are available. */
export function promoteJourneyDraft(storage: StorageLike, expectedRaw: string): SaveResult {
  try {
    const loaded = loadJourneyDraft(storage);
    if (loaded.status !== "loaded" || loaded.raw !== expectedRaw)
      return { ok: false, message: "セーブが更新されています。再読み込みしてください。" };
    const params = journeyDraftStartParameters(loaded.draft);
    const state = validateGameState(createGame(params.playerName, params.heroineName,
      { journeyId: params.journeyId, initialState: params.initialState }));
    if (state.currentCityId !== params.cityId)
      return { ok: false, message: "旅行編の開始都市が変更されているため、セーブを保護しました。" };
    if (!writeIfUnchanged(storage, SAVE_KEY, expectedRaw, JSON.stringify(state)))
      return { ok: false, message: "セーブが更新されています。再読み込みしてください。" };
    return { ok: true };
  } catch {
    return { ok: false, message: "旅行編の準備がまだ完了していません。準備中のセーブは残っています。" };
  }
}
