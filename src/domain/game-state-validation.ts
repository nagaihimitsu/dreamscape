import { battles, dates, effects, episodes, getCityContent } from "../content";
import { validateStorySnapshot } from "../story/runtime";
import { activeDateStoryId, completedDateCount, dateBelongsToCity } from "./date-rules";
import type { GameState } from "./game-state-schema";
import { resolveRomanceChoice } from "./romance-random";
import { minimumHomeFare } from "./travel-routes";
import { getTransportMode, WALK_MODE_ID } from "../content/transport";
import { getUsableRoutes } from "./transport";

/** Cross-check the saved schedule, return fare and currently running scene. */
export function validateTravelState(state: GameState): void {
  const travel = state.travel;
  const { travel: cityTravel, travelSettings } = getCityContent(state.currentCityId);
  if (travel.hotelPlaceId !== travelSettings.hotelPlaceId || travel.returnReserve > state.travelBudget ||
      !cityTravel.places.some((place) => place.id === travel.currentPlaceId) ||
      (travel.activeEvent && (!cityTravel.events.some((event) => event.id === travel.activeEvent!.eventId && event.placeId === travel.activeEvent!.placeId) ||
        travel.activeEvent.placeId !== travel.currentPlaceId || travel.activeEvent.endMinute < travel.minute)))
    throw new Error("旅行の位置や時間枠が一致しません。");
  // A rental mode is usable once rented and stays usable in the city, so the saved reserve
  // (computed from the usable routes when it was set) never falls below this minimum.
  if (travel.rentedModeIds.some((modeId) => !getTransportMode(state.currentCityId, modeId)?.rental ||
      !getCityContent(state.currentCityId).travelSettings.rentals?.some((offer) => offer.modeId === modeId)))
    throw new Error("借りた乗り物の記録が一致しません。");
  // Rides are counted per declared mode other than walking, a rental mode only once rented (both end on departure).
  if (Object.keys(travel.rideCounts).some((modeId) => {
    const mode = getTransportMode(state.currentCityId, modeId);
    return !mode || modeId === WALK_MODE_ID || (!!mode.rental && !travel.rentedModeIds.includes(modeId));
  })) throw new Error("乗り物に乗った回数の記録が一致しません。");
  const returnMinute = travel.activeEvent?.endMinute ?? travel.minute;
  const requiredFare = minimumHomeFare(getUsableRoutes(state), travel.currentPlaceId, travel.hotelPlaceId, returnMinute);
  if (requiredFare === undefined || travel.returnReserve < requiredFare)
    throw new Error("帰路の交通費を確保できていません。");
  if (travel.activeEvent) {
    const id = travel.activeEvent.eventId;
    const episode = episodes.find((item) => item.id === id);
    const sceneMatches = dates.some((item) => item.id === id)
      ? state.activeDate?.dateId === id
      : episode
        ? state.activeTourism?.landmarkId === episode.landmarkId ||
          state.activeEncounter?.returnTourism?.landmarkId === episode.landmarkId ||
          state.activeBattle?.battleId === episode.battleId
        : state.activeBattle?.battleId === id ||
          battles.some((battle) => battle.id === id && !!battle.landmarkId &&
            (state.activeTourism?.landmarkId === battle.landmarkId ||
              state.activeEncounter?.returnTourism?.landmarkId === battle.landmarkId));
    if (!sceneMatches) throw new Error("旅行の時間枠と進行中の場面が一致しません。");
  }
}

/** Check durable history and relationship records after subsystem validation. */
export function validateGameHistory(state: GameState): void {
  const knownMemories = new Set(
    effects.flatMap((effect) => (effect.memoryId ? [effect.memoryId] : [])),
  );
  if (
    state.playedDateIds.some((id) => !dates.some((date) => date.id === id)) ||
    state.memories.some((id) => !knownMemories.has(id)) ||
    state.unlockedEventIds.some(
      (id) => !dates.some((date) => date.id === id && date.kind !== "normal"),
    )
  )
    throw new Error("保存データの参照先が見つかりません。");
  if (state.endingReached !== (state.confessionStatus === "accepted"))
    throw new Error("エンディングの記録が一致しません。");
  if ((state.completedRecoveryCount > 0) !== state.playedDateIds.some(
    (id) => dates.some((date) => date.id === id && date.recovery),
  )) throw new Error("再交流の履歴が一致しません。");
  if (state.recoveryAfterRejection &&
      (state.confessionStatus !== "rejected" || state.completedRecoveryCount === 0))
    throw new Error("告白後の交流記録が一致しません。");
  if ((state.confessionStatus === "rejected") !== (state.lastRejectedDateCount !== null) ||
      (state.lastRejectedDateCount !== null && state.lastRejectedDateCount > completedDateCount(state)))
    throw new Error("告白後の進行記録が一致しません。");
  if (
    state.confessionStatus !== "none" &&
    !state.playedDateIds.some(
      (id) => dates.find((date) => date.id === id)?.kind === "confession",
    )
  )
    throw new Error("告白の記録が一致しません。");
}

