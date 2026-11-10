import { z } from "zod";
import { sceneConditionReader } from "./scene-conditions";
import { episodes, getCityContent, getCityStoryBackground, progression, scenes } from "../content";
import { knotAddress } from "../content/story-address";
import {
  beginStory,
  continueStory,
  selectStoryChoice,
  storyFingerprint,
  storyFrameSchema,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import type { GameState } from "./game";
import { applyChoiceEffects, applyDoneEffects, choiceDisplay, sceneOption, type ChoiceDisplay } from "./scene-effects";
import { sceneOfAddress } from "./reservations";
import { evaluateProgression } from "./date-rules";
import { advanceRunningOccasion } from "./occasion-hooks";
import { narrationAt, tourMoment } from "./moments";

export const activeEpilogueSchema = z
  .object({
    /** The city finale's episode (an epilogue's; an arrival's city), or a tour leg's narration scene (kind tour_leg). */
    episodeId: z.string().min(1),
    // Arrivals and a tour leg's narration (tour stage 2b) share the saved, effect-free city conversation contract.
    kind: z.enum(["arrival", "tour_leg"]).optional(),
    logoComplete: z.boolean().optional(),
    contentHash: z.string().min(1),
    storyState: z.string().min(1),
    frame: storyFrameSchema,
    /** The Japanese choices made so far (Ink's turn; stage 3a, decision 36). */
    chosenCount: z.number().int().positive().optional(),
  })
  .strict();
/** A tour leg's narration scene (`# scene: tour_leg`; tour stage 2b) by its ID. */
const narrationScene = (sceneId: string) => scenes.find((scene) => scene.id === sceneId && scene.kind === "tour_leg" && scene.story.knot !== undefined);

export function activeEpilogueStoryId(active: z.infer<typeof activeEpilogueSchema>): string | null {
  const episode = episodes.find((episode) => episode.id === active.episodeId);
  const narration = active.kind === "tour_leg" ? narrationScene(active.episodeId) : undefined;
  const current = active.kind === "tour_leg" ? narration && knotAddress(narration.story.storyId, narration.story.knot!)
    : active.kind === "arrival" && episode ? getCityContent(episode.cityId).city.arrivalStoryId : episode?.epilogueStoryId;
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
/** Arrivals and epilogues may have Japanese choices with tags (stage 3a, decision 36), never Ink's # effect:; any speaker may talk. */
function checkedStep(step: StoryStep) {
  if (step.effects.length)
    throw new Error("都市エピローグに恋愛効果は含められません。");
  return { storyState: step.storyState, frame: step.frame };
}

/** The scene of the open arrival or epilogue (its file's choices and head # on_done:), when it has tags; a tour leg's narration has none. */
function epilogueScene(active: z.infer<typeof activeEpilogueSchema>) {
  if (active.kind === "tour_leg") return narrationScene(active.episodeId);
  const finale = episodes.find((episode) => episode.id === active.episodeId);
  return finale && sceneOfAddress(active.kind === "arrival" ? getCityContent(finale.cityId).city.arrivalStoryId : finale.epilogueStoryId);
}

/** How a choice of the open arrival or epilogue shows (decision 43). */
export function epilogueChoiceDisplay(state: GameState, index: number): ChoiceDisplay {
  const active = state.activeEpilogue;
  const choice = active?.frame.choices.find((item) => item.index === index);
  if (!active || !choice) return { show: "grey", reason: "この選択肢は使えません。" };
  const scene = epilogueScene(active);
  const option = sceneOption(scene, choice.optionId);
  if (scene && choice.optionId !== undefined && !option) return { show: "hidden" };
  return choiceDisplay(state, option);
}

/** Choose in the arrival or the epilogue (each is read once): the choice's tags apply first, then Ink goes on. */
export function chooseCityEpilogue(state: GameState, index: number, expectedRevision: number, nextRoll?: () => number): GameState {
  const active = state.activeEpilogue;
  if (state.revision !== expectedRevision || !active || (active.kind === "arrival" && !active.logoComplete) ||
      epilogueChoiceDisplay(state, index).show !== "open") return state;
  const storyId = activeEpilogueStoryId(active);
  if (!storyId) return state;
  const scene = epilogueScene(active);
  const choice = active.frame.choices.find((item) => item.index === index)!;
  const option = sceneOption(scene, choice.optionId);
  const revision = state.revision + 1;
  const applied = option && scene ? applyChoiceEffects(state, scene.id, option, revision, nextRoll) : { state };
  // The romance progress is read again before Ink goes on: the lines after the choice (and the saved conversation, which
  // keeps the stage and the address it was given) read the new stage, as a reload checks them.
  const next = option?.rel || option?.profile ? evaluateProgression(applied.state) : applied.state;
  const result: Record<string, string | number | boolean> = { ...variables(next), ...("profile" in applied && applied.profile ? { romance_result: applied.profile.result } : {}) };
  const step = selectStoryChoice(storyId, active.storyState, active.frame, index, next.memories, {}, result, next.inventory, sceneConditionReader(next));
  return { ...next, revision, activeEpilogue: { ...active, chosenCount: (active.chosenCount ?? 0) + 1, ...checkedStep(step) } };
}

/** Whether the current city's arrival can begin (a new journey or a city just reached; no scene of another kind open). */
export function canBeginArrival(state: GameState): boolean {
  const storyId = getCityContent(state.currentCityId).city.arrivalStoryId;
  const finale = episodes.find((episode) => episode.cityId === state.currentCityId && episode.kind === "city_finale");
  return !!storyId && !!finale && !state.completedCityIds.includes(state.currentCityId) && !state.activeDate && !state.activeBattle &&
    !state.activeTourism && !state.activeEncounter && !state.activeEpilogue && !state.travel.activeEvent;
}

/**
 * Begin the arrival conversation: with its logo first, or (an arrival's moment, stage 4: after the logo's
 * `after logo` scenes) the conversation itself, from its start.
 */
export function beginArrival(state: GameState, logoComplete = false): GameState {
  if (!canBeginArrival(state)) return state;
  const storyId = getCityContent(state.currentCityId).city.arrivalStoryId!;
  const finale = episodes.find((episode) => episode.cityId === state.currentCityId && episode.kind === "city_finale")!;
  return { ...state, revision: state.revision + 1, activeEpilogue: {
    episodeId: finale.id, kind: "arrival", logoComplete, contentHash: storyFingerprint(storyId),
    ...checkedStep(beginStory(storyId, state.playerName, state.heroineName, variables(state), [], {},
      getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state))),
  } };
}

/**
 * Begin a tour leg's narration (tour stage 2b; `# scene: tour_leg`): its leg's moment starts it (occasion.ts), and its end goes on
 * with that moment (the in-car encounter, the leg's move). Read on this screen with no choices and no effects; cond("…") and every
 * speaker are read as in an arrival.
 */
export function beginTourLegNarration(state: GameState, sceneId: string): GameState {
  const scene = narrationScene(sceneId);
  if (!scene || state.activeEpilogue) return state;
  const address = knotAddress(scene.story.storyId, scene.story.knot!);
  return { ...state, revision: state.revision + 1, activeEpilogue: {
    episodeId: scene.id, kind: "tour_leg", contentHash: storyFingerprint(address),
    ...checkedStep(beginStory(address, state.playerName, state.heroineName, variables(state), [], {},
      getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state))),
  } };
}

