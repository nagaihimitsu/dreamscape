import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Icon, iconNames } from "./icons";

describe("Icon", () => {
  const markup = (name: (typeof iconNames)[number]) => renderToStaticMarkup(createElement(Icon, { name }));

  it("draws every named icon as one decorative line path on the 24 px grid", () => {
    for (const name of iconNames) {
      const svg = markup(name);
      expect(svg, name).toMatch(/^<svg class="icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="[^"]+"><\/path><\/svg>$/u);
      const numbers = svg.match(/d="([^"]+)"/u)![1].match(/-?\d*\.?\d+/gu)!.map(Number);
      expect(numbers.every((value) => Math.abs(value) <= 24 && Number(value.toFixed(2)) === value), name).toBe(true);
    }
  });

  it("gives every name its own picture", () => {
    expect(new Set(iconNames.map(markup)).size).toBe(iconNames.length);
  });

  it("covers the redesign's icon set", () => {
    expect([...iconNames].sort()).toEqual([
      "bag", "bed", "book", "camera", "chevron-down", "chevron-right", "close", "coin", "compass", "credit",
      "external", "eye", "eye-off", "fast", "gear", "heart", "hourglass", "info", "lens", "load", "lock", "log", "map", "moon", "music", "pin",
      "plane", "save", "sliders", "speaker", "stamp", "star", "sun", "swords", "ticket",
    ]);
  });

  it("adds a caller's class after its own", () => {
    expect(markup("gear")).toMatch(/^<svg class="icon"/u);
    expect(renderToStaticMarkup(createElement(Icon, { name: "gear", className: "hud-tool-icon" }))).toMatch(/^<svg class="icon hud-tool-icon"/u);
  });
});
