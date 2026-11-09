import type { TourismAsset } from "../content/tourism-schemas";

/** A photo's description, credit, changes and links to its source and licence (shared by the credit dialogs). */
export function ImageCredit({ asset }: { asset: TourismAsset }) {
  return <>
    <p>{asset.altJa}</p>
    <p>{asset.creditJa}</p>
    <p>{asset.modificationJa}</p>
    <p>
      <a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a>
      {" · "}
      <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.licenseName}</a>
    </p>
  </>;
}
