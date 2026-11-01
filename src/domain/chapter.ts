import {
  city,
  episodes,
  journeyConfig,
  rewardRules,
  type EpisodeDefinition,
  type RewardRule,
  type StoryBattle,
} from "../content";
import { openTourism } from "./tourism";
import { startBattle } from "./battle";
import { earnRewards, type RewardCredit } from "./rewards";
import { encounters } from "../content/encounters";
import type { GameState, Availability } from "./game";

/** Legacy access applies only to the episode that used the old chapter reward. */
function hasLegacyEpisodeAccess(
  state: GameState,
  episode: EpisodeDefinition,
): boolean {
  return (
    state.legacyTrialAvailable &&
    rewardRules.some(
      (rule) =>
        rule.episodeId === episode.id &&
        rule.id === city.firstClearReward.rewardSourceId,
    )
  );
}
export function isEpisodeUnlocked(
  state: GameState,
  episode: EpisodeDefinition,
): boolean {
  return (
    state.completedEpisodeIds.includes(episode.id) ||
    hasLegacyEpisodeAccess(state, episode) ||
    episode.requiredEpisodeIds.every((id) =>
      state.completedEpisodeIds.includes(id),
    )
  );
}
/** A completed encounter is reused even if it was played before this route existed. */
export function getNextStoryBattle(state: GameState): StoryBattle | null {
  return journeyConfig.storyBattles.find((encounter) => {
    const afterIndex = episodes.findIndex((episode) => episode.id === encounter.afterEpisodeId);
    return afterIndex >= 0 &&
      episodes.slice(0, afterIndex + 1).every((episode) => state.completedEpisodeIds.includes(episode.id)) &&
      !state.battleRecords.some((record) => record.battleId === encounter.battleId && record.attempts > 0);
  }) ?? null;
}

/** Completed destinations remain revisitable for older saved games. */
export function isEpisodeBlockedByStoryBattle(state: GameState, episode: EpisodeDefinition): boolean {
  const pending = getNextStoryBattle(state);
  if (!pending || state.completedEpisodeIds.includes(episode.id)) return false;
  const target = episodes.findIndex((item) => item.id === episode.id);
  const barrier = episodes.findIndex((item) => item.id === pending.beforeEpisodeId);
  return target >= 0 && barrier >= 0 && target >= barrier;
}

