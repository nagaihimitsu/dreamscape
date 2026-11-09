import { z } from "zod";
import { sceneConditionReader } from "./scene-conditions";
import { episodes, getCityContent, getCityStoryBackground, progression } from "../content";
import {
  beginStory,
  continueStory,
  storyFingerprint,
  storyFrameSchema,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import type { GameState } from "./game";

export const activeEpilogueSchema = z
  .object({
    episodeId: z.string().min(1),
    // Arrivals share the saved, effect-free city conversation contract.
    kind: z.literal("arrival").optional(),
    logoComplete: z.boolean().optional(),
    contentHash: z.string().min(1),
    storyState: z.string().min(1),
    frame: storyFrameSchema,
  })
  .strict();
export function activeEpilogueStoryId(active: z.infer<typeof activeEpilogueSchema>): string | null {
  const episode = episodes.find((episode) => episode.id === active.episodeId);
  const current = active.kind === "arrival" && episode
    ? getCityContent(episode.cityId).city.arrivalStoryId : episode?.epilogueStoryId;
  try { if (current && storyFingerprint(current) === active.contentHash) return current; }
  catch { /* Missing or changed content must not be resumed. */ }
  return null;
}
function variables(state: GameState) {
  const suffix = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!.playerSuffix;
  return {
    player_address: `${state.playerName}${suffix}`,
    romance_stage: state.romanceStage,
    ending_reached: state.endingReached,
  };
}
/** Arrivals and epilogues have no choices or effects yet (stage 3); any speaker may talk (decision 36). */
function checkedStep(step: StoryStep) {
  if (step.effects.length || step.frame.choices.length)
    throw new Error("都市エピローグに恋愛効果や選択肢は含められません。");
  return { storyState: step.storyState, frame: step.frame };
}

/** Called only at a new journey or a successful city departure, never on load. */
export function startCityArrival(state: GameState, expectedRevision: number): GameState {
  const storyId = getCityContent(state.currentCityId).city.arrivalStoryId;
  const finale = episodes.find((episode) => episode.cityId === state.currentCityId && episode.kind === "city_finale");
  if (state.revision !== expectedRevision || !storyId || !finale || state.completedCityIds.includes(state.currentCityId) || state.activeDate || state.activeBattle ||
      state.activeTourism || state.activeEncounter || state.activeEpilogue || state.travel.activeEvent) return state;
  return { ...state, revision: state.revision + 1, activeEpilogue: {
    episodeId: finale.id, kind: "arrival", logoComplete: false, contentHash: storyFingerprint(storyId),
    ...checkedStep(beginStory(storyId, state.playerName, state.heroineName, variables(state), [], {},
      getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state))),
  } };
}

/** Persist the decorative logo boundary so reload continues with the conversation. */
export function completeArrivalLogo(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEpilogue;
  if (state.revision !== expectedRevision || active?.kind !== "arrival" || active.logoComplete) return state;
  return { ...state, revision: state.revision + 1, activeEpilogue: { ...active, logoComplete: true } };
}
/** A cleared city whose epilogue has not been read yet offers it (free time, the finale's result). */
export function canReadCityEpilogue(state: GameState, cityId = state.currentCityId): boolean {
  return state.completedCityIds.includes(cityId) && !state.viewedEpilogueCityIds.includes(cityId);
}

export function startCityEpilogue(
  state: GameState,
  cityId: string,
  expectedRevision: number,
): GameState {
  const finale = episodes.find(
    (episode) => episode.kind === "city_finale" && episode.cityId === cityId,
  );
  if (
    state.revision !== expectedRevision ||
    cityId !== state.currentCityId ||
    state.activeDate ||
    state.activeTourism ||
    state.activeEpilogue ||
    state.activeEncounter ||
    (state.activeBattle && state.activeBattle.phase !== "result") ||
    !finale?.epilogueStoryId ||
    !state.completedCityIds.includes(cityId)
  )
    return state;
  const storyId = finale.epilogueStoryId;
  return {
    ...state,
    revision: state.revision + 1,
    activeBattle: null,
    battleRewardReceipt: null,
    activeEpilogue: {
      episodeId: finale.id,
      contentHash: storyFingerprint(storyId),
      ...checkedStep(
        beginStory(
          storyId,
          state.playerName,
          state.heroineName,
          variables(state),
          [], {}, getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state),
        ),
      ),
    },
  };
}
export function advanceCityEpilogue(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeEpilogue;
  if (state.revision !== expectedRevision || !active) return state;
  const arrival = active.kind === "arrival";
  if (arrival && !active.logoComplete) return state;
  const finale = episodes.find((episode) => episode.id === active.episodeId)!;
  if (active.frame.ended)
    return {
      ...state,
      revision: state.revision + 1,
      activeEpilogue: null,
      viewedEpilogueCityIds: arrival || state.viewedEpilogueCityIds.includes(finale.cityId)
        ? state.viewedEpilogueCityIds
        : [...state.viewedEpilogueCityIds, finale.cityId],
    };
  return {
    ...state,
    revision: state.revision + 1,
    activeEpilogue: {
      ...active,
      ...checkedStep(
        continueStory(activeEpilogueStoryId(active)!, active.storyState, active.frame, [], {}, {}, sceneConditionReader(state)),
      ),
    },
  };
}
export function validateEpilogueState(state: GameState): void {
  if (
    state.viewedEpilogueCityIds.some(
      (id) => !state.completedCityIds.includes(id),
    )
  )
    throw new Error("都市エピローグの記録が一致しません。");
  const active = state.activeEpilogue;
  if (!active) return;
  const finale = episodes.find(
    (episode) =>
      episode.id === active.episodeId && episode.kind === "city_finale",
  );
  const storyId = activeEpilogueStoryId(active);
  const arrival = active.kind === "arrival";
  if (
    !finale || (!arrival && !finale.epilogueStoryId) ||
    finale.cityId !== state.currentCityId ||
    (!arrival && !state.completedCityIds.includes(finale.cityId)) ||
    (arrival && (typeof active.logoComplete !== "boolean" || state.completedCityIds.includes(finale.cityId))) ||
    (!arrival && active.logoComplete !== undefined) ||
    state.activeDate ||
    state.activeTourism ||
    state.activeBattle ||
    !storyId ||
    active.frame.choices.length
  )
    throw new Error(
      "都市エピローグの途中データを確認できません。元のデータは保管されています。",
    );
  validateStorySnapshot(
    storyId!,
    active.storyState,
    active.frame,
    {
      playerName: state.playerName,
      heroineName: state.heroineName,
      choiceCount: 0,
      variables: variables(state),
    },
  );
}
