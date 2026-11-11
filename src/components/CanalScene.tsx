import { useEffect, useRef, useState } from "react";
import { presentation, tourismAssets } from "../content";
import { DEFAULT_BACKGROUND_ID } from "../content/default-background";
import type { TitleArt } from "../content/journey-catalog";
/** Original decorative illustration; all game information is also available as text. */
export function CanalScene({
  compact = false,
  backgroundId = DEFAULT_BACKGROUND_ID,
  imageAssetId,
  artwork,
}: {
  compact?: boolean;
  backgroundId?: string;
  /** Use a location's registered photograph while keeping this scene's fallback. */
  imageAssetId?: string;
  /** A journey's title art: its own image and caption over this scene, which stays as the fallback. */
  artwork?: TitleArt;
}) {
  const backdrop = presentation.backgrounds[backgroundId];
  const landmarkImage = imageAssetId
    ? tourismAssets.find((asset) => asset.id === imageAssetId)?.path
    : undefined;
  const image = artwork?.imagePath ?? landmarkImage ?? (backdrop?.imageAssetId
    ? tourismAssets.find((asset) => asset.id === backdrop.imageAssetId)?.path
    : backdrop?.imagePath);
  return (
    <div
      className={`canal-scene ${compact ? "compact" : ""}`}
      data-fallback={backdrop?.fallback ?? "canal"}
      style={backdrop?.fallback === "neutral" ? { backgroundColor: backdrop.color } : undefined}
      aria-hidden="true"
    >
      {backdrop?.fallback !== "neutral" && (
      <svg viewBox="0 0 800 440" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="sky" x2="0" y2="1">
            <stop stopColor={backdrop?.color ?? "#e6d8bb"} />
            <stop offset="1" stopColor="#f6ebd5" />
          </linearGradient>
          <linearGradient id="water" x2="0" y2="1">
            <stop stopColor="#a7b8ab" />
            <stop offset="1" stopColor="#526f65" />
          </linearGradient>
        </defs>
        <path fill="url(#sky)" d="M0 0h800v440H0z" />
        <circle cx="562" cy="90" r="41" fill="#fff4d7" />
        <path
          fill="#a1a590"
          d="M0 165h65v-35h82v47h63v-23h76v46h74v-50h60v72H0z"
        />
        <path fill="#c49e82" d="M0 124h100v180H0zM98 150h104v160H98z" />
        <path fill="#d9b998" d="M200 186h88v131h-88zM585 170h90v150h-90z" />
        <path fill="#c4a18a" d="M670 135h130v190H670z" />
        <path
          fill="#876e5e"
          d="M0 118h105v10H0zM93 144h115v9H93zM667 129h133v11H667z"
        />
        <g fill="#5e6a5d">
          <path d="M21 150h19v31H21zM61 150h19v31H61zM21 206h19v31H21zM61 206h19v31H61zM120 179h17v28h-17zM164 179h17v28h-17zM120 232h17v28h-17zM164 232h17v28h-17zM225 211h14v25h-14zM259 211h14v25h-14zM697 160h20v33h-20zM750 160h20v33h-20zM697 216h20v33h-20zM750 216h20v33h-20zM606 196h17v29h-17zM645 196h17v29h-17z" />
        </g>
        <path fill="url(#water)" d="M315 277h260l225 163H0z" />
        <path fill="#d6c8ad" d="M0 288l315-11L145 440H0zM575 277l225 18v145z" />
        <path
          fill="none"
          stroke="#eee3c6"
          strokeWidth="3"
          opacity=".55"
          d="M350 317h113m-85 24h138m-214 31h108m25 30h150m-335 22h165"
        />
        <path
          fill="none"
          stroke="#707b69"
          strokeWidth="10"
          d="M280 286q160-73 322 0"
        />
        <path
          fill="none"
          stroke="#707b69"
          strokeWidth="3"
          d="M286 271q154-76 311 0m-276-18v25m42-41v28m47-37v25m47-24v25m45-17v27m45-12v27"
        />
        <path
          fill="#324e42"
          d="M0 0h32v440H0zM768 0h32v440h-32zM0 0h800v25H0z"
        />
        <path fill="#324e42" d="M0 34q400-100 800 0v28Q400-40 0 62z" />
        <path
          fill="#65705a"
          d="M59 440v-68q-64-82-42-115 45 19 42 85-10-112 25-129 27 42-11 136 37-67 65-58 3 42-65 83v66z"
        />
        <ellipse fill="#8c7158" cx="566" cy="432" rx="173" ry="43" />
        <ellipse fill="#d3b893" cx="566" cy="421" rx="173" ry="38" />
        <ellipse fill="#f5ead1" cx="521" cy="415" rx="33" ry="9" />
        <path fill="#faf0dc" d="M499 381h43v25q-21 20-43 0z" />
        <ellipse fill="#6a5142" cx="520" cy="382" rx="21" ry="6" />
        <path
          fill="none"
          stroke="#faf0dc"
          strokeWidth="6"
          d="M543 386q23 0 11 16h-12"
        />
        <ellipse fill="#f5ead1" cx="635" cy="401" rx="29" ry="8" />
        <path fill="#faf0dc" d="M616 372h38v23q-19 15-38 0z" />
        <ellipse fill="#6a5142" cx="635" cy="373" rx="19" ry="5" />
        <path
          fill="none"
          stroke="#faf0dc"
          strokeWidth="5"
          d="M654 377q19 0 10 14h-11"
        />
        <path fill="#ede2c8" d="m563 410 30-13 28 13-29 14z" />
      </svg>
      )}
      {image && <SceneArtwork path={image} position={artwork ? artwork.imagePosition : backdrop?.imagePosition} />}
      <span className="scene-stamp" data-testid="scene-stamp">
        {artwork?.captionJa ?? backdrop?.captionJa}
      </span>
    </div>
  );
}

