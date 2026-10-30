import { describe, expect, it } from "vitest";
import { battles, battleQuizzes, landmarks, tourismClues } from "../content";
import {
  claimTrialMilestone,
  completeChapter,
  createGame,
  grantRewardOnce,
  setNames,
  startDate,
  validateGameState,
  type GameState,
} from "./game";
import {
  advanceBattle,
  answerBattle,
  leaveBattle,
  startBattle,
  toggleBattleHint,
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
import phase2 from "../../tests/fixtures/phase2-saves.json";
import phase3 from "../../tests/fixtures/phase3-saves.json";

const landmarkId = () => landmarks[0].id;
const clues = () =>
  tourismClues.filter((item) => item.landmarkId === landmarkId());
function reload(state: GameState) {
  const restored = validateGameState(JSON.parse(JSON.stringify(state)));
  expect(restored).toEqual(state);
  return restored;
}
function romance(state: GameState) {
  const {
    revision: _r,
    activeTourism: _t,
    discoveredClueIds: _c,
    visitedLandmarkIds: _v,
    activeBattle: _b,
    battleRecords: _br,
    ...rest
  } = state;
  return rest;
}
function explore(initial = createGame()) {
  const state = openTourism(initial, landmarkId());
  return state.activeTourism?.phase === "guide"
    ? skipTourismGuide(state, state.revision)
    : state;
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
    expect(startTourismBattle(state, before.revision)).toBe(state);
    expect(reload(state)).toEqual(state);
  });

  it("records hotspots and documentary cards once, survives reload and preserves existing progress", () => {
    const before = validateGameState(phase2.ending);
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
    expect(completeChapter(fresh)).toBe(fresh);
    expect(grantRewardOnce(fresh, "unexpected", 4)).toBe(fresh);
    expect(setNames(fresh, "違う", "名前")).toBe(fresh);
    expect(startBattle(fresh, battles[0].id)).toBe(fresh);
    const state = explore(completeChapter(createGame()));
    expect(startDate(state, "milano_cafe_01")).toBe(state);
    expect(claimTrialMilestone(state, "trial_after_cafe")).toBe(state);
    const dating = validateGameState(phase2.activeDate);
    expect(getTourismAvailability(dating, landmarkId()).available).toBe(false);
    expect(openTourism(dating, landmarkId())).toBe(dating);
    const ended = validateGameState(phase2.ending);
    expect(getTourismAvailability(ended, landmarkId()).available).toBe(true);
    expect(explore(ended).endingReached).toBe(true);
  });
});

describe("tourism temporarily suspends the current battle", () => {
  it.each(["intro", "question", "feedback", "reaction", "result"] as const)(
    "preserves the exact Phase 3 %s checkpoint through visit, discovery and return",
    (key) => {
      const before = validateGameState(phase3[key]);
      const battle = structuredClone(before.activeBattle);
      let state = explore(before);
      expect(advanceBattle(state, state.revision)).toBe(state);
      expect(answerBattle(state, "A", state.revision)).toBe(state);
      expect(toggleBattleHint(state, state.revision)).toBe(state);
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
    const before = validateGameState(phase3.feedback);
    let state = explore(before);
    state = closeTourism(state, state.revision);
    expect(state.activeBattle).toEqual(before.activeBattle);
    expect(answerBattle(state, "A", state.revision)).toBe(state);
    while (state.activeBattle!.phase !== "question")
      state = advanceBattle(state, state.revision);
    expect(state.activeBattle!.roundIndex).toBe(1);
    const battle = battles.find(
      (item) => item.id === state.activeBattle!.battleId,
    )!;
    state = answerBattle(
      state,
      battleQuizzes[battle.quizId].questions[1].correctOptionId,
      state.revision,
    );
    expect(state.activeBattle!.score).toBe(2);
    expect(state.activeBattle!.answers).toHaveLength(2);
    expect(reload(state)).toEqual(state);
  });
});
