import { tourismAssets } from "../content";
import { ImageCredit } from "./ImageCredit";
import { Modal, ModalTitle } from "./Modal";

type Asset = (typeof tourismAssets)[number];

/**
 * The same image and attribution are available wherever a scene uses it: the scene's photo with its description, credit
 * and links. (A line's `# recall:` shows an album image, the author's own artwork, which has no credit.)
 */
export function BackgroundCredits({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  return (
    <Modal labelledBy="background-credits-title" className="date-background-viewer" onClose={onClose}>
      <ModalTitle id="background-credits-title">背景画像</ModalTitle>
      <ShownImage asset={asset} />
      <button type="button" className="secondary" onClick={onClose}>閉じる</button>
    </Modal>
  );
}

function ShownImage({ asset }: { asset: Asset }) {
  return <>
    <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} />
    <details>
      <summary>画像の説明・出典と利用条件</summary>
      <ImageCredit asset={asset} />
    </details>
  </>;
}
