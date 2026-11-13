import { z } from "zod";

// The pictures a use gives a skin from its journey (`art.<slot> <imageId>`; 2026-11-13 user decision: 「クリケットとか、背景は
// あった方が盛り上がると思う」): one file each at a journey's (or the root's) `public/assets/minigames/<ID>.<webp|png|jpg|jpeg>`,
// served at `assets/minigames/<file>`. The file name without its extension is the ID. Like every served image that is no
// tourism photo, it is listed in its layer's presentation/own-artwork.json (scripts/image-rights.ts). content:build lists
// them (scripts/minigame-art.ts) into src/content/generated/minigame-art.json, which src/content/index.ts reads.

/** A mini-game picture's ID: its file name without the extension. */
export const MINI_GAME_ART_ID = /^[a-z0-9_]+$/u;
/** The folder below a public/ folder that holds the mini-game pictures (served at the same path). */
export const MINI_GAME_ART_FOLDER = "assets/minigames";
export const MINI_GAME_ART_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const;
/** A sprite (a figure on the field) needs a transparent background: webp or png. */
export const MINI_GAME_ART_SPRITE_EXTENSIONS: readonly string[] = ["webp", "png"];

/** The ID of a served path that names a mini-game picture (directly in the folder), or undefined for any other path. */
export function miniGameArtIdOf(assetPath: string): string | undefined {
  const prefix = `${MINI_GAME_ART_FOLDER}/`;
  if (!assetPath.startsWith(prefix)) return undefined;
  const name = assetPath.slice(prefix.length);
  const dot = name.lastIndexOf(".");
  const id = name.slice(0, dot);
  const extension = name.slice(dot + 1);
  return dot > 0 && MINI_GAME_ART_ID.test(id) && (MINI_GAME_ART_EXTENSIONS as readonly string[]).includes(extension) ? id : undefined;
}

/** One mini-game picture: its ID, its served path and the journey whose public/ serves it (null: the root public/). */
export const miniGameArtSchema = z.object({
  id: z.string().regex(MINI_GAME_ART_ID),
  path: z.string().min(1),
  journeyId: z.string().min(1).nullable(),
}).strict();
export type MiniGameArt = z.infer<typeof miniGameArtSchema>;

/** The generated list (`src/content/generated/minigame-art.json`): every layer's mini-game pictures, each ID once. */
export const miniGameArtListSchema = z.array(miniGameArtSchema)
  .refine((images) => new Set(images.map((image) => image.id)).size === images.length, "Duplicate mini-game art ID");
