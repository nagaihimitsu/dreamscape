import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { describeRelationshipChange } from "../domain/relationship-change";
import { RelationshipChangeNote } from "./RelationshipChangeNote";

// Debug mode's change strip: the status region is rendered (empty) before a change is put into it,
// so screen readers announce the change; a region added together with its text is often not read.
describe("relationship-change strip", () => {
  const region = '<div class="relationship-change-region"><div role="status" aria-label="Debug：関係の変化">';

  it("is an empty status region while no change is shown", () => {
    expect(renderToStaticMarkup(createElement(RelationshipChangeNote, { change: null }))).toBe(`${region}</div></div>`);
  });

  it("puts the change's lines, marked Debug, into the same region", () => {
    const change = { axes: [{ axis: "affection" as const, before: 3, after: 5, delta: 2 }], reaction: { result: "positive" as const, chancePercent: 62 }, replay: false };
    expect(renderToStaticMarkup(createElement(RelationshipChangeNote, { change }))).toBe(`${region}` +
      '<section class="relationship-change" data-testid="relationship-change"><span class="relationship-change-label" aria-hidden="true">Debug</span>' +
      '<div class="relationship-change-lines"><p><span class="relationship-change-part">親しさ +2（3→5）</span></p>' +
      '<p><span class="relationship-change-part">反応：噛み合った（噛み合う確率 62%）</span></p></div></section></div></div>');
  });

  it("keeps each value with its numbers in a box of its own, and the line's text as describeRelationshipChange gives it", () => {
    const change = { axes: [{ axis: "affection" as const, before: 3, after: 5, delta: 2 }, { axis: "spark" as const, before: 0, after: 1, delta: 1 }],
      reaction: null, replay: false };
    const markup = renderToStaticMarkup(createElement(RelationshipChangeNote, { change }));
    expect(markup).toContain('<p><span class="relationship-change-part">親しさ +2（3→5）</span>　<span class="relationship-change-part">恋愛の意識 +1（0→1）</span></p>');
    expect(markup.replace(/<[^>]+>/gu, "")).toBe(`Debug${describeRelationshipChange(change).join("")}`);
  });

  it("lists the scene's cond texts with their truth values under the status region, outside it (stage 2a)", () => {
    const conditions = [{ text: "money >= 300", met: true }, { text: "rel affection >= 3", met: false }];
    expect(renderToStaticMarkup(createElement(RelationshipChangeNote, { change: null, conditions }))).toBe(`${region}</div>` +
      '<section class="relationship-change" data-testid="scene-conditions" aria-label="Debug：場面の条件"><span class="relationship-change-label" aria-hidden="true">Debug</span>' +
      '<div class="relationship-change-lines"><p>条件「money &gt;= 300」：真（満たす）</p><p>条件「rel affection &gt;= 3」：偽（満たさない）</p></div></section></div>');
  });
});
