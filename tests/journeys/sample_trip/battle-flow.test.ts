// The sample journey's battles, each one flow (the unified event design, stage 5; fictional content): the game
// answers -> quiz(n) -> and -> reasoning -> with its existing screens, every step saves and resumes (restored from JSON and
// checked with validateGameState) without scoring, recording, rewarding or applying a choice's tags twice, and the
// conversation's choices apply their tags once per battle (decision 10): on its first play, once in a run.
import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { battles, presentation, scenes, stories } from "../../../src/content";
import { fnvHash } from "../../../src/content/fingerprint";
import type { SceneEntry, SceneOption } from "../../../src/content/scene-schemas";
import {
  advanceBattle, answerBattle, battleChrome, battleDialogueStop, chooseBattle, getActiveBattleContent, getReasoningContext, leaveBattle, pressBattleClaim,
  selectReasoningClue, startBattle, submitBattleEvidence,
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
  it("play to their result through the quiz and reasoning screens", () => {
    for (const battleId of [TOWER, MARKET, LIBRARY, FINALE]) {
      const first = start(battleId);
      const { quiz } = getActiveBattleContent(first.activeBattle!);
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
    const answered = act(state, (current) => answerBattle(current, question.correctOptionId, current.revision));
    // A second tap with the old revision changes nothing.
    expect(answerBattle(answered, question.correctOptionId, state.revision)).toBe(answered);
    expect(answered.activeBattle).toMatchObject({ phase: "feedback", score: 1, answers: [expect.objectContaining({ correct: true, hintUsed: false })] });
    const resumed = restore(answered);
    const after = act(resumed, (current) => advanceBattle(current, current.revision));
    expect(after.activeBattle).toMatchObject({ phase: "dialogue", score: 1, turns: 1 });
    expect(after.activeBattle!.frame!.text).toBe("直さずに、三時のまま残した。……修理代がなかったんだと思ってました");
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
    expect(claim.at(-1)).toBe("時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！");
    expect(state.activeBattle).toMatchObject({ phase: "reasoning", roundIndex: 1,
      reasoning: { statementId: "smp_mihon_special_b_market_claim", pressed: false, status: "selecting", selectedClueIds: [] } });
    expect(getReasoningContext(state)).toEqual({ claimText: claim.at(-1), pressedText: null });
    state = act(state, (current) => pressBattleClaim(current, current.revision));
    expect(state.activeBattle).toMatchObject({ phase: "dialogue", roundIndex: 1, reasoning: { pressed: true } });
    expect(state.activeBattle!.frame!.text).toBe("誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの");
    state = enter(state);
    expect(state.activeBattle!.phase).toBe("reasoning");
    expect(getReasoningContext(state)!.pressedText).toBe("誰も、よ。だから焼きたてを出しても、いつも冷めてから売れるの\n……一人残らず、ですか。朝市の中にも、時間を計っている人はいませんか");
    state = act(state, (current) => selectReasoningClue(current, "smp_obs_mihon_market_rain", current.revision));
    state = act(state, (current) => submitBattleEvidence(current, current.revision));
    expect(state.activeBattle!.frame!.text).toBe("その資料で、誰かが時間を守っていると言える？　わたしの『誰も』は、まだ崩れないわ");
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
    expect(() => restore({ ...state, activeBattle: { ...state.activeBattle!, turns: 1 } })).toThrow(/クイズの会話の位置が一致しません/u);
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
    // The answers and the quizzes Ink has called go together: a wrong answer added before any quiz, or one taken away at the next
    // quiz's call, is refused (the variables alone match a wrong answer's defaults).
    const opening = start(TOWER);
    const forged = { questionId: first.id, optionId: wrong, correct: false, hintUsed: false };
    expect(() => restore({ ...opening, activeBattle: { ...opening.activeBattle!, answers: [forged] } })).toThrow(/保存された回答と会話の位置が一致しません/u);
    let atCall = act(state, (current) => answerBattle(current, wrong, current.revision));
    atCall = act(atCall, (current) => advanceBattle(current, current.revision));
    while (battleDialogueStop(atCall.activeBattle!) !== "quiz") atCall = act(atCall, (current) => advanceBattle(current, current.revision));
    expect(() => restore({ ...atCall, activeBattle: { ...atCall.activeBattle!, answers: [], roundIndex: 0 } })).toThrow(/保存された回答と会話の位置が一致しません/u);
  });
});

