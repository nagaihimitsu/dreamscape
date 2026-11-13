import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { episodes, presentation, scenes, tourismAssets } from "../../../src/content";
import { encounters } from "../../../src/content/encounters";
import { clearCity, cityStart, departFromClearedCity, finishEpisode, newJourney, withAp } from "../../../src/dev/scenario-builders";
import { getActiveBattleContent } from "../../../src/domain/battle";
import { startDate, validateGameState, type GameState } from "../../../src/domain/game";
import { openMiniGame } from "../../../src/domain/minigame";
import { applyPlayerAction, listPlayerActions, playerActionChange, type PlayerAction } from "../../../src/domain/player-action";
import { screenFor } from "../../../src/domain/screen";
import { miniGameOptionId } from "../../../src/minigames/tag";
import { loadGame, saveGame, type StorageLike } from "../../../src/persistence";

/**
 * GT-4: the Golden Triangle's 13 inserted scenes (talks at the stage-4 moments: the hotel's night and morning,
 * Delhi's departure, Agra's arrival, the Jaipur finale and the India Gate date), each played at its moment with the
 * real actions as the screens commit them, each step saved and loaded again. Their two items are given (the envelope
 * handed over once), their money is paid once (the station deposit through to Agra; each envelope gift in its scene,
 * nothing more after the battle up to the epilogue), and some are also tried where their conditions do not hold:
 * Delhi's night scenes after a daytime rest, the print without the photographer, Roohi's news without the homework,
 * and the two reels without the stepwell date.
 */

const GT = "content/journeys/golden_triangle";
const MAP_ACTIONS = new Set<PlayerAction["kind"]>(["travel", "wait", "rest", "rent", "claim_ap", "depart", "read_epilogue"]);

const roundtrip = (state: GameState): GameState => {
  const values = new Map<string, string>();
  const storage: StorageLike = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); } };
  expect(saveGame(storage, state).ok).toBe(true);
  const loaded = loadGame(storage);
  expect(loaded).toEqual({ status: "loaded", state });
  if (loaded.status !== "loaded") throw new Error("Expected a current-version save");
  return loaded.state;
};

/** One action as the screen commits it, saved and loaded again. */
function act(state: GameState, action: PlayerAction): GameState {
  const next = applyPlayerAction(state, playerActionChange(action, () => 0), () => 0);
  expect(next, action.kind).not.toBe(state);
  return roundtrip(next);
}

const frameOf = (state: GameState) => state.activeEncounter?.frame ?? state.activeDate?.frame ?? state.activeEpilogue?.frame ?? state.activeTourism?.frame;
const optionOf = (state: GameState, index: number) => frameOf(state)?.choices.find((choice) => choice.index === index)?.optionId;

type Played = { state: GameState; lines: string[]; scenes: { id: string; day: number; city: string }[]; chosen: string[] };

/**
 * Play on with the screen's actions (never the map's) until `done`: a choice among `prefer` (option IDs) when the
 * screen shows one, else its first choice; at a mini-game, the outcome whose option ID is among `prefer`, else its
 * first outcome; the correct answer in a battle. Records the lines shown, the inserted
 * scenes as they start (with the day) and the options chosen.
 */
function play(initial: GameState, done: (state: GameState) => boolean, prefer: readonly string[] = []): Played {
  let state = initial;
  const played: Played = { state, lines: [], scenes: [], chosen: [] };
  let run: string | undefined;
  for (let step = 0; !done(state); step++) {
    expect(step, `stuck on ${screenFor(state)}`).toBeLessThan(500);
    const encounter = state.activeEncounter;
    if (encounter && encounter.runId !== run) {
      run = encounter.runId;
      played.scenes.push({ id: encounter.encounterId, day: state.travel.day, city: state.currentCityId });
    }
    const text = frameOf(state)?.text;
    if (text !== undefined && played.lines.at(-1) !== text) played.lines.push(text);
    const actions = listPlayerActions(state).filter((action) => !MAP_ACTIONS.has(action.kind));
    if (!actions.length) throw new Error(`no action on the screen ${screenFor(state)}`);
    let action = actions[0];
    const choices = actions.filter((item): item is Extract<PlayerAction, { index: number }> => "index" in item);
    const outcomes = actions.filter((item): item is Extract<PlayerAction, { kind: "minigame" }> => item.kind === "minigame");
    const game = openMiniGame(state);
    if (choices.length) {
      action = choices.find((item) => prefer.includes(optionOf(state, item.index) ?? "")) ?? choices[0];
      played.chosen.push(optionOf(state, action.index) ?? "");
    } else if (game && outcomes.length) {
      // A # minigame: shows the game in place of its choices (docs/13): its outcome takes the choice of the same option ID.
      action = outcomes.find((item) => prefer.includes(miniGameOptionId(game.tag, item.outcome))) ?? outcomes[0];
      played.chosen.push(miniGameOptionId(game.tag, action.outcome));
    }
    const battle = state.activeBattle;
    if (battle?.phase === "question")
      action = { kind: "battle_answer", optionId: getActiveBattleContent(battle).quiz.questions[battle.roundIndex].correctOptionId };
    state = act(state, action);
  }
  return { ...played, state };
}

