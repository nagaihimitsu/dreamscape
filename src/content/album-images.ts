import { z } from "zod";

// The album's illustrations (2026-11-11 user decision): artwork the author makes for Dreamscape, one file each at a
// journey's `public/assets/album/<ID>.<webp|png|jpg|jpeg>`, served at `assets/album/<file>`. The file name without its
// extension is the ID a line's `# photo:` and `# recall:` name. Nothing registers them, and no source, licence or credit
// is asked for or shown. content:build checks and lists them (scripts/album-images.ts) into
// src/content/generated/album-images.json, which src/content/index.ts reads.

/** An album image's ID: its file name without the extension. */
export const ALBUM_IMAGE_ID = /^[a-z0-9_]+$/u;
/** The folder below a journey's `public/` that holds its album images (served at the same path). */
export const ALBUM_IMAGE_FOLDER = "assets/album";
export const ALBUM_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const;

/**
 * The ID of a served path that names an album image (`assets/album/<ID>.<webp|png|jpg|jpeg>`, directly in the folder),
 * or undefined for any other path.
 */
export function albumImageIdOf(assetPath: string): string | undefined {
  const prefix = `${ALBUM_IMAGE_FOLDER}/`;
  if (!assetPath.startsWith(prefix)) return undefined;
  const name = assetPath.slice(prefix.length);
  const dot = name.lastIndexOf(".");
  const id = name.slice(0, dot);
  const extension = name.slice(dot + 1);
  return dot > 0 && ALBUM_IMAGE_ID.test(id) && (ALBUM_IMAGE_EXTENSIONS as readonly string[]).includes(extension) ? id : undefined;
}

/**
 * One album image of a journey: its ID, its served path and the journey whose public/ folder serves it, and where a line's
 * `# photo:` takes it (scripts/album-images.ts withPhotoSpots; 2026-11-20 user decision: once the journey is over, 旅の記録's
 * 「写真」 shows in grey the photos not taken yet): the city of the first such line and that line's `# photo_caption:`. An
 * image no line takes has no `photo` (only a `# recall:` names it, or nothing does).
 */
export const albumImageSchema = z.object({
  id: z.string().regex(ALBUM_IMAGE_ID),
  path: z.string().min(1),
  journeyId: z.string().min(1),
  photo: z.object({ cityId: z.string().min(1), caption: z.string().min(1).optional() }).strict().optional(),
}).strict();
export type AlbumImage = z.infer<typeof albumImageSchema>;

/** The generated list (`src/content/generated/album-images.json`): every journey's album images, each ID once. */
export const albumImageListSchema = z.array(albumImageSchema)
  .refine((images) => new Set(images.map((image) => image.id)).size === images.length, "Duplicate album image ID");
