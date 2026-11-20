import { createContext, useContext } from "react";

/**
 * The heroine's costume the player chose (the header's 「服」, 2026-11-20; src/domain/outfits.ts wornCostume), for every
 * picture of her (CharacterPortrait, CharacterFace, CharacterFigure): GameApp provides it from the game on screen.
 * Undefined: 普段の服 (the outfit the scene, the city or the region gives her), also outside a game (Debug's rooms).
 */
export const WornCostumeContext = createContext<string | undefined>(undefined);

export const useWornCostume = (): string | undefined => useContext(WornCostumeContext);
