import { encounterVisitSlot } from "../domain/encounter";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getJourney } from "../content/journeys";
import { advanceDate, chooseDate, validateGameState } from "../domain/game";
import { debugExampleUrls, debugSessionExampleUrls } from "../../scripts/dev/screen-gallery";
import { installPreparingJourneyTestCities } from "./test-cities";
import { parseDebugQuery, type DebugQuery } from "./debug-query";
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
    expect(() => createDebugState({ ...base, scene: "encounter", id: "duomo_string", progress: "initial" }))
      .toThrow("この進行状態では交流を始められません。必要な進行や品物を確認してください。入場の条件を満たしていません：エピソード「無人の広場、一名追加」を終えた");
    // The fortune teller's quiz waits for the battle: her observation ignores the rule's when.
    expect(createDebugState({ ...base, scene: "encounter", id: "galleria_fortune", progress: "initial" }).activeEncounter?.encounterId).toBe("galleria_fortune");
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

  it.each([
    [{ dataMode: "real", cityId: "atlantis", scene: "battle" }, "都市「atlantis」は登録されていません。仮の場面の都市なら data=fixture を付けます。"],
    [{ dataMode: "real", cityId: "milano", scene: "battle", target: "gt_delhi_main_red_fort_battle" }, "「gt_delhi_main_red_fort_battle」はミラノの「バトル」にありません。"],
    [{ dataMode: "real", cityId: "delhi", scene: "encounter" }, "デリーには「人物との交流」の場面がありません。"],
    [{ dataMode: "real", cityId: "milano", scene: "encounter", target: "castello_pick" },
      "「castello_pick」（弦を一本、余らせて）は、品物「青いピック」が必要なため開けません。Debugの場面は品物を持たない状態から始まります。"],
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
        // Neither city has a tour (the tour scenes are opened below, on a fixture tour).
        if (scene === "tour") { expect(targets, cityId).toEqual([]); continue; }
        expect(firstDebugTarget(targets), `${cityId} ${scene}`).not.toBe("");
        for (const target of targets) {
          // An encounter before or after a landmark's main part starts on the departure to it: from the journey's start.
          const settings: DebugSettings = { ...base, cityId, scene, id: target.id,
            ...(scene === "encounter" && encounterVisitSlot(target.id) !== "observe" ? { progress: "initial" } : {}) };
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
    expect(unavailable).toEqual(expect.arrayContaining(["castello_pick"]));
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