/**
 * Reproduce saved choice outcomes before restoring an active story. A running
 * date's `when`/`until` is not checked again: it was met when the date started,
 * and changing a condition in the content must not make a save unreadable.
 */
export function validateActiveDateState(state: GameState): void {
  const active = state.activeDate;
  if (active) {
    const date = dates.find((item) => item.id === active.dateId);
    if (
      !date || !dateBelongsToCity(state, date) ||
      (state.endingReached && date.kind !== "normal" && !date.allowAfterEnding)
    )
      throw new Error("デートの保存状態を確認できません。");
    const storyId = activeDateStoryId(date, active);
    if (active.resolutionMode === "fixed") {
      if (date.kind !== "confession" || active.randomPlan.length || active.resolvedChoices.length || active.responseSnapshot)
        throw new Error("告白の結果記録が一致しません。");
    } else {
      if (date.kind === "confession" || !active.responseSnapshot || active.randomPlan.length !== date.choiceCount ||
          active.resolvedChoices.length !== active.choiceCount)
        throw new Error("恋愛リアクションの進行記録が一致しません。");
      for (const [choiceNumber, saved] of active.resolvedChoices.entries()) {
        const previous = active.resolvedChoices[choiceNumber - 1];
        if (previous && (saved.before.affection !== previous.before.affection + (active.replay ? 0 : previous.deltas.affection) ||
            saved.before.trust !== previous.before.trust + (active.replay ? 0 : previous.deltas.trust) ||
            saved.before.spark !== previous.before.spark + (active.replay ? 0 : previous.deltas.spark)))
          throw new Error("保存された関係値の履歴が一致しません。");
        const effect = effects.find((item) => item.id === saved.effectId);
        const profileId = active.responseSnapshot.effectProfiles[saved.effectId];
        const profile = active.responseSnapshot.profiles.find((item) => item.id === profileId);
        if (!effect || effect.outcome || !profile) throw new Error("保存された選択効果が見つかりません。");
        const expected = resolveRomanceChoice(profile, saved.before, active.randomPlan[choiceNumber]);
        if (JSON.stringify(expected) !== JSON.stringify({ result: saved.result, chance: saved.chance, deltas: saved.deltas }) ||
            !active.appliedEffectIds.some((key) => key.endsWith(`:${saved.effectId}`)))
          throw new Error("保存された恋愛リアクションが一致しません。");
      }
    }
    if (
      active.replay !==
      (date.rewardOnlyOnce && state.playedDateIds.includes(date.id))
    )
      throw new Error("デートの履歴が一致しません。");
    if (
      active.choiceCount > date.choiceCount ||
      (active.pendingOutcome && date.kind !== "confession")
    )
      throw new Error("会話の進行記録が一致しません。");
    const lastResolution = active.resolvedChoices.at(-1);
    if (active.resolutionMode === "random_v1" && lastResolution && !active.replay &&
        (state.affection !== lastResolution.before.affection + lastResolution.deltas.affection ||
         state.trust !== lastResolution.before.trust + lastResolution.deltas.trust ||
         state.spark !== lastResolution.before.spark + lastResolution.deltas.spark))
      throw new Error("保存された関係値と選択結果が一致しません。");
    validateStorySnapshot(storyId, active.storyState, active.frame, {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: active.choiceCount,
      variables: active.resolutionMode === "random_v1" ? {
        romance_result: lastResolution?.result ?? "neutral",
        affection_delta: lastResolution?.deltas.affection ?? 0,
        trust_delta: lastResolution?.deltas.trust ?? 0,
        spark_delta: lastResolution?.deltas.spark ?? 0,
      } : undefined,
    }, state.memories);
  }
}

/**
 * The story state of the common condition system: every saved line, step and
 * flag must be declared (stage 3 declares them in progression/story.json).
 * No journey declares any yet, so only the empty records are valid.
 */
export function validateStoryProgress(state: GameState): void {
  if (Object.keys(state.storyProgress.lines).length || state.storyProgress.flags.length)
    throw new Error("物語の進行の記録が一致しません。");
  if (state.travel.temporaryFlags.length)
    throw new Error("この都市での物語の印の記録が一致しません。");
}
