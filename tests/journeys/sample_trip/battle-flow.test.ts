// The sample journey's battles in the one-flow form (the unified event design, stage 5; fictional content): the game
// answers -> quiz(n) -> and -> reasoning -> with its existing screens, every step saves and resumes (restored from JSON and
// checked with validateGameState) without scoring, recording, rewarding or applying a choice's tags twice, and the
// conversation's choices apply their tags once per battle (decision 10): on its first play, once in a run.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { scenes, stories } from "../../../src/content";
import { fnvHash } from "../../../src/content/fingerprint";
import type { SceneEntry } from "../../../src/content/scene-schemas";
import {
  advanceBattle, answerBattle, battleDialogueStop, chooseBattle, getActiveBattleContent, getReasoningContext, leaveBattle, pressBattleClaim,
  selectReasoningClue, startBattle, submitBattleEvidence, toggleBattleHint,
} from "../../../src/domain/battle";
import { validateGameState, type GameState } from "../../../src/domain/game";
import { cityStart, openBattleScene } from "../../../src/dev/scenario-builders";
import { SAMPLE_JOURNEY_DIRECTORY } from "../../../scripts/content-layout";
import { compileInk } from "../../../scripts/ink-validation";
import { MODULES_FILE, MODULES_INK } from "../../../scripts/modules-ink";
import { readMainFileHead, readPlaceFile } from "../../../scripts/place-files";

const TOWER = "smp_mihon_main_clock_tower_battle";
const MARKET = "smp_mihon_special_b_market";
const LIBRARY = "smp_mihon_special_c_library";
const FINALE = "smp_mihon_finale_battle";

const restore = (state: GameState) => validateGameState(JSON.parse(JSON.stringify(state)));
/** One action, saved and loaded again like the game does (the loaded state equals the saved one). */
function act(state: GameState, change: (current: GameState) => GameState): GameState {
  const next = change(state);
  expect(next, "the action changed nothing").not.toBe(state);
  const loaded = restore(next);
  expect(loaded).toEqual(next);
  return loaded;
}

type Plan = { answers: boolean[]; reasoning?: ("press" | "failure")[] };
/** Play the open battle by a plan to its result screen, saving and loading at every step; the frames' lines in order. */
function play(initial: GameState, plan: Plan): { state: GameState; lines: string[] } {
  let state = initial;
  const lines: string[] = [];
  const actions = [...(plan.reasoning ?? [])];
  for (let step = 0; state.activeBattle!.phase !== "result"; step++) {
    expect(step, "the battle does not end").toBeLessThan(200);
    const active = state.activeBattle!;
    const { battle, quiz } = getActiveBattleContent(active);
    if (active.phase === "dialogue") {
      lines.push(active.frame!.text);
      expect(battleDialogueStop(active)).not.toBe("choices");
      state = act(state, (current) => advanceBattle(current, current.revision));
    } else if (active.phase === "question") {
      const question = quiz.questions[active.roundIndex];
      const right = plan.answers[active.roundIndex];
      const optionId = right ? question.correctOptionId : question.options.find((option) => option.id !== question.correctOptionId)!.id;
      state = act(state, (current) => answerBattle(current, optionId, current.revision));
    } else if (active.phase === "feedback") {
      state = act(state, (current) => advanceBattle(current, current.revision));
    } else {
      const rule = battle.reasoning!;
      const next = actions.shift();
      if (next === "press") { state = act(state, (current) => pressBattleClaim(current, current.revision)); continue; }
      const wrong = rule.caseClueIds.filter((id) => !rule.correctClueIds.includes(id));
      const chosen = next === "failure" ? [wrong[0], ...rule.correctClueIds].slice(0, rule.correctClueIds.length) : rule.correctClueIds;
      for (const id of active.reasoning!.selectedClueIds) state = act(state, (current) => selectReasoningClue(current, id, current.revision));
      for (const id of chosen) state = act(state, (current) => selectReasoningClue(current, id, current.revision));
      state = act(state, (current) => submitBattleEvidence(current, current.revision));
    }
  }
  return { state, lines };
}

/** The battle opened at its place: the finale after the city's three other battles. */
function start(battleId: string): GameState {
  let state = cityStart("mihon");
  if (battleId === FINALE) for (const before of [TOWER, MARKET, LIBRARY]) {
    const { state: played } = play(openBattleScene(state, before), { answers: [true, true, true] });
    state = leaveBattle(played, played.revision);
  }
  return openBattleScene(state, battleId);
}