const noScene = (state: GameState) => !state.occasion && !state.activeEncounter && !state.activeDate && !state.activeEpilogue && !state.activeBattle && !state.activeTourism;
const atMinute = (state: GameState, minute: number) => validateGameState({ ...state, travel: { ...state.travel, minute } });

/** A date started where the party is (its own moment has no scenes here), played to its end. */
function playDate(state: GameState, dateId: string, prefer: readonly string[]): Played {
  const started = roundtrip(startDate(withAp(state, 12), dateId, () => 4500));
  expect(started.activeDate?.dateId).toBe(dateId);
  const played = play(started, (current) => !current.activeDate, prefer);
  expect(played.state.playedDateIds).toContain(dateId);
  return played;
}

/** 「休む」 at `minute` (at the hotel): the hotel's moment, played to the next morning's free time. */
function rest(state: GameState, minute: number, prefer: readonly string[] = []): Played {
  const evening = atMinute(state, minute);
  const action = listPlayerActions(evening).find((item) => item.kind === "rest");
  expect(action, "a way to rest").toBeDefined();
  const played = play(act(evening, action!), noScene, prefer);
  expect(played.state.travel.day).toBe(evening.travel.day + 1);
  return played;
}

/** A map event (its moment opens with it), played until `done`. */
function travel(state: GameState, eventId: string, done: (state: GameState) => boolean, prefer: readonly string[] = []): Played {
  const action = listPlayerActions(state).find((item) => item.kind === "travel" && item.eventId === eventId);
  expect(action, `a way to ${eventId}`).toBeDefined();
  return play(act(state, action!), done, prefer);
}

const ids = (played: Played) => played.scenes.map((scene) => scene.id);
const shown = (played: Played, text: string) => played.lines.some((line) => line.includes(text));

const delhiStart = () => finishEpisode(newJourney("golden_triangle"), "gt_delhi_main_red_fort");

