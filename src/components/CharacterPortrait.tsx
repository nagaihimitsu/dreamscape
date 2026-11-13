import { useEffect, useMemo, useRef, useState } from "react";
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
  if (!character) return null;
  const placement = characterPlacement(character, selection);
  const image = characterImage(character, { ...selection, emotion });
  const neutral = characterImage(character, { ...selection, emotion: "neutral" });
  return (
    <div className={`vn-character${focus ? ` is-${focus}` : ""}`} data-stand={stand} aria-hidden="true" style={{
      left: `${placement.x}%`, bottom: `${placement.bottom}%`, width: `${placement.width}%`, height: `${placement.height}%`,
      transform: `translateX(-50%) scale(${placement.scale})`, transformOrigin: `${placement.originX}% ${placement.originY}%`,
      // The character's own size (characters.json figureScale): its picture, not its box (character-portrait.css).
      ...(character.figureScale !== undefined ? { "--figure-scale": character.figureScale } as CSSProperties : {}),
    }}>
      <CharacterImage
        path={image}
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
      <CharacterImage path={image} neutralPath={neutral} color={character.placeholderColor} />
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
      <CharacterImage path={image} neutralPath={neutral} color={character.placeholderColor} />
    </span>
  );
}

/**
 * A character's picture. A new expression (or outfit) replaces the one on screen only once its file has loaded and
 * decoded (src/media/preload.ts loadPicture; one the background loading has made ready goes up at once): until then the
 * last picture stays up, so the figure never goes blank while a file arrives. A file that cannot be shown falls back to
 * the neutral picture, then to `fallback` or the placeholder.
 */
function CharacterImage({ path, neutralPath, color, fallback, onImageError, breathOf }: {
  path: string | null;
  neutralPath: string | null;
  color: string;
  fallback?: ReactNode;
  onImageError?: (path: string) => void;
  /** A standing portrait's character: its picture breathes (character-portrait.css). */
  breathOf?: string;
}) {
  const [failedPaths, setFailedPaths] = useState<string[]>([]);
  // Read once as the picture is first put up (scene-atmosphere.ts portraitBreath): the same <img> takes each new
  // expression, so the breath goes on through a change.
  const [breath] = useState(() => {
    if (breathOf === undefined) return undefined;
    const { durationMs, delayMs } = portraitBreath(breathOf, typeof performance === "undefined" ? 0 : performance.now());
    return { animationDuration: `${durationMs}ms`, animationDelay: `${delayMs}ms` };
  });
  const candidate = [path, neutralPath].find((item) => item && !failedPaths.includes(item)) ?? null;
  // The picture on screen: the first at once (nothing to keep up yet), each later one once it is ready.
  const [shown, setShown] = useState(candidate);
  const reportError = useRef(onImageError);
  useEffect(() => { reportError.current = onImageError; });
  const fail = (failed: string) => {
    reportError.current?.(failed);
    setFailedPaths((list) => list.includes(failed) ? list : [...list, failed]);
  };
  useEffect(() => {
    if (candidate === shown) return;
    // Nothing worth keeping up (no picture, or one whose file failed), or the next is ready: it goes up at once.
    if (!candidate || !shown || failedPaths.includes(shown) || pictureReady(candidate)) {
      setShown(candidate);
      return;
    }
    let current = true;
    loadPicture(candidate).then(() => {
      if (current) setShown(candidate);
    }, () => {
      if (current) fail(candidate);
    });
    return () => { current = false; };
  }, [candidate, shown, failedPaths]);
  // A figure on stage is what the scene is about: fetched before the music and the ambience streaming meanwhile.
  if (shown) return (
    <img src={`${import.meta.env.BASE_URL}${shown}`} alt="" fetchPriority="high" style={breath} onError={() => fail(shown)} />
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