describe("a battle as one flow (stage 5): the sample's battles", () => {
  it("are in the one-flow form and play to their result through the quiz and reasoning screens", () => {
    for (const battleId of [TOWER, MARKET, LIBRARY, FINALE]) {
      const first = start(battleId);
      const { battle, quiz } = getActiveBattleContent(first.activeBattle!);
      expect(battle.scenes, battleId).toBeUndefined();
      const { state, lines } = play(first, { answers: quiz.questions.map((_, index) => index % 2 === 0) });
      expect(state.activeBattle).toMatchObject({ phase: "result", score: Math.ceil(quiz.questions.length / 2), storyState: null, frame: null });
      expect(state.battleRecords).toContainEqual(expect.objectContaining({ battleId, attempts: 1, firstScore: Math.ceil(quiz.questions.length / 2) }));
      expect(lines.length).toBeGreaterThan(6);
    }
  });

  it("passes each answer to Ink once, as the player leaves its right-or-wrong screen, also after a reload there", () => {
    let state = start(TOWER);
    while (state.activeBattle!.phase === "dialogue") state = act(state, (current) => advanceBattle(current, current.revision));
    const question = getActiveBattleContent(state.activeBattle!).quiz.questions[0];
    expect(state.activeBattle).toMatchObject({ phase: "question", roundIndex: 0, frame: null });
    expect(state.activeBattle!.storyState).not.toBeNull();
    state = act(state, (current) => toggleBattleHint(current, current.revision));
    const answered = act(state, (current) => answerBattle(current, question.correctOptionId, current.revision));
    // A second tap with the old revision changes nothing.
    expect(answerBattle(answered, question.correctOptionId, state.revision)).toBe(answered);
    expect(answered.activeBattle).toMatchObject({ phase: "feedback", score: 1, answers: [expect.objectContaining({ correct: true, hintUsed: true })] });
    const resumed = restore(answered);
    const after = act(resumed, (current) => advanceBattle(current, current.revision));
    expect(after.activeBattle).toMatchObject({ phase: "dialogue", score: 1, turns: 1 });
    expect(after.activeBattle!.frame!.text).toBe("「直さずに、三時のまま残した。……修理代がなかったんだと思ってました」");
    expect(advanceBattle(after, answered.revision)).toBe(after);
  });

  it("drives the special battle's claim, press and evidence, and returns to the stop point after a press or a wrong evidence", () => {
    let state = start(MARKET);
    const enter = (current: GameState) => {
      let next = current;
      while (next.activeBattle!.phase === "dialogue") next = act(next, (s) => advanceBattle(s, s.revision));
      return next;
    };
    state = enter(state);
    state = act(state, (current) => answerBattle(current, "A", current.revision));
    state = act(state, (current) => advanceBattle(current, current.revision));
    const claim: string[] = [];
    while (state.activeBattle!.phase === "dialogue") { claim.push(state.activeBattle!.frame!.text); state = act(state, (s) => advanceBattle(s, s.revision)); }
    expect(claim.at(-1)).toBe("「時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！」");
    expect(state.activeBattle).toMatchObject({ phase: "reasoning", roundIndex: 1,
      reasoning: { statementId: "smp_mihon_special_b_market_claim", pressed: false, status: "selecting", selectedClueIds: [] } });
    expect(getReasoningContext(state)).toEqual({ claimText: claim.at(-1), pressedText: null });
    state = act(state, (current) => pressBattleClaim(current, current.revision));
    expect(state.activeBattle).toMatchObject({ phase: "dialogue", roundIndex: 1, reasoning: { pressed: true } });
    expect(state.activeBattle!.frame!.text).toBe("「誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの」");
    state = enter(state);
    expect(state.activeBattle!.phase).toBe("reasoning");
    expect(getReasoningContext(state)!.pressedText).toBe("「誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの」\n「……一人残らず、ですか。朝市の中にも、時間を計っている人はいませんか」");
    state = act(state, (current) => selectReasoningClue(current, "smp_obs_mihon_market_rain", current.revision));
    state = act(state, (current) => submitBattleEvidence(current, current.revision));
    expect(state.activeBattle!.frame!.text).toBe("「その資料で、誰かが時間を守っていると言える？　わたしの『誰も』は、まだ崩れないわ」");
    state = enter(state);
    expect(state.activeBattle).toMatchObject({ phase: "reasoning", reasoning: { status: "incorrect", submittedClueIds: ["smp_obs_mihon_market_rain"] } });
    state = act(state, (current) => selectReasoningClue(current, "smp_obs_mihon_market_timer", current.revision));
    const submitted = act(state, (current) => submitBattleEvidence(current, current.revision));
    // The evidence never changes the score; a stale second tap changes nothing.
    expect(submitted.activeBattle).toMatchObject({ phase: "dialogue", score: state.activeBattle!.score, reasoning: { status: "accepted" } });
    expect(submitBattleEvidence(submitted, state.revision)).toBe(submitted);
    const question = enter(submitted);
    expect(question.activeBattle).toMatchObject({ phase: "question", roundIndex: 1, reasoning: { status: "accepted" } });
  });

  it("saves and resumes at every step with the same result, records and rewards as a straight play, for B and C", () => {
    const plans: [string, Plan][] = [[MARKET, { answers: [true, false, true], reasoning: ["press", "failure", "press"] }],
      [LIBRARY, { answers: [false, true, true], reasoning: ["failure", "failure"] }]];
    for (const [battleId, plan] of plans) {
      const { state } = play(start(battleId), plan);
      expect(state.activeBattle).toMatchObject({ phase: "result", score: 2 });
      expect(state.battleRecords).toEqual([expect.objectContaining({ battleId, attempts: 1, firstScore: 2, lastScore: 2 })]);
      // The result is recorded once: advancing or leaving with the old revision does nothing.
      expect(advanceBattle(state, state.revision)).toBe(state);
      const left = leaveBattle(state, state.revision);
      expect(leaveBattle(left, state.revision)).toBe(left);
      expect(left.claimedRewardIds.filter((id) => state.claimedRewardIds.includes(id))).toEqual(state.claimedRewardIds);
    }
  });

  it("refuses a save whose story was moved past its quiz without the answer, or whose Ink turns do not match", () => {
    let state = start(TOWER);
    while (state.activeBattle!.phase === "dialogue") state = act(state, (current) => advanceBattle(current, current.revision));
    expect(() => restore({ ...state, activeBattle: { ...state.activeBattle!, turns: 1 } })).toThrow(/バトル会話の位置が一致しません/u);
    expect(() => restore({ ...state, activeBattle: { ...state.activeBattle!, roundIndex: 1 } })).toThrow();
    const first = getActiveBattleContent(state.activeBattle!).quiz.questions[0];
    const answered = act(state, (current) => answerBattle(current, first.correctOptionId, current.revision));
    const after = act(answered, (current) => advanceBattle(current, current.revision));
    // The story has the first answer; a save that still says it is on the right-or-wrong screen is refused.
    expect(() => restore({ ...after, activeBattle: { ...answered.activeBattle!, storyState: after.activeBattle!.storyState } })).toThrow();
    // Ink was told a right answer: a save whose answer is wrong (score 0) is refused.
    const wrong = first.options.find((option) => option.id !== first.correctOptionId)!.id;
    expect(() => restore({ ...after, activeBattle: { ...after.activeBattle!, score: 0,
      answers: [{ ...after.activeBattle!.answers[0], optionId: wrong, correct: false }] } })).toThrow(/保存された会話の条件が一致しません/u);
  });
});

