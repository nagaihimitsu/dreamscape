import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { clothFlap } from "./definition";
import { CLOTH_END_MS, CLOTH_FIELD, CLOTH_START_MS } from "./rules";
import { CLOTH_FIELD_POINTS, clothFlapSkin } from "./Skin";

// The flap's art slots (docs/13 2.12) and her walk: a use's pictures in place of the drawn stairs and figure, the CSS look
// without them, and her foot on the step in front of the niche at the moment to tap.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(clothFlapSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the flap's field", () => {
  it("draws its own stairs and figure without the use's art, and never the heroine", () => {
    const html = field({});
    expect(html).toContain('class="mg-cloth-flap"');
    expect(html).not.toContain("data-art-stairs");
    expect(html).toContain("mg-cloth-flap-walker-figure");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("standing-picture");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(clothFlap.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["stairs", "backdrop"], ["wall", "backdrop"], ["walker", "sprite"]]);
    const html = field({ stairs: "/assets/minigames/stairs.webp", walker: "/assets/minigames/walker.webp" });
    expect(html).toContain('data-art-stairs="true"');
    expect(html).toContain('src="/assets/minigames/stairs.webp"');
    expect(html).toContain('src="/assets/minigames/walker.webp"');
    expect(html).not.toContain("mg-cloth-flap-walker-figure");
  });

  it("puts a far-wall picture (a photo) under the drawn stairs, figure and cloth", () => {
    const html = field({ wall: "/assets/tourism/india/wall.webp" });
    expect(html).toContain('data-art-wall="true"');
    expect(html).not.toContain("data-art-stairs");
    expect(html).toContain('src="/assets/tourism/india/wall.webp"');
    expect(html).toContain("mg-cloth-flap-stairs");
    expect(html).toContain("mg-cloth-flap-walker-figure");
    expect(html).toContain("mg-cloth-flap-cloth");
  });

  it("walks her down one step at a time, her foot on the niche's step at the moment, on down past it to the end", () => {
    const { footOn, NICHE, nicheMs, walkerAt } = CLOTH_FIELD_POINTS;
    expect(walkerAt(0).foot).toEqual(footOn(0));
    expect(walkerAt(CLOTH_START_MS).foot).toEqual(footOn(0));
    expect(walkerAt(nicheMs).foot).toEqual(NICHE);
    expect(footOn(CLOTH_FIELD.stepsToNiche)).toEqual(NICHE);
    expect(walkerAt(CLOTH_END_MS).foot).toEqual(footOn(CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast));
    expect(walkerAt(CLOTH_END_MS + 5000).foot).toEqual(footOn(CLOTH_FIELD.stepsToNiche + CLOTH_FIELD.stepsPast));
  });
});