export function getNextEpisode(state: GameState): EpisodeDefinition | null {
  if (getNextStoryBattle(state)) return null;
  return (
    episodes.find(
      (episode) =>
        !state.completedEpisodeIds.includes(episode.id) &&
        isEpisodeUnlocked(state, episode),
    ) ?? null
  );
}
export function getCurrentEpisode(state: GameState): EpisodeDefinition {
  return (
    episodes.find((episode) =>
      state.activeEpilogue
        ? episode.id === state.activeEpilogue.episodeId
        : state.activeTourism
          ? episode.landmarkId === state.activeTourism.landmarkId
          : state.activeBattle?.battleId === episode.battleId,
    ) ??
    getNextEpisode(state) ??
    episodes.find((episode) => episode.id === journeyConfig.entryEpisodeId)!
  );
}
export function getEpisodeAvailability(
  state: GameState,
  episodeId: string,
): Availability {
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode)
    return { available: false, reason: "旅の予定が見つかりません。" };
  if (
    state.activeEncounter ||
    state.activeDate ||
    state.activeEpilogue ||
    state.activeTourism ||
    (state.activeBattle && state.activeBattle.phase !== "result")
  )
    return { available: false, reason: "途中の場面を終えてから出発できます。" };
  if (!isEpisodeUnlocked(state, episode))
    return {
      available: false,
      reason:
        episode.kind === "city_finale"
          ? "4つの観光地を巡ると、この対決へ進めます。"
          : "先の観光エピソードを終えると出発できます。",
    };
  if (isEpisodeBlockedByStoryBattle(state, episode))
    return { available: false, reason: "先に、旅の途中の対決へ進みましょう。" };
  return { available: true, reason: "" };
}
export function canAccessFreeTime(state: GameState): boolean {
  return (
    state.completedEpisodeIds.length > 0 ||
    state.completedChapters.includes(city.id)
  );
}
export function startEpisode(
  state: GameState,
  episodeId = getCurrentEpisode(state).id,
): GameState {
  if (!getEpisodeAvailability(state, episodeId).available) return state;
  const episode = episodes.find((item) => item.id === episodeId)!;
  const next = state.activeBattle
    ? { ...state, activeBattle: null, battleRewardReceipt: null }
    : state;
  return episode.kind === "city_finale"
    ? startBattle(next, episode.battleId)
    : openTourism(next, episode.landmarkId!);
}
export function enterFreeTime(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (
    state.revision !== expectedRevision ||
    state.activeEncounter ||
    state.activeTourism ||
    state.activeDate ||
    state.activeEpilogue ||
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
  // An optional cultural encounter may earn the very same entitlement as a
  // score threshold. The shared ID keeps existing claims and overflow intact.
  if (encounters.encounters.some((encounter) =>
    encounter.alternativeApRewardId === rule.id &&
    state.completedEncounterIds.includes(encounter.id)
  )) return true;
  if (rule.trigger === "guide_read")
    return (
      !!episode.landmarkId &&
      state.completedGuideIds.includes(episode.landmarkId)
    );
  if (rule.trigger === "episode_clear")
    return state.completedEpisodeIds.includes(episode.id);
  if (rule.trigger === "city_clear")
    return state.completedCityIds.includes(episode.cityId);
  const record = state.battleRecords.find(
    (item) => item.battleId === episode.battleId,
  );
  return (
    !!record &&
    (rule.trigger === "battle_complete" || record.bestScore >= rule.minScore!)
  );
}
/** Chapter is a compatibility token for existing dates; only a finale marks the whole city. */
function recordEpisodes(state: GameState): GameState {
  const completedEpisodeIds = [...state.completedEpisodeIds];
  const completedChapters = [...state.completedChapters];
  const completedCityIds = [...state.completedCityIds];
  for (const episode of episodes) {
    if (!hasCompletedBattle(state, episode)) continue;
    if (
      episode.kind === "city_finale" &&
      !episode.requiredEpisodeIds.every((id) =>
        completedEpisodeIds.includes(id),
      )
    )
      continue;
    if (!completedEpisodeIds.includes(episode.id))
      completedEpisodeIds.push(episode.id);
    if (!completedChapters.includes(episode.legacyChapterId))
      completedChapters.push(episode.legacyChapterId);
    if (
      episode.kind === "city_finale" &&
      !completedCityIds.includes(episode.cityId)
    )
      completedCityIds.push(episode.cityId);
  }
  return completedEpisodeIds.length === state.completedEpisodeIds.length &&
    completedChapters.length === state.completedChapters.length &&
    completedCityIds.length === state.completedCityIds.length
    ? state
    : { ...state, completedEpisodeIds, completedChapters, completedCityIds };
}
export function finalizeBattleProgress(state: GameState): GameState {
  const active = state.activeBattle;
  if (
    !active ||
    active.phase !== "result" ||
    !episodes.some((episode) => episode.battleId === active.battleId)
  )
    return state;
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
/** Old achievements become pending entitlements without changing the saved AP balance. */
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
  if (
    active?.phase === "result" &&
    episodes.some((episode) => episode.battleId === active.battleId)
  ) {
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
export function completeRecordedChapter(
  state: GameState,
  chapterId: string,
): GameState {
  if (
    state.activeEncounter ||
    state.activeDate ||
    state.activeTourism ||
    state.activeBattle ||
    state.activeEpilogue
  )
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
  for (const id of state.completedEpisodeIds) {
    const episode = episodes.find((item) => item.id === id);
    if (
      !episode ||
      !hasCompletedBattle(state, episode) ||
      !state.completedChapters.includes(episode.legacyChapterId) ||
      (!hasLegacyEpisodeAccess(state, episode) &&
        !episode.requiredEpisodeIds.every((required) =>
          state.completedEpisodeIds.includes(required),
        ))
    )
      throw new Error("観光エピソードのクリア記録が一致しません。");
  }
  for (const episode of episodes) {
    if (
      hasCompletedBattle(state, episode) !==
      state.completedEpisodeIds.includes(episode.id)
    )
      throw new Error("完了したバトルと章の記録が一致しません。");
    if (
      episode.kind === "city_finale" &&
      state.completedCityIds.includes(episode.cityId) !==
        state.completedEpisodeIds.includes(episode.id)
    )
      throw new Error("都市クリアの記録が一致しません。");
  }
  if (
    state.completedCityIds.some(
      (id) =>
        !episodes.some(
          (episode) => episode.kind === "city_finale" && episode.cityId === id,
        ),
    )
  )
    throw new Error("都市の記録が見つかりません。");
  for (const id of state.completedGuideIds)
    if (
      !episodes.some((episode) => episode.landmarkId === id) ||
      !state.visitedLandmarkIds.includes(id)
    )
      throw new Error("案内の読了記録が一致しません。");
  for (const rule of rewardRules) {
    const earned = isRewardEarned(state, rule);
    const claimed = state.claimedRewardIds.includes(rule.id);
    const legacyChapter =
      rule.id === city.firstClearReward.rewardSourceId &&
      state.legacyTrialAvailable &&
      state.completedChapters.includes(city.id);
    if ((earned && !claimed) || (claimed && !earned && !legacyChapter))
      throw new Error("進行条件と報酬記録が一致しません。");
  }
}
