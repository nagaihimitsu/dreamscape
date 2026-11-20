import { describe, expect, it } from "vitest";
import { sharedFaceAssets } from "./live-portrait-assets";

describe("moving standing picture with a shared face", () => {
  it("reads the outfit's layers from its folder and the face drawings from the face folder", () => {
    const assets = sharedFaceAssets("/a/outfit/", "/a/face/", ["eye0_ball"], ["face_shy", "mouth_a"]);
    expect(assets).toEqual({
      "layers.json": "/a/outfit/built/layers.json",
      "base.png": "/a/outfit/built/base.png",
      "hairmask.png": "/a/outfit/built/hairmask.png",
      "eye0_ball.png": "/a/outfit/built/eye0_ball.png",
      "sprites/sprites.json": "/a/face/sprites.json",
      "sprites/face_shy.png": "/a/face/face_shy.png",
      "sprites/mouth_a.png": "/a/face/mouth_a.png",
    });
  });
});
