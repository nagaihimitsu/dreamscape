import { describe, expect, it } from "vitest";
import {
  describeRelationshipChange, relationshipAxisLabels, relationshipChange, relationshipChangeLines, type RelationshipChangeState,
} from "./relationship-change";

// User decision 2026-11-08 ②: while Debug mode is on, each choice's relationship changes are shown.
// Hand-built states (the parts the change is read from); relationship-change-play.test.ts plays real dates.
const values = { affection: 3, trust: 0, spark: 2 };
const idle: RelationshipChangeState = { ...values, activeDate: null, activeEncounter: null };
const choice = (result: "positive" | "negative", chance: number) => ({ result, chance });
const date = (resolved: ReturnType<typeof choice>[], replay = false, runId = "milano_cafe_01:4"): RelationshipChangeState["activeDate"] =>
  ({ runId, replay, resolvedChoices: resolved });

describe("relationshipChange", () => {
  it("reports nothing when no value changed and no reply was resolved", () => {
    // E.g. reading on, finishing a date, or the confession's fixed effects (their deltas are 0).
    expect(relationshipChange(idle, idle)).toBeNull();
    expect(relationshipChange(idle, { ...idle, activeDate: date([]) })).toBeNull();
    // Reading on after a reply: the earlier reply is not reported again.
    const replied = { ...idle, activeDate: date([choice("positive", 62)]) };
    expect(relationshipChange(replied, replied)).toBeNull();
  });

  it("reports the changed axes with their values before and after, and a date reply's reaction with its chance", () => {
    const before = { ...idle, activeDate: date([]) };
    const after = { ...before, affection: 5, spark: 1, activeDate: date([choice("positive", 62.4)]) };
    expect(relationshipChange(before, after)).toEqual({
      axes: [
        { axis: "affection", before: 3, after: 5, delta: 2 },
        { axis: "spark", before: 2, after: 1, delta: -1 },
      ],
      reaction: { result: "positive", chancePercent: 62.4 },
      replay: false,
    });
  });

  it("reports a reply that changed no value (deltas of 0), and a replayed date's reply as a replay", () => {
    const before = { ...idle, activeDate: date([], true) };
    expect(relationshipChange(before, { ...before, activeDate: date([choice("negative", 38)], true) })).toEqual({
      axes: [], reaction: { result: "negative", chancePercent: 38 }, replay: true,
    });
    const fresh = { ...idle, activeDate: date([]) };
    expect(relationshipChange(fresh, { ...fresh, activeDate: date([choice("negative", 38)]) })?.replay).toBe(false);
  });

  it("counts a date's replies per run: a new run's first reply is new", () => {
    const earlier = { ...idle, activeDate: date([choice("positive", 50), choice("positive", 50)], false, "milano_cafe_01:4") };
    const next = { ...idle, affection: 4, activeDate: date([choice("negative", 20)], false, "milano_walk_01:9") };
    expect(relationshipChange(earlier, next)?.reaction).toEqual({ result: "negative", chancePercent: 20 });
  });

  it("reports an encounter reply's reaction once, without a chance (none is stored)", () => {
    const started = { ...idle, activeEncounter: { runId: "e:3", romanceResolution: null } };
    const answered = { ...started, trust: 1, activeEncounter: { runId: "e:3", romanceResolution: { result: "positive" as const } } };
    expect(relationshipChange(started, answered)).toEqual({
      axes: [{ axis: "trust", before: 0, after: 1, delta: 1 }], reaction: { result: "positive", chancePercent: null }, replay: false,
    });
    // The resolution stays on the encounter while it plays on: not a new reaction.
    expect(relationshipChange(answered, answered)).toBeNull();
    // Another encounter run with a resolution is new.
    expect(relationshipChange(answered, { ...answered, activeEncounter: { runId: "e:9", romanceResolution: { result: "negative" } } })?.reaction)
      .toEqual({ result: "negative", chancePercent: null });
  });

  it("reports values changed by any step (a fixed effect, a future scene effect) without a reaction", () => {
    expect(relationshipChange(idle, { ...idle, trust: -2 })).toEqual({
      axes: [{ axis: "trust", before: 0, after: -2, delta: -2 }], reaction: null, replay: false,
    });
  });

  it("still reports a change when the next state has no story scene (the screen decides whether to show it)", () => {
    const replied = { ...idle, activeDate: date([choice("positive", 70)]) };
    expect(relationshipChange(replied, { ...idle, affection: 4 })?.axes).toEqual([{ axis: "affection", before: 3, after: 4, delta: 1 }]);
  });
});

describe("describeRelationshipChange", () => {
  it("names the axes in Japanese with signed changes and the values before and after", () => {
    expect(relationshipAxisLabels).toEqual({ affection: "親しさ", trust: "信頼", spark: "恋愛の意識" });
    expect(describeRelationshipChange({
      axes: [{ axis: "affection", before: 3, after: 5, delta: 2 }, { axis: "spark", before: 2, after: 1, delta: -1 }],
      reaction: { result: "positive", chancePercent: 62.4 }, replay: false,
    })).toEqual(["親しさ +2（3→5）　恋愛の意識 −1（2→1）", "反応：噛み合った（噛み合う確率 62%）"]);
    expect(describeRelationshipChange({
      axes: [{ axis: "trust", before: -1, after: -3, delta: -2 }], reaction: { result: "negative", chancePercent: 37.5 }, replay: false,
    })).toEqual(["信頼 −2（−1→−3）", "反応：噛み合わなかった（噛み合う確率 38%）"]);
  });

  it("says when no value changed, and why for a replayed date", () => {
    expect(describeRelationshipChange({ axes: [], reaction: { result: "positive", chancePercent: 80 }, replay: true }))
      .toEqual(["関係の値は変わりません（振り返りの会話のため）", "反応：噛み合った（噛み合う確率 80%）"]);
    expect(describeRelationshipChange({ axes: [], reaction: { result: "negative", chancePercent: 5 }, replay: false }))
      .toEqual(["関係の値は変わりません", "反応：噛み合わなかった（噛み合う確率 5%）"]);
  });

  it("gives an encounter's reaction without a chance, and a change without a reply on one line", () => {
    expect(describeRelationshipChange({ axes: [{ axis: "trust", before: 0, after: 1, delta: 1 }], reaction: { result: "positive", chancePercent: null }, replay: false }))
      .toEqual(["信頼 +1（0→1）", "反応：噛み合った"]);
    expect(describeRelationshipChange({ axes: [{ axis: "spark", before: 0, after: 2, delta: 2 }], reaction: null, replay: false }))
      .toEqual(["恋愛の意識 +2（0→2）"]);
  });

  it("gives each value with its numbers as one part, which the display keeps whole", () => {
    expect(relationshipChangeLines({
      axes: [{ axis: "affection", before: 3, after: 5, delta: 2 }, { axis: "spark", before: 0, after: 1, delta: 1 }],
      reaction: { result: "positive", chancePercent: 62 }, replay: false,
    })).toEqual([["親しさ +2（3→5）", "恋愛の意識 +1（0→1）"], ["反応：噛み合った（噛み合う確率 62%）"]]);
  });
});
