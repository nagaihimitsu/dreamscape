import { tourismAssets } from "../content";
import { ImageCredit } from "./ImageCredit";
import { Modal, ModalTitle } from "./Modal";

type Asset = (typeof tourismAssets)[number];

/**
 * The same image and attribution are available wherever a scene uses it: the scene's photo and, while its line shows,
 * the photo the line recalls (`# recall:`, the scene tags of 2026-11-11), each with its description, credit and links.
 */
export function BackgroundCredits({
  asset,
  recalled,
  onClose,
}: {
  asset?: Asset;
  recalled?: Asset;
  onClose: () => void;
}) {
  return (
    <Modal labelledBy="background-credits-title" className="date-background-viewer" onClose={onClose}>
      <ModalTitle id="background-credits-title">{asset ? "背景画像" : "思い出の写真"}</ModalTitle>
      {asset && <ShownImage asset={asset} />}
      {asset && recalled && <h3>思い出の写真</h3>}
      {recalled && <ShownImage asset={recalled} />}
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
