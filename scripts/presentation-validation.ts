import type { characterCatalogSchema } from "../src/content/character-assets";
import type { presentationSchema } from "../src/content/schemas";
import type { tourismCatalogSchema } from "../src/content/tourism-schemas";
import { readFileSync } from "node:fs";
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

/**
 * A background's `placeId` (where it is, for the header's place plate) names a place on a loaded city map; that the
 * place is of the background's own journey is content-ownership.ts's check.
 */
export function validateBackgroundPlaces(backgrounds: Presentation["backgrounds"], placeIds: ReadonlySet<string>): void {
  for (const [backgroundId, background] of Object.entries(backgrounds))
    if (background.placeId && !placeIds.has(background.placeId))
      throw new Error(`Unknown background place: ${backgroundId}/${background.placeId} (placeId names a place of travel/<cityId>.json; ` +
        "for a place not on the map write placeJa)");
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
        if (pose.avatar) validateAvatarFolder(publicFiles, pose.avatar, pose.avatarFace, `${character.id}/${costume.id}/${pose.id}`, references.emotions);
      }
    }
  }
  return images;
}

/**
 * A pose's moving standing picture (`avatar`, a mesh-avatar folder; its face drawings in `avatarFace` when the outfit
 * shares them, else in the folder's built/sprites/): its rig, its layers and every drawing its sprite sheet names are
 * served, and each whole-face drawing (face_<expression>) is named by a known expression, so a missing file or a
 * misspelt face stops the build instead of leaving a portrait still or wrong in the game.
 */
function validateAvatarFolder(
  publicFiles: PublicFiles, folder: string, faceFolder: string | undefined, label: string, emotions: Presentation["emotions"],
): void {
  const needIn = (base: string, relative: string) => {
    const file = servedFile(publicFiles, base + relative);
    if (!file) throw new Error(`Missing moving portrait file: ${label}/${base}${relative}`);
    return file;
  };
  const need = (relative: string) => needIn(folder, relative);
  const readJson = (file: string) => JSON.parse(readFileSync(file, "utf8")) as { layers?: unknown };
  const json = (relative: string) => readJson(need(relative));
  need("avatar.json");
  need("rig.json");
  need("built/base.png");
  need("built/hairmask.png");
  const layers = json("built/layers.json").layers;
  for (const name of Object.keys(typeof layers === "object" && layers ? layers : {})) need(`built/${name}.png`);
  // The face drawings: the shared face folder (required when named), else the folder's own (optional).
  const spriteFolder = faceFolder ?? `${folder}built/sprites/`;
  if (!faceFolder && !servedFile(publicFiles, `${spriteFolder}sprites.json`)) return;
  const sprites = readJson(needIn(spriteFolder, "sprites.json")).layers;
  for (const name of Object.keys(typeof sprites === "object" && sprites ? sprites : {})) {
    needIn(spriteFolder, `${name}.png`);
    const face = /^face_(.+)$/.exec(name)?.[1];
    if (face && !emotions[face]) throw new Error(`Unknown expression of a moving portrait face: ${label}/${name}`);
  }
}
