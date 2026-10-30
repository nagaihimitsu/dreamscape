import {
  episodes,
  journeyConfig,
  rewardRules,
  type EpisodeDefinition,
  type RewardRule,
} from "../content";
import { openTourism } from "./tourism";
import { earnRewards, type RewardCredit } from "./rewards";
import type { GameState } from "./game";

export function getCurrentEpisode(state: GameState): EpisodeDefinition {
  return (
    episodes.find((episode) =>
      state.activeTourism
        ? episode.landmarkId === state.activeTourism.landmarkId
        : state.activeBattle?.battleId === episode.battleId,
    ) ??
    episodes.find(
      (episode) => !state.completedEpisodeIds.includes(episode.id),
    ) ??
    episodes.find((episode) => episode.id === journeyConfig.entryEpisodeId)!
  );
}
export function canAccessFreeTime(state: GameState): boolean {
  return episodes.some(
    (episode) =>
      state.completedEpisodeIds.includes(episode.id) ||
      state.completedChapters.includes(episode.legacyChapterId),
  );
}
export function startEpisode(
  state: GameState,
  episodeId = getCurrentEpisode(state).id,
): GameState {
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode) return state;
  return openTourism(state, episode.landmarkId);
}
export function enterFreeTime(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (
    state.revision !== expectedRevision ||
    state.activeTourism ||
    state.activeDate ||
    state.activeBattle?.phase !== "result" ||
    !canAccessFreeTime(state)
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: null,
    battleRewardReceipt: null,
  };
}

function hasCompletedBattle(state: GameState, episode: EpisodeDefinition) {
  return state.battleRecords.some(
    (record) => record.battleId === episode.battleId && record.attempts > 0,
  );
}
export function isRewardEarned(state: GameState, rule: RewardRule): boolean {
  const episode = episodes.find((item) => item.id === rule.episodeId)!;
  if (rule.trigger === "guide_read")
    return state.completedGuideIds.includes(episode.landmarkId);
  if (rule.trigger === "episode_clear")
    return state.completedEpisodeIds.includes(episode.id);
  const record = state.battleRecords.find(
    (item) => item.battleId === episode.battleId,
  );
  return (
    !!record &&
    (rule.trigger === "battle_complete" || record.bestScore >= rule.minScore!)
  );
}

/** A real battle completion unlocks this trial episode, never the whole city. */
function recordEpisodes(state: GameState): GameState {
  const completedEpisodeIds = [...state.completedEpisodeIds];
  const completedChapters = [...state.completedChapters];
  for (const episode of episodes) {
    if (!hasCompletedBattle(state, episode)) continue;
    if (!completedEpisodeIds.includes(episode.id))
      completedEpisodeIds.push(episode.id);
    // Compatibility token for existing date definitions. It does not mean city completion.
    if (!completedChapters.includes(episode.legacyChapterId))
      completedChapters.push(episode.legacyChapterId);
  }
  return completedEpisodeIds.length === state.completedEpisodeIds.length &&
    completedChapters.length === state.completedChapters.length
    ? state
    : { ...state, completedEpisodeIds, completedChapters };
}

/** Called inside the battle's final atomic transition, after its score/history were recorded. */
export function finalizeBattleProgress(state: GameState): GameState {
  const active = state.activeBattle;
  if (!active || active.phase !== "result") return state;
  const next = recordEpisodes(state);
  const ids = rewardRules
    .filter((rule) => {
      const episode = episodes.find((item) => item.id === rule.episodeId)!;
      return (
        episode.battleId === active.battleId &&
        rule.trigger !== "guide_read" &&
        isRewardEarned(next, rule)
      );
    })
    .map((rule) => rule.id);
  const awarded = earnRewards(next, ids);
  return {
    ...awarded.state,
    battleRewardReceipt: {
      battleRunId: active.runId,
      entries: awarded.entries,
    },
  };
}

