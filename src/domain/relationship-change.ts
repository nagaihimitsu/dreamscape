import type { GameState } from "./game";

/**
 * What one step of play did to the hidden relationship values (affection, trust,
 * spark; docs/03), for the Debug-mode display (user decision 2026-11-08: while
 * Debug mode is on, each choice's changes are shown to the author). Read from two
 * states only, so it works for any scene that changes the values (dates, encounters,
 * the confession's fixed effects, later scene effects) without reading content.
 * Type imports only: Playwright imports this module in Node to compute the expected lines.
 */
export const relationshipAxisLabels = { affection: "親しさ", trust: "信頼", spark: "恋愛の意識" } as const;
export type RelationshipAxis = keyof typeof relationshipAxisLabels;
const axes = Object.keys(relationshipAxisLabels) as RelationshipAxis[];

export interface RelationshipChange {
  /** The axes whose value changed, in the order of relationshipAxisLabels. */
  axes: { axis: RelationshipAxis; before: number; after: number; delta: number }[];
  /** The reaction of a reply resolved in this step (a date's chance in percent; an encounter stores none). */
  reaction: { result: "positive" | "negative"; chancePercent: number | null } | null;
  /** The reply belongs to a date read again (reward once): its values never change. */
  replay: boolean;
}

/** The parts of the game state the change is read from (a GameState has them). */
export type RelationshipChangeState = Pick<GameState, "affection" | "trust" | "spark"> & {
  activeDate: { runId: string; replay: boolean; resolvedChoices: readonly { result: "positive" | "negative"; chance: number }[] } | null;
  activeEncounter: { runId: string; romanceResolution: { result: "positive" | "negative" } | null } | null;
};

/** The change from `previous` to `next`, or null when no value changed and no reply was resolved. */
export function relationshipChange(previous: RelationshipChangeState, next: RelationshipChangeState): RelationshipChange | null {
  const changed = axes.filter((axis) => next[axis] !== previous[axis])
    .map((axis) => ({ axis, before: previous[axis], after: next[axis], delta: next[axis] - previous[axis] }));
  const date = next.activeDate;
  const earlierChoices = date && previous.activeDate?.runId === date.runId ? previous.activeDate.resolvedChoices.length : 0;
  const dateChoice = date && date.resolvedChoices.length > earlierChoices ? date.resolvedChoices.at(-1)! : null;
  const encounter = next.activeEncounter?.romanceResolution;
  const encounterIsNew = !!encounter && !(previous.activeEncounter?.runId === next.activeEncounter!.runId && previous.activeEncounter.romanceResolution);
  const reaction = dateChoice ? { result: dateChoice.result, chancePercent: dateChoice.chance }
    : encounter && encounterIsNew ? { result: encounter.result, chancePercent: null } : null;
  if (!changed.length && !reaction) return null;
  return { axes: changed, reaction, replay: !!dateChoice && date!.replay };
}

const signed = (value: number) => value < 0 ? `−${-value}` : `${value}`;
const delta = (value: number) => value > 0 ? `+${value}` : signed(value);

/** The display's Japanese lines: the values (or that none changed), then the reaction. */
export function describeRelationshipChange(change: RelationshipChange): string[] {
  const values = change.axes.length
    ? change.axes.map((item) => `${relationshipAxisLabels[item.axis]} ${delta(item.delta)}（${signed(item.before)}→${signed(item.after)}）`).join("　")
    : `関係の値は変わりません${change.replay ? "（振り返りの会話のため）" : ""}`;
  if (!change.reaction) return [values];
  const result = change.reaction.result === "positive" ? "噛み合った" : "噛み合わなかった";
  const chance = change.reaction.chancePercent === null ? "" : `（噛み合う確率 ${Math.round(change.reaction.chancePercent)}%）`;
  return [values, `反応：${result}${chance}`];
}
