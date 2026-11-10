// Development only (Debug): what a condition (src/content/condition-schemas.ts) reads and why
// it is false. The game itself gives no reason text for a condition (hidden values stay hidden).
import { battles, dates, episodes, getCities, landmarks } from "../content";
import { encounters } from "../content/encounters";
import { transportLabel } from "../content/transport";
import { isLeaf, leafKind, type Condition, type Leaf } from "../content/condition-schemas";
import { meets } from "../domain/conditions";
import type { GameState } from "../domain/game";
import { relationshipAxisLabels } from "../domain/relationship-change";

/** A condition node with its value now and a Japanese description. */
export type ExplainedNode = { kind: "all" | "any" | "not" | "atLeast" | "leaf"; label: string; value: boolean; children: ExplainedNode[] };

const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"];
const ITEM_STATUS_LABELS = { held: "を持っている", obtained: "を手に入れた", gifted: "を渡した", used: "を使った", left_behind: "を置いてきた" } as const;
const cityName = (id: string) => getCities().find((city) => city.id === id)?.nameJa ?? id;
const landmarkName = (id: string) => landmarks.find((landmark) => landmark.id === id)?.nameJa ?? id;
const range = (prefix: string, { atLeast, atMost }: { atLeast?: number; atMost?: number }) =>
  atLeast !== undefined && atMost !== undefined ? `${prefix}${atLeast}〜${atMost}日目`
    : atLeast !== undefined ? `${prefix}${atLeast}日目以降` : `${prefix}${atMost}日目まで`;

const bounds = ({ atLeast, atMost }: { atLeast?: number; atMost?: number }) =>
  atLeast !== undefined && atMost !== undefined ? `${atLeast}〜${atMost}` : atLeast !== undefined ? `${atLeast}以上` : `${atMost}以下`;

/** One leaf in Japanese (names from the content; the ID when the content lacks it). */
function leafLabel(state: Readonly<GameState>, leaf: Leaf): string {
  if ("episodeCompleted" in leaf) return `エピソード「${episodes.find((item) => item.id === leaf.episodeCompleted)?.titleJa ?? leaf.episodeCompleted}」を終えた`;
  if ("episodesCompleted" in leaf) return `${cityName(leaf.episodesCompleted.city)}のエピソードを${leaf.episodesCompleted.atLeast}つ以上終えた`;
  if ("cityCompleted" in leaf) return `${cityName(leaf.cityCompleted)}の旅を終えた`;
  if ("battlePlayed" in leaf) return `バトル「${battles.find((item) => item.id === leaf.battlePlayed)?.titleJa ?? leaf.battlePlayed}」を遊んだ`;
  if ("landmarkVisited" in leaf) return `${landmarkName(leaf.landmarkVisited)}を訪れた`;
  if ("guideRead" in leaf) return `${landmarkName(leaf.guideRead)}の案内を最後まで読んだ`;
  if ("encounterCompleted" in leaf) return `交流「${encounters.encounters.find((item) => item.id === leaf.encounterCompleted)?.titleJa ?? leaf.encounterCompleted}」を終えた`;
  if ("encounterSeen" in leaf) return `交流「${encounters.encounters.find((item) => item.id === leaf.encounterSeen)?.titleJa ?? leaf.encounterSeen}」を見た`;
  if ("datePlayed" in leaf) return `デート「${dates.find((item) => item.id === leaf.datePlayed)?.titleJa ?? leaf.datePlayed}」を遊んだ`;
  if ("epilogueViewed" in leaf) return `${cityName(leaf.epilogueViewed)}のエピローグを読んだ`;
  if ("item" in leaf) return `品物「${encounters.items.find((item) => item.id === leaf.item.id)?.nameJa ?? leaf.item.id}」${ITEM_STATUS_LABELS[leaf.item.is]}`;
  if ("time" in leaf) return leaf.time === "day" ? "昼（9:00〜18:00）" : "夜（18:00から眠るまで）";
  if ("cityDay" in leaf) return range("この都市の", leaf.cityDay);
  if ("journeyDay" in leaf) return range("旅の", leaf.journeyDay);
  if ("weekday" in leaf) return `${leaf.weekday.map((day) => WEEKDAYS[day]).join("・")}曜日`;
  if ("rides" in leaf) return `${transportLabel(state.currentCityId, leaf.rides.mode)}に${leaf.rides.atLeast}回以上乗った`;
  if ("rented" in leaf) return `${transportLabel(state.currentCityId, leaf.rented)}を借りた`;
  if ("battlesPlayed" in leaf) return `${cityName(leaf.battlesPlayed.city)}のバトル（フィナーレを除く）を${leaf.battlesPlayed.atLeast}つ以上遊んだ`;
  if ("relationship" in leaf) return `${relationshipAxisLabels[leaf.relationship.axis]}が${bounds(leaf.relationship)}（今は${state[leaf.relationship.axis]}）`;
  if ("money" in leaf) return `使えるお金が${bounds(leaf.money)}`;
  if ("romanceStage" in leaf) return `恋愛の段階が${bounds(leaf.romanceStage)}（今は${state.romanceStage}）`;
  if ("couple" in leaf) return "交際している";
  return leafKind(leaf);
}

