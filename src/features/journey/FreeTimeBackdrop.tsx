import { getCityBackdropPath } from "../../content/city-backdrop";

/**
 * The picture behind free time (UI redesign §3.4, §4; docs/02 「自由時間の画面」): the city's own artwork
 * (`backdropImagePath`) or the reduced `backdrop` copy of its `backdropAssetId` photo, dimmed, fixed to the
 * screen and cropped to fill it; or a plain parchment gradient when the city has none. Decorative only: every
 * text over it sits on its own card (§2.4); a photo's credit is in 「写真の出典」, own artwork has none.
 */
export function FreeTimeBackdrop({ cityId }: { cityId: string }) {
  const path = getCityBackdropPath(cityId);
  return <div className={`free-time-backdrop${path ? "" : " is-plain"}`} aria-hidden="true" data-testid="free-time-backdrop">
    {path && <img src={`${import.meta.env.BASE_URL}${path}`} alt="" decoding="async" fetchPriority="low" />}
  </div>;
}
