import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cricketBatting } from "./definition";
import { cricketSkin } from "./Skin";

// The cricket's art slots (docs/13 2.12): a use's pictures in place of the drawn pitch and the heroine's standing picture,
// and the CSS look without them.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(cricketSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) }, names: { player: "主人公", heroine: "ヒロイン" },
  art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the cricket's field", () => {
  it("draws its own pitch and the heroine's standing picture without the use's art", () => {
    const html = field({});
    expect(html).toContain('class="mg-cricket-batting"');
    expect(html).not.toContain("data-art-pitch");
    expect(html).toContain("standing-picture");
    expect(html).not.toContain("<img");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(cricketBatting.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["pitch", "backdrop"], ["bowler", "sprite"]]);
    const html = field({ pitch: "/assets/minigames/pitch.webp", bowler: "/assets/minigames/bowler.webp" });
    expect(html).toContain('data-art-pitch="true"');
    expect(html).toContain('src="/assets/minigames/pitch.webp"');
    expect(html).toContain('src="/assets/minigames/bowler.webp"');
    expect(html).not.toContain("standing-picture");
  });
});