/** Called only at a new journey or a successful city departure, never on load. */
export function startCityArrival(state: GameState, expectedRevision: number): GameState {
  return state.revision === expectedRevision ? beginArrival(state) : state;
}

/**
 * Persist the decorative logo boundary so reload continues with the conversation. In an arrival's moment (stage 4),
 * the logo is its own main part: it ends here, and the conversation begins after the `after logo` scenes.
 */
export function completeArrivalLogo(state: GameState, expectedRevision: number): GameState {
  const active = state.activeEpilogue;
  if (state.revision !== expectedRevision || active?.kind !== "arrival" || active.logoComplete) return state;
  if (state.occasion?.kind === "arrive" && state.occasion.at === "main:logo") return advanceRunningOccasion({ ...state, revision: state.revision + 1, activeEpilogue: null });
  return { ...state, revision: state.revision + 1, activeEpilogue: { ...active, logoComplete: true } };
}
/**
 * A city whose epilogue its author starts (`# then: epilogue` in any of its scenes; 3.9 (d)): the game
 * never starts it by itself and shows no 「エピローグへ」; the then: may start it before the city is cleared.
 */
export function isAuthoredEpilogueCity(cityId: string): boolean {
  return scenes.some((scene) => scene.cityId === cityId && ((scene.then && "epilogue" in scene.then) ||
    scene.options.some((option) => option.then && "epilogue" in option.then)));
}