describe("Golden Triangle inserted scenes (GT-4)", () => {
  it("places the 13 scenes at their moments, with their sources, flags, items and backgrounds", () => {
    const own = scenes.filter((scene) => /^places\/gt_(delhi|agra|jaipur)_inserts$/u.test(scene.story.storyId));
    const table = Object.fromEntries(own.map((scene) => [scene.id, [scene.kind, scene.at, scene.priority, scene.sources ?? "listed"]]));
    expect(table).toEqual({
      gt_delhi_date_india_gate_print: ["talk", [{ date: "gt_delhi_date_india_gate" }], 1, "none"],
      gt_delhi_hotel_homework: ["talk", [{ hotel: "delhi_hotel_hub" }], -2, "listed"],
      gt_delhi_hotel_sick_night_player: ["talk", [{ hotel: "delhi_hotel_hub" }], -1, "none"],
      gt_delhi_hotel_sick_night_heroine: ["talk", [{ hotel: "delhi_hotel_hub" }], -1, "none"],
      gt_delhi_hotel_sick_morning: ["talk", [{ hotel: "delhi_hotel_hub" }], 1, "listed"],
      gt_delhi_depart_scam: ["talk", [{ depart: "delhi" }], -2, "listed"],
      gt_delhi_depart_station: ["talk", [{ depart: "delhi" }], -1, "listed"],
      gt_agra_arrive_reel: ["talk", [{ arrive: "agra" }], 1, "none"],
      gt_jaipur_hotel_mehndi_night: ["talk", [{ hotel: "jaipur_hotel_hub" }], -1, "listed"],
      gt_jaipur_hotel_mehndi_morning: ["talk", [{ hotel: "jaipur_hotel_hub" }], 1, "listed"],
      gt_jaipur_finale_before_envelope: ["talk", [{ finale: "jaipur" }], -1, "listed"],
      gt_jaipur_finale_after_envelope: ["talk", [{ finale: "jaipur" }], 1, "listed"],
      gt_jaipur_finale_after_reel: ["talk", [{ finale: "jaipur" }], 2, "none"],
    });
    // The scenes that state a fact of the place list their sources (B4): https pages, with the date they were checked.
    // (The Fatehpur Sikri tour's scenes, places/gt_agra_tour_fatehpur_sikri, list theirs in the same file.)
    const catalog = JSON.parse(readFileSync(`${GT}/scenes/catalog.json`, "utf8")) as { scenes: { id: string; sources: { url: string; checkedAt: string; claimType: string }[] }[] };
    const listed = catalog.scenes.filter((scene) => !scene.id.startsWith("gt_agra_tour_"));
    expect(listed.map((scene) => scene.id).sort()).toEqual(own.filter((scene) => scene.sources !== "none").map((scene) => scene.id).sort());
    for (const source of listed.flatMap((scene) => scene.sources)) {
      expect(source.url).toMatch(/^https:\/\//u);
      expect(source.checkedAt).toMatch(/^2026-11-0[89]$/u);
    }
    // The flags only the inserts set and read, and the two items they give.
    const reads = new Set(own.flatMap((scene) => scene.conds));
    for (const flag of ["gt_delhi_roohi_metro_essay", "gt_delhi_scam_checked", "gt_delhi_scam_doubted", "gt_delhi_scam_paid", "gt_jaipur_envelope_letter"]) {
      expect(own.some((scene) => scene.options.some((option) => option.set?.includes(flag))), flag).toBe(true);
      expect(reads.has(`flag ${flag}`), flag).toBe(true);
    }
    expect(own.flatMap((scene) => scene.done.items ?? [])).toEqual(["gt_delhi_family_photo", "gt_jaipur_wedding_envelope"]);
    expect(encounters.items.filter((item) => item.id === "gt_delhi_family_photo" || item.id === "gt_jaipur_wedding_envelope"))
      .toMatchObject([{ id: "gt_delhi_family_photo", cityId: "delhi", carry: "journey" }, { id: "gt_jaipur_wedding_envelope", cityId: "jaipur" }]);
    // The Jaipur rooftop lead reads the mehndi morning again (the package's full condition, now that the scene exists).
    expect(scenes.find((scene) => scene.id === "gt_jaipur_date_confession")?.conds)
      .toContain("seen gt_jaipur_hotel_mehndi_morning");
    // Every background the inserts name resolves to a photo with its source, licence and credit.
    const ink = ["delhi", "agra", "jaipur"].map((city) => readFileSync(`${GT}/stories/places/gt_${city}_inserts.ink`, "utf8")).join("\n");
    const backgrounds = [...new Set([...ink.matchAll(/# background: ([a-z0-9_]+)/gu)].map((match) => match[1]))];
    expect(backgrounds).toEqual(expect.arrayContaining(["gt_bg_delhi_station_front", "gt_bg_delhi_paharganj", "gt_bg_delhi_station"]));
    for (const id of backgrounds) {
      const asset = tourismAssets.find((item) => item.id === presentation.backgrounds[id]?.imageAssetId);
      expect(asset, id).toBeDefined();
      expect(asset).toMatchObject({ isPlaceholder: false, sourceUrl: expect.stringMatching(/^https:\/\//u), licenseName: expect.any(String), creditJa: expect.stringContaining("写真：") });
    }
  });

  it("plays the homework and the player's sick night only at night, the morning after the night, and nothing twice", () => {
    const chandni = playDate(delhiStart(), "gt_delhi_date_chandni_chowk", ["eat_last_myself"]);
    expect(chandni.chosen).toContain("eat_last_myself");
    const night = rest(chandni.state, 20 * 60, ["write_the_metro", "stay_a_little"]);
    expect(ids(night)).toEqual(["gt_delhi_hotel_homework", "gt_delhi_hotel_sick_night_player", "gt_delhi_hotel_sick_morning"]);
    // The two night scenes before the night, the morning after it (the next day).
    expect(night.scenes.map((scene) => scene.day)).toEqual([1, 1, 2]);
    expect(night.state.storyProgress.flags).toContain("gt_delhi_roohi_metro_essay");
    expect(shown(night, "廊下の長椅子では、彼女が目をこすりながら起き上がるところだった。")).toBe(true);
    expect(shown(night, "クミンの水。わたしが作った。……宿題を手伝ってくれたお礼、半分ね")).toBe(true);
    expect(night.state.completedEncounterIds).toEqual(expect.arrayContaining(ids(night)));
    // Once each: the next night has none of them.
    expect(ids(rest(night.state, 20 * 60))).toEqual([]);

    // A daytime rest after the same date: neither night scene, only the morning (without the night before it).
    const day = rest(chandni.state, 12 * 60);
    expect(ids(day)).toEqual(["gt_delhi_hotel_sick_morning"]);
    expect(shown(day, "ノックの音で、隣の部屋の扉も開いた。彼女が、心配そうに顔を出す。")).toBe(true);
    // The next night: the homework, but not the sick night (# until: seen the morning).
    expect(ids(rest(day.state, 20 * 60))).toEqual(["gt_delhi_hotel_homework"]);
  }, 120_000);

  it("plays the heroine's sick night at night; after a daytime rest the morning only, and the night scene never follows it", () => {
    const chandni = playDate(delhiStart(), "gt_delhi_date_chandni_chowk", ["give_her_last"]);
    expect(chandni.chosen).toContain("give_her_last");
    const sickNight = rest(chandni.state, 20 * 60);
    expect(ids(sickNight)).toEqual(["gt_delhi_hotel_homework", "gt_delhi_hotel_sick_night_heroine", "gt_delhi_hotel_sick_morning"]);
    expect(sickNight.scenes.map((scene) => scene.day)).toEqual([1, 1, 2]);
    expect(shown(sickNight, "夜中の二時。携帯が一度だけ震えた。")).toBe(true);

    const day = rest(chandni.state, 12 * 60);
    expect(ids(day)).toEqual(["gt_delhi_hotel_sick_morning"]);
    expect(shown(day, "彼女の部屋の扉が、細く開いた。")).toBe(true);
    expect(shown(day, "わたし、ルーヒー。十三歳。これは、クミンを煮出した水")).toBe(true);
    // The next night: the homework (it meets Roohi again), but not the sick night (# until: seen the morning).
    const night = rest(day.state, 20 * 60);
    expect(ids(night)).toEqual(["gt_delhi_hotel_homework"]);
    expect(shown(night, "クミンの水を持ってきてくれた、宿の娘だ。")).toBe(true);
    expect(night.state.seenEncounterIds).not.toContain("gt_delhi_hotel_sick_night_heroine");
  }, 120_000);

  it("gives the India Gate print after the date only when the photographer took both of them", () => {
    const start = withAp(delhiStart(), 12);
    const hired = travel(start, "gt_delhi_date_india_gate", noScene, ["hire_photographer"]);
    expect(hired.chosen).toContain("hire_photographer");
    expect(ids(hired)).toEqual(["gt_delhi_date_india_gate_print"]);
    expect(shown(hired, "十四人。旅のアルバムに、知らない親戚が増えちゃった")).toBe(true);
    expect(hired.state.inventory.gt_delhi_family_photo).toBe("held");
    expect(hired.state.completedEncounterIds).toContain("gt_delhi_date_india_gate_print");

    const own = travel(start, "gt_delhi_date_india_gate", noScene, ["shoot_for_family"]);
    expect(own.chosen).toContain("shoot_for_family");
    expect(ids(own)).toEqual([]);
    expect(own.state.inventory.gt_delhi_family_photo).toBeUndefined();
  }, 120_000);

  it("plays Delhi's departure at the station (the deposit paid once) and Agra's reel after the stepwell date", () => {
    // Before the finale: the stepwell date (the player as the pigeon) and a night with Roohi's homework (the metro).
    const baoli = playDate(delhiStart(), "gt_delhi_date_agrasen_baoli", ["jasmeet_turn"]);
    expect(baoli.state.storyProgress.flags).toContain("gt_delhi_baoli_player_pigeon");
    const homework = rest(baoli.state, 20 * 60, ["write_the_metro"]);
    expect(ids(homework)).toEqual(["gt_delhi_hotel_homework"]);
    const cleared = clearCity(homework.state);
    const epilogue = act(cleared, { kind: "read_epilogue" });
    const before = epilogue.travelBudget;
    const agra = play(epilogue, (state) => state.currentCityId === "agra" && noScene(state), ["open_the_app", "pay_deposit", "well_spotted"]);
    expect(ids(agra)).toEqual(["gt_delhi_depart_scam", "gt_delhi_depart_station", "gt_agra_arrive_reel"]);
    expect(agra.chosen).toEqual(expect.arrayContaining(["open_the_app", "pay_deposit", "well_spotted"]));
    expect(agra.state.travelBudget).toBe(before - 500);
    expect(agra.state.storyProgress.flags).toEqual(expect.arrayContaining(["gt_delhi_scam_checked", "gt_delhi_scam_paid"]));
    expect(shown(agra, "それに、さっきのアプリ、『定刻』って出てた。古いのは、たぶん、こっちの話の方")).toBe(true);
    expect(shown(agra, "手付金は、高い授業料だったね。")).toBe(true);
    expect(shown(agra, "よかった！　まあまあの点で、大喜び。それ、いちばんいい成績だと思います")).toBe(true);
    expect(shown(agra, "旦那さまじゃないです！　鳩の役の人です！")).toBe(true);
    // The departure's scenes ran in Delhi, before its items were left behind; the arrival's after the conversation.
    expect(agra.scenes.map((scene) => scene.city)).toEqual(["delhi", "delhi", "agra"]);

    // Without the date and the homework, and doubting at once: no money, no Roohi news, no reel.
    const plain = act(clearCity(delhiStart()), { kind: "read_epilogue" });
    const left = play(plain, (state) => state.currentCityId === "agra" && noScene(state), ["check_the_board", "ask_the_caller", "half_and_half"]);
    expect(ids(left)).toEqual(["gt_delhi_depart_scam", "gt_delhi_depart_station"]);
    expect(left.state.travelBudget).toBe(plain.travelBudget);
    expect(left.state.storyProgress.flags).toContain("gt_delhi_scam_doubted");
    expect(left.state.storyProgress.flags).not.toContain("gt_delhi_scam_paid");
    expect(shown(left, "掲示板を見ようって言われたとき、すごく急がせたよね。見られたら、困るみたいに")).toBe(true);
    expect(shown(left, "……一時間、遅かった")).toBe(false);
  }, 180_000);

  describe("Jaipur", () => {
    let jaipur: GameState | undefined;
    const jaipurStart = () => (jaipur ??= finishEpisode(cityStart("jaipur"), "gt_jaipur_main_hawa_mahal"));

    it("plays the mehndi night (「明日にする」 leaves it for another night), the morning after, and the night again once", () => {
      // The night is the mehndi_hidden_name mini-game: its outcome later (「明日にする」, # later) leaves it, found ends it.
      const jalMahal = playDate(jaipurStart(), "gt_jaipur_date_jal_mahal", ["you_decide"]);
      expect(jalMahal.chosen).toContain("you_decide");
      const first = rest(jalMahal.state, 20 * 60, ["later", "did_hear"]);
      expect(ids(first)).toEqual(["gt_jaipur_hotel_mehndi_night", "gt_jaipur_hotel_mehndi_morning"]);
      expect(first.chosen).toContain("later");
      expect(first.scenes.map((scene) => scene.day)).toEqual([jalMahal.state.travel.day, jalMahal.state.travel.day + 1]);
      expect(shown(first, "逃げたね。いいよ。明日の方が、濃くて見つけやすいかも")).toBe(true);
      expect(shown(first, "あら。ここ、名前が書いてある。ヒンディー語で。")).toBe(true);
      // 「また今度」 (# later): seen, not done, so the night comes back; the morning is done.
      expect(first.state.seenEncounterIds).toContain("gt_jaipur_hotel_mehndi_night");
      expect(first.state.completedEncounterIds).not.toContain("gt_jaipur_hotel_mehndi_night");
      expect(first.state.completedEncounterIds).toContain("gt_jaipur_hotel_mehndi_morning");
      const second = rest(first.state, 20 * 60, ["found"]);
      expect(ids(second)).toEqual(["gt_jaipur_hotel_mehndi_night"]);
      expect(second.chosen).toContain("found");
      expect(shown(second, "今夜も、彼女が手のひらを差し出してきた。")).toBe(true);
      expect(shown(second, "けれど、何と書いてあるかは、もう知っている。")).toBe(true);
      expect(second.state.completedEncounterIds).toContain("gt_jaipur_hotel_mehndi_night");
      expect(ids(rest(second.state, 20 * 60))).toEqual([]);
    }, 300_000);

    /** From `start` in Jaipur, every Jaipur sightseeing done; the map's finale (its moment opens with it) played to its epilogue. */
    function finale(prefer: readonly string[], start: GameState = jaipurStart()) {
      let state = start;
      for (const episode of episodes.filter((item) => item.cityId === "jaipur" && item.kind === "episode"))
        if (!state.completedEpisodeIds.includes(episode.id)) state = finishEpisode(state, episode.id);
      let budgetAtEnvelope: number | undefined;
      let budgetAtBattle: number | undefined;
      let budgetAfterBattle: number | undefined;
      let budgetAtEpilogue: number | undefined;
      const played = travel(withAp(state, 12), "gt_jaipur_finale", (current) => {
        if (current.activeEncounter?.encounterId === "gt_jaipur_finale_before_envelope") budgetAtEnvelope ??= current.travelBudget;
        if (current.activeBattle) budgetAtBattle ??= current.travelBudget;
        if (current.activeBattle) expect(current.inventory.gt_jaipur_wedding_envelope).toBe("held");
        if (current.activeEncounter?.encounterId === "gt_jaipur_finale_after_envelope") budgetAfterBattle ??= current.travelBudget;
        if (current.activeEpilogue) budgetAtEpilogue ??= current.travelBudget;
        return !!current.activeEpilogue;
      }, prefer);
      // Paid in the envelope scene before the battle; nothing more from the scenes after it up to the epilogue.
      return { played, spent: budgetAtEnvelope! - budgetAtBattle!, spentAfter: budgetAfterBattle! - budgetAtEpilogue! };
    }

    it("gives the wedding envelope before the finale and hands it over after it (given and used once)", () => {
      const letter = finale(["letter_gift"]);
      expect(ids(letter.played)).toEqual(["gt_jaipur_finale_before_envelope", "gt_jaipur_finale_after_envelope"]);
      expect(letter.played.chosen).toContain("letter_gift");
      expect(letter.spent).toBe(0);
      expect(letter.spentAfter).toBe(0);
      expect(letter.played.state.inventory.gt_jaipur_wedding_envelope).toBe("used");
      expect(letter.played.state.storyProgress.flags).toContain("gt_jaipur_envelope_letter");
      expect(shown(letter.played, "手紙も入ってるね。……毎日言葉にしなさい、か。")).toBe(true);
      // (The reel after the finale waits for the Delhi stepwell date, not played on this way.)
      expect(letter.played.state.playedDateIds).not.toContain("gt_delhi_date_agrasen_baoli");

      const modest = finale(["modest_gift"]);
      expect(modest.played.chosen).toContain("modest_gift");
      expect(modest.spent).toBe(501);
      expect(modest.spentAfter).toBe(0);
      expect(modest.played.state.inventory.gt_jaipur_wedding_envelope).toBe("used");
      expect(shown(modest.played, "……ふん。割り切れないね。よろしい")).toBe(true);
    }, 300_000);

    it("charges the generous gift once, in the envelope scene", () => {
      const generous = finale(["generous_gift"]);
      expect(generous.played.chosen).toContain("generous_gift");
      expect(generous.spent).toBe(1101);
      expect(generous.spentAfter).toBe(0);
      expect(generous.played.state.inventory.gt_jaipur_wedding_envelope).toBe("used");
    }, 300_000);

    it("plays the stepwell reel after the envelope, before the epilogue, once the Delhi stepwell date was played", () => {
      const baoli = playDate(delhiStart(), "gt_delhi_date_agrasen_baoli", []);
      const start = departFromClearedCity(clearCity(departFromClearedCity(clearCity(baoli.state))));
      expect(start.currentCityId).toBe("jaipur");
      const reel = finale(["letter_gift"], start);
      expect(ids(reel.played)).toEqual(["gt_jaipur_finale_before_envelope", "gt_jaipur_finale_after_envelope", "gt_jaipur_finale_after_reel"]);
      expect(shown(reel.played, "踊りの輪がほどけたころ、花嫁のいとこのプージャーが、携帯を握りしめて走ってきた。")).toBe(true);
    }, 300_000);
  });
});
