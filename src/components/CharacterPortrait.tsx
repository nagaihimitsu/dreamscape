import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import characterData from "../../content/presentation/characters.json";
import {
  battleCharacterId,
  characterCatalogSchema,
  characterImage,
  characterPlacement,
  resolveCharacterCostume,
} from "../content/character-assets";
import "./character-portrait.css";

const catalog = characterCatalogSchema.parse(characterData);
const characters = catalog.characters;

/** Artwork assignment lives outside the battle data and does not affect saves. */
export function characterForBattle(battleId: string): string {
  return battleCharacterId(catalog.battleCharacters, battleId);
}

/** A decorative layer. Position and image are independent of the Ink story. */
export function CharacterPortrait({
  characterId, emotion, costume, pose, sceneId, cityId, countryId, regionId,
  active = false, fallback, onImageError, children,
}: {
  characterId: string;
  emotion?: string;
  costume?: string;
  pose?: string;
  sceneId?: string;
  cityId?: string;
  countryId?: string;
  regionId?: string;
  active?: boolean;
  fallback?: ReactNode;
  onImageError?: (path: string) => void;
  children?: ReactNode;
}) {
  const character = characters.find((item) => item.id === characterId);
  // Resolve from the scene context only, never from a changing line or its
  // emotion. Unavailable expressions therefore cannot change the outfit.
  const selection = useMemo(
    () => character
      ? resolveCharacterCostume(character, catalog.wardrobe, { sceneId, cityId, countryId, regionId, costume, pose })
      : {},
    [character, sceneId, cityId, countryId, regionId, costume, pose],
  );
  if (!character) return null;
  const placement = characterPlacement(character, selection);
  const image = characterImage(character, { ...selection, emotion });
  const neutral = characterImage(character, { ...selection, emotion: "neutral" });
  return (
    <div className={`vn-character${active ? " is-speaking" : ""}`} aria-hidden="true" style={{
      left: `${placement.x}%`, bottom: `${placement.bottom}%`, width: `${placement.width}%`, height: `${placement.height}%`,
      transform: `translateX(-50%) scale(${placement.scale})`, transformOrigin: `${placement.originX}% ${placement.originY}%`,
    }}>
      <CharacterImage
        key={image ?? "placeholder"}
        path={image}
        neutralPath={neutral}
        color={character.placeholderColor}
        fallback={fallback}
        onImageError={onImageError}
      />
      {children}
    </div>
  );
}

function CharacterImage({ path, neutralPath, color, fallback, onImageError }: {
  path: string | null;
  neutralPath: string | null;
  color: string;
  fallback?: ReactNode;
  onImageError?: (path: string) => void;
}) {
  const [failedPaths, setFailedPaths] = useState<string[]>([]);
  const candidate = [path, neutralPath].find((item) => item && !failedPaths.includes(item));
  if (candidate) return (
    <img src={`${import.meta.env.BASE_URL}${candidate}`} alt="" onError={() => {
      onImageError?.(candidate);
      setFailedPaths((failed) => [...failed, candidate]);
    }} />
  );
  if (fallback) return fallback;
  // Deliberately abstract placeholder, not a final character design.
  return <svg viewBox="0 0 240 360" role="presentation" focusable="false">
    <ellipse cx="120" cy="350" rx="88" ry="8" fill="#302f2b" opacity=".15" />
    <path d="M42 350v-81c0-48 30-73 78-73s78 25 78 73v81" fill={color} />
    <path d="M92 187h56v34H92z" fill={color} />
    <ellipse cx="120" cy="130" rx="48" ry="61" fill={color} />
    <path d="M102 127v4m36-4v4m-25 20q7 4 14 0" fill="none" stroke="#f3eee3" opacity=".8" strokeWidth="3" strokeLinecap="round" />
    <path d="M86 218l34 31 34-31" fill="none" stroke="#f3eee3" opacity=".4" strokeWidth="3" />
  </svg>;
}
