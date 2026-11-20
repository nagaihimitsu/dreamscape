import { readFileSync } from "node:fs";
import { z } from "zod";
import { servedFile } from "./public-assets";

// The heroine's face in a small round frame (CharacterFace: her whispered hint, a place's or the recap's few words) is
// cut from the standing picture of the outfit she wears (2026-11-20 user decision): no face file per outfit. Where the
// face is in each pose's picture (`face`: its centre and the frame's size, in the picture's pixels) comes from the pose's
// moving standing picture (its built/layers.json gives both eyes), so an outfit added later frames her face by itself,
// wherever its picture puts her head. A writer may write `face` by hand (a pose without a moving picture); content:build
// keeps it. Without either, the face falls back to the frame every picture of the heroine had (character-portrait.css).

/** A face frame in a pose's picture: its centre and its side, in the picture's pixels. */
export type FaceFrame = { x: number; y: number; size: number };

/**
 * How the frame stands to the eyes: its side is 3.8 times the distance between the eyes' centres, its centre a little
 * right of and above their midpoint (the hair and the chin in, the ears at the edge). Chosen so that the basic outfit's
 * frame stays the one character-portrait.css drew before (centre 512, 184 of 1024×1536, side 301).
 */
const SIDE_PER_EYES = 3.8;
const RIGHT_PER_EYES = 0.08;
const DOWN_PER_EYES = -0.04;

const eyeSchema = z.object({
  x0: z.number(),
  x1: z.number(),
  top: z.array(z.number()).min(1),
  bot: z.array(z.number()).min(1),
}).refine((eye) => eye.top.length === eye.bot.length);
const layersSchema = z.object({
  size: z.tuple([z.number().positive(), z.number().positive()]),
  eyes: z.array(eyeSchema).length(2),
});

/**
 * The face frame of a pose from its moving picture's layers (built/layers.json: `size`, and `eyes`, each with its span
 * x0–x1 and its upper and lower lid along it), in the pose's `canvas` (the layers' size scaled to it). Null when the
 * layers do not give two eyes (another format, a face without eyes): then the pose keeps the default frame.
 */
export function faceFrameFromEyes(layers: unknown, canvas: { width: number; height: number }): FaceFrame | null {
  const parsed = layersSchema.safeParse(layers);
  if (!parsed.success) return null;
  const [width, height] = parsed.data.size;
  const sx = canvas.width / width;
  const sy = canvas.height / height;
  const [a, b] = parsed.data.eyes.map((eye) => ({
    x: ((eye.x0 + eye.x1) / 2) * sx,
    y: (eye.top.reduce((sum, top, index) => sum + (top + eye.bot[index]) / 2, 0) / eye.top.length) * sy,
  }));
  const distance = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(distance > 0)) return null;
  return {
    x: Math.round((a.x + b.x) / 2 + RIGHT_PER_EYES * distance),
    y: Math.round((a.y + b.y) / 2 + DOWN_PER_EYES * distance),
    size: Math.round(SIDE_PER_EYES * distance),
  };
}

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The merged presentation/characters.json with a `face` on every pose that has a moving picture and no `face` of its
 * own (faceFrameFromEyes over its built/layers.json, read from the served files), for the generated mirror the game
 * reads. Null when no pose gains one (the mirror stays the merged sources). Run after validateCharacters, which has
 * checked that every moving picture's layers are served.
 */
export function withFaceFrames(characters: unknown, publicFiles: ReadonlyMap<string, string>): unknown | null {
  if (!isObject(characters) || !Array.isArray(characters.characters)) return null;
  let added = false;
  const next = {
    ...characters,
    characters: characters.characters.map((character: unknown) => {
      if (!isObject(character) || !Array.isArray(character.costumes)) return character;
      return { ...character, costumes: character.costumes.map((costume: unknown) => {
        if (!isObject(costume) || !Array.isArray(costume.poses)) return costume;
        return { ...costume, poses: costume.poses.map((pose: unknown) => {
          if (!isObject(pose) || pose.face !== undefined || typeof pose.avatar !== "string" || !isObject(pose.canvas)) return pose;
          const file = servedFile(publicFiles, `${pose.avatar}built/layers.json`);
          if (!file) return pose;
          const face = faceFrameFromEyes(JSON.parse(readFileSync(file, "utf8")), pose.canvas as { width: number; height: number });
          if (!face) return pose;
          added = true;
          return { ...pose, face };
        }) };
      }) };
    }),
  };
  return added ? next : null;
}
