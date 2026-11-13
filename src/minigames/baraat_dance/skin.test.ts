import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { baraatDance } from "./definition";
import { baraatSkin } from "./Skin";

// The baraat dance's art slots (docs/13 2.12): a use's pictures in place of the drawn drum and of the standing pictures
// (the heroine's, and the speaker's for Kamla), and the CSS look without them.
const field = (art: Record<string, string>, person = true) => renderToStaticMarkup(createElement(baraatSkin.Field, {
  params: {}, still: false, seed: 1, names: { player: "主人公", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  cast: { heroine: createElement("i", { "data-testid": "heroine-picture" }), ...(person ? { person: createElement("i", { "data-testid": "person-picture" }) } : {}) },
  frames: () => () => undefined,
}));

describe("the baraat dance's field", () => {
  it("draws its own drum and the standing pictures without the use's art", () => {
    const html = field({});
    expect(html).toContain('class="mg-baraat-dance"');
    expect(html).toContain(`class="mg-baraat-dance-drum"`);
    expect(html).toContain("heroine-picture");
    expect(html).toContain("person-picture");
    expect(html).not.toContain("<img");
    // Without a speaker on the stage (Debug's room), Kamla's place stays empty.
    expect(field({}, false)).not.toContain("person-picture");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(baraatDance.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["street", "backdrop"], ["drummer", "sprite"], ["kamla", "sprite"], ["heroine", "sprite"]]);
    const html = field({ street: "/m/street.webp", drummer: "/m/drummer.webp", kamla: "/m/kamla.webp", heroine: "/m/her.webp" });
    expect(html).toContain('data-art-street="true"');
    for (const path of ["/m/street.webp", "/m/drummer.webp", "/m/kamla.webp", "/m/her.webp"]) expect(html).toContain(`src="${path}"`);
    expect(html).not.toContain("heroine-picture");
    expect(html).not.toContain("person-picture");
    expect(html).not.toContain(`class="mg-baraat-dance-drum"`);
  });

  it("has no stop button: the dance ends with the drum", () => {
    expect(baraatSkin.stop).toBeNull();
    expect(baraatSkin.actionJa).toBe("踊る");
  });
});
