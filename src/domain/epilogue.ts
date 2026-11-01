import { z } from "zod";
import { episodes, progression } from "../content";
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
    contentHash: z.string().min(1),
    storyState: z.string().min(1),
    frame: storyFrameSchema,
  })
  .strict();
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
function checkedStep(step: StoryStep) {
  if (step.effects.length || step.frame.choices.length)
    throw new Error("都市エピローグに恋愛効果や選択肢は含められません。");
  return { storyState: step.storyState, frame: step.frame };
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
  const finale = episodes.find((episode) => episode.id === active.episodeId)!;
  if (active.frame.ended)
    return {
      ...state,
      revision: state.revision + 1,
      activeEpilogue: null,
      viewedEpilogueCityIds: state.viewedEpilogueCityIds.includes(finale.cityId)
        ? state.viewedEpilogueCityIds
        : [...state.viewedEpilogueCityIds, finale.cityId],
    };
  return {
    ...state,
    revision: state.revision + 1,
    activeEpilogue: {
      ...active,
      ...checkedStep(
        continueStory(finale.epilogueStoryId!, active.storyState, active.frame),
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
  if (
    !finale?.epilogueStoryId ||
    !state.completedCityIds.includes(finale.cityId) ||
    state.activeDate ||
    state.activeTourism ||
    state.activeBattle ||
    active.contentHash !== storyFingerprint(finale.epilogueStoryId) ||
    active.frame.choices.length
  )
    throw new Error(
      "都市エピローグの途中データを確認できません。元のデータは保管されています。",
    );
  validateStorySnapshot(
    finale.epilogueStoryId,
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
