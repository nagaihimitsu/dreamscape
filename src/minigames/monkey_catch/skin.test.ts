import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { monkeyCatch } from "./definition";
import { monkeyCatchSkin } from "./Skin";

// The catch's art slots (docs/13 2.12): a use's pictures in place of the drawn wall and monkey, and the CSS look without them.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(monkeyCatchSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the catch's field", () => {
  it("draws its own wall and monkey without the use's art, and never the heroine", () => {
    const html = field({});
    expect(html).toContain('class="mg-monkey-catch"');
    expect(html).not.toContain("data-art-wall");
    expect(html).toContain("mg-monkey-catch-monkey-figure");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("standing-picture");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(monkeyCatch.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["wall", "backdrop"], ["monkey", "sprite"]]);
    const html = field({ wall: "/assets/minigames/wall.webp", monkey: "/assets/minigames/monkey.webp" });
    expect(html).toContain('data-art-wall="true"');
    expect(html).toContain('src="/assets/minigames/wall.webp"');
    expect(html).toContain('src="/assets/minigames/monkey.webp"');
    expect(html).not.toContain("mg-monkey-catch-monkey-figure");
  });
});
