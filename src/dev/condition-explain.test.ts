import { describe, expect, it } from "vitest";
import { getCities } from "../content";
import { encounters } from "../content/encounters";
import type { Condition } from "../content/condition-schemas";
import { createGame } from "../domain/game";
import { explainCondition, unmetConditionLabels } from "./condition-explain";

const base = createGame();
const city = getCities().find((item) => item.id === base.currentCityId)!;

describe("Debug's explanation of a condition", () => {
  it("gives each node its value and a Japanese label", () => {
    const condition: Condition = { all: [{ cityCompleted: city.id }, { not: { time: "night" } }, { weekday: [5, 6] }] };
    const explained = explainCondition({ ...base, completedCityIds: [city.id] }, condition);
    expect(explained).toMatchObject({ kind: "all", label: "次のすべて", value: false, children: [
      { kind: "leaf", label: `${city.nameJa}の旅を終えた`, value: true },
      { kind: "not", label: "次ではない", value: true, children: [{ label: "夜（18:00から眠るまで）", value: false }] },
      { kind: "leaf", label: "土・日曜日", value: false },
    ] });
  });

  it("names what keeps a condition from being true, and nothing when it is true", () => {
    const item = encounters.items[0];
    const condition: Condition = { all: [
      { episodesCompleted: { city: city.id, atLeast: 2 } },
      { any: [{ time: "day" }, { cityDay: { atLeast: 2, atMost: 3 } }] },
      { not: { item: { id: item.id, is: "held" } } },
      { atLeast: { count: 1, of: [{ journeyDay: { atMost: 4 } }, { rides: { mode: "walk", atLeast: 1 } }] } },
    ] };
    const night = { ...base, travel: { ...base.travel, minute: 19 * 60 }, inventory: { [item.id]: "held" as const } };
    expect(unmetConditionLabels(night, condition)).toEqual([
      `${city.nameJa}のエピソードを2つ以上終えた`,
      "次のどれか（昼（9:00〜18:00）／この都市の2〜3日目）",
      `「品物「${item.nameJa}」を持っている」ではないこと`,
      "次のうち1つ以上（旅の4日目まで／徒歩に1回以上乗った）",
    ]);
    expect(unmetConditionLabels(base, { cityDay: { atLeast: 1 } })).toEqual([]);
  });
});
