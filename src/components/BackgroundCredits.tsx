import { tourismAssets } from "../content";
import { Modal } from "./Modal";

/** The same image and attribution are available wherever a scene uses it. */
export function BackgroundCredits({
  asset,
  onClose,
}: {
  asset: (typeof tourismAssets)[number];
  onClose: () => void;
}) {
  return (
    <Modal labelledBy="background-credits-title" className="date-background-viewer" onClose={onClose}>
      <h2 id="background-credits-title">背景画像</h2>
      <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} />
      <details>
        <summary>画像の説明・出典と利用条件</summary>
        <p>{asset.altJa}</p>
        <p>{asset.creditJa}</p>
        <p>{asset.modificationJa}</p>
        <p>
          <a href={asset.sourceUrl} target="_blank" rel="noreferrer">画像の出典</a>
          {" · "}
          <a href={asset.licenseUrl} target="_blank" rel="noreferrer">{asset.licenseName}</a>
        </p>
      </details>
      <button type="button" className="secondary" onClick={onClose}>閉じる</button>
    </Modal>
  );
}
