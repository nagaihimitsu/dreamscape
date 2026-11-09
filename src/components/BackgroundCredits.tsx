import { tourismAssets } from "../content";
import { ImageCredit } from "./ImageCredit";
import { Modal, ModalTitle } from "./Modal";

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
      <ModalTitle id="background-credits-title">背景画像</ModalTitle>
      <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} />
      <details>
        <summary>画像の説明・出典と利用条件</summary>
        <ImageCredit asset={asset} />
      </details>
      <button type="button" className="secondary" onClick={onClose}>閉じる</button>
    </Modal>
  );
}
