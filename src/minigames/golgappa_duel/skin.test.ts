import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { golgappaDuel } from "./definition";
import { golgappaSkin } from "./Skin";

// The golgappa duel's art slots (docs/13 2.12): a use's pictures in place of the drawn stall, bowls and golgappa and of
// the heroine's standing picture, and the CSS look without them; the names drawn as text.
const field = (art: Record<string, string>) => renderToStaticMarkup(createElement(golgappaSkin.Field, {
  params: {}, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) },
  names: { player: "<b>主人公</b>", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined, frames: () => () => undefined,
}));

describe("the golgappa duel's field", () => {
  it("draws its own stall, bowls and the heroine's standing picture without the use's art, the names as text", () => {
    const html = field({});
    expect(html).toContain('class="mg-golgappa-duel"');
    expect(html).toContain("mg-golgappa-duel-counter");
    expect(html).toContain("standing-picture");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;b&gt;主人公&lt;/b&gt;");
    expect(html).toContain("ヒロイン");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(golgappaDuel.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["stall", "backdrop"], ["heroine", "sprite"], ["bowl", "sprite"], ["puri", "sprite"]]);
    const html = field({ stall: "/m/stall.webp", heroine: "/m/her.webp", bowl: "/m/bowl.webp", puri: "/m/puri.webp" });
    expect(html).toContain('data-art-stall="true"');
    for (const path of ["/m/stall.webp", "/m/her.webp", "/m/bowl.webp", "/m/puri.webp"]) expect(html).toContain(`src="${path}"`);
    expect(html).not.toContain("standing-picture");
    expect(html).not.toContain("mg-golgappa-duel-counter");
  });

  it("has a stop button 「バス」 apart from 「食べる」", () => {
    expect(golgappaSkin.actionJa).toBe("食べる");
    expect(golgappaSkin.stop?.labelJa).toBe("バス");
  });

  it("keeps the card's lines her first breath: no line that the story's next one says again, one 「……」 at most", () => {
    const lines = golgappaDuel.outcomes.flatMap((outcome) => outcome.reaction?.linesJa ?? []);
    expect(lines.filter((line) => line.includes("……")).length).toBeLessThanOrEqual(1);
    // The story goes on with 「引き分け！　今の、…」 and 「…はい、水。」: neither is said here first.
    for (const line of lines) {
      expect(line).not.toContain("今の");
      expect(line).not.toContain("水");
    }
  });
});
