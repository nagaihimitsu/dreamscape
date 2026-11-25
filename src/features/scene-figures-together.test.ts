// Two people opposite the heroine on each story screen (`# together:`, 2026-11-15 user decision; scene-stage.ts): the
// date, the guide, the epilogue, the battle and the talk draw her and the two the line's tag names, in the order written, laid out
// three in a row (`data-together="three"`), or the two side by side while she is off stage (`pair`); with three names
// (2026-11-20), four in a row (`four`), or the three in a row without her (`trio`). Each screen is
// rendered at a line of a real India scene with the tag (the scene's first render: its stage starts there). The screens'
// stages without the tag are scene-figures.test.ts's, unchanged.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { dates } from "../content";
import {
  cityStart, completedCity, openBattleScene, openEpilogueScene, openTourismScene, rollTickets, startDateScene, withAp,
} from "../dev/scenario-builders";
import type { GameState } from "../domain/game";
import type { StoryFrame } from "../story/frame-reader";
import { BattleScreen } from "./battle/BattleScreen";
import { EncounterScreen, type EncounterScreenView } from "./journey/EncounterScreen";
import { EpilogueScreen } from "./journey/EpilogueScreen";
import { loadLearning } from "./learning/learning-storage";
import type { Learning } from "./learning/useLearning";
import { RomanceScene } from "./romance/RomanceScene";
import { TourismScreen } from "./tourism/TourismScreen";

vi.stubGlobal("document", { hidden: false, querySelector: () => null, addEventListener: () => undefined, removeEventListener: () => undefined });
vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
vi.stubGlobal("window", globalThis);
afterAll(() => { vi.unstubAllGlobals(); });

const nothing = () => undefined;
type Figures = { figures: string[]; together: string | null; slots: string[] };

/** The figures a screen's markup draws, in order (by their pictures), its layout for two opposite her, and the places of the people opposite her. */
function drawn(markup: string): Figures {
  const figures = [...markup.matchAll(/<div class="vn-character[ "][^>]*><img src="[^"]*\/assets\/characters\/([^/"]+)\//gu)].map((match) => match[1]);
  const together = /data-together="([a-z]+)"/u.exec(markup)?.[1] ?? null;
  const slots = [...markup.matchAll(/class="(?:encounter|battle)-character-slot (?:encounter-character-|battle-)(enemy|beside|far)"/gu)].map((match) => match[1]);
  return { figures, together, slots };
}

/** The scene's state with its line changed (no one leaves or stands together at it unless `line` says). */
function atLine<K extends "activeDate" | "activeBattle" | "activeEpilogue" | "activeTourism">(state: GameState, key: K, line: Partial<StoryFrame>): GameState {
  const active = state[key]!;
  const { leave: _left, together: _together, ...frame } = active.frame!;
  return { ...state, [key]: { ...active, frame: { ...frame, ...line } } };
}

describe("a date with two people opposite her (RomanceScene): Guru ka Taal, the father and the son", () => {
  const DATE = "gt_agra_date_guru_ka_taal";
  const start = startDateScene(withAp(completedCity("agra"), 12), DATE, rollTickets.positive);
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(RomanceScene, {
    game, date: dates.find((date) => date.id === DATE), speed: 0, onSpeed: nothing, reduceMotion: true, onSelect: () => true, onAdvance: nothing,
    onFinish: nothing })));
  const son = { speaker: "person" as const, speakerPersonId: "gt_gurmeet", text: "親父に言ってください", together: ["gt_harbans", "gt_gurmeet"] };

  it("draws her and the two in a row, the father first as written", () => {
    expect(render(atLine(start, "activeDate", son))).toEqual({ figures: ["heroine", "gt_harbans", "gt_gurmeet"], together: "three", slots: ["enemy", "beside"] });
  });

  it("draws the two side by side while she is off stage, and one person as before when one of them leaves", () => {
    expect(render(atLine(start, "activeDate", { ...son, leave: ["heroine"] }))).toEqual({ figures: ["gt_harbans", "gt_gurmeet"], together: "pair", slots: ["enemy", "beside"] });
    expect(render(atLine(start, "activeDate", { ...son, leave: ["gt_harbans"] }))).toEqual({ figures: ["heroine", "gt_gurmeet"], together: null, slots: ["enemy"] });
  });
});

describe("a guide with two people opposite her (TourismScreen): the Red Fort", () => {
  const start = openTourismScene(cityStart("delhi"), "delhi_red_fort");
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(TourismScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onDiscover: () => false, onNotebook: nothing,
    onBattle: nothing, onReplayGuide: nothing })));

  it("draws her and the two in a row", () => {
    expect(render(atLine(start, "activeTourism", { speaker: "narrator", together: ["gt_sonu", "gt_anjali"] })))
      .toEqual({ figures: ["heroine", "gt_sonu", "gt_anjali"], together: "three", slots: ["enemy", "beside"] });
  });
});

