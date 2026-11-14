import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { centreStroke, shapeMeasures, shapeStart, type ShapeRollMark } from "../engines/shape_drag/engine";
import { shapeHandView, type ShapeDragView } from "../engines/shape_drag/EnginePlay";
import { rotiRolling } from "./definition";
import { ROTI_GAME, ROTI_HAND, ROTI_TUNING, ROTI_WINDOWS } from "./rules";
import { rotiArrowDegrees, rotiFollowedArrow, rotiHarbansWord, rotiPrefer, rotiSkin, softOutline } from "./Skin";

// The roti's field (docs/13 2.12): a use's pictures in place of the drawn table, board, pin and dough, the CSS and SVG look
// without them, and Harbans's beat drawn: the arrow with its fuse, his hand coming and on the dough, the tava, his words.
const start = shapeStart(ROTI_TUNING);
const view: ShapeDragView = {
  points: start.points, pin: null, measures: shapeMeasures(start, ROTI_TUNING), strokes: 0, outcome: null, lastStroke: null, idle: false,
  turned: 0, rolls: [], hand: shapeHandView(ROTI_HAND, 100),
};
const props = (art: Record<string, string>, change: Partial<ShapeDragView> = {}) => ({
  params: {}, still: false, seed: 7, cast: { heroine: null }, names: { player: "主人公", heroine: "ヒロイン" }, art, view: { ...view, ...change },
});
const board = (art: Record<string, string>, change: Partial<ShapeDragView> = {}) => renderToStaticMarkup(createElement(rotiSkin.Board, props(art, change)));
const backdrop = (art: Record<string, string>, change: Partial<ShapeDragView> = {}) => renderToStaticMarkup(createElement(rotiSkin.Backdrop, props(art, change)));
/** A roll the arrow's way (or `off` degrees from it) lifted at `at`. */
const roll = (rolls: readonly ShapeRollMark[], at: number, off = 0): ShapeRollMark => ({ degrees: (rotiArrowDegrees(7, { rolls, turned: 0 }) + off) % 180, push: 0.08, skid: false, at });

