import { encounterEntryRuleList, encounterVisitSlot } from "../domain/encounter";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getJourney } from "../content/journeys";
import { scenes } from "../content";
import { advanceDate, chooseDate, validateGameState } from "../domain/game";
import { screenFor } from "../domain/screen";
import { debugExampleUrls, debugSessionExampleUrls } from "../../scripts/dev/screen-gallery";
import { installPreparingJourneyTestCities } from "./test-cities";
import { debugQueryString, parseDebugQuery, settingsQuery, type DebugQuery } from "./debug-query";
import { debugEpisodes } from "./debug-edits";
import { createDebugState, debugSceneLocation, debugTargets, defaultDebugSettings, firstDebugTarget, resolveDebugLaunch, type DebugSettings, type DebugTarget } from "./debug-state";
import { installTourTestCity, testTour } from "./test-tours";

const base: DebugSettings = { scene: "tourism", id: "duomo_milano", progress: "completed", ap: 9, affection: 3, trust: 2, spark: 1, roll: "positive" };

describe("debug scene preparation", () => {
  it.each([
    ["tourism", "duomo_milano", "p_duomo"],
    ["battle", "milano_duomo_01", "p_duomo"],
    ["encounter", "galleria_fortune", "p_galleria"],
    ["date", "milano_brera_date_01", "p_brera"],
  ] as const)("opens a valid %s scene using game rules", (scene, id, placeId) => {
    const game = createDebugState({ ...base, scene, id });
    expect(validateGameState(game)).toEqual(game);
    expect(game.affection).toBe(3);
    expect(game.trust).toBe(2);
    expect(game.spark).toBe(1);
    expect(game.travel.currentPlaceId).toBe(placeId);
    expect(scene === "tourism" ? game.activeTourism?.landmarkId : scene === "battle" ? game.activeBattle?.battleId : scene === "encounter" ? game.activeEncounter?.encounterId : game.activeDate?.dateId).toBe(id);
    expect(game.ap).toBe(scene === "date" ? 7 : 9);
  });
  it("uses saved deterministic tickets with the ordinary date choice resolver", () => {
    for (const [roll, expected] of [["positive", "positive"], ["negative", "negative"]] as const) {
      let game = createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", roll });
      for (let i = 0; !game.activeDate!.frame.choices.length; i++) {
        expect(i).toBeLessThan(50);
        game = advanceDate(game, game.revision);
      }
      game = chooseDate(game, game.activeDate!.frame.choices[0].index, game.revision);
      expect(game.activeDate!.resolvedChoices[0].result).toBe(expected);
      expect(validateGameState(game)).toEqual(game);
    }
  });
  it("opens her answer after Debug's records of a deferral (2026-11-13): Debug's relationship values decide it", () => {
    for (const [cityId, id] of [["milano", "milano_answer_01"], ["jaipur", "gt_jaipur_date_answer"]] as const) {
      expect(debugTargets(cityId).date.map((target) => target.id)).toContain(id);
      for (const [values, outcome] of [[{ affection: 0, trust: 0, spark: 0 }, "rejected"], [{ affection: 8, trust: 4, spark: 4 }, "accepted"]] as const) {
        const game = createDebugState({ ...base, cityId, scene: "date", id, ...values });
        expect(validateGameState(game)).toEqual(game);
        expect(game).toMatchObject({ confessionStatus: "deferred", ...values });
        expect(game.activeDate).toMatchObject({ dateId: id, pendingOutcome: outcome, resolutionMode: "fixed" });
      }
    }
  }, 120_000);
  it("does not open a locked scene and keeps the AP limit", () => {
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", progress: "initial" })).toThrow("この進行状態ではデートを始められません。APや解放条件を確認してください。");
    // Debug names the unmet part of the date's condition; AP alone gives no condition text.
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", progress: "initial" }))
      .toThrow("デートの条件を満たしていません：エピソード「五本の指で話す人」を終えた");
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", ap: 0 })).toThrow(/^この進行状態ではデートを始められません。APや解放条件を確認してください。$/u);
    expect(() => createDebugState({ ...base, scene: "date", id: "milano_brera_date_01", ap: 0 })).toThrow("この進行状態ではデートを始められません。APや解放条件を確認してください。");
    expect(createDebugState({ ...base, ap: 99 }).ap).toBe(12);
  });
  it("names the unmet part of an encounter's entry rule before its milestone", () => {
    // Since Milan's rewrite (2026-11-13) Debug plays every Milan encounter's moment to the point its condition holds; a
    // condition planted on an observation's encounter (in memory) stays unmet from the journey's start.
    const rule = encounterEntryRuleList.find((item) => item.encounterId === "brera_sitter")!;
    const kept = rule.when;
    rule.when = { episodeCompleted: "milano_duomo_episode" };
    try {
      expect(() => createDebugState({ ...base, scene: "encounter", id: "brera_sitter", progress: "initial" }))
        .toThrow("この進行状態では交流を始められません。必要な進行や品物を確認してください。入場の条件を満たしていません：エピソード「無人の広場、一名追加」を終えた");
    } finally {
      if (kept) rule.when = kept;
      else delete rule.when;
    }
    // The Galleria's wish opens in its first observation; Nora after the Duomo's battle; Tino after the castle's (which opens at 10:00).
    expect(createDebugState({ ...base, scene: "encounter", id: "galleria_fortune", progress: "initial" }).activeEncounter?.encounterId).toBe("galleria_fortune");
    expect(createDebugState({ ...base, scene: "encounter", id: "duomo_string", progress: "initial" }).activeEncounter?.encounterId).toBe("duomo_string");
    expect(createDebugState({ ...base, scene: "encounter", id: "castello_pick", progress: "initial" }).activeEncounter?.encounterId).toBe("castello_pick");
  });
  it("opens a cleared city's epilogue, not before the clear", () => {
    const game = createDebugState({ ...base, scene: "epilogue", id: "milano_finale" });
    expect(game.activeEpilogue).toMatchObject({ episodeId: "milano_finale" });
    expect(game.completedCityIds).toEqual(["milano"]);
    expect(validateGameState(game)).toEqual(game);
    expect(() => createDebugState({ ...base, scene: "epilogue", id: "milano_finale", progress: "initial" })).toThrow("エピローグは都市クリア後に開けます");
    expect(() => createDebugState({ ...base, scene: "epilogue", id: "milano_duomo_episode" })).toThrow("フィナーレではありません");
  });
});

