import { z } from "zod";
import { legacyStoryId, legacyTourism } from "../content/legacy-milano";
import { isEpisodeBlockedByStoryBattle, recordGuideRead, isEpisodeUnlocked } from "./chapter";
import {
  battles,
  episodes,
  landmarks,
  progression,
  tourismClues,
} from "../content";
import {
  beginStory,
  continueStory,
  storyFingerprint,
  storyFrameSchema,
  validateStorySnapshot,
  type StoryStep,
} from "../story/runtime";
import { startBattleFromTourism } from "./battle";
import type { Availability, GameState } from "./game";

export const activeTourismSchema = z
  .object({
    landmarkId: z.string().min(1),
    phase: z.enum(["guide", "exploring"]),
    contentHash: z.string().min(1),
    storyState: z.string().nullable(),
    frame: storyFrameSchema.nullable(),
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
  return `${landmark.guideStoryId}:${storyFingerprint(landmark.guideStoryId)}`;
}

export function activeGuideStoryId(active: ActiveTourism): string | null {
  const current = landmarks.find((item) => item.id === active.landmarkId);
  try { if (current && active.contentHash === tourismFingerprint(active.landmarkId)) return current.guideStoryId; }
  catch { /* The archived guide is checked independently. */ }
  const old = legacyTourism.landmarks.find((item) => item.id === active.landmarkId);
  if (!old) return null;
  const storyId = legacyStoryId(old.guideStoryId);
  return active.contentHash === `${old.guideStoryId}:${storyFingerprint(storyId)}` ? storyId : null;
}

export function getTourismAvailability(
  state: GameState,
  landmarkId: string,
): Availability {
  if (!landmarks.some((item) => item.id === landmarkId))
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
  const episode = episodes.find((item) => item.landmarkId === landmarkId);
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

export function openTourism(state: GameState, landmarkId: string): GameState {
  if (
    state.activeTourism ||
    !getTourismAvailability(state, landmarkId).available
  )
    return state;
  const landmark = landmarks.find((item) => item.id === landmarkId)!;
  const seen = state.visitedLandmarkIds.includes(landmarkId);
  const active: ActiveTourism = {
    landmarkId,
    phase: seen ? "exploring" : "guide",
    contentHash: tourismFingerprint(landmarkId),
    storyState: null,
    frame: null,
  };
  return {
    ...state,
    revision: state.revision + 1,
    activeTourism: seen
      ? active
      : fromGuide(
          active,
          beginStory(
            landmark.guideStoryId,
            state.playerName,
            state.heroineName,
            { player_address: playerAddress(state) },
          ),
        ),
  };
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
      continueStory(storyId, active.storyState, active.frame),
    ),
  };
}

/** Re-reading is available after a skip or a legacy visit; its reward still has one stable ID. */
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
      }),
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
  if (!landmark || state.activeDate || state.activeEpilogue)
    throw new Error("観光の進行状態を確認できません。");
  const episode = episodes.find(
    (item) => item.landmarkId === active.landmarkId,
  );
  if (episode && !isEpisodeUnlocked(state, episode))
    throw new Error("未解放の観光地の途中記録です。");
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