// A conversation's choices in a battle (decision 10): the sample has none, so the tests below give its battles some, in memory.
const placeStory = "places/smp_mihon_clock_tower";
/** The market's place file: its guide and its special battle B (a place file's battle knot). */
const marketStory = "places/smp_mihon_market";
/** The market's battle as a one-scene file (a form the build still accepts), made in memory from its knot (marketAsFile). */
const fileStory = "battles/smp_mihon_special_b_market";
const marketBattle = battles.find((battle) => battle.id === MARKET)!;
const kept = { place: stories[placeStory], market: stories[marketStory], marketStoryId: marketBattle.storyId, scenes: [...scenes] };
afterEach(() => {
  stories[placeStory] = kept.place;
  stories[marketStory] = kept.market;
  delete stories[fileStory];
  marketBattle.storyId = kept.marketStoryId;
  (scenes as SceneEntry[]).splice(0, scenes.length, ...kept.scenes);
});
const source = (storyId: string) => readFileSync(`${SAMPLE_JOURNEY_DIRECTORY}/stories/${storyId}.ink`, "utf8");
/** The market's battle knot as a one-scene file: `INCLUDE modules.ink`, the knot's lines (without its # scene:), then its helper knots. */
const marketAsFile = (change: (text: string) => string) => {
  const text = source(marketStory);
  const body = text.slice(text.indexOf(`=== ${MARKET} ===\n`)).split("\n").slice(1).filter((line) => !/^\s*#\s*scene\s*:/u.test(line));
  return change(["INCLUDE modules.ink", ...body].join("\n"));
};
/** Play the market's battle from the one-scene file `written`: the battle points at the file, whose scene (its choices) replaces the knot's. */
function useMarketFile(written: string, options: SceneOption[]) {
  stories[fileStory] = compileInk(readMainFileHead(written).source, "market.ink", { [MODULES_FILE]: MODULES_INK });
  marketBattle.storyId = fileStory;
  (scenes as SceneEntry[])[scenes.findIndex((item) => item.id === MARKET)] = { id: MARKET, kind: "battle", title: "誰も時間を守らない？", cityId: "mihon",
    story: { storyId: fileStory }, main: { battle: MARKET }, at: [], order: 0, repeat: "once", people: [], options, done: {}, conds: [], knots: [],
    fingerprint: fnvHash(stories[fileStory]), origin: "file" };
}

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

  it("give an item from a battle's choice, and the save records it and loads (a place file's battle knot)", () => {
    const written = source(placeStory).replace("\n-> quiz(1) ->\n",
      "\n* [「これ、三時のしおり」 # option: give_bookmark]\n    # give: smp_mihon_three_bookmark heroine\n    # speaker: enemy\n    「妹のしおりだ」\n" +
      "* [「先に言い伝えを」 # option: legend_first]\n- \n-> quiz(1) ->\n");
    stories[placeStory] = compileInk(readPlaceFile(placeStory, written).source, "tower.ink", { [MODULES_FILE]: MODULES_INK });
    const scene = scenes.find((item) => item.id === "smp_mihon_main_clock_tower")!;
    (scenes as SceneEntry[])[scenes.indexOf(scene)] = { ...scene, options: [
      { id: "give_bookmark", knot: scene.id, give: { item: "smp_mihon_three_bookmark", to: "heroine" } }, { id: "legend_first", knot: scene.id }] };
    const holding = restore({ ...cityStart("mihon"), inventory: { smp_mihon_three_bookmark: "held" },
      completedEncounterIds: ["smp_mihon_bookmark_stall"], seenEncounterIds: ["smp_mihon_bookmark_stall"] });
    let state = openBattleScene(holding, TOWER);
    while (battleDialogueStop(state.activeBattle!) !== "choices") state = act(state, (current) => advanceBattle(current, current.revision));
    const give = state.activeBattle!.frame!.choices.find((item) => item.optionId === "give_bookmark")!;
    const given = act(state, (current) => chooseBattle(current, give.index, current.revision));
    expect(given.inventory.smp_mihon_three_bookmark).toBe("gifted");
    expect(given.itemUses.smp_mihon_three_bookmark).toEqual({ encounterId: "smp_mihon_main_clock_tower", optionId: "give_bookmark" });
    // Saved and loaded during the battle (act) and after its result and leaving it.
    const done = play(given, { answers: [true, true, true] }).state;
    expect(restore(leaveBattle(done, done.revision)).itemUses.smp_mihon_three_bookmark.optionId).toBe("give_bookmark");
  });

  it("refuse a save whose battle choice gave or used an item it did not (a place file's battle knot and a one-scene battle)", () => {
    const bookmark = "smp_mihon_three_bookmark";
    const holding = restore({ ...cityStart("mihon"), inventory: { [bookmark]: "held" },
      completedEncounterIds: ["smp_mihon_bookmark_stall"], seenEncounterIds: ["smp_mihon_bookmark_stall"] });
    const given = (state: GameState, encounterId: string, optionId: string): GameState =>
      ({ ...state, inventory: { ...state.inventory, [bookmark]: "gifted" }, itemUses: { [bookmark]: { encounterId, optionId } } });
    const refused = /品物を渡した・使った記録が一致しません/u;
    // The tower battle (a place file's battle knot) with a choice that gives the bookmark.
    stories[placeStory] = compileInk(readPlaceFile(placeStory, source(placeStory).replace("\n-> quiz(1) ->\n",
      "\n* [「これ、三時のしおり」 # option: give_bookmark]\n    # give: smp_mihon_three_bookmark heroine\n" +
      "* [「先に言い伝えを」 # option: legend_first]\n- \n-> quiz(1) ->\n")).source, "tower.ink", { [MODULES_FILE]: MODULES_INK });
    const tower = scenes.find((item) => item.id === "smp_mihon_main_clock_tower")!;
    (scenes as SceneEntry[])[scenes.indexOf(tower)] = { ...tower, options: [
      { id: "give_bookmark", knot: tower.id, give: { item: bookmark, to: "heroine" } }, { id: "legend_first", knot: tower.id }] };
    let running = openBattleScene(holding, TOWER);
    while (battleDialogueStop(running.activeBattle!) !== "choices") running = act(running, (current) => advanceBattle(current, current.revision));
    // Running, but the choice not applied in this run; no run and no result.
    expect(() => restore(given(running, tower.id, "give_bookmark"))).toThrow(refused);
    expect(() => restore(given(holding, tower.id, "give_bookmark"))).toThrow(refused);
    // Played once (without giving): its first play might have given it.
    const legend = running.activeBattle!.frame!.choices.find((item) => item.optionId === "legend_first")!;
    const played = play(act(running, (current) => chooseBattle(current, legend.index, current.revision)), { answers: [true, true, true] }).state;
    expect(restore(given(leaveBattle(played, played.revision), tower.id, "give_bookmark")).itemUses[bookmark].optionId).toBe("give_bookmark");
    // The market battle as a one-scene battle file (made from its knot) with a choice that gives the bookmark: the same rule.
    useMarketFile(marketAsFile((text) => text.replace("\n-> quiz(1) ->\n",
      "\n* [「このしおり、どうぞ」 # option: give_bookmark_market]\n    # give: smp_mihon_three_bookmark heroine\n" +
      "* [「先にパンの話を」 # option: bread_first]\n- \n-> quiz(1) ->\n")), [{ id: "give_bookmark_market", knot: MARKET, give: { item: bookmark, to: "heroine" } },
      { id: "bread_first", knot: MARKET }]);
    expect(() => restore(given(holding, MARKET, "give_bookmark_market"))).toThrow(refused);
    let market = openBattleScene(holding, MARKET);
    while (battleDialogueStop(market.activeBattle!) !== "choices") market = act(market, (current) => advanceBattle(current, current.revision));
    expect(() => restore(given(market, MARKET, "give_bookmark_market"))).toThrow(refused);
    const give = market.activeBattle!.frame!.choices.find((item) => item.optionId === "give_bookmark_market")!;
    const gave = act(market, (current) => chooseBattle(current, give.index, current.revision));
    expect(gave.itemUses[bookmark]).toEqual({ encounterId: MARKET, optionId: "give_bookmark_market" });
    expect(gave.activeBattle!.appliedOptionIds).toEqual(["give_bookmark_market"]);
    // A run records each applied choice once, among its choices (turns), and a replay records none before its result.
    const forged = /保存された選択の記録が一致しません/u;
    expect(() => restore({ ...gave, activeBattle: { ...gave.activeBattle!, appliedOptionIds: ["give_bookmark_market", "bread_first"] } })).toThrow(forged);
    // Another battle's result is not this battle's: a first play after the tower's result still applies and loads, and a gift
    // the market never gave is still refused.
    const towerDone = leaveBattle(played, played.revision);
    expect(() => restore(given(towerDone, MARKET, "give_bookmark_market"))).toThrow(refused);
    let afterTower = openBattleScene(towerDone, MARKET);
    while (battleDialogueStop(afterTower.activeBattle!) !== "choices") afterTower = act(afterTower, (current) => advanceBattle(current, current.revision));
    const gaveAfterTower = act(afterTower, (current) => chooseBattle(current, give.index, current.revision));
    expect(gaveAfterTower.activeBattle!.appliedOptionIds).toEqual(["give_bookmark_market"]);
    let replay = startBattle(leaveBattle(played, played.revision), TOWER);
    while (battleDialogueStop(replay.activeBattle!) !== "choices") replay = act(replay, (current) => advanceBattle(current, current.revision));
    replay = act(replay, (current) => chooseBattle(current, legend.index, current.revision));
    expect(replay.activeBattle!.appliedOptionIds).toEqual([]);
    expect(() => restore({ ...replay, activeBattle: { ...replay.activeBattle!, appliedOptionIds: ["legend_first"] } })).toThrow(forged);
    // The first play keeps its record to its result (and the replay's result screen too).
    expect(play(replay, { answers: [true, true, true] }).state.activeBattle!.phase).toBe("result");
  });

  it("apply a choice's tags once in a run, when the flow comes back to it (a choice after the press)", () => {
    const written = source(marketStory).replace("=== smp_mihon_special_b_market_press ===\n",
      "=== smp_mihon_special_b_market_press ===\n+ [「本当に、一人も？」 # option: doubt]\n    # rel: spark +1\n    # profile: attentive\n- \n");
    stories[marketStory] = compileInk(readPlaceFile(marketStory, written).source, "market.ink", { [MODULES_FILE]: MODULES_INK });
    // The market's battle knot (a place file's): its scene's option is the choice in the press, its helper knot.
    const market = scenes.find((item) => item.id === MARKET)!;
    (scenes as SceneEntry[])[scenes.indexOf(market)] = { ...market, options: [
      { id: "doubt", knot: "smp_mihon_special_b_market_press", rel: { spark: 1 }, profile: "attentive" }] };
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

// What the battle screen shows around the claim: the 「次へ進む」 at the end of the part before the claim, the upcoming
// question in the clue book while the claim plays, the clue book in the header at the stop point, and a rebuttal that
// hides the clue book.
describe("a special battle's claim and rebuttal on the battle screen (stage 5)", () => {
  type Seen = { text: string; part?: string; sceneEnd?: true; round: number; chrome: ReturnType<typeof battleChrome> };
  /** Play to the first stop point (right answers), saving and loading at every step; every line with its marks. */
  function toStop(battleId: string): { state: GameState; seen: Seen[] } {
    let state = start(battleId);
    const seen: Seen[] = [];
    for (let step = 0; state.activeBattle!.phase !== "reasoning"; step++) {
      expect(step).toBeLessThan(80);
      const active = state.activeBattle!;
      const { battle, quiz } = getActiveBattleContent(active);
      if (active.phase === "dialogue") {
        seen.push({ text: active.frame!.text, ...(active.linePart ? { part: active.linePart } : {}), ...(active.sceneEnd ? { sceneEnd: true as const } : {}),
          round: active.roundIndex, chrome: battleChrome(active, battle) });
        // A scene's end is where the next line says it is: a save that moves it is refused.
        const { sceneEnd: _end, ...unmarked } = active;
        if (active.sceneEnd) expect(() => restore({ ...state, activeBattle: unmarked })).toThrow(/クイズの会話の位置が一致しません/u);
        else if (!battleDialogueStop(active).match(/quiz|reasoning|end/u))
          expect(() => restore({ ...state, activeBattle: { ...active, sceneEnd: true } })).toThrow(/クイズの会話の位置が一致しません/u);
        state = act(state, (current) => advanceBattle(current, current.revision));
      } else if (active.phase === "question") state = act(state, (current) => answerBattle(current, quiz.questions[active.roundIndex].correctOptionId, current.revision));
      else state = act(state, (current) => advanceBattle(current, current.revision));
    }
    return { state, seen };
  }
  const advance = (label: string, testId = "battle-advance") => ({ label, testId });

  it("ends the part before the claim with 「次へ進む」, and shows the upcoming question while the claim plays (B and C)", () => {
    for (const [battleId, round, claimLine] of [[MARKET, 1, "時計が止まってから、この街では誰も時間を守らなくなった。一人残らず、よ！"],
      [LIBRARY, 2, undefined]] as const) {
      const { state, seen } = toStop(battleId);
      const claim = seen.filter((line) => line.part === "claim");
      expect(claim.length, battleId).toBeGreaterThan(0);
      if (claimLine) expect(claim.map((line) => line.text)).toEqual([claimLine]);
      const before = seen[seen.indexOf(claim[0]) - 1];
      // The last line before the claim ends its part: 「次へ進む」, and the auto-advance stops there.
      expect(before).toMatchObject({ sceneEnd: true, round: round - 1, chrome: { advance: advance("次へ進む"), notebookTab: true } });
      expect(seen.filter((line) => line.sceneEnd)).toEqual([before]);
      // The claim's lines: the reasoning's round (the clue book's question is the one the proof leads to), its last line ends the part.
      for (const line of claim) expect(line).toMatchObject({ round, chrome: { rebuttal: false, notebookTab: true } });
      expect(claim.at(-1)!.chrome.advance).toEqual(advance("次へ進む"));
      // The sample has no rebuttal.
      expect(seen.some((line) => line.part === "rebuttal")).toBe(false);
      // At the stop point the clue book is in the header (as at every question: the quiz card has none of its own).
      const stop = state.activeBattle!;
      expect(battleChrome(stop, getActiveBattleContent(stop).battle).notebookTab, battleId).toBe(true);
    }
  });

  it("plays a rebuttal after the claim, saved line by line, without the clue book", () => {
    const written = source(marketStory).replace("-> smp_mihon_special_b_market_claim ->\n",
      "-> smp_mihon_special_b_market_claim ->\n# background: smp_bg_mihon_market\n# speaker: heroine\n「待って。一人残らず、ですか」\n「確かめてみましょう」\n");
    stories[marketStory] = compileInk(readPlaceFile(marketStory, written).source, "market.ink", { [MODULES_FILE]: MODULES_INK });
    const { seen } = toStop(MARKET);
    const claim = seen.filter((line) => line.part === "claim");
    const rebuttal = seen.filter((line) => line.part === "rebuttal");
    expect(rebuttal.map((line) => line.text)).toEqual(["「待って。一人残らず、ですか」", "「確かめてみましょう」"]);
    // The claim ends its part before the rebuttal.
    expect(claim.at(-1)).toMatchObject({ sceneEnd: true, chrome: { advance: advance("次へ進む"), notebookTab: true } });
    // The rebuttal's last line, before the stop point, ends it.
    const chrome = { rebuttal: true, choosing: false, notebookTab: false };
    expect(rebuttal[0]).toEqual({ text: rebuttal[0].text, part: "rebuttal", round: 1, chrome: { ...chrome, advance: null } });
    expect(rebuttal[1]).toEqual({ text: rebuttal[1].text, part: "rebuttal", round: 1, chrome: { ...chrome, advance: advance("次へ進む", "reasoning-rebuttal-advance") } });
  });
});

// The clue book's claim and press (stage 5): read with the names, memories and items, as the flow reads them, and never
// stopping the screen. The market's special battle B (a knot of its place file), with names in its claim and press; the
// file's afterEach above puts the market's story back.
describe("the clue book's claim and press (stage 5)", () => {
  const named = source(marketStory)
    .replace(/(=== \w*_claim ===\n(?:#[^\n]*\n)*)/u, "$1「{player_name}さん、{heroine_name}さん、聞きなさい」\n");
  const compile = (written: string) => compileInk(readPlaceFile(marketStory, written).source, "market.ink", { [MODULES_FILE]: MODULES_INK });
  // The sample declares no memories: the claim reads one registered for these tests only.
  const memoryId = "smp_test_claim_memory";
  beforeAll(() => {
    presentation.memories[memoryId] = { titleJa: "テストの思い出", descriptionJa: "主張が思い出を読むかを確かめるためだけの思い出。" };
  });
  afterAll(() => {
    delete presentation.memories[memoryId];
  });
  /** Play the market's B to its stop point, press, and read the clue book's claim and press. */
  function clueBook(): { claimText: string; pressedText: string | null } {
    let state = openBattleScene(cityStart("mihon", ["たいち", "あゆみ"]), MARKET);
    for (let step = 0; state.activeBattle!.phase !== "reasoning"; step++) {
      expect(step).toBeLessThan(80);
      const active = state.activeBattle!;
      state = active.phase === "question" ? act(state, (current) => answerBattle(current, "A", current.revision)) : act(state, (current) => advanceBattle(current, current.revision));
    }
    return getReasoningContext(act(state, (current) => pressBattleClaim(current, current.revision)))!;
  }

  it("shows the claim and press with the names", () => {
    expect(named).toContain("{player_name}さん、{heroine_name}さん");
    const withPressName = named.replace(/(=== \w*_press ===\n(?:#[^\n]*\n)*)/u, "$1「{heroine_name}さんも、そう思うだろう」\n");
    stories[marketStory] = compile(withPressName);
    const { claimText, pressedText } = clueBook();
    expect(claimText).toContain("「たいちさん、あゆみさん、聞きなさい」");
    expect(pressedText).toContain("「あゆみさんも、そう思うだろう」");
  });

  it("reads the claim with the player's memories, as the flow reads it", () => {
    const line = "「あの店の音を、まだ覚えているか」";
    // A place file's top is its two lines: the declaration goes in the knot (Ink reads it anywhere).
    const remembering = named
      .replace(/(=== \w*_claim ===\n(?:#[^\n]*\n)*)/u, `$1EXTERNAL has_memory(memory_id)\n{ has_memory("${memoryId}"): ${line} }\n`);
    stories[marketStory] = compile(remembering);
    for (const memories of [[], [memoryId]]) {
      const opened = openBattleScene(cityStart("mihon"), MARKET);
      let state: GameState = { ...opened, memories };
      const lines: string[] = [];
      for (let step = 0; state.activeBattle!.phase !== "reasoning"; step++) {
        expect(step).toBeLessThan(80);
        const active = state.activeBattle!;
        if (active.phase === "dialogue") lines.push(active.frame!.text);
        state = active.phase === "question" ? answerBattle(state, "A", state.revision) : advanceBattle(state, state.revision);
      }
      const { claimText } = getReasoningContext(state)!;
      expect(claimText.split("\n").includes(line), `memories ${JSON.stringify(memories)}`).toBe(memories.length > 0);
      // The clue book's claim is what the flow showed in its claim.
      expect(lines.includes(line)).toBe(memories.length > 0);
      expect(claimText.split("\n").every((text) => lines.includes(text))).toBe(true);
    }
  });

  it("never stops the screen when a claim reaches a choice or errors (content:build stops such a knot)", () => {
    stories[marketStory] = compile(named.replace(/(=== \w*_claim ===\n(?:#[^\n]*\n)*)/u, "$1「まず聞こう」\n* [「はい」]\n- \n"));
    const state = openBattleScene(cityStart("mihon"), MARKET);
    expect(getReasoningContext(state)).toEqual({ claimText: "「まず聞こう」", pressedText: null });
    // A claim that stops with an error (here a condition not in the scene conditions): the clue book shows no claim.
    stories[marketStory] = compile(named.replace(/(=== \w*_claim ===\n(?:#[^\n]*\n)*)/u, "$1{cond(\"dreamscape_unknown\"): 「x」}\n"));
    expect(getReasoningContext(openBattleScene(cityStart("mihon"), MARKET))).toEqual({ claimText: "", pressedText: null });
  });
});