type Artwork = { path: string; position?: { x: number; y: number } };

/** How long a scene's next picture takes to fade in over the last (styles.css, --motion-scene). */
const ARTWORK_FADE_MS = 450;

/**
 * The scene's picture. When a line changes it, the next one waits, unseen, over the one on
 * show until it has loaded, then fades in (at once with reduced motion) and the last one goes:
 * the scene never cuts to the drawn fallback while the next picture loads. The first picture
 * shows as it loads, as before.
 */
function SceneArtwork({ path, position }: Artwork) {
  const [shown, setShown] = useState<Artwork>({ path, position });
  const settled = shown.path === path;
  // A picture on show keeps the place it is shown at, for the moment it lies under the next one.
  useEffect(() => {
    if (settled && shown.position !== position) setShown({ path, position });
  }, [settled, shown.position, path, position]);
  return <>
    <BackgroundArtwork key={shown.path} {...(settled ? { path, position } : shown)} />
    {!settled && <BackgroundArtwork key={path} path={path} position={position} onArrive={() => setShown({ path, position })} />}
  </>;
}

/**
 * Decorative backgrounds are optional; the original illustration remains the fallback.
 * `onArrive`: the picture comes in over another one (SceneArtwork); called once it has faded
 * in, or at once when it cannot load (the fallback then shows, as for any missing picture).
 */
function BackgroundArtwork({ path, position, onArrive }: Artwork & { onArrive?: () => void }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const arrive = useRef(onArrive);
  arrive.current = onArrive;
  const entering = !!onArrive;
  useEffect(() => {
    if (!entering || !(loaded || failed)) return;
    const timer = window.setTimeout(() => arrive.current?.(), failed ? 0 : ARTWORK_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [entering, loaded, failed]);
  if (failed) return null;
  return <img className="scene-artwork" src={`${import.meta.env.BASE_URL}${path}`} alt=""
    data-entering={entering || undefined} data-loaded={loaded || undefined}
    onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: position ? `${position.x}% ${position.y}%` : "center" }} />;
}
