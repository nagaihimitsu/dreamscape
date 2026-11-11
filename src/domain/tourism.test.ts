import { seedCurrentFreeTime } from "../../tests/fixtures/current-game";
import { describe, expect, it } from "vitest";
import { finalizeBattleProgress } from "./chapter";
import {
  battles,
  landmarks,
  rewardRules,
  tourismClues,
} from "../content";
import {
  createGame,
  setNames,
  startDate,
  validateGameState,
  type GameState,
} from "./game";
import {
  advanceBattle,
  answerBattle,
  getActiveBattleContent,
  leaveBattle,
  startBattle,
} from "./battle";
import {
  advanceTourismGuide,
  closeTourism,
  discoverClue,
  getTourismAvailability,
  openTourism,
  skipTourismGuide,
  startTourismBattle,
} from "./tourism";

const landmarkId = () => landmarks[0].id;
const clues = () =>
  tourismClues.filter((item) => item.landmarkId === landmarkId());
function reload(state: GameState) {
  const restored = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(restored).toEqual(state);
  return restored;
}
function currentEnding(): GameState {
  return validateGameState({ ...createGame(), endingReached: true, confessionStatus: "accepted", playedDateIds: ["milano_confession_01"] });
}
function romance(state: GameState) {
  return {
    playerName: state.playerName,
    heroineName: state.heroineName,
    affection: state.affection,
    trust: state.trust,
    spark: state.spark,
    lastRejectedDateCount: state.lastRejectedDateCount,
    romanceStage: state.romanceStage,
    memories: state.memories,
    playedDateIds: state.playedDateIds,
    activeDate: state.activeDate,
    unlockedEventIds: state.unlockedEventIds,
    confessionStatus: state.confessionStatus,
    endingReached: state.endingReached,
  };
}
function explore(initial = createGame()) {
  const state = openTourism(initial, landmarkId());
  return state.activeTourism?.phase === "guide"
    ? skipTourismGuide(state, state.revision)
    : state;
}

/** Build current battle checkpoints through the public game operations. */
function battleCheckpoint(key: "intro" | "question" | "feedback" | "reaction" | "result"): GameState {
  let state = startBattle(createGame(), landmarks[0].battleId);
  expect(state.activeBattle).not.toBeNull();
  if (key === "intro") return state;
  for (let step = 0; step < 250; step++) {
    const active = state.activeBattle!;
    if (key === "question" && active.phase === "question" && active.roundIndex === 0) return state;
    if (key === "feedback" && active.phase === "feedback" && active.roundIndex === 0) return state;
    if (key === "reaction" && active.phase === "dialogue" && active.answers.length === 1) return state;
    if (key === "result" && active.phase === "result") return state;
    state = active.phase === "question"
      ? answerBattle(state, getActiveBattleContent(active).quiz.questions[active.roundIndex].correctOptionId, state.revision)
      : advanceBattle(state, state.revision);
  }
  throw new Error(`Could not reach current battle checkpoint: ${key}`);
}

