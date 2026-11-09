import { z } from "zod";
import { sceneConditionReader } from "./scene-conditions";
import { isEpisodeBlockedByStoryBattle, recordGuideRead, isEpisodeUnlocked } from "./chapter";
import {
  battles,
  episodes,
  landmarks,
  progression,
  tourismClues,
  getCityStoryBackground,
} from "../content";
import { hasObservation } from "../content/tourism-schemas";
import {
  beginStory,
  continueStory,
  storyFingerprint,
  storyFrameSchema,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import { startBattleFromTourism, startVisitBattle } from "./battle";
import type { Availability, GameState } from "./game";
import { validObservationEncounterIds } from "./encounter-state";

export const activeTourismSchema = z
  .object({
    landmarkId: z.string().min(1),
    phase: z.enum(["guide", "exploring"]),
    contentHash: z.string().min(1),
    storyState: z.string().nullable(),
    frame: storyFrameSchema.nullable(),
    /** Encounters already introduced during this observation visit. */
    encounterIds: z.array(z.string().min(1)).optional(),
  })
  .strict();
export type ActiveTourism = z.infer<typeof activeTourismSchema>;

function playerAddress(state: GameState): string {
  const suffix = progression.stages.find(
    (item) => item.stage === state.romanceStage,
  )!.playerSuffix;
  return `${state.playerName}${suffix}`;
}

/** Only the running guide needs a fingerprint. Replacing the image does not invalidate a visit. */
export function tourismFingerprint(landmarkId: string): string {
  const landmark = landmarks.find((item) => item.id === landmarkId);
  if (!landmark) throw new Error("観光地が見つかりません。");
  // A landmark without a guide (stage 2b) has only its observation to resume.
  return landmark.guideStoryId ? `${landmark.guideStoryId}:${storyFingerprint(landmark.guideStoryId)}` : `${landmarkId}:no-guide`;
}

export function activeGuideStoryId(active: ActiveTourism): string | null {
  const current = landmarks.find((item) => item.id === active.landmarkId);
  try { if (current && active.contentHash === tourismFingerprint(active.landmarkId)) return current.guideStoryId ?? null; }
  catch { /* Missing or changed content must not be resumed. */ }
  return null;
}

/** Whether the landmark has a guide to read (re-read) on its visits. */
export function landmarkHasGuide(landmarkId: string): boolean {
  return !!landmarks.find((item) => item.id === landmarkId)?.guideStoryId;
}

/**
 * Whether the landmark's visit can open now. `mapChecked`: the departure from the map already
 * checked when the visit shows on the map (decision 21), so it is not checked again (stage 2b).
 */
export function getTourismAvailability(
  state: GameState,
  landmarkId: string,
  mapChecked = false,
): Availability {
  if (!landmarks.some((item) => item.id === landmarkId && item.cityId === state.currentCityId))
    return { available: false, reason: "観光地が見つかりません。" };
  if (state.activeEncounter)
    return { available: false, reason: "途中の交流を終えてから訪ねられます。" };
  if (state.activeDate || state.activeEpilogue)
    return {
      available: false,
      reason: "途中の恋愛会話を終えてから訪ねられます。",
    };
  if (state.activeTourism && state.activeTourism.landmarkId !== landmarkId)
    return {
      available: false,
      reason: "今の観光画面を閉じてから訪ねられます。",
    };
  if (
    state.activeBattle &&
    battles.find((item) => item.id === state.activeBattle!.battleId)
      ?.landmarkId !== landmarkId
  )
    return { available: false, reason: "今のバトルと同じ観光地へ戻れます。" };
  const episode = mapChecked ? undefined : episodes.find((item) => item.landmarkId === landmarkId);
  if (
    episode &&
    !isEpisodeUnlocked(state, episode) &&
    state.activeBattle?.battleId !== episode.battleId &&
    state.activeTourism?.landmarkId !== landmarkId
  )
    return {
      available: false,
      reason: "先の観光エピソードを終えると訪ねられます。",
    };
  if (
    episode && !state.activeTourism && !state.activeBattle &&
    isEpisodeBlockedByStoryBattle(state, episode)
  ) return { available: false, reason: "先に、旅の途中の対決へ進みましょう。" };
  return { available: true, reason: "" };
}

function fromGuide(active: ActiveTourism, result: StoryStep): ActiveTourism {
  if (result.effects.length || result.frame.choices.length)
    throw new Error("観光案内に恋愛効果や選択肢を含められません。");
  return { ...active, storyState: result.storyState, frame: result.frame };
}

/**
 * Open the landmark's tourism: its guide on the first visit (when it has one), else its
 * observation (when it has one). A landmark with neither opens nothing here (openLandmarkVisit
 * starts its battle at once). `mapChecked`: see getTourismAvailability.
 */
export function openTourism(state: GameState, landmarkId: string, mapChecked = false): GameState {
  if (
    state.activeTourism ||
    !getTourismAvailability(state, landmarkId, mapChecked).available
  )
    return state;
  const landmark = landmarks.find((item) => item.id === landmarkId)!;
  const guide = !state.visitedLandmarkIds.includes(landmarkId) ? landmark.guideStoryId : undefined;
  if (!guide && !hasObservation(landmark)) return state;
  const active: ActiveTourism = {
    landmarkId,
    phase: guide ? "guide" : "exploring",
    contentHash: tourismFingerprint(landmarkId),
    storyState: null,
    frame: null,
  };
  return {
    ...state,
    revision: state.revision + 1,
    // A first visit without a guide is recorded as it opens (the observation needs the record).
    visitedLandmarkIds: guide ? state.visitedLandmarkIds : recordVisit(state, landmarkId),
    activeTourism: !guide
      ? active
      : fromGuide(
          active,
          beginStory(
            guide,
            state.playerName,
            state.heroineName,
            { player_address: playerAddress(state) },
            [], {}, getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state),
          ),
        ),
  };
}