describe("Debug launch URLs against the content", () => {
  const launch = (search: string) => {
    const parsed = parseDebugQuery(search);
    if (parsed.kind !== "launch") throw new Error(`not a launch URL: ${search}`);
    return resolveDebugLaunch(parsed.query);
  };

  it("fills omitted items with the scene picker's defaults", () => {
    expect(launch("?debug&scene=tourism")).toEqual({ kind: "scene", settings: defaultDebugSettings() });
    const delhi = launch("?debug&city=delhi&scene=battle");
    expect(delhi).toEqual({ kind: "scene", settings: { ...defaultDebugSettings("delhi"), scene: "battle", id: debugTargets("delhi").battle[0].id } });
    expect(launch("?debug&city=milano&scene=date&target=milano_brera_date_01&ap=3&roll=negative")).toEqual({ kind: "scene",
      settings: { ...defaultDebugSettings("milano"), scene: "date", id: "milano_brera_date_01", ap: 3, roll: "negative" } });
    expect(launch("?debug&city=samarkand&scene=map")).toEqual({ kind: "map", cityId: "samarkand" });
  });

  it("starts a date without a held item (without=), for the branch of a player who never got it", () => {
    const akbar = "?debug&city=agra&scene=date&target=gt_agra_date_akbar_tomb";
    const held = launch(akbar);
    const left = launch(`${akbar}&without=gt_delhi_rain_attar`);
    if (held.kind !== "scene" || left.kind !== "scene") throw new Error("not a scene");
    expect(left.settings).toEqual({ ...held.settings, without: ["gt_delhi_rain_attar"] });
    expect(createDebugState(held.settings).inventory.gt_delhi_rain_attar).toBe("held");
    const state = createDebugState(left.settings);
    expect(state.inventory).not.toHaveProperty("gt_delhi_rain_attar");
    expect(state.activeDate?.dateId).toBe("gt_agra_date_akbar_tomb");
    expect(validateGameState(state)).toBeTruthy();
    expect(() => createDebugState({ ...held.settings, without: ["no_such_item"] }))
      .toThrow("without の「no_such_item」は、Debugのこの場面の状態で持っている品物ではありません。");
  });

  it("starts a date before an episode its story asks about (before=), from the city's start", () => {
    const lodhi = launch("?debug&city=delhi&scene=date&target=gt_delhi_date_lodhi_garden&before=gt_delhi_main_humayun_tomb");
    if (lodhi.kind !== "scene") throw new Error("not a scene");
    const state = createDebugState(lodhi.settings);
    expect(state.activeDate?.dateId).toBe("gt_delhi_date_lodhi_garden");
    expect(state.completedEpisodeIds).not.toContain("gt_delhi_main_humayun_tomb");
    expect(state.completedEpisodeIds.length).toBeGreaterThan(0);
    expect(validateGameState(state)).toBeTruthy();
    expect(() => createDebugState({ ...lodhi.settings, before: "gt_agra_main_agra_fort" }))
      .toThrow("before の「gt_agra_main_agra_fort」は、デリーのフィナーレでないエピソードではありません。");
  });

  it("opens free time (scene=free) at a place, day and time, with flags (2026-11-15)", () => {
    const night = launch("?debug&city=milano&scene=free&time=19:00&flags=milano_tino_needs_pick");
    if (night.kind !== "scene") throw new Error("not a scene");
    expect(night.settings).toEqual({ ...defaultDebugSettings("milano"), scene: "free", id: "p_hotel", time: 1140, flags: ["milano_tino_needs_pick"] });
    const state = createDebugState(night.settings);
    expect(validateGameState(state)).toEqual(state);
    expect(screenFor(state)).toBe("free_time");
    expect(state.travel).toMatchObject({ currentPlaceId: "p_hotel", minute: 1140 });
    expect(state.storyProgress.flags).toContain("milano_tino_needs_pick");
    expect(debugSceneLocation(night.settings, state)).toBe(`${debugTargets("milano").free[0].name}（1日目 19:00）`);
    // The hotel first; a place and a day (Delhi's calendar moves with it).
    expect(debugTargets("delhi").free[0]).toEqual({ id: "delhi_hotel_hub", name: "デリーの架空宿（ラジーヴ・チョーク付近）" });
    const gate = launch("?debug&city=delhi&scene=free&target=delhi_india_gate&day=2&time=12:00&progress=initial");
    if (gate.kind !== "scene") throw new Error("not a scene");
    expect(createDebugState(gate.settings).travel).toMatchObject({ currentPlaceId: "delhi_india_gate", day: 2, minute: 720, calendar: { journeyDay: 2 } });
    // Without a time, the progress's own.
    expect(createDebugState({ ...defaultDebugSettings("milano"), scene: "free", id: "p_hotel" }).travel.minute).toBe(540);
  });

  it("starts any scene with the flags it is given, before the scene reads them", () => {
    const date = launch("?debug&city=delhi&scene=date&target=gt_delhi_date_lodhi_garden&flags=gt_delhi_golgappa_sick,gt_delhi_player_sick");
    if (date.kind !== "scene") throw new Error("not a scene");
    const state = createDebugState(date.settings);
    expect(state.activeDate?.dateId).toBe("gt_delhi_date_lodhi_garden");
    expect(state.storyProgress.flags).toEqual(expect.arrayContaining(["gt_delhi_golgappa_sick", "gt_delhi_player_sick"]));
  });

  it.each([
    [{ dataMode: "real", cityId: "milano", scene: "free", flags: ["gt_delhi_golgappa_sick"] },
      "フラグ「gt_delhi_golgappa_sick」はミラノ編のフラグではありません（progression/story.json の flags のID。場面の確認の「フラグを得たことにする」に一覧があります）。"],
    [{ dataMode: "real", cityId: "delhi", scene: "battle", flags: ["no_such_flag"] }, "フラグ「no_such_flag」はインド・ゴールデントライアングル編のフラグではありません"],
    [{ dataMode: "real", cityId: "agra", scene: "free", target: "agra_fatehpur_sikri" }, "「agra_fatehpur_sikri」（ファテープル・シークリー）は、ツアーの場面（scene=tour）から開けます。"],
    [{ dataMode: "real", cityId: "atlantis", scene: "battle" }, "都市「atlantis」は登録されていません。仮の場面の都市なら data=fixture を付けます。"],
    [{ dataMode: "real", cityId: "milano", scene: "battle", target: "gt_delhi_main_red_fort_battle" }, "「gt_delhi_main_red_fort_battle」はミラノの「クイズ」にありません。"],
    [{ dataMode: "real", cityId: "delhi", scene: "encounter" }, "デリーには「人物との交流」の場面がありません。"],
    [{ dataMode: "real", cityId: "milano", scene: "map" }, "地図・交通の確認（scene=map）は制作中の都市だけで使えます。"],
    [{ dataMode: "real", cityId: "samarkand", scene: "battle" }, "サマルカンドは制作中の都市で、物語・クイズはまだありません。地図・交通は scene=map で確認できます。"],
  ] satisfies Array<[DebugQuery, string]>)("explains a URL that does not fit the content: %o", (query, message) => {
    expect(() => resolveDebugLaunch(query)).toThrow(message);
  });

  it("opens every scene the scene picker (場面の確認) lists for a cleared Milan and sample city, and explains the rest", () => {
    if (!getJourney("sample_trip"))
      throw new Error("見本の旅（sample_trip）が生成物にありません。npm run content:build -- --with-sample を実行してから、もう一度テストしてください。");
    const unavailable: string[] = [];
    for (const cityId of ["milano", "mihon"]) {
      for (const [scene, targets] of Object.entries(debugTargets(cityId)) as Array<[DebugSettings["scene"], DebugTarget[]]>) {
        // Neither city has a tour (the tour scenes are opened below, on a fixture tour), nor Milan a scene of its hotel's
        // moment (India's are opened below).
        if (scene === "tour" || (scene === "hotel" && cityId === "milano")) { expect(targets, cityId).toEqual([]); continue; }
        expect(firstDebugTarget(targets), `${cityId} ${scene}`).not.toBe("");
        for (const target of targets) {
          // An encounter before or after a landmark's main part starts on the departure to it: from the journey's start.
          const settings: DebugSettings = { ...base, cityId, scene, id: target.id,
            ...(scene === "encounter" && encounterVisitSlot(target.id) !== "observe" ? { progress: "initial" } : {}) };
          // A scene of the hotel's moment opens at the progress its condition reads (the sample's morning before the clock tower).
          if (scene === "hotel") {
            const opened = (["completed", "initial"] as const).flatMap((progress) => {
              try {
                return [createDebugState({ ...settings, progress })];
              } catch {
                return [];
              }
            });
            expect(opened[0]?.activeEncounter?.encounterId, `${cityId} hotel ${target.id}`).toBe(target.id);
            continue;
          }
          if (!target.unavailable) {
            const game = createDebugState(settings);
            expect(validateGameState(game), `${cityId} ${scene} ${target.id}`).toEqual(game);
            continue;
          }
          // Shown disabled with its reason; the game's own rule refuses it too, and so does its URL.
          unavailable.push(target.id);
          expect(() => createDebugState(settings), target.id).toThrow("この進行状態では交流を始められません。必要な進行や品物を確認してください。");
          expect(() => resolveDebugLaunch({ dataMode: "real", cityId, scene, target: target.id }), target.id)
            .toThrow(`「${target.id}」（${target.name}）は、${target.unavailable}。Debugの場面は品物を持たない状態から始まります。`);
        }
      }
    }
    // Every Milan encounter opens (Tino's choices without the pick need nothing; with it, Debug plays Nora first when she comes before).
    expect(unavailable).toEqual([]);
    // The gift needs the bookmark, which the stall before it (played with its first choice) gives.
    // The clock tower's place file (stage 3a) also has two talks; a talk without # title: is named after its place.
    expect(debugTargets("mihon").encounter).toEqual([
      { id: "smp_mihon_bookmark_stall", name: "三時のしおりの露店" },
      { id: "smp_mihon_clock_gears", name: "見本の時計塔" },
      { id: "smp_mihon_bookmark_gift", name: "しおりを渡す" },
      { id: "smp_mihon_clock_bell", name: "見本の時計塔" },
    ]);
    expect(() => createDebugState({ ...base, cityId: "mihon", scene: "encounter", id: "smp_mihon_bookmark_stall" }))
      .toThrow("旅の進行を「旅の開始時」にしてください。");
  });
});

