import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { shapeMeasures, shapeStart } from "../engines/shape_drag/engine";
import { rotiRolling } from "./definition";
import { ROTI_TUNING } from "./rules";
import { rotiSkin } from "./Skin";
import type { ShapeDragView } from "../engines/shape_drag/EnginePlay";

// The roti's art slots (docs/13 2.12): a use's pictures in place of the drawn table, board, pin and dough, and the CSS and
// SVG look without them.
const start = shapeStart(ROTI_TUNING);
const view: ShapeDragView = { points: start.points, pin: null, measures: shapeMeasures(start, ROTI_TUNING), strokes: 0, outcome: null };
const props = (art: Record<string, string>, change: Partial<ShapeDragView> = {}) => ({
  params: {}, still: false, seed: 7, cast: { heroine: null }, names: { player: "主人公", heroine: "ヒロイン" }, art, view: { ...view, ...change },
});
const board = (art: Record<string, string>, change: Partial<ShapeDragView> = {}) => renderToStaticMarkup(createElement(rotiSkin.Board, props(art, change)));
const backdrop = (art: Record<string, string>) => renderToStaticMarkup(createElement(rotiSkin.Backdrop, props(art)));

describe("the roti's field", () => {
  it("draws its own table, board, pin and dough without the use's art", () => {
    expect(backdrop({})).toContain("mg-roti-rolling-table");
    expect(backdrop({})).not.toContain("<img");
    const html = board({});
    expect(html).toContain('class="mg-roti-rolling"');
    expect(html).toContain("mg-roti-rolling-board-face");
    expect(html).toContain("mg-roti-rolling-pin-body");
    expect(html).toContain('data-testid="roti-dough"');
    expect(html).not.toContain("<image");
  });

  it("puts the use's pictures in its declared slots", () => {
    expect(rotiRolling.artSlots.map((slot) => [slot.id, slot.kind])).toEqual([["kitchen", "backdrop"], ["board", "sprite"], ["pin", "sprite"], ["dough", "backdrop"]]);
    expect(backdrop({ kitchen: "/assets/minigames/kitchen.webp" })).toContain('src="/assets/minigames/kitchen.webp"');
    const html = board({ board: "/assets/minigames/board.webp", pin: "/assets/minigames/pin.webp", dough: "/assets/minigames/dough.webp" });
    expect(html).toContain('href="/assets/minigames/board.webp"');
    expect(html).toContain('href="/assets/minigames/pin.webp"');
    expect(html).toContain('href="/assets/minigames/dough.webp"');
    expect(html).not.toContain("mg-roti-rolling-board-face");
    expect(html).not.toContain("mg-roti-rolling-pin-body");
  });

  it("shows the pin where the stroke rolls, and a hole when the dough tore", () => {
    const rolling = board({}, { pin: { x: 0.1, y: -0.2, degrees: 270 } });
    expect(rolling).toContain('transform="translate(0.1 -0.2) rotate(360)"');
    expect(board({})).not.toContain("mg-roti-rolling-hole");
    expect(board({}, { outcome: "torn" })).toContain("mg-roti-rolling-hole");
  });
});
