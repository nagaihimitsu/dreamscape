import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OutcomeHeading } from "./OutcomeHeading";

// UI stage 0, item C: the result heading's accessible name is Japanese; the English stays on screen.
describe("battle result heading", () => {
  it.each([
    ["perfect", "PERFECT VICTORY", "完全勝利"],
    ["victory", "VICTORY", "勝利"],
    ["defeat", "DEFEAT", "敗北"],
  ] as const)("%s shows %s and is named %s", (outcome, en, ja) => {
    expect(renderToStaticMarkup(createElement(OutcomeHeading, { outcome }))).toBe(
      `<h2 class="outcome"><span lang="en" aria-hidden="true">${en}</span><span class="sr-only">${ja}</span></h2>`);
  });
});
