import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { REACTION_MARKS } from "../content/dialogue-reactions";
import { ComicEffect } from "./ComicEffect";

describe("reaction artwork", () => {
  it("has a distinct local SVG for every supported mark", async () => {
    expect(new Set(REACTION_MARKS).size).toBe(13);
    const images = await Promise.all(REACTION_MARKS.map((mark) =>
      readFile(`public/assets/effects/${mark}.svg`, "utf8"),
    ));
    for (const image of images) {
      expect(image).toContain('viewBox="0 0 64 64"');
      expect(image).toContain('stroke-linecap="round"');
    }
    expect(new Set(images).size).toBe(13);
  });
  it("renders a decorative cue with the requested reduced-motion state", () => {
    const markup = renderToStaticMarkup(createElement(ComicEffect, {
      effect: "heart", cueKey: "line-1", reduceMotion: true,
    }));
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-effect="heart"');
    expect(markup).toContain("comic-effect is-reduced");
    expect(markup).toContain("assets/effects/heart.svg");
  });
});
