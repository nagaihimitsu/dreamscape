// Development only (Debug, the unified event design 4.8 「この時点の候補」): the running occasion's
// steps with their position, whether each started, runs next or was passed and why, each condition
// part's truth, the open choice point's hidden choices with their false parts, and the map
// conditions' parts. It reads the game's own functions (the order and the entry rules the game uses).
import { battles, dates, episodes, landmarks } from "../content";
import { encounters } from "../content/encounters";
import type { Condition } from "../content/condition-schemas";
import { encounterChoiceDisplay, encounterEntryRule, encounterRunsAt, encounterVisitSlot, momentSceneAvailability, nextObservationScene } from "../domain/encounter";
import { canStartAuthoredEpilogue, isAuthoredEpilogueCity } from "../domain/epilogue";
import type { GameState } from "../domain/game";
import { occasionSteps, planThen } from "../domain/occasion";
import { sceneById, sceneOption } from "../domain/scene-effects";
import { explainCondition, type ExplainedNode } from "./condition-explain";

export type CandidatePart = { label: string; value: boolean };
export type CandidateRow = { position: string; name: string; status: "済み" | "実行中" | "次の候補" | "とばす" | "未到達"; reason: string; parts: CandidatePart[] };
export type OccasionCandidates = { title: string; rows: CandidateRow[]; hiddenChoices: { text: string; parts: CandidatePart[] }[]; mapConditions: { name: string; parts: CandidatePart[] }[] };

const leaves = (node: ExplainedNode): CandidatePart[] => node.kind === "leaf" ? [{ label: node.label, value: node.value }] : node.children.flatMap(leaves);
const partsOf = (state: Readonly<GameState>, condition: Condition | undefined): CandidatePart[] => condition ? leaves(explainCondition(state, condition)) : [];
const positionOf = (id: string) => {
  const priority = encounterEntryRule(id)?.priority;
  return typeof priority === "number" ? (priority > 0 ? `+${priority}` : String(priority)) : priority ?? "after observe";
};
const partNames = { guide: "案内", observe: "観察", battle: "バトル", date: "デート", ending: "「交際開始」の画面", move: "移動", ticket: "入場",
  sleep: "眠る", epilogue: "エピローグ", depart: "出発", logo: "ロゴ", arrival: "到着の会話" } as const;
const sceneName = (id: string) => sceneById(id)?.title ?? encounters.encounters.find((event) => event.id === id)?.titleJa ?? id;

/** The candidate table of the running occasion (null when none runs), and the map conditions in free time. */
export function occasionCandidates(state: GameState): OccasionCandidates {
  const occasion = state.occasion;
  const mapConditions = [
    ...episodes.filter((item) => item.cityId === state.currentCityId && item.when).map((item) => ({ name: item.titleJa, parts: partsOf(state, item.when) })),
    ...battles.filter((item) => item.cityId === state.currentCityId && (item as { when?: Condition }).when)
      .map((item) => ({ name: item.titleJa, parts: partsOf(state, (item as { when?: Condition }).when) })),
    ...dates.filter((item) => item.chapterId === state.currentCityId && item.when).map((item) => ({ name: item.titleJa, parts: partsOf(state, item.when) })),
  ];
  const epilogueNote = isAuthoredEpilogueCity(state.currentCityId)
    ? [{ position: "エピローグ", name: "then: epilogue で始まる都市", status: "未到達" as const,
      reason: canStartAuthoredEpilogue(state) ? "まだ読んでいない（作者の then: epilogue で始まる）" : "エピローグをもう読んだ（then: epilogue は何もしない）", parts: [] }] : [];
  if (!occasion) return { title: "時点なし（自由時間）", rows: epilogueNote, hiddenChoices: [], mapConditions };
  const landmark = landmarks.find((item) => item.id === occasion.landmarkId);
  const rows: CandidateRow[] = [];
  const steps = occasionSteps(occasion);
  const atIndex = occasion.at === null ? -1 : steps.findIndex((step) => ("scene" in step ? step.scene : `main:${step.part}`) === (occasion.at === "left:observe" ? "main:observe" : occasion.at));
  let nextFound = false;
  steps.forEach((step, index) => {
    if ("part" in step) {
      const ran = occasion.ran.includes(step.part);
      rows.push({ position: "0（本筋）", name: partNames[step.part], status: ran ? (index === atIndex ? "実行中" : "済み") : index < atIndex ? "とばす" : "未到達",
        reason: ran ? "" : index < atIndex ? "この時点では始まらなかった" : "", parts: [] });
      if (step.part === "observe" && landmark) for (const id of encounters.encounters.filter((event) => encounterVisitSlot(event.id) === "observe" && encounterRunsAt(event.id, landmark.id)).map((event) => event.id)) {
        const started = occasion.started.includes(id);
        rows.push({ position: positionOf(id), name: sceneName(id), status: started ? "済み" : nextObservationScene(state) === id ? "次の候補" : "未到達",
          reason: started ? "" : momentSceneAvailability({ ...state, activeTourism: null, activeEncounter: null }, id).reason, parts: partsOf(state, encounterEntryRule(id)?.when) });
      }
      return;
    }
    const id = step.scene;
    const started = occasion.started.includes(id);
    const availability = momentSceneAvailability({ ...state, activeTourism: null, activeEncounter: null, activeBattle: null }, id);
    const thenPlan = sceneById(id)?.then && planThen(state, sceneById(id)!.then!, id);
    const reason = started ? "" : occasion.then ? "前の場面の then: で時点が終わる" :
      step.after && !occasion.ran.includes(step.after) ? `${partNames[step.after]}がこの時点で流れていない` :
        thenPlan && thenPlan.ok === false ? `then: が払えない（${thenPlan.reason}）` : availability.available ? "" : availability.reason;
    const status = started ? (occasion.at === id ? "実行中" : "済み") : index < atIndex ? "とばす" : !reason && !nextFound ? "次の候補" : reason ? "とばす" : "未到達";
    if (status === "次の候補") nextFound = true;
    rows.push({ position: positionOf(id), name: sceneName(id), status, reason, parts: partsOf(state, encounterEntryRule(id)?.when) });
  });
  const active = state.activeEncounter;
  const scene = active && sceneById(active.encounterId);
  const hiddenChoices = active && scene ? active.frame.choices.filter((choice) => encounterChoiceDisplay(state, choice.index).show === "hidden").map((choice) => {
    const option = sceneOption(scene, choice.optionId);
    return { text: choice.text, parts: (option?.requires ?? []).flatMap((condition) => partsOf(state, condition)).filter((part) => !part.value) };
  }) : [];
  const kindNames = { date: "デート", battle: "バトル", hotel: "宿", epilogue: "エピローグ", depart: "都市の出発", arrive: "到着" } as const;
  const title = (occasion.trip ? `移動（${occasion.trip.modeId}：${occasion.trip.from} → ${occasion.trip.to}）→ ` : "") + (occasion.ticket ? "窓口 → " : "") +
    (occasion.kind === "visit" ? `観光地：${landmark?.nameJa ?? occasion.landmarkId}${occasion.eventId ? "" : "（本筋なし）"}` : `${kindNames[occasion.kind]}：${occasion.eventId ?? occasion.cityId}`);
  return { title, rows: [...rows, ...epilogueNote], hiddenChoices, mapConditions };
}
