import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { completedDateCount, createGame, validateGameState, type GameState } from "./game";
import { compileInk } from "../../scripts/ink-validation";
import { encounters } from "../content/encounters";
import type { EncounterDefinition } from "../content/encounter-schemas";
import { responseProfiles, sceneConditions, stories } from "../content";
import { sceneConditionTruths } from "./scene-conditions";
import { finishEpisode } from "../dev/scenario-builders";
import { loadGame, saveGame, type StorageLike } from "../persistence";
import { startTourismEncounter, chooseEncounter, advanceEncounter, answerEncounterQuiz, finishEncounter, getEncounterOptionAvailability, validateEncounterState } from "./encounter";
import { encounterOffered, meetEncounter, observeLandmark } from "../../tests/fixtures/encounter-moment";
import { storyFingerprint } from "../story/runtime";

const ready = (): GameState => galleriaReady();
let completedGalleria: GameState | undefined;
/** Reach Galleria using the current journey rather than a historical save. */
function galleriaReady(): GameState {
  if (!completedGalleria) {
    let state = createGame();
    for (const id of ["milano_duomo_episode", "milano_galleria_episode"]) state = finishEpisode(state, id);
    completedGalleria = validateGameState(state);
  }
  return structuredClone(completedGalleria);
}
const restored = (s: GameState): GameState => {
  const copy = JSON.parse(JSON.stringify(s)) as GameState;
  validateEncounterState(copy);
  return copy;
};
function untilChoice(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && !state.activeEncounter?.frame.choices.length; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error("choice not reached");
    state = next;
  }
  expect(state.activeEncounter?.frame.choices).toHaveLength(3);
  return restored(state);
}
function untilPhase(initial: GameState, phase: "quiz" | "outcome"): GameState {
  let state = initial;
  for (let i = 0; i < 100 && state.activeEncounter?.phase !== phase; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error(`phase ${phase} not reached`);
    state = next;
  }
  expect(state.activeEncounter?.phase).toBe(phase);
  return restored(state);
}
function finish(initial: GameState): GameState {
  let state = initial;
  for (let i = 0; i < 100 && !state.activeEncounter?.frame.ended; i++) {
    state = restored(state);
    const next = advanceEncounter(state, state.revision);
    if (next === state) throw new Error("end not reached");
    state = next;
  }
  return restored(finishEncounter(state, state.revision));
}
function choose(initial: GameState, index: number): GameState {
  const state = untilChoice(initial);
  const next = chooseEncounter(state, index, state.revision);
  expect(next).not.toBe(state);
  expect(chooseEncounter(next, index, state.revision)).toBe(next);
  return restored(next);
}
function fortune(initial: GameState, answer: "A" | "B", roll: number): GameState {
  let state = choose(meetEncounter(initial, "galleria_fortune", () => roll), 0);
  state = untilPhase(state, "quiz");
  const answered = answerEncounterQuiz(state, answer, state.revision);
  expect(answerEncounterQuiz(answered, answer, state.revision)).toBe(answered);
  state = untilPhase(restored(answered), "outcome");
  return finish(state);
}

