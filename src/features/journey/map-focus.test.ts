import { describe, expect, it } from "vitest";
import agra from "../../content/generated/content/travel/agra.json";
import milano from "../../content/generated/content/travel/milano.json";
import { fitZoom, FOCUS_PADDING, framePosition, getFocusView, labelMaxWidth, mapControlRects, type Frame } from "./map-focus";

const small: Frame = { width: 288, height: 140 };
const large: Frame = { width: 358, height: 210 };
const at = (places: { id: string; latitude: number; longitude: number; nameJa: string }[], test: (place: { nameJa: string; id: string }) => boolean) => places.find(test)!;
const m = (id: string) => at(milano.places, (place) => place.id === id);
const taj = at(agra.places, (place) => place.nameJa.includes("タージ"));
const sikri = at(agra.places, (place) => place.nameJa.includes("シークリー"));
const overview = (places: typeof milano.places, frame: Frame) => fitZoom(places, frame, 24, 15);

describe("the map's focus on a selection (§3.5 examples)", () => {
  it.each([
    [small, 11, 9, [14, true], [14, true], [12, true], [12, false], [10, false]],
    [large, 12, 10, [15, true], [15, true], [13, true], [13, false], [11, false]],
  ] as const)("frame %o", (frame, milanoOverview, agraOverview, duomoGalleria, hotelDuomo, hotelCastello, hotelDarsena, tajSikri) => {
    expect(overview(milano.places, frame)).toBe(milanoOverview);
    expect(overview(agra.places, frame)).toBe(agraOverview);
    const view = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }, o: number) =>
      { const result = getFocusView({ destination: to, current: from, frame, overviewZoom: o }); return [result.zoom, result.showsCurrent]; };
    expect(view(m("p_duomo"), m("p_galleria"), milanoOverview)).toEqual(duomoGalleria);
    expect(view(m("p_hotel"), m("p_duomo"), milanoOverview)).toEqual(hotelDuomo);
    expect(view(m("p_hotel"), m("p_castello"), milanoOverview)).toEqual(hotelCastello);
    expect(view(m("p_hotel"), m("p_darsena"), milanoOverview)).toEqual(hotelDarsena);
    expect(view(taj, sikri, agraOverview)).toEqual(tajSikri);
  });

  it("zooms to 17 on the current place and never below the overview + 1", () => {
    expect(getFocusView({ destination: m("p_duomo"), current: m("p_duomo"), frame: small, overviewZoom: 11 }).zoom).toBe(17);
    for (const frame of [small, large]) for (const places of [milano.places, agra.places]) {
      const o = overview(places, frame);
      for (const a of places) for (const b of places) if (a !== b)
        expect(getFocusView({ destination: b, current: a, frame, overviewZoom: o }).zoom).toBeGreaterThanOrEqual(o + 1);
    }
  });

  it("never shows the current place's marker under the zoom column, 「大きく」 or the attribution", () => {
    let hits = 0;
    for (const frame of [small, large]) for (const places of [milano.places, agra.places]) {
      const o = overview(places, frame);
      for (const a of places) for (const b of places) {
        if (a === b) continue;
        const view = getFocusView({ destination: b, current: a, frame, overviewZoom: o });
        if (!view.showsCurrent) continue;
        const { x, y } = framePosition(a, view.center, view.zoom, frame);
        const box = { left: x - 16, top: y - 16, right: x + 16, bottom: y + 16 };
        hits += mapControlRects(frame).filter((rect) => box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top).length;
      }
    }
    expect(hits).toBe(0);
  });

  it("keeps the label within the side paddings, at most 180 px", () => {
    expect(labelMaxWidth(288)).toBe(144);
    expect(labelMaxWidth(358)).toBe(180);
    expect(FOCUS_PADDING).toEqual({ left: 72, right: 72, top: 32, bottom: 40 });
  });
});
