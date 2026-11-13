import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { nahargarhHideSeek } from "./definition";
import { hideSeekSetup } from "./rules";
import { hideSeekSkin } from "./Skin";

// The hide-and-seek's field (docs/13 2.12–2.13): nine door buttons named by number only, her behind hers once opened, her
// peeking out when the play ran out, and the use's art in its declared slots.
const view = (change: Partial<SearchView> = {}): SearchView => ({ searched: [], presses: {}, last: null, ending: null, ...change });
const field = (art: Record<string, string>, shown: SearchView = view()) => renderToStaticMarkup(createElement(hideSeekSkin.Field, {
  params: { hide: 7 }, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) },
  names: { player: "主人公", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  setup: hideSeekSetup({ hide: 7 }), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
}));

describe("the hide-and-seek's field", () => {
  it("draws nine doors as buttons named by number, none telling which one hides her", () => {
    const html = field({});
    expect(html).toContain('class="mg-nahargarh-hide-seek"');
    for (let door = 1; door <= 9; door++) expect(html).toContain(`aria-label="扉${door}"`);
    expect(html).not.toContain("standing-picture");
    expect(html).not.toContain("<img");
  });

  it("shows her behind her door once it is opened, and peeking out when the play ran out", () => {
    const found = field({}, view({ searched: [2, 6], ending: { kind: "found", spot: 6, misses: 1 } }));
    expect(found).toContain('aria-label="扉3：空っぽの部屋"');
    expect(found).toContain('aria-label="扉7：見つけた"');
    expect(found).toContain("standing-picture");
    expect(field({}, view({ ending: { kind: "idle", misses: 0 } }))).toContain("mg-nahargarh-hide-seek-peek");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(nahargarhHideSeek.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["bay", "backdrop"], ["room", "backdrop"], ["peek", "sprite"]]);
    const html = field({ bay: "/assets/minigames/bay.webp", room: "/assets/minigames/room.webp", peek: "/assets/minigames/peek.webp" },
      view({ ending: { kind: "idle", misses: 0 } }));
    expect(html).toContain('data-art-bay="true"');
    expect(html).toContain("/assets/minigames/bay.webp");
    expect(html).toContain("/assets/minigames/room.webp");
    expect(html).toContain('src="/assets/minigames/peek.webp"');
    expect(html).not.toContain("standing-picture");
  });
});
