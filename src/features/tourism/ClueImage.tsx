import { useState } from "react";
import { landmarks, tourismAssets, type TourismClue } from "../../content";

/** A view of the same source image; the outlined region never modifies the asset. */
export function ClueImage({ clue }: { clue: TourismClue }) {
  const [zoomed, setZoomed] = useState(false);
  const landmark = landmarks.find((item) => item.id === clue.landmarkId)!;
  const asset = tourismAssets.find((item) => item.id === landmark.imageAssetId)!;
  const region = clue.region;
  const x = region ? region.x * asset.width : 0;
  const y = region ? region.y * asset.height : 0;
  const width = region ? region.width * asset.width : asset.width;
  const height = region ? region.height * asset.height : asset.height;
  const padding = Math.min(asset.width, asset.height) * 0.035;
  const left = Math.max(0, x - padding);
  const top = Math.max(0, y - padding);
  const right = Math.min(asset.width, x + width + padding);
  const bottom = Math.min(asset.height, y + height + padding);
  const viewBox = zoomed && region
    ? `${left} ${top} ${right - left} ${bottom - top}`
    : `0 0 ${asset.width} ${asset.height}`;
  return (
    <details className="case-image-details">
      <summary>画像と場所を確認する</summary>
      <figure className="case-image">
        <svg
          viewBox={viewBox}
          role="img"
          aria-labelledby={`clue-image-${clue.id}`}
          data-testid={`clue-image-${clue.id}`}
        >
          <title id={`clue-image-${clue.id}`}>
            {asset.altJa}{region ? ` 注目する範囲：${clue.titleJa}` : ""}
          </title>
          <image
            href={`${import.meta.env.BASE_URL}${asset.path}`}
            width={asset.width}
            height={asset.height}
          />
          {region && <rect
            x={x} y={y} width={width} height={height}
            fill="none" stroke="#fff7c0" strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />}
        </svg>
        {region ? (
          <button
            className="secondary"
            onClick={() => setZoomed((value) => !value)}
            aria-pressed={zoomed}
          >
            {zoomed ? "画像の全体を見る" : "囲んだ部分を拡大する"}
          </button>
        ) : (
          <p className="fine-print">
            この資料の内容は画像だけでは確認できません。説明と出典を参照してください。
          </p>
        )}
        <figcaption>
          {asset.isPlaceholder && <strong>仮画像 · </strong>}
          {asset.creditJa}
          <a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a>
          <a href={asset.licenseUrl} target="_blank" rel="noreferrer">利用条件</a>
        </figcaption>
      </figure>
    </details>
  );
}
