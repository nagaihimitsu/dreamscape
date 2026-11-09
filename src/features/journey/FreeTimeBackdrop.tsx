import { getCityBackdrop } from "../../content/city-backdrop";
import { derivedImagePath } from "../../content/derived-images";

/**
 * The picture behind free time (UI redesign §3.4, §4): the city's
 * `backdropAssetId` photo in its reduced `backdrop` copy, dimmed, or a plain
 * parchment gradient when the city has none. Decorative only: every text over it
 * sits on its own card (§2.4), and its credit is in 「写真の出典」.
 */
export function FreeTimeBackdrop({ cityId }: { cityId: string }) {
  const asset = getCityBackdrop(cityId);
  return <div className={`free-time-backdrop${asset ? "" : " is-plain"}`} aria-hidden="true" data-testid="free-time-backdrop">
    {asset && <img src={`${import.meta.env.BASE_URL}${derivedImagePath(asset, "backdrop")}`} alt="" decoding="async" fetchPriority="low" />}
  </div>;
}