describe("an epilogue with two people opposite her (EpilogueScreen): Delhi's, Aman and his grandmother", () => {
  const start = openEpilogueScene(completedCity("delhi"));
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(EpilogueScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing })));

  it("draws the scene's person (enemy) and a person beside them", () => {
    expect(render(atLine(start, "activeEpilogue", { speaker: "enemy", text: "祖母が喜びそうな返事だ", together: ["gt_kamla", "enemy"] })))
      .toEqual({ figures: ["heroine", "gt_kamla", "gt_aman"], together: "three", slots: ["enemy", "beside"] });
  });
});

describe("a battle with two people opposite her (BattleScreen): Jama Masjid, Hamid and Zoheb", () => {
  const BATTLE = "gt_delhi_main_jama_masjid_battle";
  const start = openBattleScene(cityStart("delhi"), BATTLE);
  const learning: Learning = { data: loadLearning({ getItem: () => null, setItem: nothing }).data, error: "", update: () => true, isMarked: () => false };
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(BattleScreen, {
    learning, onEnglish: nothing, game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onAnswer: () => true,
    onClaimRewards: nothing, onPress: nothing, onSubmitEvidence: nothing })));
  const zoheb = { speaker: "person" as const, speakerPersonId: "gt_zoheb", text: "また爺さんの作り話だ", together: ["enemy", "gt_zoheb"] };

  it("draws her, the opponent in their place and the person beside them, three in a row", () => {
    expect(render(atLine(start, "activeBattle", zoheb))).toEqual({ figures: ["heroine", "gt_hamid", "gt_zoheb"], together: "three", slots: ["enemy", "beside"] });
  });

  it("draws her, the opponent and two people beside them, four in a row, at a tag with three names (Hawa Mahal's finale)", () => {
    const finale = openBattleScene(completedCity("jaipur"), "gt_jaipur_finale_battle");
    const nani = { speaker: "person" as const, speakerPersonId: "gt_jaipur_bride_grandmother", text: "十六でこの家に来て、六十年。",
      together: ["enemy", "gt_pooja", "gt_jaipur_bride_grandmother"] };
    expect(render(atLine(finale, "activeBattle", nani)))
      .toEqual({ figures: ["heroine", "gt_kamla", "gt_pooja", "gt_jaipur_bride_grandmother"], together: "four", slots: ["enemy", "beside", "far"] });
  });

  it("shows the opponent alone over the quiz, as before", () => {
    const question = atLine(start, "activeBattle", zoheb);
    expect(render({ ...question, activeBattle: { ...question.activeBattle!, phase: "question" } }))
      .toEqual({ figures: ["gt_hamid"], together: null, slots: ["enemy"] });
  });
});

describe("a talk with two people opposite her (EncounterScreen): Delhi's sick morning, the okami and Roohi", () => {
  const learning: Learning = { data: loadLearning({ getItem: () => null, setItem: nothing }).data, error: "", update: () => true, isMarked: () => false };
  // The scene's person (# person: gt_roohi) is its enemy; the okami speaks in her own name.
  const scene = { enemyFigure: "gt_roohi" };
  const view = (line: EncounterScreenView["stage"]["line"]): EncounterScreenView => ({
    id: "gt_delhi_hotel_sick_morning_talk", revision: 1, placeJa: "宿", background: "gt_bg_delhi_hotel_corridor", speaker: "おかみ", narration: false,
    text: "キチュリー。うちでは、お腹を壊したら、これ", minute: 480, choices: [], ended: false, cityId: "delhi", sceneId: "gt_delhi_hotel_sick_morning",
    stage: { line, scene, heroine: { emotion: "neutral" }, enemy: { emotion: "neutral" } } });
  const render = (line: EncounterScreenView["stage"]["line"]) => drawn(renderToStaticMarkup(createElement(EncounterScreen, {
    view: view(line), learning, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onChoose: () => true, onAnswer: () => true,
    onFinish: nothing })));
  const okami = { speaker: "person" as const, personFigure: "gt_delhi_hotel_okami", together: [{ figure: "gt_delhi_hotel_okami" }, "enemy" as const] };

  it("draws the two side by side before she comes, and the three in a row once she is there", () => {
    expect(render(okami)).toEqual({ figures: ["gt_delhi_hotel_okami", "gt_roohi"], together: "pair", slots: ["enemy", "beside"] });
    expect(render({ ...okami, heroineCue: true })).toEqual({ figures: ["heroine", "gt_delhi_hotel_okami", "gt_roohi"], together: "three", slots: ["enemy", "beside"] });
  });

  it("draws three in a row before she comes, and four in a row once she is there, at a tag with three names", () => {
    const three = { ...okami, together: [...okami.together, { figure: "gt_pooja" }] };
    expect(render(three)).toEqual({ figures: ["gt_delhi_hotel_okami", "gt_roohi", "gt_pooja"], together: "trio", slots: ["enemy", "beside", "far"] });
    expect(render({ ...three, heroineCue: true }))
      .toEqual({ figures: ["heroine", "gt_delhi_hotel_okami", "gt_roohi", "gt_pooja"], together: "four", slots: ["enemy", "beside", "far"] });
  });
});
