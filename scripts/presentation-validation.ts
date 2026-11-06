import type { characterCatalogSchema } from "../src/content/character-assets";
import type { presentationSchema } from "../src/content/schemas";
import type { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { servedFile } from "./public-assets";

type Presentation = ReturnType<typeof presentationSchema.parse>;
type Characters = ReturnType<typeof characterCatalogSchema.parse>;
type Tourism = ReturnType<typeof tourismCatalogSchema.parse>;
/** Served files of the loaded content (ContentSources.publicFiles). */
type PublicFiles = ReadonlyMap<string, string>;

/** Check image files and asset references without changing their authored metadata. */
export function validateBackgroundAssets(
  publicFiles: PublicFiles,
  backgrounds: Presentation["backgrounds"],
  assets: Tourism["assets"],
): void {
  for (const [backgroundId, background] of Object.entries(backgrounds)) {
    if (background.imagePath && !servedFile(publicFiles, background.imagePath))
      throw new Error(`Missing background image: ${backgroundId}/${background.imagePath}`);
    if (background.imageAssetId && !assets.some((asset) => asset.id === background.imageAssetId))
      throw new Error(`Unknown background image asset: ${backgroundId}/${background.imageAssetId}`);
    if (background.imagePath && background.imageAssetId)
      throw new Error(`Background cannot specify both imagePath and imageAssetId: ${backgroundId}`);
  }
}

/** A registered costume image: decoded by validateCharacterImage once the content is valid (see content-images.ts). */
export type CharacterImage = { file: string; imagePath: string; canvas: { width: number; height: number }; label: string };

/**
 * Character assignments, wardrobe and image files share one validation
 * boundary. Returns the costume images, which exist; their contents are
 * checked by validateCharacterImage.
 */
export function validateCharacters(
  publicFiles: PublicFiles,
  characters: Characters,
  references: {
    cities: readonly { id: string; countryCode: string }[];
    emotions: Presentation["emotions"];
    battleIds: ReadonlySet<string>;
    sceneIds: ReadonlySet<string>;
  },
): CharacterImage[] {
  for (const battleId of Object.keys(characters.battleCharacters ?? {})) {
    if (!references.battleIds.has(battleId))
      throw new Error(`Unknown battle ID in character assignment: ${battleId}`);
  }
  for (const required of ["heroine", "enemy"]) {
    if (!characters.characters.some((character) => character.id === required))
      throw new Error(`Unknown required character ID: ${required}`);
  }
  for (const [cityId, mapping] of Object.entries(characters.wardrobe?.cities ?? {})) {
    const wardrobeCity = references.cities.find((item) => item.id === cityId);
    if (!wardrobeCity)
      throw new Error(`Unknown city in character wardrobe: ${cityId}`);
    if (mapping.country !== wardrobeCity.countryCode)
      throw new Error(`Character wardrobe country mismatch: ${cityId}/${mapping.country} (expected ${wardrobeCity.countryCode})`);
  }
  for (const sceneId of Object.keys(characters.wardrobe?.scenes ?? {})) {
    if (!references.sceneIds.has(sceneId))
      throw new Error(`Unknown scene in character wardrobe: ${sceneId}`);
  }
  const images: CharacterImage[] = [];
  for (const character of characters.characters) {
    for (const variant of character.variants) {
      if (variant.emotion && !references.emotions[variant.emotion])
        throw new Error(`Unknown character emotion: ${character.id}/${variant.emotion}`);
    }
    for (const image of [character.imagePath, ...character.variants.map((variant) => variant.imagePath)]) {
      if (image && !servedFile(publicFiles, image))
        throw new Error(`Missing character image: ${character.id}/${image}`);
    }
    for (const costume of character.costumes ?? []) {
      for (const pose of costume.poses) {
        for (const [expression, imagePath] of Object.entries(pose.expressions)) {
          const label = `${character.id}/${costume.id}/${pose.id}/${expression}`;
          const file = servedFile(publicFiles, imagePath);
          if (!file) throw new Error(`Missing character image: ${label}/${imagePath}`);
          images.push({ file, imagePath, canvas: pose.canvas, label });
        }
      }
    }
  }
  return images;
}
