import { tourismAssets } from "../content";
import { ImageCredit } from "./ImageCredit";
import { Modal, ModalTitle } from "./Modal";

type Asset = (typeof tourismAssets)[number];

/**
 * 「画像の出典」 (the header menu's item over a story scene with a credited photo): the scene's photo whole, with its
 * description, credit and links shown at once (2026-11-14: the dialog has the item's name, and the credit is no longer
 * folded away). A dialog for viewing: 「× 閉じる」 in its title bar, a tap on the dimmed page around it, or Esc closes it.
 * (A line's `# recall:` shows an album image, the author's own artwork, which has no credit.)
 */
export function BackgroundCredits({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  return (
    <Modal labelledBy="background-credits-title" className="date-background-viewer" onClose={onClose} closeOnBackdrop>
      <ModalTitle id="background-credits-title" onClose={onClose}>画像の出典</ModalTitle>
      <img src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} />
      <div className="background-credit">
        <ImageCredit asset={asset} />
      </div>
    </Modal>
  );
}
