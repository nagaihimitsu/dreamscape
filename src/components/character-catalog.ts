import characterData from "../content/generated/content/presentation/characters.json";
import {
  battleCharacterId, characterCatalogSchema, characterImage, resolveCharacterCostume, type CharacterAsset, type CostumeContext,
} from "../content/character-assets";

// The standing pictures of the characters (presentation/characters.json), read once for the portraits
// (CharacterPortrait.tsx) and for the background loading of the figures a scene is about to show (src/media/preload-ahead.ts).

export const characterCatalog = characterCatalogSchema.parse(characterData);

export function findCharacter(characterId: string): CharacterAsset | undefined {
  return characterCatalog.characters.find((item) => item.id === characterId);
}

/** Artwork assignment lives outside the battle data and does not affect saves. */
export function characterForBattle(battleId: string): string {
  return battleCharacterId(characterCatalog.battleCharacters, battleId);
}

/**
 * The served path of a character's standing picture with `emotion` in the outfit its scene gives it (the scene, its city:
 * resolveCharacterCostume), as CharacterPortrait shows it; null for one drawn as a placeholder.
 */
export function characterPicture(characterId: string, emotion: string, context: CostumeContext): string | null {
  const character = findCharacter(characterId);
  if (!character) return null;
  return characterImage(character, { ...resolveCharacterCostume(character, characterCatalog.wardrobe, context), emotion });
}
