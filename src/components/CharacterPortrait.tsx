import { useState } from "react";
import type { ReactNode } from "react";
import characterData from "../../content/presentation/characters.json";
import { battleCharacterId, characterCatalogSchema, characterImage } from "../content/character-assets";
import "./character-portrait.css";

const catalog = characterCatalogSchema.parse(characterData);
const characters = catalog.characters;

/** Artwork assignment lives outside the battle data and does not affect saves. */
export function characterForBattle(battleId: string): string {
  return battleCharacterId(catalog.battleCharacters, battleId);
}

/** A decorative layer. Position and image are independent of the Ink story. */
export function CharacterPortrait({ characterId, emotion, costume, pose, active = false, fallback }: {
  characterId: string;
  emotion?: string;
  costume?: string;
  pose?: string;
  active?: boolean;
  fallback?: ReactNode;
}) {
  const character = characters.find((item) => item.id === characterId);
  if (!character) return null;
  const { placement } = character;
  const image = characterImage(character, { emotion, costume, pose });
  return (
    <div className={`vn-character${active ? " is-speaking" : ""}`} aria-hidden="true" style={{
      left: `${placement.x}%`, bottom: `${placement.bottom}%`, width: `${placement.width}%`, height: `${placement.height}%`,
      transform: `translateX(-50%) scale(${placement.scale})`, transformOrigin: `${placement.originX}% ${placement.originY}%`,
    }}>
      <CharacterImage key={image ?? "placeholder"} path={image} color={character.placeholderColor} fallback={fallback} />
    </div>
  );
}

function CharacterImage({ path, color, fallback }: { path: string | null; color: string; fallback?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (path && !failed) return <img src={`${import.meta.env.BASE_URL}${path}`} alt="" onError={() => setFailed(true)} />;
  if (fallback) return fallback;
  // Deliberately abstract placeholder, not a final character design.
  return <svg viewBox="0 0 240 360" role="presentation" focusable="false">
    <ellipse cx="120" cy="350" rx="88" ry="8" fill="#302f2b" opacity=".15" />
    <path d="M42 350v-81c0-48 30-73 78-73s78 25 78 73v81" fill={color} />
    <path d="M92 187h56v34H92z" fill={color} />
    <ellipse cx="120" cy="130" rx="48" ry="61" fill={color} />
    <path d="M86 218l34 31 34-31" fill="none" stroke="#f3eee3" opacity=".4" strokeWidth="3" />
  </svg>;
}