// The scenes screenshots needed Debug's code rewritten for (2026-11-16): the confession, a scene's night branch, the hotel's scenes.
describe("Debug launch URLs for the confession, the clock of any scene and the hotel's scenes (2026-11-16)", () => {
  const launch = (search: string) => {
    const parsed = parseDebugQuery(search);
    if (parsed.kind !== "launch") throw new Error(parsed.kind === "error" ? parsed.message : `not a launch URL: ${search}`);
    const resolved = resolveDebugLaunch(parsed.query);
    if (resolved.kind !== "scene") throw new Error(`not a scene: ${search}`);
    return resolved.settings;
  };
  const confession = "?debug&city=agra&scene=date&target=gt_agra_date_confession";

  it("lists each city's confession and opens it at night, at its stage, with the dates it counts: the values alone decide her answer", () => {
    for (const [cityId, id] of [["milano", "milano_confession_01"], ["agra", "gt_agra_date_confession"], ["jaipur", "gt_jaipur_date_confession"],
      ["jaipur", "gt_jaipur_date_her_confession"]] as const)
      expect(debugTargets(cityId).date.find((target) => target.id === id)?.name, id).toMatch(/（告白）$/u);
    for (const [values, outcome] of [["", "rejected"], ["&affection=4&trust=2", "deferred"], ["&affection=8&trust=4&spark=4", "accepted"]] as const) {
      const state = createDebugState(launch(`${confession}${values}`));
      expect(validateGameState(state)).toEqual(state);
      expect(state.activeDate, values).toMatchObject({ dateId: "gt_agra_date_confession", pendingOutcome: outcome });
      expect(state.romanceStage).toBeGreaterThanOrEqual(2);
      // Its `# when: time night` (18:00 on); three ordinary dates of the city recorded as played (the confession counts three).
      expect(state.travel.minute).toBeGreaterThanOrEqual(18 * 60);
      expect(state.playedDateIds).toEqual(["gt_agra_date_mehtab_bagh", "gt_agra_date_akbar_tomb", "gt_agra_date_ram_bagh"]);
    }
    // Before the city's first episode, the date's own condition says what is missing.
    expect(() => createDebugState(launch(`${confession}&progress=initial`)))
      .toThrow("デートの条件を満たしていません：アーグラのエピソードを1つ以上終えた");
  }, 120_000);

  it("does not record a date the confession's story asks about (cond(\"date …\")), so its branch stays the player's", () => {
    const scene = scenes.find((item) => item.main && "date" in item.main && item.main.date === "gt_agra_date_confession")!;
    const kept = scene.conds;
    // Agra's story already asks about gt_agra_date_chini_rauza (its own cond), so that one is skipped too.
    (scene as { conds: string[] }).conds = [...kept, "date gt_agra_date_akbar_tomb"];
    try {
      expect(createDebugState(launch(confession)).playedDateIds)
        .toEqual(["gt_agra_date_mehtab_bagh", "gt_agra_date_ram_bagh", "gt_agra_date_mariam_tomb"]);
    } finally {
      (scene as { conds: string[] }).conds = kept;
    }
  }, 120_000);

  it("opens any scene at a chosen time, so a date's cond(\"time night\") branch shows (from the hotel, the clock's rules kept)", () => {
    const chowk = "?debug&city=delhi&scene=date&target=gt_delhi_date_chandni_chowk";
    const night = createDebugState(launch(`${chowk}&time=19:00`));
    expect(night.travel.minute).toBe(19 * 60);
    expect(night.activeDate?.frame.text).toMatch(/^日が落ちても/u);
    expect(validateGameState(night)).toEqual(night);
    expect(createDebugState(launch(chowk)).activeDate?.frame.text).toMatch(/^チャンドニー・チョークの路地は、昼でも薄暗い/u);
    // The day moves the journey's calendar, as free time's does.
    expect(createDebugState(launch(`${chowk}&day=3&time=12:00`)).travel).toMatchObject({ day: 3, minute: 720, calendar: { journeyDay: 3 } });
    expect(launch(`${chowk}&time=19:00`)).toMatchObject({ scene: "date", time: 1140 });
  }, 120_000);

  it("lists the hotel's scenes and opens each through 「休む」, the night's scenes first when it rests at night", () => {
    expect(debugTargets("delhi").hotel).toEqual([
      { id: "gt_delhi_hotel_homework", name: "宿の場面（休む前の夜）" },
      { id: "gt_delhi_hotel_sick_night_player", name: "宿の場面（休む前の夜）" },
      { id: "gt_delhi_hotel_sick_night_heroine", name: "宿の場面（休む前の夜）" },
      { id: "gt_delhi_hotel_sick_morning", name: "宿の場面（翌朝）" },
    ]);
    const morning = "?debug&city=delhi&scene=hotel&target=gt_delhi_hotel_sick_morning";
    // Its `# when: flag gt_delhi_golgappa_sick` set by Debug; the next morning at 9:00.
    const plain = createDebugState(launch(morning));
    expect(validateGameState(plain)).toEqual(plain);
    expect(plain.activeEncounter?.encounterId).toBe("gt_delhi_hotel_sick_morning");
    expect(plain.storyProgress.flags).toContain("gt_delhi_golgappa_sick");
    expect(plain.travel.minute).toBe(9 * 60);
    expect(debugSceneLocation(launch(morning), plain)).toMatch(/（\d+日目 09:00）$/u);
    // Sick himself, resting at 19:00: the night in the corridor came first, and the morning tells of it.
    const sick = createDebugState(launch(`${morning}&flags=gt_delhi_player_sick&time=19:00`));
    expect(sick.seenEncounterIds).toContain("gt_delhi_hotel_sick_night_player");
    expect(sick.activeEncounter?.frame.text).toMatch(/^朝、こちらの部屋の扉を叩く音がした/u);
    // A night scene opens before the rest; one whose condition Debug cannot set says so.
    expect(createDebugState(launch("?debug&city=delhi&scene=hotel&target=gt_delhi_hotel_homework")).activeEncounter?.encounterId).toBe("gt_delhi_hotel_homework");
    expect(() => createDebugState(launch("?debug&city=delhi&scene=hotel&target=gt_delhi_hotel_homework&progress=initial")))
      .toThrow("宿の時点の場面 gt_delhi_hotel_homework の条件をDebugでは満たせません：デリーのエピソードを1つ以上終えた");
  }, 120_000);

  it.each([
    [{ dataMode: "real", cityId: "milano", scene: "hotel" }, "ミラノには「宿の場面（休む）」の場面がありません。"],
    [{ dataMode: "real", cityId: "delhi", scene: "hotel", target: "gt_agra_date_confession" }, "「gt_agra_date_confession」はデリーの「宿の場面（休む）」にありません。"],
    [{ dataMode: "real", cityId: "delhi", scene: "date", target: "gt_agra_date_reassurance" }, "「gt_agra_date_reassurance」はデリーの「デート」にありません。"],
  ] satisfies Array<[DebugQuery, string]>)("explains a hotel or confession URL that does not fit the content: %o", (query, message) => {
    expect(() => resolveDebugLaunch(query)).toThrow(message);
  });
});