// Test-only encounters at the Galleria with test Ink: a café that charges, pays back on completion and hands over a
// souvenir; a gift of that souvenir with response profiles; an outing that takes the Fortune ticket or a fee and reads
// the souvenir's state in Ink. No published encounter combines these rules (the dormant Milano ones that did were
// removed in v14), so these fixtures exercise them next to the current Fortune scene and its saved lottery.
const SOUVENIR = "test_souvenir";
const CAFE = "test_cafe";
const GIFT = "test_gift";
const OUTING = "test_outing";
const testInk: Record<string, string> = {
  [CAFE]: `VAR player_name = ""
VAR heroine_name = ""
# background: milano_galleria
# speaker: narrator
試験用のカフェ。店先で注文票が風に飛んだ。
# speaker: heroine
「拾えた。お礼に何か頼もうか。」
* [Two coffees, please.]
    # speaker: heroine
    「小さいけれど、濃いね。」
    -> done
* [A cappuccino and a pastry, please.]
    # speaker: heroine
    「お菓子は半分にしよう。」
    -> done
* [Nothing for now, thank you.]
    # speaker: heroine
    「香りだけで少し休めた。」
    -> done
=== done ===
# speaker: narrator
店員はお礼に小銭と、雄牛のしおりを渡した。
-> END`,
  [GIFT]: `VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "positive"
# background: milano_galleria
# speaker: heroine
「そのしおり、どうするの？」
* [Would you like this bookmark?]
    { romance_result == "positive":
        # speaker: heroine
        「いいの？　次に本を開いたら思い出しそう。」
    - else:
        # speaker: heroine
        「ありがとう。でも、二人で使う方がいいな。」
    }
    -> given
* [This bookmark made me think of you.]
    { romance_result == "positive":
        # speaker: heroine
        「私を？　理由は今度聞かせて。」
    - else:
        # speaker: heroine
        「ありがとう。でも、その理由はちゃんと聞いておきたいな。」
    }
    -> given
* [I'll keep it for now.]
    # speaker: heroine
    「うん。急いで決めなくていいよ。」
    -> END
=== given ===
# speaker: narrator
彼女はしおりを手帳にはさんだ。
-> END`,
  [OUTING]: `VAR player_name = ""
VAR heroine_name = ""
EXTERNAL has_item_status(id, status)
# background: milano_galleria
# speaker: narrator
小さな臨時展示の案内が出ていた。
* [Use the ticket.]
    # speaker: narrator
    展示券を渡して中へ入った。
    -> exhibition
* [Buy an entry ticket.]
    # speaker: narrator
    入場料を払って中へ入った。
    -> exhibition
* [Not now.]
    # speaker: heroine
    「展示はまた今度にしよう。」
    -> END
=== exhibition ===
# speaker: heroine
「同じ床に、違う街の印が並んでいるんだね。」
{has_item_status("${SOUVENIR}", "gifted"):
    「しおりの牛には、手帳で待っててもらおう。」
}
-> END`,
};
/** A test encounter at the Galleria, in the shape of the published Galleria print stall (city, landmark, sources). */
function testEncounter(id: string, options: EncounterDefinition["options"], extra: Partial<EncounterDefinition> = {}): EncounterDefinition {
  const base = structuredClone(encounters.encounters.find((event) => event.id === "galleria_print")!);
  return { ...base, id, titleJa: "試験用の寄り道", descriptionJa: "試験用の寄り道。", storyId: `encounters/${id}`, options, ...extra };
}
const testEncounters = (): EncounterDefinition[] => [
  testEncounter(CAFE, [
    { id: "coffee", translationJa: "コーヒーを二杯ください。", cost: 4 },
    { id: "coffee_pastry", translationJa: "カプチーノとお菓子を一つずつください。", cost: 8 },
    { id: "nothing", translationJa: "今は何もいりません、ありがとう。", cost: 0 },
  ], { completionMoney: 2, completionItemId: SOUVENIR }),
  testEncounter(GIFT, [
    { id: "offer", translationJa: "このしおり、いりますか？", cost: 0, requiresItemId: SOUVENIR, giftItemId: SOUVENIR, responseProfileId: "attentive" },
    { id: "thought", translationJa: "このしおりを見て、あなたを思い出しました。", cost: 0, requiresItemId: SOUVENIR, giftItemId: SOUVENIR, responseProfileId: "honest" },
    { id: "later", translationJa: "今は自分で持っておく。", cost: 0, deferCompletion: true },
  ]),
  testEncounter(OUTING, [
    { id: "ticket", translationJa: "展示券を使う。", cost: 0, requiresItemId: "galleria_ticket", consumeItemId: "galleria_ticket" },
    { id: "buy", translationJa: "入場券を買う。", cost: 4 },
    { id: "later", translationJa: "今はやめておく。", cost: 0, deferCompletion: true },
  ]),
];
const testEncounterIn = (id: string) => encounters.encounters.find((event) => event.id === id)!;