describe("optional tourism and discoveries", () => {
  it("reads the short Ink guide and resumes every line without altering romance", () => {
    const before = createGame("航", "澪");
    let state = openTourism(before, landmarkId());
    const lines: string[] = [];
    for (let n = 0; state.activeTourism!.phase === "guide" && n < 30; n++) {
      state = reload(state);
      lines.push(state.activeTourism!.frame!.text);
      const previousRevision = state.revision;
      state = advanceTourismGuide(state, state.revision);
      expect(advanceTourismGuide(state, previousRevision)).toBe(state);
    }
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join("\n")).toMatch(/[ぁ-んァ-ヶ一-龠]/);
    expect(state.activeTourism!.phase).toBe("exploring");
    expect(state.visitedLandmarkIds).toEqual([landmarkId()]);
    expect(romance(state)).toEqual(romance(before));
    expect(state.ap).toBe(
      before.ap + rewardRules.find((rule) => rule.trigger === "guide_read")!.ap,
    );
    expect(reload(state)).toEqual(state);
    state = closeTourism(state, state.revision);
    state = openTourism(state, landmarkId());
    expect(state.activeTourism!.phase).toBe("exploring");
    expect(state.visitedLandmarkIds).toEqual([landmarkId()]);
  });

  it("allows skipping the guide, but never forces observations before battle", () => {
    let state = openTourism(createGame(), landmarkId());
    const before = state;
    state = startTourismBattle(state, state.revision);
    expect(state.activeTourism).toBeNull();
    expect(state.activeBattle!.battleId).toBe(landmarks[0].battleId);
    expect(state.discoveredClueIds).toEqual([]);
    expect(state.visitedLandmarkIds).toEqual([landmarkId()]);
    expect(romance(state)).toEqual(romance(before));
    expect(state.ap).toBe(before.ap);
    expect(startTourismBattle(state, before.revision)).toBe(state);
    expect(reload(state)).toEqual(state);
  });

  it("records hotspots and documentary cards once, survives reload and preserves existing progress", () => {
    const before = currentEnding();
    let state = explore(before);
    expect(clues().some((item) => item.kind === "hotspot")).toBe(true);
    expect(clues().some((item) => item.kind === "document")).toBe(true);
    for (const clue of clues()) {
      const revision = state.revision;
      state = discoverClue(state, clue.id, revision);
      expect(discoverClue(state, clue.id, revision)).toBe(state);
      expect(discoverClue(state, clue.id, state.revision)).toBe(state);
      state = reload(state);
    }
    expect(state.discoveredClueIds).toEqual(clues().map((clue) => clue.id));
    expect(romance(state)).toEqual(romance(before));
    state = closeTourism(state, state.revision);
    expect(discoverClue(state, clues()[0].id, state.revision)).toBe(state);
    state = reload(openTourism(state, landmarkId()));
    expect(state.discoveredClueIds).toHaveLength(clues().length);
  });

  it("rejects unknown, stale, guide-time and out-of-visit discoveries", () => {
    const initial = createGame();
    expect(openTourism(initial, "missing")).toBe(initial);
    expect(discoverClue(initial, clues()[0].id, initial.revision)).toBe(
      initial,
    );
    let state = openTourism(initial, landmarkId());
    expect(discoverClue(state, clues()[0].id, state.revision)).toBe(state);
    expect(openTourism(state, landmarkId())).toBe(state);
    state = skipTourismGuide(state, state.revision);
    expect(skipTourismGuide(state, state.revision)).toBe(state);
    expect(discoverClue(state, "missing", state.revision)).toBe(state);
    expect(discoverClue(state, clues()[0].id, state.revision - 1)).toBe(state);
    expect(closeTourism(state, state.revision - 1)).toBe(state);
  });

  it("blocks overlapping romance, names and rewards while allowing visits after the romance ending", () => {
    const fresh = explore();
    // A tourism scene holds no battle, so no battle result can be recorded or paid from it.
    expect(fresh.activeTourism).not.toBeNull();
    expect(fresh.activeBattle).toBeNull();
    expect(finalizeBattleProgress(fresh)).toBe(fresh);
    expect(setNames(fresh, "違う", "名前")).toBe(fresh);
    expect(startBattle(fresh, battles[0].id)).toBe(fresh);
    const state = explore(seedCurrentFreeTime(createGame()));
    expect(startDate(state, "milano_cafe_01")).toBe(state);
    const dating = startDate(seedCurrentFreeTime(createGame()), "milano_cafe_01", () => 0);
    expect(dating.activeDate).not.toBeNull();
    expect(getTourismAvailability(dating, landmarkId()).available).toBe(false);
    expect(openTourism(dating, landmarkId())).toBe(dating);
    const ended = currentEnding();
    expect(getTourismAvailability(ended, landmarkId()).available).toBe(true);
    expect(explore(ended).endingReached).toBe(true);
  });
});

describe("tourism temporarily suspends the current battle", () => {
  it.each(["intro", "question", "feedback", "reaction", "result"] as const)(
    "preserves the current %s checkpoint through visit, discovery and return",
    (key) => {
      const before = battleCheckpoint(key);
      const battle = structuredClone(before.activeBattle);
      let state = explore(before);
      expect(advanceBattle(state, state.revision)).toBe(state);
      expect(answerBattle(state, "A", state.revision)).toBe(state);
      expect(leaveBattle(state, state.revision)).toBe(state);
      state = discoverClue(state, clues()[0].id, state.revision);
      state = reload(state);
      expect(state.activeBattle).toEqual(battle);
      expect(state.battleRecords).toEqual(before.battleRecords);
      state = startTourismBattle(state, state.revision);
      expect(state.activeTourism).toBeNull();
      expect(state.activeBattle).toEqual(battle);
      expect(state.battleRecords).toEqual(before.battleRecords);
      expect(romance(state)).toEqual(romance(before));
      expect(reload(state)).toEqual(state);
    },
  );

  it("returning via close keeps the locked answer and a later round scores normally", () => {
    const before = battleCheckpoint("feedback");
    let state = explore(before);
    state = closeTourism(state, state.revision);
    expect(state.activeBattle).toEqual(before.activeBattle);
    expect(answerBattle(state, "A", state.revision)).toBe(state);
    while (state.activeBattle!.phase !== "question")
      state = advanceBattle(state, state.revision);
    expect(state.activeBattle!.roundIndex).toBe(1);
    // A current in-progress battle continues against its matching quiz.
    const { quiz } = getActiveBattleContent(state.activeBattle!);
    state = answerBattle(
      state,
      quiz.questions[1].correctOptionId,
      state.revision,
    );
    expect(state.activeBattle!.score).toBe(2);
    expect(state.activeBattle!.answers).toHaveLength(2);
    expect(reload(state)).toEqual(state);
  });
});
