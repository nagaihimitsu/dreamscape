import { useState, type CSSProperties } from "react";
import type { ObservationRegion, TourismAsset } from "../../content/tourism-schemas";
import { ImageCreditLine } from "../../components/ImageCredit";
import { revealZoom } from "./reveal-zoom";

const percent = (fraction: number) => `${fraction * 100}%`;

/**
 * The reveal under an answer's explanation (a battle question's revealRegion, user decision 2026-11-11): the
 * battle's landmark photo (the one behind the battle; the same file, already loaded) in a small frame at its own
 * proportions, slowly zooming toward the region while an outline around it fades in (battle.css; under reduced
 * motion the photo stays whole and the outline shows at once), the question's one-line caption when it has one,
 * and the photo's credit line as the clue book shows it (⚙設定's 「画像の出典」 opens the same photo's credits).
 * Nothing in it takes a tap but the credit's links. A photo that cannot load leaves the reveal out.
 */
export function LandmarkReveal({ asset, region, captionJa }: { asset: TourismAsset; region: ObservationRegion; captionJa?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const zoom = revealZoom(region);
  const frame = {
    "--reveal-width": asset.width,
    "--reveal-height": asset.height,
    "--reveal-zoom": zoom.scale,
    "--reveal-origin": `${percent(zoom.originX)} ${percent(zoom.originY)}`,
  } as CSSProperties;
  return <figure className="battle-reveal" data-testid="battle-reveal">
    <div className="battle-reveal-frame" style={frame}>
      <div className="battle-reveal-zoom">
        <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} decoding="async" onError={() => setFailed(true)} />
        <span className="battle-reveal-region" aria-hidden="true"
          style={{ left: percent(region.x), top: percent(region.y), width: percent(region.width), height: percent(region.height) }} />
      </div>
    </div>
    {captionJa && <figcaption>{captionJa}</figcaption>}
    <ImageCreditLine asset={asset} className="battle-reveal-credit" />
  </figure>;
}
