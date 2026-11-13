import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { characterImage, characterPlacement, resolveCharacterCostume } from "../content/character-assets";
import type { StandPosition } from "../content/tags";
import { loadPicture, pictureReady } from "../media/preload";
import { characterCatalog as catalog } from "./character-catalog";
import type { PortraitFocus } from "./scene-stage";
import { portraitBreath } from "./scene-atmosphere";
import "./character-portrait.css";

const characters = catalog.characters;

export { characterForBattle } from "./character-catalog";

/**
 * The picture a standing portrait shows for `path` (2026-11-13): a new expression waits, unseen, until it has loaded and
 * been decoded (src/media/preload.ts loadPicture) while the last one stays, so the figure never vanishes while the next
 * picture loads on a slow network; one loaded ahead (pictureReady) and the portrait's first picture show at once. One
 * that cannot load is shown all the same (CharacterImage then falls back to the neutral face).
 */
function useArrivedPicture(path: string | null): string | null {
  const [shown, setShown] = useState(path);
  const now = path !== shown && (path === null || shown === null || pictureReady(path));
  if (now) setShown(path);
  useEffect(() => {
    if (path === shown || path === null) return;
    let live = true;
    const arrive = () => {
      if (live) setShown(path);
    };
    loadPicture(path).then(arrive, arrive);
    return () => {
      live = false;
    };
  }, [path, shown]);
  return now ? path : shown;
}

/** A decorative layer. Position and image are independent of the Ink story, but for a scene's `# stand:` (written by its writer). */
export function CharacterPortrait({
  characterId, emotion, costume, pose, sceneId, cityId, countryId, regionId,
  focus, stand, fallback, onImageError, children,
}: {
  characterId: string;
  emotion?: string;
  costume?: string;
  pose?: string;
  sceneId?: string;
  cityId?: string;
  countryId?: string;
  regionId?: string;
  /** Speaking (slightly forward) or listening (slightly dimmed) while a line is read; none when no one on stage says it (stageFocus). */
  focus?: PortraitFocus;
  /** Where the scene's `# stand:` puts her (line-stage.css); none: her placement as it is. */
  stand?: StandPosition;
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
  const image = character ? characterImage(character, { ...selection, emotion }) : null;
  // A new expression stays unseen until it has loaded, the last one on show meanwhile.
  const shown = useArrivedPicture(image);
  if (!character) return null;
  const placement = characterPlacement(character, selection);
  const neutral = characterImage(character, { ...selection, emotion: "neutral" });
  return (
    <div className={`vn-character${focus ? ` is-${focus}` : ""}`} data-stand={stand} aria-hidden="true" style={{
      left: `${placement.x}%`, bottom: `${placement.bottom}%`, width: `${placement.width}%`, height: `${placement.height}%`,
      transform: `translateX(-50%) scale(${placement.scale})`, transformOrigin: `${placement.originX}% ${placement.originY}%`,
      // The character's own size (characters.json figureScale): its picture, not its box (character-portrait.css).
      ...(character.figureScale !== undefined ? { "--figure-scale": character.figureScale } as CSSProperties : {}),
    }}>
      <CharacterImage
        key={shown ?? "placeholder"}
        path={shown}
        neutralPath={neutral}
        color={character.placeholderColor}
        fallback={fallback}
        onImageError={onImageError}
        breathOf={characterId}
      />
      {children}
    </div>
  );
}

/**
 * The character's face in a small round frame, beside a few words of hers by the quiz card (her
 * whispered hint, her line on a right answer): the picture of her portrait in the scene's outfit,
 * cropped to the head (character-portrait.css). Decorative: her name is written beside it.
 */
export function CharacterFace({ characterId, emotion, sceneId, cityId }: {
  characterId: string;
  emotion?: string;
  sceneId?: string;
  cityId?: string;
}) {
  const character = characters.find((item) => item.id === characterId);
  const selection = useMemo(
    () => character ? resolveCharacterCostume(character, catalog.wardrobe, { sceneId, cityId }) : {},
    [character, sceneId, cityId],
  );
  if (!character) return null;
  const image = characterImage(character, { ...selection, emotion });
  const neutral = characterImage(character, { ...selection, emotion: "neutral" });
  return (
    <span className="character-face" aria-hidden="true">
      <CharacterImage key={image ?? "placeholder"} path={image} neutralPath={neutral} color={character.placeholderColor} />
    </span>
  );
}

/**
 * The character's whole standing picture in a box its caller places and sizes (the mini-game's bowler at the far end of
 * the pitch): the scene's outfit, without a placement of its own or breathing. Decorative.
 */
export function CharacterFigure({ characterId, emotion, sceneId, cityId }: {
  characterId: string;
  emotion?: string;
  sceneId?: string;
  cityId?: string;
}) {
  const character = characters.find((item) => item.id === characterId);
  const selection = useMemo(
    () => character ? resolveCharacterCostume(character, catalog.wardrobe, { sceneId, cityId }) : {},
    [character, sceneId, cityId],
  );
  if (!character) return null;
  const image = characterImage(character, { ...selection, emotion });
  const neutral = characterImage(character, { ...selection, emotion: "neutral" });
  return (
    <span className="character-figure" aria-hidden="true">
      <CharacterImage key={image ?? "placeholder"} path={image} neutralPath={neutral} color={character.placeholderColor} />
    </span>
  );
}

function CharacterImage({ path, neutralPath, color, fallback, onImageError, breathOf }: {
  path: string | null;
  neutralPath: string | null;
  color: string;
  fallback?: ReactNode;
  onImageError?: (path: string) => void;
  /** A standing portrait's character: its picture breathes (character-portrait.css), going on from where the last picture was. */
  breathOf?: string;
}) {
  const [failedPaths, setFailedPaths] = useState<string[]>([]);
  // Read once as the picture is put up (scene-atmosphere.ts portraitBreath): a new expression takes the breath on.
  const [breath] = useState(() => {
    if (breathOf === undefined) return undefined;
    const { durationMs, delayMs } = portraitBreath(breathOf, typeof performance === "undefined" ? 0 : performance.now());
    return { animationDuration: `${durationMs}ms`, animationDelay: `${delayMs}ms` };
  });
  const candidate = [path, neutralPath].find((item) => item && !failedPaths.includes(item));
  if (candidate) return (
    // A figure on stage is what the scene is about: fetched before the music and the ambience streaming meanwhile.
    <img src={`${import.meta.env.BASE_URL}${candidate}`} alt="" fetchPriority="high" style={breath} onError={() => {
      onImageError?.(candidate);
      setFailedPaths((failed) => [...failed, candidate]);
    }} />
  );
  if (fallback) return fallback;
  // Deliberately abstract placeholder, not a final character design.
  return <svg viewBox="0 0 240 360" role="presentation" focusable="false" style={breath}>
    <ellipse cx="120" cy="350" rx="88" ry="8" fill="#302f2b" opacity=".15" />
    <path d="M42 350v-81c0-48 30-73 78-73s78 25 78 73v81" fill={color} />
    <path d="M92 187h56v34H92z" fill={color} />
    <ellipse cx="120" cy="130" rx="48" ry="61" fill={color} />
    <path d="M102 127v4m36-4v4m-25 20q7 4 14 0" fill="none" stroke="#f3eee3" opacity=".8" strokeWidth="3" strokeLinecap="round" />
    <path d="M86 218l34 31 34-31" fill="none" stroke="#f3eee3" opacity=".4" strokeWidth="3" />
  </svg>;
}