/** Completing the actual guide is distinct from visiting or explicitly skipping it. */
export function recordGuideRead(
  state: GameState,
  landmarkId: string,
): GameState {
  const next = state.completedGuideIds.includes(landmarkId)
    ? state
    : { ...state, completedGuideIds: [...state.completedGuideIds, landmarkId] };
  const ids = rewardRules
    .filter(
      (rule) =>
        rule.trigger === "guide_read" &&
        episodes.some(
          (episode) =>
            episode.id === rule.episodeId && episode.landmarkId === landmarkId,
        ),
    )
    .map((rule) => rule.id);
  return earnRewards(next, ids).state;
}

/** Legacy AP stays unchanged on load. Verified old achievements become pending entitlements. */
export function migrateJourneyProgress(state: GameState): GameState {
  const next = recordEpisodes(state);
  const eligible = rewardRules
    .filter(
      (rule) => rule.trigger !== "guide_read" && isRewardEarned(next, rule),
    )
    .map((rule) => rule.id);
  const recorded = earnRewards(next, eligible, false);
  let entries: RewardCredit[] = recorded.entries;
  const active = state.activeBattle;
  if (active?.phase === "result") {
    entries = entries.filter((entry) =>
      episodes.some(
        (episode) =>
          episode.id ===
            rewardRules.find((rule) => rule.id === entry.rewardId)!.episodeId &&
          episode.battleId === active.battleId,
      ),
    );
    return {
      ...recorded.state,
      battleRewardReceipt: { battleRunId: active.runId, entries },
    };
  }
  return recorded.state;
}

/** Kept for old internal callers, but never awards a chapter without a finished battle. */
export function completeRecordedChapter(
  state: GameState,
  chapterId: string,
): GameState {
  if (state.activeDate || state.activeTourism || state.activeBattle)
    return state;
  const matched = episodes.filter(
    (episode) =>
      episode.legacyChapterId === chapterId &&
      hasCompletedBattle(state, episode),
  );
  if (!matched.length) return state;
  const next = recordEpisodes(state);
  const ids = rewardRules
    .filter(
      (rule) =>
        matched.some((episode) => episode.id === rule.episodeId) &&
        rule.trigger !== "guide_read" &&
        isRewardEarned(next, rule),
    )
    .map((rule) => rule.id);
  const awarded = earnRewards(next, ids).state;
  return awarded === state
    ? state
    : { ...awarded, revision: state.revision + 1 };
}

export function validateJourneyState(state: GameState): void {
  if (state.completedCityIds.length)
    throw new Error("都市全体のクリアはまだ実装されていません。");
  for (const id of state.completedEpisodeIds) {
    const episode = episodes.find((item) => item.id === id);
    if (
      !episode ||
      !hasCompletedBattle(state, episode) ||
      !state.completedChapters.includes(episode.legacyChapterId)
    )
      throw new Error("試遊章のクリア記録が一致しません。");
  }
  for (const episode of episodes) {
    if (
      hasCompletedBattle(state, episode) &&
      !state.completedEpisodeIds.includes(episode.id)
    )
      throw new Error("完了したバトルと章の記録が一致しません。");
  }
  for (const id of state.completedGuideIds) {
    if (
      !episodes.some((episode) => episode.landmarkId === id) ||
      !state.visitedLandmarkIds.includes(id)
    )
      throw new Error("案内の読了記録が一致しません。");
  }
  for (const rule of rewardRules) {
    const earned = isRewardEarned(state, rule);
    const claimed = state.claimedRewardIds.includes(rule.id);
    const legacyChapter =
      rule.trigger === "episode_clear" &&
      episodes.some(
        (episode) =>
          episode.id === rule.episodeId &&
          state.completedChapters.includes(episode.legacyChapterId),
      );
    if ((earned && !claimed) || (claimed && !earned && !legacyChapter))
      throw new Error("進行条件と報酬記録が一致しません。");
  }
}
