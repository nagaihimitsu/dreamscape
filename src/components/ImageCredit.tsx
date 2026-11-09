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
