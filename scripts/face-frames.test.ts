import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { faceFrameStyle } from "../src/content/character-assets";
import { faceFrameFromEyes, withFaceFrames } from "./face-frames";

// The small round face cut from the outfit she wears (2026-11-20): each pose's frame comes from its moving picture's eyes.

const CANVAS = { width: 1024, height: 1536 };
const LAYERS = "public/assets/characters/heroine/default_01/standing_01/avatar/built/layers.json";
const basic = () => JSON.parse(readFileSync(LAYERS, "utf8")) as { size: [number, number]; eyes: { x0: number; x1: number; top: number[]; bot: number[] }[] };

describe("the face frame from a moving picture's eyes", () => {
  it("keeps the basic outfit's face where the small round face always showed it", () => {
    const frame = faceFrameFromEyes(basic(), CANVAS)!;
    expect(frame).toEqual({ x: 512, y: 183, size: 302 });
    // The frame character-portrait.css drew before (width 340 %, left -120 %, top -11 %), to within about a percent.
    const style = faceFrameStyle({ face: frame, canvas: CANVAS });
    expect(parseFloat(style.width)).toBeCloseTo(340, -1);
    expect(parseFloat(style.left)).toBeCloseTo(-120, -1);
    expect(parseFloat(style.top)).toBeCloseTo(-11, -1);
  });

  it("follows a head drawn elsewhere or larger, and the canvas the layers are scaled to", () => {
    const moved = basic();
    for (const eye of moved.eyes) {
      eye.x0 -= 100; eye.x1 -= 100;
      eye.top = eye.top.map((value) => value + 200);
      eye.bot = eye.bot.map((value) => value + 200);
    }
    expect(faceFrameFromEyes(moved, CANVAS)).toEqual({ x: 412, y: 383, size: 302 });
    expect(faceFrameFromEyes(basic(), { width: 512, height: 768 })).toEqual({ x: 256, y: 92, size: 151 });
  });

  it("gives none for layers without two eyes", () => {
    expect(faceFrameFromEyes({ size: [1024, 1536], eyes: [] }, CANVAS)).toBeNull();
    expect(faceFrameFromEyes({ layers: {} }, CANVAS)).toBeNull();
  });

  it("adds a frame to each pose with a moving picture, keeping one written by hand and the poses without", () => {
    const pose = (extra: object) => ({ id: "standing_01", canvas: CANVAS, expressions: {}, ...extra });
    const catalog = { schemaVersion: 1, characters: [{ id: "heroine", costumes: [
      { id: "a", poses: [pose({ avatar: "assets/a/" })] },
      { id: "b", poses: [pose({ avatar: "assets/a/", face: { x: 1, y: 2, size: 3 } })] },
      { id: "c", poses: [pose({})] },
    ] }] };
    const files = new Map([["assets/a/built/layers.json", LAYERS]]);
    const faced = withFaceFrames(catalog, files) as typeof catalog;
    const faces = faced.characters[0].costumes.map((costume) => (costume.poses[0] as { face?: unknown }).face);
    expect(faces).toEqual([{ x: 512, y: 183, size: 302 }, { x: 1, y: 2, size: 3 }, undefined]);
    expect(withFaceFrames(catalog, new Map())).toBeNull();
  });
});
