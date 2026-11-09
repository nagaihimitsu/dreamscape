import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RelationshipChangeNote } from "./RelationshipChangeNote";

// Debug mode's change strip: the status region is rendered (empty) before a change is put into it,
// so screen readers announce the change; a region added together with its text is often not read.
describe("relationship-change strip", () => {
  const region = '<div class="relationship-change-region" role="status" aria-label="Debug：関係の変化">';

  it("is an empty status region while no change is shown", () => {
    expect(renderToStaticMarkup(createElement(RelationshipChangeNote, { change: null }))).toBe(`${region}</div>`);
  });

  it("puts the change's lines, marked Debug, into the same region", () => {
    const change = { axes: [{ axis: "affection" as const, before: 3, after: 5, delta: 2 }], reaction: { result: "positive" as const, chancePercent: 62 }, replay: false };
    expect(renderToStaticMarkup(createElement(RelationshipChangeNote, { change }))).toBe(`${region}` +
      '<section class="relationship-change" data-testid="relationship-change"><span class="relationship-change-label" aria-hidden="true">Debug</span>' +
      '<div class="relationship-change-lines"><p>親しさ +2（3→5）</p><p>反応：噛み合った（噛み合う確率 62%）</p></div></section></div>');
  });
});