// A conversation's choices in a battle (decision 10): the sample has none, so the tests below give its battles some, in memory.
const placeStory = "places/smp_mihon_clock_tower";
const fileStory = "battles/smp_mihon_special_b_market";
const kept = { place: stories[placeStory], file: stories[fileStory], scenes: [...scenes] };
afterEach(() => {
  stories[placeStory] = kept.place;
  stories[fileStory] = kept.file;
  (scenes as SceneEntry[]).splice(0, scenes.length, ...kept.scenes);
});
const source = (storyId: string) => readFileSync(`${SAMPLE_JOURNEY_DIRECTORY}/stories/${storyId}.ink`, "utf8");

describe("a battle's conversation choices (stage 5, decision 10)", () => {
  it("apply their tags on the battle's first play only, before Ink goes on, and hide or grey as other scenes' choices", () => {
    const written = source(placeStory).replace("\n-> quiz(1) ->\n",
      "\n* [「どうして直したいの？」 # option: ask_why]\n    # rel: trust +2\n    # speaker: enemy\n    「止まったままだと、番人の仕事がない気がして」\n" +
      "* [「先に言い伝えを」 # option: legend_first]\n    # speaker: enemy\n    「では、さっそく」\n- \n-> quiz(1) ->\n");
    stories[placeStory] = compileInk(readPlaceFile(placeStory, written).source, "tower.ink", { [MODULES_FILE]: MODULES_INK });
    const scene = scenes.find((item) => item.id === "smp_mihon_main_clock_tower")!;
    (scenes as SceneEntry[])[scenes.indexOf(scene)] = { ...scene, options: [
      { id: "ask_why", knot: scene.id, rel: { trust: 2 } }, { id: "legend_first", knot: scene.id }] };
    let state = start(TOWER);
    while (battleDialogueStop(state.activeBattle!) !== "choices") state = act(state, (current) => advanceBattle(current, current.revision));
    // A tap does not pass a choice point.
    expect(state.activeBattle!.frame!.choices.map((item) => item.optionId)).toEqual(["ask_why", "legend_first"]);
    expect(advanceBattle(state, state.revision)).toBe(state);
    const choice = state.activeBattle!.frame!.choices.find((item) => item.optionId === "ask_why")!;
    const chosen = act(state, (current) => chooseBattle(current, choice.index, current.revision));
    expect(chosen.trust).toBe(state.trust + 2);
    expect(chosen.activeBattle).toMatchObject({ phase: "dialogue", appliedOptionIds: ["ask_why"], turns: 1 });
    expect(chosen.activeBattle!.frame!.text).toBe("「止まったままだと、番人の仕事がない気がして」");
    // A second tap with the old revision, or a reload, applies nothing more.
    expect(chooseBattle(chosen, choice.index, state.revision)).toBe(chosen);
    const played = play(restore(chosen), { answers: [true, true, true] }).state;
    expect(played.trust).toBe(state.trust + 2);
    // Played again (its result recorded): the same choice applies nothing.
    let again = startBattle(leaveBattle(played, played.revision), TOWER);
    expect(again.activeBattle?.battleId).toBe(TOWER);
    while (battleDialogueStop(again.activeBattle!) !== "choices") again = act(again, (current) => advanceBattle(current, current.revision));
    const replayed = act(again, (current) => chooseBattle(current, choice.index, current.revision));
    expect(replayed.trust).toBe(again.trust);
    expect(replayed.activeBattle!.appliedOptionIds).toEqual([]);
  });

  it("apply a choice's tags once in a run, when the flow comes back to it (a choice after the press)", () => {
    const written = source(fileStory).replace("=== smp_mihon_special_b_market_press ===\n",
      "=== smp_mihon_special_b_market_press ===\n+ [「本当に、一人も？」 # option: doubt]\n    # rel: spark +1\n    # profile: attentive\n- \n");
    stories[fileStory] = compileInk(readMainFileHead(written).source, "market.ink", { [MODULES_FILE]: MODULES_INK });
    (scenes as SceneEntry[]).push({ id: MARKET, kind: "battle", title: "誰も時間を守らない？", cityId: "mihon", story: { storyId: fileStory }, main: { battle: MARKET },
      at: [], order: 0, repeat: "once", people: [], options: [{ id: "doubt", knot: "smp_mihon_special_b_market", rel: { spark: 1 }, profile: "attentive" }],
      done: {}, conds: [], knots: [], fingerprint: fnvHash(stories[fileStory]), origin: "file" });
    let state = start(MARKET);
    const toStop = (current: GameState) => {
      let next = current;
      for (let step = 0; next.activeBattle!.phase !== "reasoning"; step++) {
        expect(step).toBeLessThan(40);
        const active = next.activeBattle!;
        if (active.phase === "question") next = act(next, (s) => answerBattle(s, "A", s.revision));
        else if (battleDialogueStop(active) === "choices")
          next = act(next, (s) => chooseBattle(s, active.frame!.choices[0].index, s.revision, () => 0));
        else next = act(next, (s) => advanceBattle(s, s.revision));
      }
      return next;
    };
    state = toStop(state);
    const trust = state.trust;
    const pressed = act(state, (current) => pressBattleClaim(current, current.revision));
    expect(pressed.activeBattle!.frame!.choices).toEqual([expect.objectContaining({ optionId: "doubt" })]);
    state = toStop(act(state, (current) => pressBattleClaim(current, current.revision)));
    // The reaction profile (decision 39) drew its roll with the choice: a positive reaction's trust +2 or +3.
    expect(state.trust).toBeGreaterThanOrEqual(trust + 2);
    expect(state.activeBattle!.appliedOptionIds).toEqual(["doubt"]);
    const once = { trust: state.trust, spark: state.spark, affection: state.affection };
    state = toStop(act(state, (current) => pressBattleClaim(current, current.revision)));
    expect({ trust: state.trust, spark: state.spark, affection: state.affection }).toEqual(once);
    expect(state.activeBattle!.turns).toBeGreaterThan(4);
  });
});