describe("travel encounters", () => {
  const currentEntries = [...encounters.encounters];
  const currentItems = [...encounters.items];
  /** The published catalog only (the test encounters and the souvenir removed). */
  const useCurrentCatalog = () => {
    encounters.encounters.splice(0, encounters.encounters.length, ...currentEntries);
    encounters.items.splice(0, encounters.items.length, ...currentItems);
  };
  beforeEach(() => {
    encounters.encounters.push(...testEncounters());
    encounters.items.push({ id: SOUVENIR, cityId: "milano", nameJa: "雄牛のしおり", descriptionJa: "試験用のカフェで受け取ったしおり。" });
    for (const [id, source] of Object.entries(testInk)) stories[`encounters/${id}`] = compileInk(source, `encounters/${id}.ink`);
  });
  afterEach(() => {
    useCurrentCatalog();
    for (const id of Object.keys(testInk)) delete stories[`encounters/${id}`];
  });

  it("charges and rewards currency-neutral amounts once", () => {
    const cafe = testEncounterIn(CAFE);
    const option = cafe.options[0];
    option.cost = 7;
    cafe.completionMoney = 3;
    const initial = ready();
    const chosen = choose(meetEncounter(initial, cafe.id, () => 0), 0);
    expect(chosen.travelBudget).toBe(initial.travelBudget - 7);
    const completed = finish(chosen);
    expect(completed.travelBudget).toBe(initial.travelBudget - 7 + 3);
    expect(finishEncounter(completed, completed.revision)).toBe(completed);
  });

  it("rejects a changed active definition", () => {
    const cafe = untilChoice(meetEncounter(ready(), CAFE));
    expect(restored(cafe)).toEqual(cafe);
    testEncounterIn(CAFE).titleJa = "書き換えた寄り道";
    expect(() => restored(cafe)).toThrow("道中交流の保存状態が一致しません");
  });

  it("replays galleria_fortune on a later Galleria visit after a completion or draw without paying its rewards again", () => {
    const original = galleriaReady();
    const finishedSaves = [fortune(original, "A", 0), fortune(original, "B", 0), fortune(original, "B", 9999)];
    useCurrentCatalog();
    for (const finished of finishedSaves) {
      // The finished scene returned to its observation; a later visit is a new observation.
      expect(finished.occasion?.started).toContain("galleria_fortune");
      let state = observeLandmark(restored(finished), "galleria_vittorio_emanuele_ii");
      expect(state.activeTourism).toMatchObject({ phase: "exploring", landmarkId: "galleria_vittorio_emanuele_ii" });
      expect(state.occasion).toBeNull();
      const visitBefore = state.activeTourism;
      const begin = startTourismEncounter(state, "galleria_fortune", state.revision, () => 0);
      expect(begin.activeEncounter?.encounterId).toBe("galleria_fortune");
      state = untilPhase(choose(restored(begin), 0), "quiz");
      state = answerEncounterQuiz(state, "A", state.revision);
      state = finish(untilPhase(restored(state), "outcome"));
      expect(state.activeTourism).toEqual(visitBefore);
      expect(state.occasion?.started).toEqual(["galleria_fortune"]);
      expect(state.ap).toBe(finished.ap);
      expect(state.pendingApRewards).toEqual(finished.pendingApRewards);
      expect(state.claimedRewardIds).toEqual(finished.claimedRewardIds);
      expect(state.travelBudget).toBe(finished.travelBudget);
      expect(state.inventory).toEqual(finished.inventory);
      expect(state.encounterRewards).toEqual(finished.encounterRewards);
      expect(state.completedEncounterIds.filter((id) => id === "galleria_fortune")).toHaveLength(1);
    }
  });
  it("rejects an altered encounter fingerprint instead of resuming it", () => {
    const started = meetEncounter(ready(), CAFE, () => 0);
    const changed = { ...started, activeEncounter: { ...started.activeEncounter!, contentHash: "outdated" } };
    expect(() => restored(changed)).toThrow("道中交流の保存状態が一致しません");
  });
  it("charges the chosen amount once, preserves the completed café reward and rejects insufficient funds", () => {
    let state = untilChoice(meetEncounter(ready(), CAFE, () => 0));
    const startingBudget = state.travelBudget;
    const poor = { ...state, travelBudget: 3 };
    expect(getEncounterOptionAvailability(poor, 0).available).toBe(false);
    expect(chooseEncounter(poor, 0, poor.revision)).toBe(poor);
    state = chooseEncounter(state, 0, state.revision);
    expect(state.travelBudget).toBe(startingBudget - 4);
    state = finish(state);
    expect(state.travelBudget).toBe(startingBudget - 4 + 2);
    expect(state.inventory[SOUVENIR]).toBe("held");
    expect(encounterOffered(state, CAFE)).toEqual({ available: false, reason: "今は話しかけられません。" });
  });
  it("does not allow a purchase to spend money reserved for the return journey", () => {
    const initial = ready();
    const reserved = { ...initial, travelBudget: 8, travel: { ...initial.travel, returnReserve: 5 } };
    const choice = untilChoice(meetEncounter(reserved, CAFE, () => 0));
    expect(getEncounterOptionAvailability(choice, 0).available).toBe(false);
    expect(chooseEncounter(choice, 0, choice.revision)).toBe(choice);
    expect(choice.travelBudget).toBe(8);
    expect(choice.travel.returnReserve).toBe(5);
    expect(getEncounterOptionAvailability(choice, 2).available).toBe(true);
  });
  it("allows the free conversation, the gift to be deferred, and only one transfer", () => {
    const initial = ready();
    let state = finish(choose(meetEncounter(initial, CAFE, () => 0), 2));
    expect(state.travelBudget).toBe(initial.travelBudget + 2);
    state = finish(choose(meetEncounter(state, GIFT, () => 0), 2));
    expect(state.inventory[SOUVENIR]).toBe("held");
    expect(state.completedEncounterIds).not.toContain(GIFT);
    state = finish(choose(meetEncounter(state, GIFT, () => 0), 0));
    expect(state.inventory[SOUVENIR]).toBe("gifted");
    expect(encounterOffered(state, GIFT)).toEqual({ available: false, reason: "今は話しかけられません。" });
  });
  it("draws only on the first perfect quiz even after a failed attempt, and never re-awards a ticket", () => {
    let state = fortune(ready(), "A", 0);
    expect(state.encounterRewards.galleria_fortune).toBeUndefined();
    expect(state.claimedRewardIds).toContain("victory_galleria_first");
    state = fortune(state, "B", 0);
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
    expect(state.inventory.galleria_ticket).toBe("held");
    state = finish(choose(meetEncounter(state, OUTING, () => 0), 0));
    expect(state.inventory.galleria_ticket).toBe("used");
    expect(state.itemUses).toEqual({ galleria_ticket: { encounterId: OUTING, optionId: "ticket" } });
    state = fortune(state, "B", 0);
    expect(state.inventory.galleria_ticket).toBe("used");
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
  });
  it("persists losing rolls and lets players buy the alternative without a ticket", () => {
    let state = fortune(ready(), "B", 9999);
    const startingBudget = state.travelBudget;
    expect(state.encounterRewards.galleria_fortune).toEqual({ roll: 9999, chancePercent: 25, won: false });
    state = fortune(state, "B", 0);
    expect(state.encounterRewards.galleria_fortune.won).toBe(false);
    expect(state.inventory.galleria_ticket).toBeUndefined();
    state = finish(choose(meetEncounter(state, OUTING, () => 0), 1));
    expect(state.travelBudget).toBe(startingBudget - 4);
  });
  it("reconstructs gift reactions from saved tickets and rejects altered outcomes", () => {
    const withItem = finish(choose(meetEncounter(ready(), CAFE, () => 0), 2));
    const happy = choose(meetEncounter(withItem, GIFT, () => 0), 0);
    const unhappy = choose(meetEncounter(withItem, GIFT, () => 9999), 0);
    expect(happy.activeEncounter!.romanceResolution!.result).toBe("positive");
    expect(unhappy.activeEncounter!.romanceResolution!.result).toBe("negative");
    expect(happy.activeEncounter!.frame.text).not.toBe(unhappy.activeEncounter!.frame.text);
    expect(() => validateEncounterState({ ...happy, trust: happy.trust + 1 })).toThrow("道中交流の保存状態が一致しません。");
    // The chosen gift's item put back in the bag: its use record no longer matches an item given away;
    // dropping the record too leaves the chosen option's gift ungiven.
    expect(happy.itemUses[SOUVENIR]).toEqual({ encounterId: GIFT, optionId: "offer" });
    expect(() => validateEncounterState({ ...happy, inventory: { ...happy.inventory, [SOUVENIR]: "held" } })).toThrow("品物を渡した・使った記録が一致しません。");
    expect(() => validateEncounterState({ ...happy, inventory: { ...happy.inventory, [SOUVENIR]: "held" }, itemUses: {} })).toThrow("道中交流の保存状態が一致しません。");
  });
  it("reads cond(\"…\") before the choice on the state then, after it on the state with the choice's effects (stage 2a)", () => {
    const text = `item ${SOUVENIR} held`;
    const storyId = `encounters/${GIFT}`;
    sceneConditions.conditions[text] = { item: { id: SOUVENIR, is: "held" } };
    sceneConditions.stories[storyId] = [text];
    stories[storyId] = compileInk(`VAR player_name = ""
VAR heroine_name = ""
VAR romance_result = "positive"
EXTERNAL cond(text)
# background: milano_galleria
# speaker: heroine
{ cond("${text}"): 「そのしおり、どうするの？」 | 「しおりはどこ？」 }
* [Would you like this bookmark?]
    -> given
* [This bookmark made me think of you.]
    -> given
* [I'll keep it for now.]
    -> END
=== given ===
# speaker: narrator
{ cond("${text}"): まだ持っている。 | 彼女はしおりを手帳にはさんだ。}
-> END
=== function cond(text) ===
~ return false
`, `${storyId}.ink`);
    try {
      const withItem = finish(choose(meetEncounter(ready(), CAFE, () => 0), 2));
      const offered = untilChoice(meetEncounter(withItem, GIFT, () => 0));
      expect(offered.activeEncounter!.frame.text).toBe("「そのしおり、どうするの？」");
      expect(sceneConditionTruths(offered)).toEqual([{ text, met: true }]);
      // The gift is applied before the choice reaches Ink: the next line already reads it as given.
      const given = restored(chooseEncounter(offered, 0, offered.revision));
      expect(given.inventory[SOUVENIR]).toBe("gifted");
      expect(given.activeEncounter!.frame.text).toBe("彼女はしおりを手帳にはさんだ。");
      expect(sceneConditionTruths(given)).toEqual([{ text, met: false }]);
      expect(sceneConditionTruths({ ...offered, inventory: {} })).toEqual([{ text, met: false }]);
    } finally {
      delete sceneConditions.conditions[text];
      delete sceneConditions.stories[storyId];
    }
  });
  it("requires the running gift's own use record even when another completed encounter could have given the item", () => {
    const again: EncounterDefinition = { ...structuredClone(testEncounterIn(GIFT)), id: "test_gift_again" };
    encounters.encounters.push(again);
    const withItem = finish(choose(meetEncounter(ready(), CAFE), 2));
    const giving = choose(meetEncounter(withItem, again.id), 0);
    expect(giving.itemUses).toEqual({ [SOUVENIR]: { encounterId: again.id, optionId: "offer" } });
    // Forged: the other gift encounter is marked done and named as the giver, while this one has chosen to give.
    const forged = { ...giving, completedEncounterIds: [...giving.completedEncounterIds, GIFT], seenEncounterIds: [...giving.seenEncounterIds, GIFT],
      itemUses: { [SOUVENIR]: { encounterId: GIFT, optionId: "offer" } } };
    expect(() => validateEncounterState(forged)).toThrow("品物を渡した・使った記録が一致しません。");
  });
  it("rejects missing draws, inconsistent prizes and forged outcome stories", () => {
    let state = choose(meetEncounter(ready(), "galleria_fortune", () => 0), 0);
    state = untilPhase(state, "quiz");
    state = answerEncounterQuiz(state, "B", state.revision);
    expect(() => validateEncounterState({ ...state, encounterRewards: {} })).toThrow("道中交流の保存状態が一致しません。");
    expect(() => validateEncounterState({ ...state, inventory: {} })).toThrow("道中交流の保存状態が一致しません。");
    state = untilPhase(state, "outcome");
    // The correct answer earned the won story; a save that claims the lost one
    // (with that story's own fingerprint) is refused.
    const quiz = encounters.encounters.find((event) => event.id === "galleria_fortune")!.quiz!;
    expect(state.activeEncounter!.storyId).not.toBe(quiz.lostStoryId);
    const altered = structuredClone(state);
    altered.activeEncounter!.storyId = quiz.lostStoryId;
    altered.activeEncounter!.storyHash = storyFingerprint(quiz.lostStoryId);
    expect(() => validateEncounterState(altered)).toThrow("道中交流の保存状態が一致しません。");
  });
  it("reads a previously gifted souvenir in a later encounter without changing it", () => {
    let state = finish(choose(meetEncounter(ready(), CAFE, () => 0), 2));
    state = finish(choose(meetEncounter(state, GIFT, () => 0), 0));
    state = choose(meetEncounter(state, OUTING, () => 0), 1);
    const lines: string[] = [];
    for (let i = 0; i < 100; i++) {
      lines.push(state.activeEncounter!.frame.text);
      if (state.activeEncounter!.frame.ended) break;
      state = restored(advanceEncounter(state, state.revision));
    }
    expect(lines.join("\n")).toContain("しおり");
    expect(state.inventory[SOUVENIR]).toBe("gifted");
  });
  it("keeps recorded lottery odds and an active response profile across rebalancing", () => {
    const quiz = encounters.encounters.find((event) => event.id === "galleria_fortune")!.quiz!;
    const profile = responseProfiles.find((item) => item.id === "attentive")!;
    const oldChance = quiz.chancePercent;
    const oldBase = profile.baseChance;
    try {
      const drawn = fortune(ready(), "B", 2000);
      let active = finish(choose(meetEncounter(drawn, CAFE, () => 0), 2));
      active = untilChoice(meetEncounter(active, GIFT, () => 7000));
      quiz.chancePercent = 0;
      profile.baseChance = 0;
      expect(restored(drawn).encounterRewards.galleria_fortune.won).toBe(true);
      active = restored(chooseEncounter(active, 0, active.revision));
      expect(active.activeEncounter!.romanceResolution!.result).toBe("positive");
    } finally {
      quiz.chancePercent = oldChance;
      profile.baseChance = oldBase;
    }
  });
  it("commits and reloads the actual first-perfect prize through the save API", () => {
    const values = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
    };
    let state = galleriaReady();
    state = choose(meetEncounter(state, "galleria_fortune", () => 0), 0);
    state = untilPhase(state, "quiz");
    expect(saveGame(storage, state)).toEqual({ ok: true });
    const answer = answerEncounterQuiz(state, "B", state.revision);
    expect(saveGame(storage, answer, state)).toEqual({ ok: true });
    const loaded = loadGame(storage);
    expect(loaded.status).toBe("loaded");
    if (loaded.status === "loaded") {
      expect(loaded.state.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
      expect(loaded.state.inventory.galleria_ticket).toBe("held");
    }
  });
  it("rejects competing tabs for payment, gifts, and lottery outcomes", () => {
    function commitFirst(previous: GameState, first: GameState, competing: GameState): GameState {
      const values = new Map<string, string>();
      const storage: StorageLike = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
      };
      expect(saveGame(storage, previous)).toEqual({ ok: true });
      expect(saveGame(storage, first, previous)).toEqual({ ok: true });
      expect(saveGame(storage, competing, previous).ok).toBe(false);
      const result = loadGame(storage);
      expect(result.status).toBe("loaded");
      if (result.status !== "loaded") throw new Error("save unavailable");
      expect(result.state).toEqual(first);
      return result.state;
    }

    const base = galleriaReady();
    const payment = untilChoice(meetEncounter(base, CAFE, () => 0));
    const paid = chooseEncounter(payment, 0, payment.revision);
    const otherPayment = chooseEncounter(payment, 1, payment.revision);
    expect(commitFirst(payment, paid, otherPayment).travelBudget).toBe(payment.travelBudget - 4);

    const withItem = finish(paid);
    expect(withItem.inventory[SOUVENIR]).toBe("held");
    const gift = untilChoice(meetEncounter(withItem, GIFT, () => 0));
    const given = chooseEncounter(gift, 0, gift.revision);
    const kept = chooseEncounter(gift, 2, gift.revision);
    const savedGift = commitFirst(gift, given, kept);
    expect(savedGift.inventory[SOUVENIR]).toBe("gifted");
    expect(savedGift.travelBudget).toBe(gift.travelBudget);

    let quiz = choose(meetEncounter(base, "galleria_fortune", () => 0), 0);
    quiz = untilPhase(quiz, "quiz");
    const correct = answerEncounterQuiz(quiz, "B", quiz.revision);
    const incorrect = answerEncounterQuiz(quiz, "A", quiz.revision);
    const savedLottery = commitFirst(quiz, correct, incorrect);
    expect(savedLottery.encounterRewards.galleria_fortune).toEqual({ roll: 0, chancePercent: 25, won: true });
    expect(savedLottery.inventory.galleria_ticket).toBe("held");
    expect(savedLottery.travelBudget).toBe(quiz.travelBudget);
  });
  it("evaluates existing stage thresholds after a gift without counting it as a date", () => {
    const start = { ...ready(), playedDateIds: ["milano_cafe_01"], affection: 1, trust: 0, spark: 1 };
    let state = finish(choose(meetEncounter(start, CAFE, () => 0), 2));
    state = choose(meetEncounter(state, GIFT, () => 0), 0);
    expect(state.romanceStage).toBe(1);
    state = finish(state);
    expect(state.romanceStage).toBe(2);
    expect(completedDateCount(state)).toBe(1);
    expect(state.playedDateIds).toEqual(["milano_cafe_01"]);

    const withoutDate = { ...ready(), affection: 1, trust: 0, spark: 1 };
    let other = finish(choose(meetEncounter(withoutDate, CAFE, () => 0), 2));
    other = finish(choose(meetEncounter(other, GIFT, () => 0), 0));
    expect(other.romanceStage).toBe(1);
    expect(completedDateCount(other)).toBe(0);
  });
  it("prevents using and gifting an item from a different city without touching money or AP", () => {
    let state = finish(choose(meetEncounter(ready(), CAFE, () => 0), 2));
    state = untilChoice(meetEncounter(state, GIFT, () => 0));
    const souvenir = encounters.items.find((item) => item.id === SOUVENIR)!;
    const cityId = souvenir.cityId;
    try {
      souvenir.cityId = "roma";
      expect(getEncounterOptionAvailability(state, 0).available).toBe(false);
      expect(chooseEncounter(state, 0, state.revision)).toBe(state);
      expect(state.inventory[SOUVENIR]).toBe("held");
      expect(() => validateEncounterState(state)).toThrow("道中交流の保存状態が一致しません。");
    } finally { souvenir.cityId = cityId; }
    const next = finish(chooseEncounter(state, 0, state.revision));
    expect(next.inventory[SOUVENIR]).toBe("gifted");
    expect(next.travelBudget).toBe(state.travelBudget);
    expect(next.ap).toBe(state.ap);
  });
  it("rejects both prize and completion awards from a different city before state changes", () => {
    let cafe = choose(meetEncounter(ready(), CAFE, () => 0), 2);
    while (!cafe.activeEncounter!.frame.ended) cafe = advanceEncounter(cafe, cafe.revision);
    const souvenir = encounters.items.find((item) => item.id === SOUVENIR)!;
    const originalSouvenirCity = souvenir.cityId;
    try {
      souvenir.cityId = "roma";
      expect(finishEncounter(cafe, cafe.revision)).toBe(cafe);
      expect(cafe.inventory[SOUVENIR]).toBeUndefined();
    } finally { souvenir.cityId = originalSouvenirCity; }

    let quiz = choose(meetEncounter(ready(), "galleria_fortune", () => 0), 0);
    quiz = untilPhase(quiz, "quiz");
    const ticket = encounters.items.find((item) => item.id === "galleria_ticket")!;
    const originalTicketCity = ticket.cityId;
    try {
      ticket.cityId = "roma";
      expect(answerEncounterQuiz(quiz, "B", quiz.revision)).toBe(quiz);
      expect(quiz.inventory.galleria_ticket).toBeUndefined();
      expect(quiz.encounterRewards.galleria_fortune).toBeUndefined();
    } finally { ticket.cityId = originalTicketCity; }
    const winner = answerEncounterQuiz(quiz, "B", quiz.revision);
    expect(winner.inventory.galleria_ticket).toBe("held");
    expect(winner.ap).toBe(quiz.ap);
    expect(winner.travelBudget).toBe(quiz.travelBudget);
  });
  it("does not consume an entry ticket from another city", () => {
    const won = fortune(ready(), "B", 0);
    const outing = untilChoice(meetEncounter(won, OUTING, () => 0));
    const ticket = encounters.items.find((item) => item.id === "galleria_ticket")!;
    const original = ticket.cityId;
    try {
      ticket.cityId = "roma";
      expect(getEncounterOptionAvailability(outing, 0).available).toBe(false);
      expect(chooseEncounter(outing, 0, outing.revision)).toBe(outing);
      expect(outing.inventory.galleria_ticket).toBe("held");
      expect(() => validateEncounterState(outing)).toThrow("道中交流の保存状態が一致しません。");
    } finally { ticket.cityId = original; }
    const used = finish(chooseEncounter(outing, 0, outing.revision));
    expect(used.inventory.galleria_ticket).toBe("used");
    expect(used.travelBudget).toBe(outing.travelBudget);
    expect(used.ap).toBe(outing.ap);
  });
  it("keeps foreign-city item history while allowing local items after city completion", () => {
    const foreign = { id: "test_roma_item", cityId: "roma", nameJa: "旅の品", descriptionJa: "別の街の品。" };
    encounters.items.push(foreign);
    try {
      const initial = { ...ready(), completedCityIds: ["milano", "roma"], inventory: { test_roma_item: "left_behind" as const } };
      expect(() => validateEncounterState({ ...initial, inventory: { test_roma_item: "held" } })).toThrow("道中交流の保存状態が一致しません。");
      expect(() => validateEncounterState({ ...initial, completedCityIds: ["milano"] })).toThrow("道中交流の保存状態が一致しません。");
      expect(encounterOffered(initial, CAFE).available).toBe(true);
      const bought = finish(choose(meetEncounter(initial, CAFE, () => 0), 2));
      const gifted = finish(choose(meetEncounter(bought, GIFT, () => 0), 0));
      expect(gifted.inventory.test_roma_item).toBe("left_behind");
      expect(gifted.inventory[SOUVENIR]).toBe("gifted");
      expect(gifted.ap).toBe(initial.ap);
      expect(gifted.travelBudget).toBe(initial.travelBudget + 2);
    } finally { encounters.items.pop(); }
  });
  it("resumes a current Milan encounter, and rejects a changed city", () => {
    const initial = galleriaReady();
    const started = meetEncounter(initial, CAFE, () => 4321);
    const reloaded = validateGameState(JSON.parse(JSON.stringify(started)));
    expect(reloaded.activeEncounter).toEqual(started.activeEncounter);
    expect(reloaded.inventory).toEqual(initial.inventory);
    expect(reloaded.ap).toBe(initial.ap);
    expect(reloaded.travelBudget).toBe(initial.travelBudget);
    expect(advanceEncounter(reloaded, reloaded.revision)).not.toBe(reloaded);

    const event = testEncounterIn(CAFE);
    const original = event.cityId;
    try {
      event.cityId = "roma";
      expect(encounterOffered(initial, event.id)).toEqual({ available: false, reason: "今は話しかけられません。" });
      // Do not apply a changed event definition to the saved encounter.
      expect(advanceEncounter(reloaded, reloaded.revision)).toBe(reloaded);
      expect(() => validateEncounterState(reloaded)).toThrow("道中交流の保存状態が一致しません。");
    } finally { event.cityId = original; }
  });
});
