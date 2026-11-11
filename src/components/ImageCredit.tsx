import type { TourismAsset } from "../content/tourism-schemas";

/**
 * A photo's description, credit, changes and links to its source and licence (shared by the credit dialogs).
 * `sourceLabelJa` names the source link instead of 「画像の出典」 (the credits list: 「元の画像：{file name}」).
 */
export function ImageCredit({ asset, sourceLabelJa = "画像の出典" }: { asset: TourismAsset; sourceLabelJa?: string }) {
  return <>
    <p>{asset.altJa}</p>
    <p>{asset.creditJa}</p>
    <p>{asset.modificationJa}</p>
    <p>
      <a href={asset.sourceUrl} target="_blank" rel="noreferrer">{sourceLabelJa}</a>
      {" · "}
      <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.licenseName}</a>
    </p>
  </>;
}

/**
 * A photo's credit on one line under a photo shown in the reading area (the clue book's photo, a battle answer's
 * reveal): 仮画像 for a placeholder, the credit, and links to its source and licence.
 */
export function ImageCreditLine({ asset, className }: { asset: TourismAsset; className: string }) {
  return <div className={className}>
    {asset.isPlaceholder && <strong>仮画像 · </strong>}
    {asset.creditJa}{" "}
    <a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a>{" · "}
    <a href={asset.licenseUrl} target="_blank" rel="noreferrer">利用条件</a>
  </div>;
}
