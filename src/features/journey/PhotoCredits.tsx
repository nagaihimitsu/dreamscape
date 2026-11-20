import { getCityContent } from "../../content";
import { getCityBackdrop } from "../../content/city-backdrop";
import { DERIVED_PHOTO_NOTE_JA, RECAP_PHOTO_NOTE_JA } from "../../content/credits";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import type { TourismAsset } from "../../content/tourism-schemas";
import { ImageCredit } from "../../components/ImageCredit";
import { Modal, ModalTitle } from "../../components/Modal";
import type { GameState } from "../../domain/game";
import { getTravelDestinations } from "../../domain/travel-destinations";
import type { RecapPicture } from "./journey-moments";

export type ShownPhoto = { key: string; labelJa: string; asset: TourismAsset; kind: "backdrop" | "card" | "recap" };

/**
 * Every photo free time shows now (≡メニュー's 「写真の出典」 lists them): the city's backdrop photo and each place's photo.
 * A city's own-artwork backdrop (backdropImagePath) is not a photo and has no credit: getCityBackdrop never returns it,
 * like the credits list leaves out every artwork made for Dreamscape (OWN_ARTWORK_NOTE_JA).
 */
export function freeTimePhotos(game: GameState): ShownPhoto[] {
  const { city } = getCityContent(game.currentCityId);
  const backdrop = getCityBackdrop(game.currentCityId);
  const { nearby, other } = getTravelDestinations(game);
  const rows = [...nearby, ...other].flatMap((place): ShownPhoto[] => {
    const asset = getPlacePhoto(game.currentCityId, place.id);
    return asset ? [{ key: `row-${place.id}`, labelJa: place.events[0].place.nameJa, asset, kind: "card" }] : [];
  });
  return [...(backdrop ? [{ key: "backdrop", labelJa: `背景（${city.nameJa}）`, asset: backdrop, kind: "backdrop" as const }] : []), ...rows];
}

/**
 * The photo of 前回までのあらすじ while its card shows (2026-11-15 user decision: the card shows no credit of its own; in free
 * time and on the night screen, ≡メニュー's 「写真の出典」 lists it first): a place's photo in its `recap` copy. None for the
 * author's own album picture, which has no credit.
 */
export function recapPhotos(picture: RecapPicture | null | undefined): ShownPhoto[] {
  return picture?.credit ? [{ key: "recap", labelJa: `前回までのあらすじ（${picture.captionJa}）`, asset: picture.credit, kind: "recap" }] : [];
}

/**
 * 「写真の出典」 (UI redesign §3.4 item 6): the credit and licence of each photo on the free-time screen, and of the recap's
 * (recapPhotos; with its own note, as its copy is cropped to the card's frame). The note on the reduced copies heads the
 * list when it has free time's photos.
 */
export function PhotoCredits({ photos, onClose }: { photos: ShownPhoto[]; onClose: () => void }) {
  return <Modal labelledBy="photo-credits-title" className="photo-credits-modal" onClose={onClose} closeOnBackdrop>
    <ModalTitle id="photo-credits-title" onClose={onClose}>写真の出典</ModalTitle>
    <PhotoCreditList photos={photos} />
  </Modal>;
}

function PhotoCreditList({ photos }: { photos: ShownPhoto[] }) {
  return <>
    {photos.some((photo) => photo.kind !== "recap") && <p className="fine-print">{DERIVED_PHOTO_NOTE_JA}</p>}
    <ul className="photo-credits-list" data-testid="photo-credits">
      {photos.map((photo) => <li key={photo.key}>
        <img src={`${import.meta.env.BASE_URL}${derivedImagePath(photo.asset, photo.kind)}`} alt="" width={96} height={64} loading="lazy" decoding="async" />
        <div>
          <h3>{photo.labelJa}</h3>
          <ImageCredit asset={photo.asset} />
          {photo.kind === "recap" && <p>{RECAP_PHOTO_NOTE_JA}</p>}
        </div>
      </li>)}
    </ul>
  </>;
}

/**
 * 「画面の出典」 (≡メニュー; 2026-11-20 user decision, one item in place of 写真の出典 and 画像の出典): what the screen shows
 * now. A story scene's photo (`scenePhoto`: its background, a landmark's or a battle's photo) shows whole, with its
 * description, credit and links at once (the scene shows no 出典 of its own, nor does a quiz answer's reveal of the same
 * photo); free time's photos and the recap card's (`photos`) are listed under it with their credits. A dialog for viewing:
 * 「× 閉じる」 in its title bar, a tap on the dimmed page around it, or Esc closes it. (A line's `# recall:` shows an album
 * image, the author's own artwork, which has no credit.) In play it is the way into 「出典・権利の一覧」 (`onAllCredits`;
 * from ゲームの設定 until 2026-11-20), at its foot, so it is on ≡メニュー on every screen, saying so when the screen shows no
 * credited photo.
 */
export function ScreenCredits({ scenePhoto, photos, onAllCredits, onClose }: {
  scenePhoto?: TourismAsset; photos: ShownPhoto[];
  /** Opens 「出典・権利の一覧」 over this dialog (closing it comes back here). */
  onAllCredits: () => void;
  onClose: () => void;
}) {
  const className = [scenePhoto && "date-background-viewer", photos.length > 0 && "photo-credits-modal"].filter(Boolean).join(" ");
  return <Modal labelledBy="screen-credits-title" className={className} onClose={onClose} closeOnBackdrop>
    <ModalTitle id="screen-credits-title" onClose={onClose}>画面の出典</ModalTitle>
    {scenePhoto && <>
      <img src={`${import.meta.env.BASE_URL}${scenePhoto.path}`} alt={scenePhoto.altJa} />
      <div className="background-credit">
        <ImageCredit asset={scenePhoto} />
      </div>
    </>}
    {photos.length > 0 && <PhotoCreditList photos={photos} />}
    {!scenePhoto && photos.length === 0 && <p>いまの画面には、出典を示す写真はありません。</p>}
    <div className="settings-data-links screen-credits-all">
      <button type="button" className="text-button credits-entry" onClick={onAllCredits}>出典・権利の一覧</button>
    </div>
  </Modal>;
}
