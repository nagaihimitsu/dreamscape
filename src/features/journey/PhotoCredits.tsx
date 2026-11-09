import { getCityContent } from "../../content";
import { getCityBackdrop } from "../../content/city-backdrop";
import { DERIVED_PHOTO_NOTE_JA } from "../../content/credits";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import type { TourismAsset } from "../../content/tourism-schemas";
import { ImageCredit } from "../../components/ImageCredit";
import { Modal, ModalTitle } from "../../components/Modal";
import type { GameState } from "../../domain/game";
import { getTravelDestinations } from "../../domain/travel-destinations";

type ShownPhoto = { key: string; labelJa: string; asset: TourismAsset; kind: "backdrop" | "card" };

/** Every photo free time shows now: the city's backdrop and each destination row's photo. */
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

/** 「写真の出典」 (UI redesign §3.4 item 6): the credit and licence of each photo on the free-time screen. */
export function PhotoCredits({ photos, onClose }: { photos: ShownPhoto[]; onClose: () => void }) {
  return <Modal labelledBy="photo-credits-title" className="photo-credits-modal" onClose={onClose}>
    <ModalTitle id="photo-credits-title" onClose={onClose}>写真の出典</ModalTitle>
    <p className="fine-print">{DERIVED_PHOTO_NOTE_JA}</p>
    <ul className="photo-credits-list" data-testid="photo-credits">
      {photos.map((photo) => <li key={photo.key}>
        <img src={`${import.meta.env.BASE_URL}${derivedImagePath(photo.asset, photo.kind)}`} alt="" width={96} height={64} loading="lazy" decoding="async" />
        <div>
          <h3>{photo.labelJa}</h3>
          <ImageCredit asset={photo.asset} />
        </div>
      </li>)}
    </ul>
  </Modal>;
}
