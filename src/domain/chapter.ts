import { applyDoneEffects } from "./scene-effects";
import { mainScene } from "./reservations";
import {
  battles,
  landmarks,
  episodes,
  journeyConfig,
  allRewardRules,
  type EpisodeDefinition,
  type RewardRule,
  type StoryBattle,
} from "../content";
import { getJourneyForCity } from "../content/journeys";
import { openLandmarkVisit } from "./tourism";
import { advanceRunningOccasion } from "./occasion-hooks";
import { getActiveBattleContent, leaveBattle, startBattle, startVisitBattle } from "./battle";
import { canReadCityEpilogue } from "./epilogue";
import { earnRewards } from "./rewards";
import { rewardBattleId, rewardLandmarkId } from "./reward-rules";
import { encounters } from "../content/encounters";
import { battlePlayed, meets } from "./conditions";
import type { GameState, Availability } from "./game";

/**
 * Whether the episode shows on the map: its `when` when written (stage 2b), else the current
 * rule (every requiredEpisodeIds episode completed; a finale: every special battle of its city
 * played too). A completed episode stays unlocked.
 */
export function isEpisodeUnlocked(
  state: GameState,
  episode: EpisodeDefinition,
): boolean {
  if (episode.cityId !== state.currentCityId) return false;
  if (state.completedEpisodeIds.includes(episode.id)) return true;
  if (episode.when) return meets(state, episode.when);
  return episode.requiredEpisodeIds.every((id) => state.completedEpisodeIds.includes(id)) &&
    (episode.kind !== "city_finale" || allStoryBattlesCompleted(state, episode.cityId));
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
  return storyBattlesForCity(cityId).every((battle) => battlePlayed(state, battle.battleId));
}

/** Whether the special battle shows on the map: its `when` when written (stage 2b), else its requiredEpisodeIds completed. */
export function isStoryBattleUnlocked(state: GameState, battleId: string): boolean {
  if (battleCityId(battleId) !== state.currentCityId) return false;
  const battle = journeyConfig.storyBattles.find((item) => item.battleId === battleId);
  if (battle?.when) return meets(state, battle.when);
  return !battle || battle.requiredEpisodeIds.every((id) => state.completedEpisodeIds.includes(id));
}

/** Eligible special battles can be visited independently in any order. */
export function getAvailableStoryBattles(state: GameState): StoryBattle[] {
  return storyBattlesForCity(state.currentCityId).filter((battle) =>
    isStoryBattleUnlocked(state, battle.battleId) &&
    !battlePlayed(state, battle.battleId),
  );
}

/** Convenience for callers displaying a single recommendation. */
export function getNextStoryBattle(state: GameState): StoryBattle | null {
  return getAvailableStoryBattles(state)[0] ?? null;
}