describe("the roti's field", () => {
  it("draws its own table, board, pin and dough without the use's art", () => {
    expect(backdrop({})).toContain("mg-roti-rolling-table");
    expect(backdrop({})).not.toContain("<img");
    const html = board({});
    expect(html).toContain('class="mg-roti-rolling mg-play-object"');
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

  it("shows the pin where the stroke rolls (skidding into his hand), and a hole when the dough tore", () => {
    const rolling = board({}, { pin: { x: 0.1, y: -0.2, degrees: 270, skid: false } });
    expect(rolling).toContain('transform="translate(0.1 -0.2) rotate(360)"');
    expect(board({}, { pin: { x: 0, y: 0, degrees: 0, skid: true } })).toContain('data-skid="true"');
    expect(board({})).not.toContain("mg-roti-rolling-hole");
    expect(board({}, { outcome: "torn" })).toContain("mg-roti-rolling-hole");
  });

  it("points the arrow the way of the dough rolled least, turned with the dough, its order from the seed", () => {
    expect([...rotiPrefer(7)].sort((a, b) => a - b)).toEqual([0, 45, 90, 135]);
    expect(rotiPrefer(7)).toEqual(rotiPrefer(7));
    const first = rotiArrowDegrees(7, view);
    expect(first).toBe(rotiPrefer(7)[0]);
    expect(board({})).toContain(`data-degrees="${first}"`);
    // Turned a quarter with the dough.
    expect(rotiArrowDegrees(7, { rolls: [], turned: 90 })).toBe((first + 90) % 360);
    // Once a way is rolled, the arrow moves on to one rolled less.
    const once = [roll([], 400)];
    expect(rotiArrowDegrees(7, { rolls: once, turned: 0 }) % 180).not.toBe(first % 180);
  });

  it("burns the arrow's fuse down with the window, fades it as his hand comes, and hides it while his hand is on", () => {
    expect(board({}, { hand: shapeHandView(ROTI_HAND, 100) })).toContain('data-testid="roti-fuse"');
    const late = board({}, { hand: shapeHandView(ROTI_HAND, ROTI_WINDOWS[0].to - 200) });
    expect(late).toContain('data-coming="true"');
    expect(late).toContain('data-testid="roti-hand"');
    const on = board({}, { hand: shapeHandView(ROTI_HAND, ROTI_HAND.turns[0].at) });
    expect(on).not.toContain("roti-arrow");
    expect(on).toContain('data-phase="on"');
    expect(board({}, { pin: { x: 0, y: 0, degrees: 0, skid: false } })).not.toContain("roti-arrow");
    expect(board({}, { outcome: "round" })).not.toContain("roti-arrow");
    // Left alone, a finger rolls along it.
    expect(board({})).not.toContain("mg-roti-rolling-finger");
    expect(board({}, { idle: true })).toContain("mg-roti-rolling-finger");
  });

  it("waits for his turn once a window has had its stroke (two in the long pause), with a turning sign", () => {
    const stroked = [roll([], ROTI_WINDOWS[0].from + 400)];
    const waiting = board({}, { rolls: stroked, strokes: 1 });
    expect(waiting).not.toContain("roti-arrow");
    expect(waiting).toContain('data-testid="roti-wait"');
    const pause = ROTI_WINDOWS.findIndex((window) => window.kind === "pause");
    const inPause = ROTI_WINDOWS[pause].from + 300;
    const once = [roll([], inPause)];
    expect(board({}, { rolls: once, strokes: 1, hand: shapeHandView(ROTI_HAND, inPause + 400) })).toContain("roti-arrow");
    const twice = [...once, roll(once, inPause + 900)];
    expect(board({}, { rolls: twice, strokes: 2, hand: shapeHandView(ROTI_HAND, inPause + 1300) })).not.toContain("roti-arrow");
  });

  it("dusts flour in the feint, and the tava glows in the hot windows", () => {
    const feint = ROTI_HAND.turns.find((item) => item.deg === 0)!.at;
    const dust = board({}, { hand: shapeHandView(ROTI_HAND, feint) });
    expect(dust).toContain('data-feint="true"');
    expect(dust).toContain("mg-roti-rolling-flour-fall");
    const hot = ROTI_WINDOWS.findIndex((window) => window.kind === "hot");
    expect(backdrop({}, { hand: shapeHandView(ROTI_HAND, ROTI_WINDOWS[hot].from + 100) })).toMatch(/data-hot="true"[^>]*data-testid="roti-tava"/u);
    expect(backdrop({})).not.toContain('data-hot="true"');
  });

  it("gives Harbans a word for the twist, the feint, a skid, a stroke the arrow's way (shown only with a speaker)", () => {
    const at = (ms: number, change: Partial<ShapeDragView> = {}) => rotiHarbansWord(ROTI_GAME, 7, { ...view, hand: shapeHandView(ROTI_HAND, ms), ...change })?.word ?? null;
    const begins = (kind: string) => ROTI_WINDOWS[ROTI_WINDOWS.findIndex((window) => window.kind === kind)].from + 100;
    expect(at(100)).toBeNull();
    expect(at(begins("pause"))).toContain("二回");
    expect(at(begins("quick"))).toBe("速くするぞ");
    expect(at(begins("hot"))).toBe("鉄板が熱い。急げ");
    expect(at(ROTI_HAND.turns.find((item) => item.deg === 0)!.at)).toBe("粉だ");
    const followed = [roll([], 400)];
    expect(at(600, { rolls: followed, strokes: 1 })).toBe("そうだ");
    expect(at(600, { rolls: [roll([], 400, 90)], strokes: 1 })).toBeNull();
    expect(at(600, { rolls: [{ ...followed[0], skid: true }], strokes: 1 })).toBe("おっと、手だ");
    expect(rotiFollowedArrow(7, followed)).toBe(true);
    expect(rotiFollowedArrow(7, [roll([], 400, 30)])).toBe(false);
    // On the field: only with the scene's speaker.
    const withHim = renderToStaticMarkup(createElement(rotiSkin.Backdrop,
      { ...props({}, { rolls: followed, strokes: 1, hand: shapeHandView(ROTI_HAND, 600) }), cast: { heroine: null, person: createElement("i", { "data-testid": "harbans" }) } }));
    expect(withHim).toContain('data-testid="harbans"');
    expect(withHim).toContain("そうだ");
    expect(backdrop({}, { rolls: followed, strokes: 1 })).not.toContain("mg-roti-rolling-harbans");
    expect(centreStroke(0, 0.5)).toBeTruthy();
  });

  it("softens the drawn outline: a rolled octagon reads round, a box keeps its corners", () => {
    const radii = (points: readonly { x: number; y: number }[]) => points.map((point) => Math.hypot(point.x, point.y));
    const spread = (values: number[]) => Math.max(...values) / Math.min(...values);
    const octagon = Array.from({ length: 8 }, (_, index) => ({ x: Math.cos((index * Math.PI) / 4) * 0.3, y: Math.sin((index * Math.PI) / 4) * 0.3 }));
    expect(spread(radii(softOutline(octagon)))).toBeLessThan(1.01);
    const square = [{ x: -0.2, y: -0.2 }, { x: 0.2, y: -0.2 }, { x: 0.2, y: 0.2 }, { x: -0.2, y: 0.2 }];
    expect(spread(radii(softOutline(square)))).toBeGreaterThan(1.2);
  });
});
