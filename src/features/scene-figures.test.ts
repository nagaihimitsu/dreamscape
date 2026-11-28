// The figures each story screen draws are exactly who stands on the scene's stage (src/components/scene-stage.ts; a line's
// `# leave:`, 2026-11-13): the date, the guide, the arrival and epilogue (and a tour's leg) and the battle draw the heroine
// only while she stands there and the one opposite her only while they do. Each screen is rendered at a line of a real
// India scene (the scene's first render: its stage starts there, as after a reload in the middle of a scene); the
// lines that come after a `# leave:` (who comes back when) are the stage's own tests (scene-stage.test.ts).
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
import { EpilogueScreen } from "./journey/EpilogueScreen";
import { loadLearning } from "./learning/learning-storage";
import type { Learning } from "./learning/useLearning";
import { RomanceScene } from "./romance/RomanceScene";
import { TourismScreen } from "./tourism/TourismScreen";

// The screens read the page while they render (the reading's guards, a guide's narrow-screen check); nothing is open.
vi.stubGlobal("document", { hidden: false, querySelector: () => null, addEventListener: () => undefined, removeEventListener: () => undefined });
vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }));
vi.stubGlobal("window", globalThis);
afterAll(() => { vi.unstubAllGlobals(); });

const nothing = () => undefined;
type Figures = { figures: string[]; twoCharacters: boolean };

/** The figures a screen's markup draws, in order (each standing portrait's character, by its picture), and whether two stand side by side. */
function drawn(markup: string): Figures {
  const figures = [...markup.matchAll(/<div class="vn-character[ "][^>]*><img src="[^"]*\/assets\/characters\/([^/"]+)\//gu)].map((match) => match[1]);
  return { figures, twoCharacters: markup.includes('data-two-characters="true"') };
}

/** The scene's state with its line changed (who says it; who leaves at it: no one unless `line` says). */
function atLine<K extends "activeDate" | "activeBattle" | "activeEpilogue" | "activeTourism">(state: GameState, key: K, line: Partial<StoryFrame>): GameState {
  const active = state[key]!;
  const { leave: _written, ...frame } = active.frame!;
  return { ...state, [key]: { ...active, frame: { ...frame, ...line } } };
}

describe("a date's figures (RomanceScene): the India Gate date", () => {
  const DATE = "gt_delhi_date_india_gate";
  const start = startDateScene(withAp(completedCity("delhi"), 12), DATE, rollTickets.positive);
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(RomanceScene, {
    game, date: dates.find((date) => date.id === DATE), speed: 0, onSpeed: nothing, reduceMotion: true, onSelect: () => true, onAdvance: nothing,
    onFinish: nothing })));

  it("has her from the start, as before", () => {
    expect(start.activeDate!.frame.leave).toBeUndefined();
    expect(render(start)).toEqual({ figures: ["heroine"], twoCharacters: false });
  });

  it("draws no one when she runs off at the narration (# leave: heroine)", () => {
    expect(render(atLine(start, "activeDate", { leave: ["heroine"] }))).toEqual({ figures: [], twoCharacters: false });
  });

  it("draws the boy alone, in the middle, while she is away", () => {
    const monu = { speaker: "person" as const, speakerPersonId: "gt_monu", text: "Photo, please!" };
    expect(render(atLine(start, "activeDate", monu))).toEqual({ figures: ["heroine", "gt_monu"], twoCharacters: true });
    expect(render(atLine(start, "activeDate", { ...monu, leave: ["heroine"] }))).toEqual({ figures: ["gt_monu"], twoCharacters: false });
  });
});

describe("a guide's figures (TourismScreen): the Red Fort", () => {
  const start = openTourismScene(cityStart("delhi"), "delhi_red_fort");
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(TourismScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onDiscover: () => false, onNotebook: nothing,
    onBattle: nothing, onReplayGuide: nothing })));

  it("has her from the start, as before, and draws no one once she leaves (# leave: heroine)", () => {
    expect(start.activeTourism!.phase).toBe("guide");
    expect(start.activeTourism!.frame!.leave).toBeUndefined();
    expect(render(start)).toEqual({ figures: ["heroine"], twoCharacters: false });
    expect(render(atLine(start, "activeTourism", { leave: ["heroine"] }))).toEqual({ figures: [], twoCharacters: false });
  });
});

describe("an epilogue's figures (EpilogueScreen): Delhi's, with Aman", () => {
  const start = openEpilogueScene(completedCity("delhi"));
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(EpilogueScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing })));
  const aman = { speaker: "enemy" as const, text: "祖母が喜びそうな返事だ" };

  it("draws the two of them at his line, as before", () => {
    expect(start.activeEpilogue!.episodeId).toBe("gt_delhi_finale");
    expect(render(atLine(start, "activeEpilogue", aman))).toEqual({ figures: ["heroine", "gt_aman"], twoCharacters: true });
  });

  it("takes him off when he walks away (# leave: gt_aman), and her when she does (# leave: heroine)", () => {
    expect(render(atLine(start, "activeEpilogue", { ...aman, leave: ["gt_aman"] }))).toEqual({ figures: ["heroine"], twoCharacters: false });
    expect(render(atLine(start, "activeEpilogue", { ...aman, leave: ["heroine"] }))).toEqual({ figures: ["gt_aman"], twoCharacters: false });
  });
});

describe("a battle's figures (BattleScreen): the Red Fort's school trip, with Nidhi", () => {
  const BATTLE = "gt_delhi_main_red_fort_battle";
  const start = openBattleScene(cityStart("delhi"), BATTLE);
  // A fresh English notebook (nothing stored).
  const learning: Learning = { data: loadLearning({ getItem: () => null, setItem: nothing }).data, error: "", update: () => true, isMarked: () => false };
  const render = (game: GameState) => drawn(renderToStaticMarkup(createElement(BattleScreen, {
    learning, onEnglish: nothing, game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onAnswer: () => true,
    onPress: nothing, onSubmitEvidence: nothing })));
  const anjali = { speaker: "person" as const, speakerPersonId: "gt_anjali", text: "学級委員のアンジャリです。質問は、番号順にします" };

  it("has her and the opponent from the start, as before", () => {
    expect(start.activeBattle!.phase).toBe("dialogue");
    expect(start.activeBattle!.frame!.leave).toBeUndefined();
    expect(render(start)).toEqual({ figures: ["heroine", "gt_nidhi"], twoCharacters: false });
  });

  it("keeps the opponent off at a line that takes them off (# leave: enemy), and her at hers (# leave: heroine)", () => {
    expect(render(atLine(start, "activeBattle", { leave: ["enemy"] }))).toEqual({ figures: ["heroine"], twoCharacters: false });
    expect(render(atLine(start, "activeBattle", { leave: ["heroine"] }))).toEqual({ figures: ["gt_nidhi"], twoCharacters: false });
  });

  it("puts a person in the opponent's place at their line, and no one when they speak from off stage (not the opponent)", () => {
    expect(render(atLine(start, "activeBattle", anjali))).toEqual({ figures: ["heroine", "gt_anjali"], twoCharacters: false });
    expect(render(atLine(start, "activeBattle", { ...anjali, leave: ["gt_anjali"] }))).toEqual({ figures: ["heroine"], twoCharacters: false });
  });

  // The quiz is a part of the talk (2026-11-28 user decision): she stays on stage while the opponent asks.
  it("shows her and the opponent over the quiz, as in the talk", () => {
    const question: GameState = { ...start, activeBattle: { ...start.activeBattle!, phase: "question" } };
    expect(render(question)).toEqual({ figures: ["heroine", "gt_nidhi"], twoCharacters: false });
  });
});