/** The condition as a tree of nodes, each with its value now. */
export function explainCondition(state: Readonly<GameState>, condition: Condition): ExplainedNode {
  const value = meets(state, condition);
  const explain = (child: Condition) => explainCondition(state, child);
  if (isLeaf(condition)) return { kind: "leaf", label: leafLabel(state, condition), value, children: [] };
  if ("all" in condition) return { kind: "all", label: "次のすべて", value, children: condition.all.map(explain) };
  if ("any" in condition) return { kind: "any", label: "次のどれか", value, children: condition.any.map(explain) };
  if ("not" in condition) return { kind: "not", label: "次ではない", value, children: [explain(condition.not)] };
  return { kind: "atLeast", label: `次のうち${condition.atLeast.count}つ以上`, value, children: condition.atLeast.of.map(explain) };
}

/** A node as one line: a leaf's label, or a combinator with its parts. */
function line(node: ExplainedNode): string {
  return node.kind === "leaf" ? node.label : `${node.label}（${node.children.map(line).join("／")}）`;
}

/**
 * The items of other cities whose parts keep the condition false now (outside `not`), with the status the part asks for,
 * e.g. a scene of Agra that needs Delhi's family photo held. Debug starts a later city after playing the earlier ones
 * along their main path (arrival, battles, finale, epilogue: cityStart), so it holds what their main scenes give but may
 * lack an item only an optional date, inserted scene or encounter gives, or a record of a choice that gave or used one;
 * and 「場面から始める」 plays only the city's own scenes (the item design §2.7).
 */
export function otherCityItemsMissing(state: Readonly<GameState>, condition: Condition): MissingItem[] {
  const missing = new Map<string, MissingItem>();
  const walk = (node: Condition) => {
    if (meets(state, node)) return;
    if (isLeaf(node)) {
      const item = "item" in node ? encounters.items.find((entry) => entry.id === node.item.id) : undefined;
      if (item && "item" in node && item.cityId !== state.currentCityId)
        missing.set(`${item.id} ${node.item.is}`, { itemId: item.id, cityId: item.cityId, cityNameJa: cityName(item.cityId),
          statusJa: ITEM_STATUS_LABELS[node.item.is] });
      return;
    }
    if ("all" in node) node.all.forEach(walk);
    else if ("any" in node) node.any.forEach(walk);
    else if ("atLeast" in node) node.atLeast.of.forEach(walk);
  };
  walk(condition);
  return [...missing.values()];
}

/** An item of another city a condition asks for, with the status in Japanese (e.g. 「を持っている」). */
export type MissingItem = { itemId: string; cityId: string; cityNameJa: string; statusJa: string };

/** What keeps the condition from being true now (empty when it is true). */
export function unmetConditionLabels(state: Readonly<GameState>, condition: Condition): string[] {
  const unmet = (node: ExplainedNode): string[] => {
    if (node.value) return [];
    if (node.kind === "leaf") return [node.label];
    if (node.kind === "all") return node.children.flatMap(unmet);
    if (node.kind === "not") return [`「${line(node.children[0])}」ではないこと`];
    return [line(node)];
  };
  return unmet(explainCondition(state, condition));
}
