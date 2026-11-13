import { describe, expect, it } from "vitest";
import { WEATHER_KINDS } from "../content/tags";
import { portraitBreath, SCENE_SHAKES, sceneShakeFrames, WEATHER_PART_COUNTS, weatherParts } from "./scene-atmosphere";
import { isVectorIcon, itemFlight, itemShowLeaving } from "./item-show";

// The scene's atmosphere (2026-11-13): the weather's drawn parts, the scene's shake, the portraits' breathing and a
// line's item card.

describe("a weather's drawn parts", () => {
  it("are a few puffs or petals (rain and dust draw none), the same every time", () => {
    for (const kind of WEATHER_KINDS) {
      const parts = weatherParts(kind);
      expect(parts, kind).toHaveLength(WEATHER_PART_COUNTS[kind]);
      expect(weatherParts(kind)).toEqual(parts);
    }
    expect(weatherParts("rain")).toEqual([]);
    expect(weatherParts("dust")).toEqual([]);
    expect(weatherParts("petals").length).toBeLessThanOrEqual(8);
  });

  it("spread across the scene, each already on its way (a negative delay within its own length)", () => {
    for (const kind of ["colors", "petals"] as const) {
      const parts = weatherParts(kind);
      const xs = parts.map((part) => part.x);
      for (const part of parts) {
        expect(part.x).toBeGreaterThan(0);
        expect(part.x).toBeLessThan(100);
        expect(part.delayS).toBeLessThanOrEqual(0);
        expect(-part.delayS).toBeLessThan(part.durationS);
        expect(part.restY).toBeGreaterThan(0);
        expect(part.restY).toBeLessThan(100);
      }
      // Left to right in even bands: no two in one place.
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
      expect(new Set(xs).size).toBe(xs.length);
    }
  });

  it("give the colour powder its six hues and the petals a pink", () => {
    expect(new Set(weatherParts("colors").map((part) => part.hue)).size).toBe(6);
    for (const part of weatherParts("petals")) {
      expect(part.hue).toBeGreaterThanOrEqual(338);
      expect(part.hue).toBeLessThanOrEqual(354);
    }
  });
});

describe("the scene's shake", () => {
  it("moves a little, sideways mostly, and ends where it started; the larger the farther and longer", () => {
    for (const size of ["small", "normal", "large"] as const) {
      const frames = sceneShakeFrames(size, false);
      expect(frames[0]).toEqual({ translate: "0px 0px" });
      expect(frames.at(-1)).toEqual({ translate: "0px 0px" });
      const furthest = Math.max(...frames.map((frame) => Math.abs(Number.parseFloat(String(frame.translate)))));
      expect(furthest).toBe(SCENE_SHAKES[size].px);
    }
    expect(SCENE_SHAKES.small.ms).toBeLessThan(SCENE_SHAKES.normal.ms);
    expect(SCENE_SHAKES.normal.ms).toBeLessThan(SCENE_SHAKES.large.ms);
    expect(SCENE_SHAKES.large.ms).toBeLessThanOrEqual(450);
    expect(SCENE_SHAKES.small.ms).toBeGreaterThanOrEqual(300);
  });

  it("grows the picture meanwhile so its edges never show, and its people not at all", () => {
    const picture = sceneShakeFrames("large", true);
    expect(picture[0].scale).toBe("1");
    expect(picture.at(-1)?.scale).toBe("1");
    expect(Number(picture[2].scale)).toBeGreaterThan(1);
    expect(sceneShakeFrames("large", false).some((frame) => "scale" in frame)).toBe(false);
  });
});

describe("a portrait's breathing", () => {
  it("takes 4.2 to 4.9 s a breath, by its character", () => {
    for (const id of ["heroine", "gt_delhi_kamla", "smp_mihon_toma", "x"]) {
      const { durationMs } = portraitBreath(id, 0);
      expect(durationMs).toBeGreaterThanOrEqual(4200);
      expect(durationMs).toBeLessThanOrEqual(4900);
    }
  });

  it("goes on from where it was when its picture is put up again (a new expression), by the page's clock", () => {
    const { durationMs, delayMs: first } = portraitBreath("heroine", 1000);
    const later = portraitBreath("heroine", 1000 + 1234).delayMs;
    // Where in the breath it is: the time since the first picture, plus where that one started.
    const phase = (delay: number) => -delay;
    expect((phase(first) + 1234) % durationMs).toBe(phase(later));
    expect(first).toBeLessThanOrEqual(0);
    expect(-first).toBeLessThan(durationMs);
  });

  it("puts two characters out of phase", () => {
    expect(portraitBreath("heroine", 5000)).not.toEqual(portraitBreath("smp_mihon_toma", 5000));
  });
});

describe("a line's item card", () => {
  it("leaves as its line goes, not while the next line shows the same item, nor for a load", () => {
    expect(itemShowLeaving("bookmark", undefined, false)).toBe("bookmark");
    expect(itemShowLeaving("bookmark", "ticket", false)).toBe("bookmark");
    expect(itemShowLeaving("bookmark", "bookmark", false)).toBeUndefined();
    expect(itemShowLeaving(undefined, "bookmark", false)).toBeUndefined();
    expect(itemShowLeaving("bookmark", undefined, true)).toBeUndefined();
  });

  it("flies from its middle into the bag's middle, shrinking a little below the bag's size", () => {
    const flight = itemFlight({ left: 100, top: 300, width: 200, height: 220 }, { left: 20, top: 40, width: 44, height: 44 });
    expect(flight).toEqual({ dx: 42 - 200, dy: 62 - 410, scale: Math.round((0.8 * 44 / 220) * 1000) / 1000 });
    expect(itemFlight({ left: 0, top: 0, width: 0, height: 0 }, { left: 10, top: 10, width: 44, height: 44 }).scale).toBe(0.2);
  });

  it("draws an SVG as large as the card allows, any other picture at its own size", () => {
    expect(isVectorIcon("assets/items/item.svg")).toBe(true);
    expect(isVectorIcon("assets/items/ticket.SVG")).toBe(true);
    expect(isVectorIcon("assets/items/ticket.webp")).toBe(false);
    expect(isVectorIcon("assets/items/svg.png")).toBe(false);
  });
});
