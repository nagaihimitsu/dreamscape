import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SearchView } from "../engines/search/EnginePlay";
import { nahargarhHideSeek } from "./definition";
import { hideSeekSetup } from "./rules";
import { HIDE_SEEK_ROOM_EVENTS, hideSeekLean, hideSeekRoomEvents, hideSeekRoomJa, hideSeekSkin } from "./Skin";

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
    expect(found).toContain('aria-label="扉3：空っぽの部屋。しんとしている"');
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

  it("leans an empty room near her door toward it (warm), not a far one (cold), in the picture and the door's name; next door, her gasp", () => {
    // Her door is the 7th (index 6): rooms within three doors lean toward it, farther ones are quiet.
    expect(hideSeekLean(3, 6)).toEqual({ toward: "right", next: false });
    expect(hideSeekLean(9, 6)).toEqual({ toward: "left", next: false });
    expect(hideSeekLean(5, 6)).toEqual({ toward: "right", next: true });
    expect(hideSeekLean(7, 6)).toEqual({ toward: "left", next: true });
    expect(hideSeekLean(0, 6)).toEqual({ toward: null, next: false });
    expect(hideSeekLean(11, 6)).toEqual({ toward: null, next: false });
    const cold = field({}, view({ searched: [0] }));
    expect(cold).toContain('data-toward="none"');
    expect(cold).toContain('aria-label="扉1：空っぽの部屋。しんとしている"');
    const warm = field({}, view({ searched: [3] }));
    expect(warm).toContain('data-toward="right"');
    expect(warm).toMatch(/aria-label="扉4：空っぽの部屋。[^"]*右[^"]*"/u);
    const beyond = field({}, view({ searched: [9] }));
    expect(beyond).toContain('data-toward="left"');
    expect(beyond).toMatch(/aria-label="扉10：空っぽの部屋。[^"]*左[^"]*"/u);
    for (const event of HIDE_SEEK_ROOM_EVENTS) {
      expect(hideSeekRoomJa(event, 3, 6)).toContain("右");
      expect(hideSeekRoomJa(event, 9, 6)).toContain("左");
      expect(hideSeekRoomJa(event, 0, 6)).toBe("しんとしている");
      expect(hideSeekRoomJa(event, 5, 6)).toBe("右の壁の向こうで、小さな声がした");
    }
  });

  it("draws her fingers ready at her shut door (shown when she peeks), never at another door or once found", () => {
    expect(field({}).match(/mg-nahargarh-hide-seek-fingers/gu)).toHaveLength(1);
    expect(field({}, view({ searched: [6], ending: { kind: "found", spot: 6, misses: 0, helped: 0 } }))).not.toContain("mg-nahargarh-hide-seek-fingers");
  });

  it("warns before the call that brings her out: the button and the band", () => {
    const [call] = hideSeekSkin.buttons;
    const label = (presses: number) => (typeof call.labelJa === "function" ? call.labelJa(view({ presses: { call: presses } })) : call.labelJa);
    expect([0, 1, 2].map(label)).toEqual(["名前を呼ぶ", "名前を呼ぶ", "最後に呼ぶ"]);
    expect(hideSeekSkin.statusJa?.(view({ presses: { call: 1 } }), null)).toBe("呼んだ 1回");
    // The warning first (at 320px the band's end is cut: 2026-11-14 playtest), and nothing once she is out.
    expect(hideSeekSkin.statusJa?.(view({ searched: [0], presses: { call: 2 } }), null)).toBe("次で出てくる・開けた扉 1");
    expect(hideSeekSkin.statusJa?.(view({ searched: [0, 6], presses: { call: 2 }, ending: { kind: "found", spot: 6, misses: 1, helped: 0 } }), null)).toBe("");
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
