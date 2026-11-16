// A remembered line (`# remembered`, 2026-11-16 user decision) on each of the five story screens: the date, the guide,
// the epilogue (and arrival), the battle's talk and the talk or encounter. Each is rendered at a line of Kamla's earlier
// words (gt_kamla has a figure) as the scene's first render: her name on the plate with 「回想」 beside it (read
// 「カムラ（回想）」), the window marked for its memory's tone, and no figure of hers; the same line without the tag
// brings her on, as before.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, describe, expect, it, vi } from "vitest";
import { dates, storyState } from "../content";
import { stageLine } from "../components/scene-stage";
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
const learning: Learning = { data: loadLearning({ getItem: () => null, setItem: nothing }).data, error: "", update: () => true, isMarked: () => false };
const words = { speaker: "person" as const, speakerPersonId: "gt_kamla", text: "アーグラでも、言いたいことは言いなさい。" };
const remembered = { ...words, remembered: true as const };

type Shown = { figures: string[]; plate: string; mark: boolean; window: boolean };

/** What a screen's markup shows of the line: the figures drawn (by their pictures), the plate's text, its 「回想」 and the window's tone. */
function shown(markup: string): Shown {
  const figures = [...markup.matchAll(/<div class="vn-character[ "][^>]*><img src="[^"]*\/assets\/characters\/([^/"]+)\//gu)].map((match) => match[1]);
  const plate = /<div class="speaker[^"]*"[^>]*>(.*?)<\/div>/u.exec(markup)?.[1].replace(/<[^>]+>/gu, "") ?? "";
  const tone = /data-dialogue-window=""[^>]*data-remembered="true"|data-remembered="true"[^>]*data-dialogue-window=""/u.test(markup);
  return { figures, plate, mark: markup.includes('data-testid="speaker-remembered"'), window: tone };
}

/** The scene's state with its line changed (no one leaves or stands together at it). */
function atLine<K extends "activeDate" | "activeBattle" | "activeEpilogue" | "activeTourism">(state: GameState, key: K, line: Partial<StoryFrame>): GameState {
  const active = state[key]!;
  const { leave: _left, together: _together, ...frame } = active.frame!;
  return { ...state, [key]: { ...active, frame: { ...frame, ...line } } };
}

const remembering = (figures: string[]): Shown => ({ figures, plate: "カムラ（回想）", mark: true, window: true });

describe("a remembered line on the date (RomanceScene)", () => {
  const DATE = "gt_agra_date_guru_ka_taal";
  const start = startDateScene(withAp(completedCity("agra"), 12), DATE, rollTickets.positive);
  const render = (game: GameState) => shown(renderToStaticMarkup(createElement(RomanceScene, {
    game, date: dates.find((date) => date.id === DATE), speed: 0, onSpeed: nothing, reduceMotion: true, onSelect: () => true, onAdvance: nothing,
    onFinish: nothing })));

  it("shows her name with 「回想」 over the remembering window, and no figure of hers", () => {
    expect(render(atLine(start, "activeDate", remembered))).toEqual(remembering(["heroine"]));
    expect(render(atLine(start, "activeDate", words))).toEqual({ figures: ["heroine", "gt_kamla"], plate: "カムラ", mark: false, window: false });
  });
});

describe("a remembered line in the guide (TourismScreen)", () => {
  const start = openTourismScene(cityStart("delhi"), "delhi_red_fort");
  const render = (game: GameState) => shown(renderToStaticMarkup(createElement(TourismScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onSkip: nothing, onDiscover: () => false, onNotebook: nothing,
    onBattle: nothing, onReplayGuide: nothing })));

  it("shows her name with 「回想」 over the remembering window, and no figure of hers", () => {
    expect(render(atLine(start, "activeTourism", remembered))).toEqual(remembering(["heroine"]));
    expect(render(atLine(start, "activeTourism", words)).figures).toEqual(["heroine", "gt_kamla"]);
  });
});

describe("a remembered line in the epilogue (EpilogueScreen)", () => {
  const start = openEpilogueScene(completedCity("delhi"));
  const render = (game: GameState) => shown(renderToStaticMarkup(createElement(EpilogueScreen, {
    game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing })));

  it("shows her name with 「回想」 over the remembering window, and no figure of hers", () => {
    expect(render(atLine(start, "activeEpilogue", remembered))).toEqual(remembering(["heroine"]));
    expect(render(atLine(start, "activeEpilogue", words)).figures).toEqual(["heroine", "gt_kamla"]);
  });
});

describe("a remembered line in the battle's talk (BattleScreen): the Agra finale", () => {
  const start = openBattleScene(completedCity("agra"), "gt_agra_finale_battle");
  const render = (game: GameState) => shown(renderToStaticMarkup(createElement(BattleScreen, {
    learning, onEnglish: nothing, game, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onAnswer: () => true,
    onClaimRewards: nothing, onPress: nothing, onSubmitEvidence: nothing })));

  it("shows her name with 「回想」 over the remembering window, the opponent staying in their place", () => {
    expect(render(atLine(start, "activeBattle", remembered))).toEqual(remembering(["heroine", "gt_anwar"]));
    expect(render(atLine(start, "activeBattle", words)).figures).toEqual(["heroine", "gt_kamla"]);
  });
});

describe("a remembered line in a talk (EncounterScreen)", () => {
  const scene = { enemyFigure: "gt_roohi" };
  const view = (frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "remembered">): EncounterScreenView => ({
    id: "gt_delhi_hotel_sick_morning_talk", revision: 1, placeJa: "宿", background: "gt_bg_delhi_hotel_corridor", speaker: "カムラ", narration: false,
    ...(frame.remembered ? { remembered: true } : {}), text: words.text, minute: 480, choices: [], ended: false, cityId: "delhi",
    sceneId: "gt_delhi_hotel_sick_morning", staging: { ...frame },
    stage: { line: stageLine(frame, storyState.people), scene, heroine: { emotion: "neutral" }, enemy: { emotion: "neutral" } } });
  const render = (frame: Pick<StoryFrame, "speaker" | "speakerPersonId" | "remembered">) => shown(renderToStaticMarkup(createElement(EncounterScreen, {
    view: view(frame), learning, speed: 0, reduceMotion: true, onSpeed: nothing, onAdvance: nothing, onChoose: () => true, onAnswer: () => true,
    onFinish: nothing })));

  it("shows her name with 「回想」 over the remembering window, and no one on the stage", () => {
    expect(render(remembered)).toEqual(remembering([]));
    expect(render(words).figures).toEqual(["gt_kamla"]);
  });
});
