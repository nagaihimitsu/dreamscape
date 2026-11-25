import { getCityBackdropPath, getCityBackdropVideoPath } from "../../content/city-backdrop";
import type { ConnectionHint } from "../../media/preload-queue";
import { reducedMotion } from "./useCardGestures";

/**
 * The picture behind free time (UI redesign §3.4, §4; docs/02 「街歩きの画面」): the city's own artwork
 * (`backdropImagePath`) or the reduced `backdrop` copy of its `backdropAssetId` photo, dimmed, fixed to the
 * screen and cropped to fill it; or a plain parchment gradient when the city has none. Decorative only: every
 * text over it sits on its own card (§2.4); a photo's credit is in ≡メニュー's 「画面の出典」, own artwork has none.
 *
 * A city with a moving backdrop (`backdropVideoPath`, 2026-11-25) plays it muted in a loop over the artwork, which is
 * its first frame: the artwork shows while it loads, when the browser refuses to play it (iOS Low Power Mode) or the
 * file cannot load, and instead of it under reduced motion (the game's 「演出を短縮する」 or the system's) or
 * データセーバー.
 */
export function FreeTimeBackdrop({ cityId }: { cityId: string }) {
  const path = getCityBackdropPath(cityId);
  const video = path ? getCityBackdropVideoPath(cityId) : null;
  const moving = video !== null && !reducedMotion() && !savesData();
  const base = import.meta.env.BASE_URL;
  return <div className={`free-time-backdrop${path ? "" : " is-plain"}`} aria-hidden="true" data-testid="free-time-backdrop">
    {path && <img src={`${base}${path}`} alt="" decoding="async" fetchPriority="low" />}
    {moving && <video key={video} src={`${base}${video}`} muted autoPlay loop playsInline disablePictureInPicture
      preload="auto" tabIndex={-1} />}
  </div>;
}

/** The reader asks to save data (データセーバー; `navigator.connection`, which Safari and Firefox lack). */
function savesData(): boolean {
  const connection = (navigator as Navigator & { connection?: ConnectionHint }).connection;
  return !!connection?.saveData;
}
