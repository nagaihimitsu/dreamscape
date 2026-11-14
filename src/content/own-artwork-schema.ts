import { z } from "zod";
import { japaneseText } from "./schemas";

// Artwork made for Dreamscape (the heroine's standing images, the reaction
// marks, item icons, browser icons, a journey's title art): served images
// that have no third-party credit. The credits list leaves them out, and
// content:build checks that every served image is either a credited tourism
// image (tourism/catalog.json `assets`) or listed here, one exact file at a
// time (scripts/image-rights.ts). Each layer lists the files of its own
// public/ folder: content/presentation/own-artwork.json those of the root
// public/, content/journeys/<journeyId>/presentation/own-artwork.json those
// of that journey's public/.

/** File extensions content:build treats as images, in any letter case (served files with another extension are not checked). */
export const IMAGE_EXTENSIONS: readonly string[] = [".png", ".webp", ".jpg", ".jpeg", ".svg", ".gif", ".avif", ".ico"];

/**
 * A served image path relative to the public root (the URL path below the
 * game's base, such as assets/effects/heart.svg or favicon-32.png): no
 * leading slash, no empty segment and no segment that starts with a dot (so
 * no `..`; the loader skips dot entries), an image file extension of
 * IMAGE_EXTENSIONS in any letter case (as the image-rights check reads them,
 * so a served `Icon.PNG` can be listed). Folder prefixes are not accepted, so
 * every new image needs its own line.
 */
export const OWN_ARTWORK_PATH = new RegExp(
  `^(?:[a-zA-Z0-9_-][a-zA-Z0-9_.-]*/)*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\\.(?:${IMAGE_EXTENSIONS.map((extension) => extension.slice(1)).join("|")})$`, "iu");

export const ownArtworkGroupSchema = z
  .object({
    /** What these files are and who made them (for the people editing the list; never shown in the game). */
    noteJa: japaneseText,
    /** The served paths (a path listed twice, in one group or in two, is content:build's Japanese error: scripts/image-rights.ts). */
    paths: z
      .array(z.string().regex(OWN_ARTWORK_PATH, "Expected a served image path such as assets/effects/heart.svg"))
      .min(1),
  })
  .strict();

export const ownArtworkCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    artworks: z.array(ownArtworkGroupSchema),
  })
  .strict();

export type OwnArtworkGroup = z.infer<typeof ownArtworkGroupSchema>;
export type OwnArtworkCatalog = z.infer<typeof ownArtworkCatalogSchema>;