/**
 * Open a visit of the landmark from the map (its main part, stage 2b): the guide (first visit)
 * or the observation as openTourism opens them; with neither, its battle starts at once and the
 * visit is recorded. The map condition is not checked again (`mapChecked`, decision 21).
 */
export function openLandmarkVisit(state: GameState, landmarkId: string, mapChecked: boolean): GameState {
  const opened = openTourism(state, landmarkId, mapChecked);
  if (opened !== state) return opened;
  const landmark = landmarks.find((item) => item.id === landmarkId);
  if (!landmark || state.activeTourism || hasObservation(landmark) ||
      (landmark.guideStoryId && !state.visitedLandmarkIds.includes(landmarkId)) ||
      !getTourismAvailability(state, landmarkId, mapChecked).available) return state;
  const visited = { ...state, visitedLandmarkIds: recordVisit(state, landmarkId) };
  const started = startVisitBattle(visited, landmark.battleId, mapChecked);
  return started === visited ? state : started;
}

function recordVisit(state: GameState, landmarkId: string): string[] {
  return state.visitedLandmarkIds.includes(landmarkId)
    ? state.visitedLandmarkIds
    : [...state.visitedLandmarkIds, landmarkId];
}

export function skipTourismGuide(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeTourism;
  if (
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "guide"
  )
    return state;
  const landmark = landmarks.find((item) => item.id === active.landmarkId);
  // A landmark without an observation goes from its guide straight to its battle (stage 2b).
  if (landmark && !hasObservation(landmark)) {
    const visited = { ...state, activeTourism: null, visitedLandmarkIds: recordVisit(state, active.landmarkId) };
    if (state.activeBattle) return { ...visited, revision: state.revision + 1 };
    const started = startVisitBattle(visited, landmark.battleId, true);
    return started === visited ? state : started;
  }
  return {
    ...state,
    revision: state.revision + 1,
    visitedLandmarkIds: recordVisit(state, active.landmarkId),
    activeTourism: {
      ...active,
      phase: "exploring",
      storyState: null,
      frame: null,
    },
  };
}

export function advanceTourismGuide(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeTourism;
  if (
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "guide" ||
    !active.frame ||
    !active.storyState
  )
    return state;
  if (active.frame.ended) {
    return recordGuideRead(
      skipTourismGuide(state, expectedRevision),
      active.landmarkId,
    );
  }
  const storyId = activeGuideStoryId(active);
  if (!storyId) throw new Error("観光案内の旧版が見つかりません。");
  return {
    ...state,
    revision: state.revision + 1,
    activeTourism: fromGuide(
      active,
      continueStory(storyId, active.storyState, active.frame, [], {}, {}, sceneConditionReader(state)),
    ),
  };
}

/** Re-reading is available after a skip; its reward still has one stable ID. */
export function replayTourismGuide(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeTourism;
  if (
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "exploring"
  )
    return state;
  const landmark = landmarks.find((item) => item.id === active.landmarkId)!;
  if (!landmark.guideStoryId) return state;
  const next = {
    ...active,
    phase: "guide" as const,
    contentHash: tourismFingerprint(active.landmarkId),
  };
  return {
    ...state,
    revision: state.revision + 1,
    activeTourism: fromGuide(
      next,
      beginStory(landmark.guideStoryId, state.playerName, state.heroineName, {
        player_address: playerAddress(state),
      }, [], {}, getCityStoryBackground(state.currentCityId, state.travel.currentPlaceId), sceneConditionReader(state)),
    ),
  };
}

export function closeTourism(
  state: GameState,
  expectedRevision: number,
): GameState {
  if (state.revision !== expectedRevision || !state.activeTourism) return state;
  return { ...state, revision: state.revision + 1, activeTourism: null };
}