/** A cleared city whose epilogue has not been read yet offers it (free time, the finale's result); an authored city never does. */
export function canReadCityEpilogue(state: GameState, cityId = state.currentCityId): boolean {
  return !isAuthoredEpilogueCity(cityId) && state.completedCityIds.includes(cityId) && !state.viewedEpilogueCityIds.includes(cityId);
}

/** Whether a `# then: epilogue` would open the city's epilogue now (an authored city, unread; cleared or not). */
export function canStartAuthoredEpilogue(state: GameState, cityId = state.currentCityId): boolean {
  return cityId === state.currentCityId && isAuthoredEpilogueCity(cityId) && !state.viewedEpilogueCityIds.includes(cityId) &&
    !!episodes.find((episode) => episode.kind === "city_finale" && episode.cityId === cityId)?.epilogueStoryId;
}

/**
 * The state the city's epilogue can open from (null: it cannot): the finale result's 「エピローグへ」 leaves the result
 * and closes its occasion first (its trip's window settles). `authored`: started by a `# then: epilogue` (its occasion
 * has closed), an authored city's epilogue, cleared or not.
 */
export function epilogueOpening(input: GameState, cityId: string, authored = false): GameState | null {
  let state = input;
  if (state.activeBattle?.phase === "result" && state.occasion && !state.occasion.then && !authored) {
    const trip = state.travel.activeEvent;
    state = { ...state, occasion: null, travel: trip ? { ...state.travel, minute: trip.endMinute, activeEvent: null } : state.travel };
  }
  const finale = episodes.find((episode) => episode.kind === "city_finale" && episode.cityId === cityId);
  if (cityId !== state.currentCityId || state.activeDate || state.activeTourism || state.activeEpilogue || state.activeEncounter ||
      (state.activeBattle && state.activeBattle.phase !== "result") || !finale?.epilogueStoryId || state.occasion ||
      (authored ? !canStartAuthoredEpilogue(state, cityId) : !state.completedCityIds.includes(cityId) || isAuthoredEpilogueCity(cityId)))
    return null;
  return { ...state, activeBattle: null, battleRewardReceipt: null };
}

export function startCityEpilogue(
  input: GameState,
  cityId: string,
  expectedRevision: number,
  /** Started by a `# then: epilogue` (its occasion has closed): an authored city's epilogue, cleared or not. */
  authored = false,
): GameState {
  const opening = input.revision === expectedRevision ? epilogueOpening(input, cityId, authored) : null;
  return opening ? beginCityEpilogue(opening, cityId) : input;
}

