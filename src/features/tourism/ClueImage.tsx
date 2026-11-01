import { useState } from "react";
import { landmarks, tourismAssets, type TourismClue } from "../../content";

function clueAsset(clue: TourismClue) {
  const landmark = landmarks.find((item) => item.id === clue.landmarkId);
  return landmark && tourismAssets.find((item) => item.id === landmark.imageAssetId);
}

/** A view of the same source image; the outlined region never modifies the asset. */
export function ClueImage({ clue }: { clue: TourismClue }) {
  const [zoomed, setZoomed] = useState(false);
  const [failed, setFailed] = useState(false);
  const asset = clueAsset(clue);
  if (!asset || failed) {
    return <p className="clue-image-unavailable" role="status">画像を表示できません。説明と出典を確認してください。</p>;
  }
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
  const picture = (
    <svg
      viewBox={viewBox}
      role="img"
      aria-labelledby={`clue-image-title-${clue.id}`}
      data-testid={`clue-image-${clue.id}`}
    >
      <title id={`clue-image-title-${clue.id}`}>
        {asset.altJa}{region ? ` 注目する範囲：${clue.titleJa}` : ""}
      </title>
      <image
        href={`${import.meta.env.BASE_URL}${asset.path}`}
        width={asset.width}
        height={asset.height}
        onError={() => setFailed(true)}
      />
      {region && <rect
        x={x} y={y} width={width} height={height}
        fill="none" stroke="#fff7c0" strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />}
    </svg>
  );
  return (
    <figure className="case-image">
      {asset.isPlaceholder && <figcaption className="case-image-placeholder">仮画像</figcaption>}
      {region ? (
        <button
          type="button"
          className="case-image-toggle"
          onClick={() => setZoomed((value) => !value)}
          aria-label={zoomed ? "画像の全体を見る" : "囲んだ部分を拡大する"}
          aria-pressed={zoomed}
        >
          {picture}
          <span aria-hidden="true">{zoomed ? "全体" : "拡大"}</span>
        </button>
      ) : (
        <>
          {picture}
          <p className="fine-print">画像だけでは確認できない資料です。説明と出典をご覧ください。</p>
        </>
      )}
    </figure>
  );
}

/** Keep attribution with the existing source details rather than adding another panel. */
export function ClueImageCredits({ clue }: { clue: TourismClue }) {
  const asset = clueAsset(clue);
  if (!asset) return null;
  return (
    <div className="case-image-credits">
      {asset.isPlaceholder && <strong>仮画像 · </strong>}
      {asset.creditJa}{" "}
      <a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a>{" · "}
      <a href={asset.licenseUrl} target="_blank" rel="noreferrer">利用条件</a>
    </div>
  );
}