/** The clues the observation image marks (ObservationViewer): the landmark's hotspots that have a region. */
export function observationHotspots(landmarkId: string) {
  const clueIds = landmarks.find((item) => item.id === landmarkId)?.clueIds ?? [];
  return clueIds.flatMap((id) => tourismClues.filter((clue) => clue.id === id && clue.kind === "hotspot" && clue.region !== null));
}

/**
 * The documents the clue book lists for reading now (「資料を読む」 on those not yet read): the
 * landmark's documents while its observation is open, none otherwise.
 */
export function getReadableDocumentIds(state: GameState): string[] {
  const active = state.activeTourism;
  if (!active || active.phase !== "exploring") return [];
  return tourismClues.filter((clue) => clue.kind === "document" && clue.landmarkId === active.landmarkId).map((clue) => clue.id);
}

/** What an open observation still lets the player find: its marked hotspots and the documents the clue book offers to read. */
export function getDiscoverableClueIds(state: GameState): string[] {
  const active = state.activeTourism;
  if (!active || active.phase !== "exploring") return [];
  return [...observationHotspots(active.landmarkId).map((clue) => clue.id), ...getReadableDocumentIds(state)]
    .filter((id) => !state.discoveredClueIds.includes(id));
}

/** Hotspots and documentary cards share stable clue IDs; repeated discoveries are harmless. */
export function discoverClue(
  state: GameState,
  clueId: string,
  expectedRevision: number,
): GameState {
  const active = state.activeTourism;
  const clue = tourismClues.find((item) => item.id === clueId);
  if (
    state.revision !== expectedRevision ||
    !active ||
    active.phase !== "exploring" ||
    !clue ||
    clue.landmarkId !== active.landmarkId ||
    state.discoveredClueIds.includes(clueId)
  )
    return state;
  return {
    ...state,
    revision: state.revision + 1,
    discoveredClueIds: [...state.discoveredClueIds, clueId],
  };
}

/** Exploration is optional. Returning from tourism resumes the exact existing battle, never starts it again. */
export function startTourismBattle(
  state: GameState,
  expectedRevision: number,
): GameState {
  const active = state.activeTourism;
  if (state.revision !== expectedRevision || !active) return state;
  const landmark = landmarks.find((item) => item.id === active.landmarkId)!;
  const next = {
    ...state,
    activeTourism: null,
    visitedLandmarkIds: recordVisit(state, active.landmarkId),
  };
  if (state.activeBattle) return { ...next, revision: state.revision + 1 };
  return startBattleFromTourism(state, landmark.battleId);
}

export function validateTourismState(state: GameState): void {
  const knownLandmarks = new Set(landmarks.map((item) => item.id));
  if (state.activeTourism && !validObservationEncounterIds(state.activeTourism.landmarkId, state.activeTourism.encounterIds))
    throw new Error("観光中の出会いの記録が一致しません。");
  if (state.visitedLandmarkIds.some((id) => !knownLandmarks.has(id)))
    throw new Error("訪問した観光地が見つかりません。");
  for (const id of state.discoveredClueIds) {
    const clue = tourismClues.find((item) => item.id === id);
    if (!clue || !state.visitedLandmarkIds.includes(clue.landmarkId))
      throw new Error("手がかりの発見記録が一致しません。");
  }
  const active = state.activeTourism;
  if (!active) return;
  const landmark = landmarks.find((item) => item.id === active.landmarkId);
  if (!landmark || landmark.cityId !== state.currentCityId || state.activeDate || state.activeEpilogue)
    throw new Error("観光の進行状態を確認できません。");
  const episode = episodes.find(
    (item) => item.landmarkId === active.landmarkId,
  );
  // A map condition (`when`) was checked on departing and may have turned false since (decision 21).
  if (episode && !episode.when && !isEpisodeUnlocked(state, episode))
    throw new Error("未解放の観光地の途中記録です。");
  if (active.phase === "exploring" && !hasObservation(landmark))
    throw new Error("観察のない観光地の途中記録です。");
  if (
    state.activeBattle &&
    battles.find((item) => item.id === state.activeBattle!.battleId)
      ?.landmarkId !== active.landmarkId
  )
    throw new Error("観光地と途中のバトルが一致しません。");
  if (active.phase === "guide") {
    const storyId = activeGuideStoryId(active);
    if (
      !storyId ||
      !active.frame ||
      !active.storyState ||
      active.frame.choices.length
    )
      throw new Error(
        "観光案内が更新されたか、途中の案内が一致しません。元のデータは保管されています。",
      );
    validateStorySnapshot(
      storyId!,
      active.storyState,
      active.frame,
      {
        playerName: state.playerName,
        heroineName: state.heroineName,
        choiceCount: 0,
        variables: { player_address: playerAddress(state) },
      },
    );
  } else if (
    !state.visitedLandmarkIds.includes(active.landmarkId) ||
    active.frame !== null ||
    active.storyState !== null
  )
    throw new Error("観察の進行記録が一致しません。");
}
