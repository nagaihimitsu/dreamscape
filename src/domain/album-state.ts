import { z } from "zod";
import { ALBUM_IMAGE_ID } from "../content/album-images";
import { storyAddressSchema } from "../content/story-address";
import { stableContentId } from "./stable-id";

/**
 * One photo of the album (2026-11-11, save v22; src/domain/album.ts): the image a line's `# photo:` named, its
 * `# photo_caption:`, and where and when the line was first read in this journey (the city, the city's day and
 * minute of the game clock, the place the party was at, the story the line is in). The image is an album image, whose
 * ID is its file name (src/content/album-images.ts: it may start with a digit, unlike the other saved IDs).
 */
export const albumPhotoSchema = z.object({
  imageId: z.string().regex(ALBUM_IMAGE_ID),
  caption: z.string().min(1).optional(),
  cityId: stableContentId,
  day: z.number().int().positive().safe(),
  minute: z.number().int().min(540).max(1980),
  placeId: stableContentId,
  storyId: storyAddressSchema,
}).strict();
export type AlbumPhoto = z.infer<typeof albumPhotoSchema>;

/** The album in the order the photos were taken; an image is in it once at most. */
export const albumSchema = z.array(albumPhotoSchema)
  .refine((photos) => new Set(photos.map((photo) => photo.imageId)).size === photos.length, "同じ写真がアルバムに2枚あります。");
