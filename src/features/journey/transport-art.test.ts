import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { transportKinds, type TransportArtKind } from "../../content/transport-schemas";
import { PassingScenery, railKinds, sceneryPace, TransportIllustration } from "./transport-art";

const kinds: TransportArtKind[] = ["walk", ...transportKinds];

describe("transport transition art", () => {
  it("has a distinct illustration for walking and every declarable kind", () => {
    const pictures = kinds.map((kind) => renderToStaticMarkup(createElement(TransportIllustration, { kind })));
    for (const picture of pictures) {
      expect(picture).toMatch(/^<svg viewBox="0 0 120 68" aria-hidden="true" focusable="false">/u);
      expect(picture).toMatch(/<(path|circle|rect)\b/u);
    }
    expect(new Set(pictures).size).toBe(kinds.length);
  });

  it("puts rails under the rail kinds only", () => {
    expect([...railKinds].sort()).toEqual(["rail", "tram"]);
  });

  it("passes the scenery at the pace of each kind, a kind it does not know at the medium pace", () => {
    expect(Object.fromEntries(kinds.map((kind) => [kind, sceneryPace(kind)]))).toEqual({
      walk: "slow", rail: "fast", tram: "medium", bus: "medium", car: "fast", three_wheeler: "medium", bicycle: "medium",
    });
    expect(sceneryPace("hovercraft")).toBe("medium");
    expect(sceneryPace("constructor")).toBe("medium");
  });

  it("draws the scenery as three layers of one path each, three tiles wide", () => {
    const scenery = renderToStaticMarkup(createElement(PassingScenery));
    expect(scenery.match(/<svg class="travel-scenery is-(far|mid|near)"/gu)).toHaveLength(3);
    expect(scenery.match(/<path /gu)).toHaveLength(3);
    for (const path of scenery.match(/ d="[^"]+"/gu)!) expect(path.match(/M/gu)).toHaveLength(3);
  });
});