describe("Debug's tour scene (scene=tour; tour stage 2a)", () => {
  it("opens Fatehpur Sikri's scenes in Agra only through its tour, with the tour reason and no item sentence", () => {
    const targets = debugTargets("agra");
    expect(targets.tour).toEqual([{ id: "gt_agra_tour_fatehpur_sikri", name: "ファテープル・シークリー日帰りツアー" }]);
    for (const [scene, id] of [["tourism", "agra_fatehpur_sikri"], ["battle", "gt_agra_main_fatehpur_sikri_battle"], ["occasion", "agra_fatehpur_sikri"]] as const) {
      const target = targets[scene].find((item) => item.id === id)!;
      expect(target, `${scene} ${id}`).toMatchObject({ unavailable: "ツアーの場面（scene=tour）から開けます", unavailableKind: "tour" });
      expect(() => resolveDebugLaunch({ dataMode: "real", cityId: "agra", scene, target: id }))
        .toThrow(`「${id}」（${target.name}）は、ツアーの場面（scene=tour）から開けます。`);
      expect(() => resolveDebugLaunch({ dataMode: "real", cityId: "agra", scene, target: id })).not.toThrow("品物");
    }
  });


  it("lists the city's tours, marks the tour-only place's scenes as opened from the tour, and opens the tour booked or at its step", () => {
    const cleanup = installTourTestCity();
    try {
      const targets = debugTargets(testTour.cityId);
      expect(targets.tour).toEqual([{ id: testTour.tourId, name: "見本の街の日帰りツアー" }]);
      const tourOnly = { unavailable: "ツアーの場面（scene=tour）から開けます", unavailableKind: "tour" };
      expect(targets.tourism.find((item) => item.id === "mihon_library")).toMatchObject(tourOnly);
      expect(targets.battle.find((item) => item.id === testTour.eventId)).toMatchObject(tourOnly);
      expect(targets.occasion.find((item) => item.id === "mihon_library")).toMatchObject(tourOnly);
      expect(targets.tourism.find((item) => item.id === "mihon_clock_tower")?.unavailable).toBeUndefined();
      // The URL's refusal names the tour scene, without the item sentence.
      expect(() => resolveDebugLaunch({ dataMode: "real", cityId: testTour.cityId, scene: "battle", target: testTour.eventId }))
        .toThrow(/^「smp_mihon_special_c_library」（.+）は、ツアーの場面（scene=tour）から開けます。$/u);
      // Booked at the city's start (the default progress of a tour), or at its visit with step=.
      const launch = resolveDebugLaunch({ dataMode: "real", cityId: testTour.cityId, scene: "tour", target: testTour.tourId });
      expect(launch).toMatchObject({ kind: "scene", settings: { scene: "tour", id: testTour.tourId, progress: "initial" } });
      const booked = createDebugState((launch as Extract<typeof launch, { kind: "scene" }>).settings);
      expect(validateGameState(booked)).toEqual(booked);
      expect(booked.tour).toMatchObject({ status: "booked", tourId: testTour.tourId, offerId: testTour.desk.id });
      expect(debugSceneLocation((launch as Extract<typeof launch, { kind: "scene" }>).settings, booked)).toBe("ツアー：見本の街の日帰りツアー（予約中）");
      const visit = createDebugState({ ...base, cityId: testTour.cityId, scene: "tour", id: testTour.tourId, progress: "initial", step: "visit" });
      expect(validateGameState(visit)).toEqual(visit);
      expect(visit.tour).toMatchObject({ status: "running", step: 1 });
      expect(visit.travel.currentPlaceId).toBe(testTour.placeId);
      expect(debugSceneLocation({ ...base, scene: "tour", id: testTour.tourId }, visit)).toMatch(/^ツアー：見本の街の日帰りツアー（.+）$/u);
      expect(() => createDebugState({ ...base, cityId: testTour.cityId, scene: "tour", id: testTour.tourId, progress: "initial", step: "out" }))
        .toThrow("「out」は見本の街の日帰りツアーの見学の行程ではありません（行程：visit）。");
      expect(() => createDebugState({ ...base, cityId: testTour.cityId, scene: "tour", id: testTour.tourId, progress: "completed" }))
        .toThrow("ツアーは都市クリアの前に予約します。旅の進行を「旅の開始時」にしてください。");
      expect(parseDebugQuery("?debug&city=mihon&scene=tour&target=smp_mihon_tour_test&step=visit"))
        .toEqual({ kind: "launch", query: { dataMode: "real", cityId: "mihon", scene: "tour", target: "smp_mihon_tour_test", step: "visit" } });
      expect(parseDebugQuery("?debug&scene=battle&step=visit")).toEqual({ kind: "error", message: "step は scene=tour（ツアー）で使います。" });
    } finally { cleanup(); }
  });
});

