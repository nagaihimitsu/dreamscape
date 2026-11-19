import { getJourneyForCity } from "../content/journeys";
import { battles, landmarks } from "../content";
import type { GameState } from "./game-state-schema";

// 「もう一度この旅を」 (2026-11-19 user decisions; docs/01 「クリア後・難易度・複数のセーブ」): what the journey begun again
// keeps of the finished one — what was collected, never what plays a part in the game: the album's photos, 旅の図鑑's
// terms and the quizzes 英語ノート lists (their answers are this device's record; the save names the quizzes whose
// questions it shows). Progress, AP, money, items, clues and the relationship start again. No condition reads any of them.

/** Each ID once, in the order first given. */
const union = (...lists: readonly (readonly string[])[]) => [...new Set(lists.flat())];

/** The quizzes of earlier journeys that 英語ノート lists besides this one's (none for a journey not begun again). */
export const pastBattleIds = (state: Pick<GameState, "pastBattleIds">): readonly string[] => state.pastBattleIds ?? [];

/**
 * The new journey `fresh` with what `finished` collected: its photos first (in the order taken, with where and when they
 * were taken then), then any `fresh` already has; its terms the same way; and the quizzes it and the journeys before it played.
 */
export function carryOver(finished: GameState, fresh: GameState): GameState {
  const photos = new Set(finished.album.map((photo) => photo.imageId));
  const glossary = union(finished.glossary ?? [], fresh.glossary ?? []);
  const battles = union(pastBattleIds(finished), finished.battleRecords.map((record) => record.battleId), pastBattleIds(fresh));
  return {
    ...fresh,
    album: [...finished.album, ...fresh.album.filter((photo) => !photos.has(photo.imageId))],
    ...(glossary.length ? { glossary } : {}),
    ...(battles.length ? { pastBattleIds: battles } : {}),
  };
}

/** The quizzes of earlier journeys are this journey's (as the save's other references; otherwise it is not loaded). */
export function validatePastBattles(state: GameState): void {
  const journeyId = getJourneyForCity(state.currentCityId)?.id;
  for (const id of pastBattleIds(state)) {
    const battle = battles.find((item) => item.id === id);
    const cityId = battle?.landmarkId ? landmarks.find((item) => item.id === battle.landmarkId)?.cityId : battle?.cityId;
    if (!cityId || getJourneyForCity(cityId)?.id !== journeyId) throw new Error("前の旅のクイズの参照先が見つかりません。");
  }
}
