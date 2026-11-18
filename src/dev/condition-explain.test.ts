import { describe, expect, it } from "vitest";
import { getCities, tourismClues } from "../content";
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

  it("names the wait after a rejection a writer wrote on a date (2026-11-15)", () => {
    const rejected = { ...base, confessionStatus: "rejected" as const, lastRejectedDateCount: 0 };
    expect(unmetConditionLabels(rejected, { all: [{ dateSinceRejection: true }, { not: { couple: true } }] }))
      .toEqual(["断られた後に、新しいデートか再交流を終えた（断られていなければ成り立つ）"]);
    expect(unmetConditionLabels(base, { dateSinceRejection: true })).toEqual([]);
  });

  it("names the parts a relationship repair is written with (2026-11-15): dates done, a ready confession, an ordinary date to start", () => {
    // Milan's recovery: a date done, the relationship not settled, and no ordinary date to start instead.
    const recovery: Condition = { all: [{ datesCompleted: { atLeast: 1 } },
      { any: [{ not: { confessionReady: true } }, { not: { dateSinceRejection: true } }] }, { not: { normalDateAvailable: true } }] };
    const open = { ...base, ap: 12, completedEpisodeIds: ["milano_duomo_episode"] };
    expect(unmetConditionLabels(open, recovery)).toEqual([
      "終えたデート（再交流は3回まで）が1以上（今は0）",
      "「この都市で、通常デートを今始められる（APも足りる）」ではないこと",
    ]);
    expect(explainCondition(open, { confessionReady: true })).toMatchObject({ kind: "leaf", value: false,
      label: "今告白すれば受け入れられる（関係の値と終えたデートの数を読む）" });
    expect(unmetConditionLabels({ ...open, ap: 0, playedDateIds: ["milano_cafe_01"] }, recovery)).toEqual([]);
  });

  it("names a clue in 手がかり帳 by its title (2026-11-18), and its ID when no catalog has it", () => {
    const clue = tourismClues[0];
    expect(explainCondition({ ...base, discoveredClueIds: [clue.id] }, { clue: clue.id }))
      .toMatchObject({ kind: "leaf", label: `手がかり「${clue.titleJa}」を持っている`, value: true });
    expect(unmetConditionLabels(base, { clue: "smp_no_such_clue" })).toEqual(["手がかり「smp_no_such_clue」を持っている"]);
  });
});