describe("the URL list in docs/10", () => {
  // Every example a person or a test may copy from the docs opens its scene.
  const docs = readFileSync("docs/10_DEVELOPMENT_CHECKS.md", "utf8");
  const urls = [...docs.slice(docs.indexOf("### URLの例"), docs.indexOf("### 人が画面を確かめるときの使い方")).matchAll(/`\/(\?debug&[^`]+)`/g)].map((match) => match[1]);

  it("has examples", () => {
    expect(urls.length).toBeGreaterThan(10);
  });

  /** What a launch URL opens: a scene with a game state, or a prototype city's map. */
  const opens = (search: string) => {
    const parsed = parseDebugQuery(search);
    if (parsed.kind !== "launch") throw new Error(parsed.kind === "error" ? parsed.message : "not a launch URL");
    const cleanup = parsed.query.dataMode === "fixture" ? installPreparingJourneyTestCities() : () => {};
    try {
      const launch = resolveDebugLaunch(parsed.query);
      if (launch.kind === "scene") expect(validateGameState(createDebugState(launch.settings))).toBeTruthy();
      return launch.kind;
    } finally {
      cleanup();
    }
  };

  it.each(urls)("opens %s", (search) => {
    expect(["scene", "map"]).toContain(opens(search));
  });

  it("gives the monkey every example that opens a scene with a game state as a Debug start point, and only those", () => {
    // The monkey (tests/e2e/explore/monkey.spec.ts) reads the game state of each start point;
    // the map check shows none, so a start there could only fail.
    const examples = debugExampleUrls(docs).map((item) => item.url);
    const starts = debugSessionExampleUrls(docs).map((item) => item.url);
    expect(starts).toEqual(examples.filter((url) => opens(url) === "scene"));
    expect(starts.length).toBeGreaterThan(10);
  });
});


// 2026-11-25 user request: 「〇〇のエピソードを終えた状態を得る」 for a scene whose `# when: episodes <city> >= 1` the journey's start lacks.
describe("Debug's episodes finished first (episodes=…; from the journey's start)", () => {
  const launch = (search: string) => {
    const parsed = parseDebugQuery(search);
    if (parsed.kind !== "launch") throw new Error(parsed.kind === "error" ? parsed.message : `not a launch URL: ${search}`);
    const resolved = resolveDebugLaunch(parsed.query);
    if (resolved.kind !== "scene") throw new Error(`not a scene: ${search}`);
    return resolved.settings;
  };
  const indiaGate = "?debug&city=delhi&scene=date&target=gt_delhi_date_india_gate&progress=initial";

  it("lists the city's episodes without its finale, and opens a date that needs one finished", () => {
    expect(debugEpisodes("delhi").map((episode) => episode.id))
      .toEqual(["gt_delhi_main_red_fort", "gt_delhi_main_qutb_minar", "gt_delhi_main_humayun_tomb", "gt_delhi_main_jama_masjid"]);
    expect(() => createDebugState(launch(indiaGate))).toThrow("デートの条件を満たしていません：デリーのエピソードを1つ以上終えた");
    const settings = launch(`${indiaGate}&episodes=gt_delhi_main_red_fort&ap=5&flags=gt_delhi_golgappa_sick`);
    expect(settings.episodes).toEqual(["gt_delhi_main_red_fort"]);
    const state = createDebugState(settings);
    expect(validateGameState(state)).toEqual(state);
    expect(state.completedEpisodeIds).toEqual(["gt_delhi_main_red_fort"]);
    expect(state.activeDate?.dateId).toBe("gt_delhi_date_india_gate");
    expect(state.storyProgress.flags).toContain("gt_delhi_golgappa_sick");
    // The date's own cost is taken from Debug's AP, set after the episode's rewards.
    expect(state.ap).toBeLessThan(5);
    // The URL keeps the episodes.
    expect(debugQueryString(settingsQuery("real", settings))).toContain("&episodes=gt_delhi_main_red_fort&");
  }, 120_000);

  it("opens the hotel's scene that needs an episode finished", () => {
    const state = createDebugState(launch("?debug&city=delhi&scene=hotel&target=gt_delhi_hotel_homework&progress=initial&episodes=gt_delhi_main_qutb_minar"));
    expect(state.activeEncounter?.encounterId).toBe("gt_delhi_hotel_homework");
  }, 120_000);

  it.each([
    ["&episodes=gt_delhi_finale", "エピソード「gt_delhi_finale」はデリーのフィナーレです。"],
    ["&episodes=gt_agra_main_taj_mahal", "エピソード「gt_agra_main_taj_mahal」はデリーのエピソードではありません"],
  ])("refuses an episode Debug does not offer for the city: %s", (item, message) => {
    expect(() => launch(`${indiaGate}${item}`)).toThrow(message);
  });

  it("refuses episodes after the city is cleared (it has finished them all)", () => {
    expect(() => launch("?debug&city=delhi&scene=date&target=gt_delhi_date_india_gate&episodes=gt_delhi_main_red_fort"))
      .toThrow("episodes は旅の進行が「旅の開始時」（progress=initial）のときに使います。");
  });
});
