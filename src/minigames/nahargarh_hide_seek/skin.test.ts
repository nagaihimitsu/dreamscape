import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { nahargarhHideSeek } from "./definition";
import { hideSeekSetup } from "./rules";
import { HIDE_SEEK_ROOM_EVENTS, hideSeekRoomEvents, hideSeekSkin } from "./Skin";

// The hide-and-seek's field (docs/13 2.12–2.13): twelve door buttons named by number only, her behind hers once opened,
// an empty room's small event, her peeking out when the play ran out, and the use's art in its declared slots (the echo's
// clue and the hint run on the play's clock: tests/e2e/minigame-nahargarh_hide_seek.spec.ts).
const view = (change: Partial<SearchView> = {}): SearchView => ({ total: 1, round: 0, searched: [], done: [], presses: {}, last: null, roundAt: 0, nudge: null, ending: null, ...change });
const field = (art: Record<string, string>, shown: SearchView = view()) => renderToStaticMarkup(createElement(hideSeekSkin.Field, {
  params: { hide: 7 }, still: false, seed: 1, cast: { heroine: createElement("i", { "data-testid": "standing-picture" }) },
  names: { player: "主人公", heroine: "ヒロイン" }, art, sound: () => undefined, vibrate: () => undefined,
  setup: hideSeekSetup({ hide: 7 }), view: shown, live: true, search: () => undefined, active: () => undefined, frames: () => () => undefined,
}));

describe("the hide-and-seek's field", () => {
  it("draws twelve doors as buttons named by number, none telling which one hides her", () => {
    const html = field({});
    expect(html).toContain('class="mg-nahargarh-hide-seek"');
    for (let door = 1; door <= 12; door++) expect(html).toContain(`aria-label="扉${door}"`);
    expect(html).not.toContain('aria-label="扉13"');
    expect(html).not.toContain("standing-picture");
    expect(html).not.toContain("<img");
  });

  it("shows her behind her door once it is opened, and peeking out when the play ran out", () => {
    const found = field({}, view({ searched: [2, 6], ending: { kind: "found", spot: 6, misses: 1, helped: 0 } }));
    expect(found).toContain('aria-label="扉3：空っぽの部屋"');
    expect(found).toContain('aria-label="扉7：見つけた"');
    expect(found).toContain("standing-picture");
    expect(field({}, view({ ending: { kind: "idle", misses: 0, helped: 0 } }))).toContain("mg-nahargarh-hide-seek-peek");
  });

  it("shows something small going on in an empty room, dealt out by the seed, none behind her door", () => {
    const events = hideSeekRoomEvents(1, 6);
    expect(events).toHaveLength(12);
    expect(events[6]).toBeNull();
    // Every kind before any comes again; the same seed deals the same, another seed (mostly) another order.
    expect(new Set(events.slice(0, 5))).toEqual(new Set(HIDE_SEEK_ROOM_EVENTS));
    expect(hideSeekRoomEvents(1, 6)).toEqual(events);
    expect([2, 3, 4, 5, 6].some((seed) => JSON.stringify(hideSeekRoomEvents(seed, 6)) !== JSON.stringify(events))).toBe(true);
    for (let index = 1; index < events.length; index++) if (events[index] && events[index - 1]) expect(events[index]).not.toBe(events[index - 1]);
    const html = field({}, view({ searched: [0] }));
    expect(html).toContain(`data-event="${events[0]}"`);
    expect(html.match(/data-event=/gu)).toHaveLength(1);
  });

  it("warns before the call that brings her out: the button and the band", () => {
    const [call] = hideSeekSkin.buttons;
    const label = (presses: number) => (typeof call.labelJa === "function" ? call.labelJa(view({ presses: { call: presses } })) : call.labelJa);
    expect([0, 1, 2].map(label)).toEqual(["名前を呼ぶ", "名前を呼ぶ", "最後に呼ぶ"]);
    expect(hideSeekSkin.statusJa?.(view({ presses: { call: 1 } }), null)).toBe("呼んだ 1回");
    expect(hideSeekSkin.statusJa?.(view({ searched: [0], presses: { call: 2 } }), null)).toBe("開けた扉 1・呼んだ 2回（次で出てくる）");
    expect(call.hintJa).toContain("3回目で、彼女が出てきます");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(nahargarhHideSeek.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["bay", "backdrop"], ["room", "backdrop"], ["peek", "sprite"]]);
    const html = field({ bay: "/assets/minigames/bay.webp", room: "/assets/minigames/room.webp", peek: "/assets/minigames/peek.webp" },
      view({ ending: { kind: "idle", misses: 0, helped: 0 } }));
    expect(html).toContain('data-art-bay="true"');
    expect(html).toContain("/assets/minigames/bay.webp");
    expect(html).toContain("/assets/minigames/room.webp");
    expect(html).toContain('src="/assets/minigames/peek.webp"');
    expect(html).not.toContain("standing-picture");
  });
});
