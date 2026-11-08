import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { transportKinds, type TransportArtKind } from "../../content/transport-schemas";
import { railKinds, TransportIllustration } from "./transport-art";

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
});
