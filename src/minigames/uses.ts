import { z } from "zod";
import { SCENE_KINDS } from "../content/scene-schemas";
import { miniGameTagText, type MiniGameTag } from "./tag";

// Where the stories use the mini-games (docs/13 3.4): what content:build's full-branch walk found, one entry per tag
// (src/content/generated/minigame-uses.json). The game never reads it; the content-driven tests and Debug's
// 「ミニゲームの見本」 do.

const word = z.string().regex(/^\S+$/u);
export const miniGameUseSchema = z.object({
  /** The scene the tag is in (a place file's knot, or a one-scene file's story), and its kind. */
  sceneId: z.string().min(1),
  kind: z.enum(SCENE_KINDS),
  /** The story file and the knot the tag's line is in (a helper knot the scene calls, or its own). */
  storyId: z.string().min(1),
  knot: z.string().min(1).optional(),
  game: z.string().min(1),
  auto: word,
  prefix: word.optional(),
  bg: word.optional(),
  art: z.record(z.string(), word).optional(),
  params: z.record(z.string(), word).optional(),
  /** The tag's line (its text), to find it in the story. */
  line: z.string(),
}).strict();
export type MiniGameUse = z.infer<typeof miniGameUseSchema>;
export const miniGameUseListSchema = z.array(miniGameUseSchema);

/** A use's tag as a frame keeps it. */
export const miniGameUseTag = (use: MiniGameUse): MiniGameTag => ({ id: use.game, auto: use.auto, ...(use.prefix ? { prefix: use.prefix } : {}),
  ...(use.bg ? { bg: use.bg } : {}), ...(use.art ? { art: use.art } : {}), ...(use.params ? { params: use.params } : {}) });

/** The key of a use: one per scene, knot and tag as written (one tag reached on several paths is one use). */
export const miniGameUseKey = (use: MiniGameUse): string => `${use.sceneId}|${use.knot ?? ""}|${miniGameTagText(miniGameUseTag(use))}`;