/** Completed destinations remain revisitable for older saved games. */
export function isEpisodeBlockedByStoryBattle(state: GameState, episode: EpisodeDefinition): boolean {
  // A finale with `when` (stage 2b) reads only its condition.
  return episode.kind === "city_finale" && !episode.when && !state.completedEpisodeIds.includes(episode.id) &&
    !allStoryBattlesCompleted(state, episode.cityId);
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
  if (sceneOpen(state))
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
/** A scene is open that an episode cannot start over. */
function sceneOpen(state: GameState): boolean {
  return !!(state.activeEncounter || state.activeDate || state.activeEpilogue || state.activeTourism ||
    (state.activeBattle && state.activeBattle.phase !== "result"));
}
export function canAccessFreeTime(_state: GameState): boolean {
  // The initial destination is a choice too; no sightseeing stop is mandatory first.
  return true;
}
/**
 * Start the episode's main part: a finale's battle, or the landmark's visit (its guide,
 * observation, or battle at once, openLandmarkVisit). `mapChecked`: the departure from the map
 * already checked that the episode shows on the map (decision 21), so a trip's encounters before
 * the main part may have spent money or given items without refusing it; only an open scene
 * still refuses (stage 2b).
 */
export function startEpisode(
  state: GameState,
  episodeId = getCurrentEpisode(state).id,
  mapChecked = false,
): GameState {
  const episode = episodes.find((item) => item.id === episodeId);
  if (!episode || (mapChecked ? sceneOpen(state) || episode.cityId !== state.currentCityId : !getEpisodeAvailability(state, episodeId).available))
    return state;
  const next = state.activeBattle
    ? { ...state, activeBattle: null, battleRewardReceipt: null }
    : state;
  const started = episode.kind === "city_finale"
    ? (mapChecked ? startVisitBattle(next, episode.battleId, true) : startBattle(next, episode.battleId))
    : openLandmarkVisit(next, episode.landmarkId!, mapChecked);
  return started === next ? state : started;
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
/**
 * The ways out of a battle's result screen: the city finale's 「エピローグへ進む」 while its
 * epilogue is unread (and no special battle is left), and leaving to free time, which a journey
 * that moves on after the epilogue (cityTransition after_epilogue) does not offer beside it.
 * The epilogue is the current city's, the one startCityEpilogue(state, state.currentCityId) opens.
 */
export function getBattleResultExits(state: GameState): { epilogue: boolean; leave: boolean } {
  const active = state.activeBattle;
  if (!active || active.phase !== "result" || state.activeTourism) return { epilogue: false, leave: false };
  const { battle } = getActiveBattleContent(active);
  const epilogue = battle.scope === "city_finale" && battle.cityId === state.currentCityId && !getNextStoryBattle(state) &&
    canReadCityEpilogue(state);
  const automatic = getJourneyForCity(state.currentCityId)?.cityTransition === "after_epilogue";
  return { epilogue, leave: !(automatic && epilogue) };
}

/**
 * Leaving a battle's result screen: a special battle returns to its place, the others to free time.
 * The screen's 「自由時間へ戻る／進む」 is leaveBattleToFreeTime (encounter.ts), which then meets the
 * encounters after a landmark's main part.
 */
export function leaveBattleResult(state: GameState, expectedRevision: number, nextRoll?: () => number): GameState {
  const active = state.activeBattle;
  if (!active || active.phase !== "result" || state.activeTourism) return state;
  const left = getActiveBattleContent(active).battle.reasoning
    ? leaveBattle(state, expectedRevision)
    : enterFreeTime(state, expectedRevision);
  // The battle (its result screen included) is one part of its occasion: what follows runs now (stage 3b).
  return left === state ? state : advanceRunningOccasion(left, nextRoll);
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
      : !!rule.battleId && battlePlayed(state, rule.battleId);
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
/**
 * Records the episodes whose battle is finished; only a finale marks the whole city. completedEpisodeIds only grows at its
 * end, so it is the order the episodes were completed in; the current city's episodes completed now also go after today's
 * headlines (the travel state's `todayEpisodeIds`, save v23; the night's recap).
 */
function recordEpisodes(state: GameState): GameState {
  const completedEpisodeIds = [...state.completedEpisodeIds];
  const completedCityIds = [...state.completedCityIds];
  for (const episode of episodes) {
    if (!battlePlayed(state, episode.battleId)) continue;
    // A finale with `when` is not checked again once played (4.2): its condition may have turned false.
    if (
      episode.kind === "city_finale" && !episode.when &&
      (!allStoryBattlesCompleted(state, episode.cityId) || !episode.requiredEpisodeIds.every((id) =>
        completedEpisodeIds.includes(id),
      ))
    )
      continue;
    if (!completedEpisodeIds.includes(episode.id))
      completedEpisodeIds.push(episode.id);
    if (
      episode.kind === "city_finale" &&
      !completedCityIds.includes(episode.cityId)
    )
      completedCityIds.push(episode.cityId);
  }
  if (completedEpisodeIds.length === state.completedEpisodeIds.length && completedCityIds.length === state.completedCityIds.length)
    return state;
  const today = completedEpisodeIds.slice(state.completedEpisodeIds.length)
    .filter((id) => episodes.some((episode) => episode.id === id && episode.cityId === state.currentCityId));
  return { ...state, completedEpisodeIds, completedCityIds,
    travel: today.length ? { ...state.travel, todayEpisodeIds: [...state.travel.todayEpisodeIds, ...today] } : state.travel };
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
  const first = !state.completedGuideIds.includes(landmarkId);
  let next = first ? { ...state, completedGuideIds: [...state.completedGuideIds, landmarkId] } : state;
  // The guide's main # on_done: (its knot head or its file's head): the first time it is read to its end (decision 37).
  const doneScene = first ? mainScene({ guide: landmarkId }) : undefined;
  if (doneScene) next = applyDoneEffects(next, doneScene.id, doneScene.done, next.revision);
  const ids = allRewardRules
    .filter(
      (rule) =>
        rule.trigger === "guide_read" &&
        rewardLandmarkId(rule) === landmarkId,
    )
    .map((rule) => rule.id);
  return earnRewards(next, ids).state;
}
export function validateJourneyState(state: GameState): void {
  for (const id of state.completedEpisodeIds) {
    const episode = episodes.find((item) => item.id === id);
    // An episode with `when` is checked only for its played battle (4.2): money or items may have changed since.
    if (
      !episode ||
      !battlePlayed(state, episode.battleId) ||
      (!episode.when && (!episode.requiredEpisodeIds.every((required) =>
        state.completedEpisodeIds.includes(required),
      ) ||
      (episode.kind === "city_finale" && !allStoryBattlesCompleted(state, episode.cityId))))
    )
      throw new Error("観光エピソードのクリア記録が一致しません。");
  }
  for (const episode of episodes) {
    if (
      battlePlayed(state, episode.battleId) !==
      state.completedEpisodeIds.includes(episode.id)
    )
      throw new Error("完了したバトルと観光エピソードの記録が一致しません。");
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