/** Begin the city's epilogue conversation (the caller checked it may open: epilogueOpening). */
export function beginCityEpilogue(state: GameState, cityId: string): GameState {
  const finale = episodes.find((episode) => episode.kind === "city_finale" && episode.cityId === cityId);
  if (!finale?.epilogueStoryId || state.activeEpilogue) return state;
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
  if (active.frame.choices.length) return state;
  // A tour leg's narration (tour stage 2b): it records nothing and does nothing when done; its leg's moment goes on.
  if (active.frame.ended && active.kind === "tour_leg") return advanceRunningOccasion({ ...state, revision: state.revision + 1, activeEpilogue: null });
  if (active.frame.ended) {
    const first = arrival || !state.viewedEpilogueCityIds.includes(finale.cityId);
    const closed: GameState = {
      ...state,
      revision: state.revision + 1,
      activeEpilogue: null,
      viewedEpilogueCityIds: arrival || state.viewedEpilogueCityIds.includes(finale.cityId)
        ? state.viewedEpilogueCityIds
        : [...state.viewedEpilogueCityIds, finale.cityId],
    };
    // Its file's head # on_done: (the arrival: once per city; the epilogue: the first time it is read).
    const scene = first ? epilogueScene(active) : undefined;
    // Its moment (stage 4) goes on: the scenes after it, a then: of it.
    if (!scene) return advanceRunningOccasion(closed);
    const paid = applyDoneEffects(closed, scene.id, scene.done, closed.revision);
    return advanceRunningOccasion(scene.done.rel ? evaluateProgression(paid) : paid);
  }
  return {
    ...state,
    revision: state.revision + 1,
    activeEpilogue: {
      ...active,
      ...checkedStep(
        continueStory(activeEpilogueStoryId(active)!, active.storyState, active.frame, state.memories, {}, state.inventory, sceneConditionReader(state)),
      ),
    },
  };
}
export function validateEpilogueState(state: GameState): void {
  // A city whose epilogue its author starts may read it before it is cleared (4.5): the current city or one already left.
  if (
    state.viewedEpilogueCityIds.some(
      (id) => !state.completedCityIds.includes(id) && !(isAuthoredEpilogueCity(id) && id === state.currentCityId),
    )
  )
    throw new Error("都市エピローグの記録が一致しません。");
  const active = state.activeEpilogue;
  if (!active) return;
  if (active.kind === "tour_leg") return validateTourLegNarration(state, active);
  const finale = episodes.find(
    (episode) =>
      episode.id === active.episodeId && episode.kind === "city_finale",
  );
  const storyId = activeEpilogueStoryId(active);
  const arrival = active.kind === "arrival";
  if (
    !finale || (!arrival && !finale.epilogueStoryId) ||
    finale.cityId !== state.currentCityId ||
    (!arrival && !state.completedCityIds.includes(finale.cityId) && !isAuthoredEpilogueCity(finale.cityId)) ||
    (arrival && (typeof active.logoComplete !== "boolean" || state.completedCityIds.includes(finale.cityId))) ||
    (!arrival && active.logoComplete !== undefined) ||
    state.activeDate ||
    state.activeTourism ||
    state.activeBattle ||
    !storyId
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
      choiceCount: active.chosenCount ?? 0,
      variables: variables(state),
    },
  );
}

/**
 * A tour leg's narration in progress (tour stage 2b): the narration of the leg whose moment runs now, started at its "leg" part
 * and not yet moved, with no other scene open; its saved Ink as the content reads it (no choices).
 */
function validateTourLegNarration(state: GameState, active: z.infer<typeof activeEpilogueSchema>): void {
  const occasion = state.occasion;
  const tour = occasion?.kind === "tour" && occasion.at === "main:leg" && !occasion.ran.includes("leg_move") ? occasion.tour : undefined;
  const storyId = activeEpilogueStoryId(active);
  if (!storyId || !tour || narrationAt(tourMoment(tour))?.id !== active.episodeId ||
      active.logoComplete !== undefined || active.chosenCount !== undefined || state.activeDate || state.activeTourism || state.activeBattle)
    throw new Error("ツアーの区間の語りの途中データを確認できません。元のデータは保管されています。");
  validateStorySnapshot(storyId, active.storyState, active.frame,
    { playerName: state.playerName, heroineName: state.heroineName, choiceCount: 0, variables: variables(state) });
}
