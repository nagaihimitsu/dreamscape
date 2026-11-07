import {
  battles,
  landmarks,
  episodes,
  journeyConfig,
  rewardRules,
  allRewardRules,
  type EpisodeDefinition,
  type RewardRule,
  type StoryBattle,
} from "../content";
import { openTourism } from "./tourism";
import { startBattle } from "./battle";
import { earnRewards } from "./rewards";
import { rewardBattleId, rewardLandmarkId } from "./reward-rules";
import { encounters } from "../content/encounters";
import type { GameState, Availability } from "./game";

export function isEpisodeUnlocked(
  state: GameState,
  episode: EpisodeDefinition,
): boolean {
  return (
    episode.cityId === state.currentCityId && (
    state.completedEpisodeIds.includes(episode.id) ||
    (episode.requiredEpisodeIds.every((id) =>
      state.completedEpisodeIds.includes(id),
    ) && (episode.kind !== "city_finale" || allStoryBattlesCompleted(state, episode.cityId))))
  );
}
function storyBattleCompleted(state: GameState, battleId: string): boolean {
  return state.battleRecords.some((record) => record.battleId === battleId && record.attempts > 0);
}

/** The city finale is explicitly owned; normal and special battles inherit their landmark's city. */
export function battleCityId(battleId: string): string | undefined {
  const battle = battles.find((item) => item.id === battleId);
  return battle?.landmarkId
    ? landmarks.find((item) => item.id === battle.landmarkId)?.cityId
    : battle?.cityId;
}

export function storyBattlesForCity(cityId: string): StoryBattle[] {
  return journeyConfig.storyBattles.filter((battle) => battleCityId(battle.battleId) === cityId);
}

function allStoryBattlesCompleted(state: GameState, cityId: string): boolean {
  return storyBattlesForCity(cityId).every((battle) => storyBattleCompleted(state, battle.battleId));
}

export function isStoryBattleUnlocked(state: GameState, battleId: string): boolean {
  if (battleCityId(battleId) !== state.currentCityId) return false;
  const battle = journeyConfig.storyBattles.find((item) => item.battleId === battleId);
  return !battle || battle.requiredEpisodeIds.every((id) => state.completedEpisodeIds.includes(id));
}

/** Eligible special battles can be visited independently in any order. */
export function getAvailableStoryBattles(state: GameState): StoryBattle[] {
  return storyBattlesForCity(state.currentCityId).filter((battle) =>
    isStoryBattleUnlocked(state, battle.battleId) &&
    !storyBattleCompleted(state, battle.battleId),
  );
}

/** Convenience for callers displaying a single recommendation. */
export function getNextStoryBattle(state: GameState): StoryBattle | null {
  return getAvailableStoryBattles(state)[0] ?? null;
}

/** Completed destinations remain revisitable for older saved games. */
export function isEpisodeBlockedByStoryBattle(state: GameState, episode: EpisodeDefinition): boolean {
  return episode.kind === "city_finale" && !state.completedEpisodeIds.includes(episode.id) && !allStoryBattlesCompleted(state, episode.cityId);
}

export function getNextEpisode(state: GameState): EpisodeDefinition | null {
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
    episodes.find((episode) => episode.cityId === state.currentCityId)!
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
        episode.kind !== "city_finale"
          ? "先の観光エピソードを終えると出発できます。"
          // Only cities with special battles have mid-journey battles to mention.
          : storyBattlesForCity(episode.cityId).length
            ? "観光地と旅の途中の対決を巡ると、この対決へ進めます。"
            : "観光地を巡ると、この対決へ進めます。",
    };
  if (isEpisodeBlockedByStoryBattle(state, episode))
    return { available: false, reason: "先に、旅の途中の対決へ進みましょう。" };
  return { available: true, reason: "" };
}
export function canAccessFreeTime(_state: GameState): boolean {
  // The initial destination is a choice too; no sightseeing stop is mandatory first.
  return true;
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
  const episode = episodes.find((item) => item.id === rule.episodeId);
  // An optional cultural encounter may earn the very same entitlement as a
  // score threshold. The shared ID keeps existing claims and overflow intact.
  if (encounters.encounters.some((encounter) =>
    encounter.alternativeApRewardId === rule.id &&
    state.completedEncounterIds.includes(encounter.id)
  )) return true;
  if (rule.trigger === "guide_read") {
    const landmarkId = rewardLandmarkId(rule);
    return !!landmarkId && state.completedGuideIds.includes(landmarkId);
  }
  if (rule.trigger === "episode_clear")
    return episode ? state.completedEpisodeIds.includes(episode.id)
      : !!rule.battleId && storyBattleCompleted(state, rule.battleId);
  if (rule.trigger === "city_clear")
    return !!episode && state.completedCityIds.includes(episode.cityId);
  const record = state.battleRecords.find(
    (item) => item.battleId === rewardBattleId(rule),
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
      (!allStoryBattlesCompleted(state, episode.cityId) || !episode.requiredEpisodeIds.every((id) =>
        completedEpisodeIds.includes(id),
      ))
    )
      continue;
    if (!completedEpisodeIds.includes(episode.id))
      completedEpisodeIds.push(episode.id);
    if (!completedChapters.includes(episode.cityId))
      completedChapters.push(episode.cityId);
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
    (!allRewardRules.some((rule) => rewardBattleId(rule) === active.battleId) &&
      !episodes.some((episode) => episode.battleId === active.battleId))
  )
    return state;
  const next = recordEpisodes(state);
  const ids = allRewardRules
    .filter((rule) => {
      return (
        rewardBattleId(rule) === active.battleId &&
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
  const ids = allRewardRules
    .filter(
      (rule) =>
        rule.trigger === "guide_read" &&
        rewardLandmarkId(rule) === landmarkId,
    )
    .map((rule) => rule.id);
  return earnRewards(next, ids).state;
}
/**
 * Records the city's episodes whose battle this save has finished and pays
 * their episode rewards not received yet. During a scene, without such a
 * battle, or when everything is recorded already, the state comes back
 * unchanged: completing a city's episodes needs real battle evidence and never
 * pays twice.
 */
export function recordFinishedEpisodes(
  state: GameState,
  cityId = state.currentCityId,
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
      episode.cityId === cityId &&
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
      !state.completedChapters.includes(episode.cityId) ||
      !episode.requiredEpisodeIds.every((required) =>
        state.completedEpisodeIds.includes(required),
      ) ||
      (episode.kind === "city_finale" && !allStoryBattlesCompleted(state, episode.cityId))
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
      (!episodes.some((episode) => episode.landmarkId === id) &&
        !journeyConfig.storyBattles.some((battle) => battles.some((definition) =>
          definition.id === battle.battleId && definition.landmarkId === id))) ||
      !state.visitedLandmarkIds.includes(id)
    )
      throw new Error("案内の読了記録が一致しません。");
  for (const rule of allRewardRules) {
    const earned = isRewardEarned(state, rule);
    const claimed = state.claimedRewardIds.includes(rule.id);
    // Episode rewards are claimed when earned; every recorded claim must
    // still satisfy its conditions.
    if ((rule.episodeId !== undefined && earned && !claimed) || (claimed && !earned))
      throw new Error("進行条件と報酬記録が一致しません。");
  }
}
