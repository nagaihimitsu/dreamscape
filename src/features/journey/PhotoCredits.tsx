import { getCityContent } from "../../content";
import { getCityBackdrop } from "../../content/city-backdrop";
import { DERIVED_PHOTO_NOTE_JA, RECAP_PHOTO_NOTE_JA } from "../../content/credits";
import { derivedImagePath } from "../../content/derived-images";
import { getPlacePhoto } from "../../content/place-photo";
import type { QuizQuestion } from "../../content/schemas";
import type { TourismAsset, TourismClue } from "../../content/tourism-schemas";
import { ImageCredit } from "../../components/ImageCredit";
import { Modal, ModalTitle } from "../../components/Modal";
import { SourceNotes } from "../../components/SourceNotes";
import type { GameState } from "../../domain/game";
import { getTravelDestinations } from "../../domain/travel-destinations";
import type { RecapPicture } from "./journey-moments";

export type ShownPhoto = { key: string; labelJa: string; asset: TourismAsset; kind: "backdrop" | "card" | "recap" };

/**
 * Every photo free time shows now (≡メニュー's 「画面の出典」 lists them): the city's backdrop photo and each place's photo.
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
 * time and on the night screen, ≡メニュー's 「画面の出典」 lists it first): a place's photo in its `recap` copy. None for the
 * author's own album picture, which has no credit.
 */
export function recapPhotos(picture: RecapPicture | null | undefined): ShownPhoto[] {
  return picture?.credit ? [{ key: "recap", labelJa: `前回までのあらすじ（${picture.captionJa}）`, asset: picture.credit, kind: "recap" }] : [];
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

/** A quiz question's answer while its explanation shows: the option chosen and the right one. */
export interface ScreenAnswer {
  optionId: string;
  correctOptionId: string;
}

/**
 * 「画面の出典」 (≡メニュー; 2026-11-20 user decision, one item in place of 写真の出典 and 画像の出典): what the screen shows
 * now. A story scene's photo (`scenePhoto`: its background, a landmark's or a battle's photo) shows whole, with its
 * description, credit and links at once (the scene shows no 出典 of its own, nor does a quiz answer's reveal of the same
 * photo); free time's photos and the recap card's (`photos`) are listed under it with their credits. A dialog for viewing:
 * 「× 閉じる」 in its title bar, a tap on the dimmed page around it, or Esc closes it. (A line's `# recall:` shows an album
 * image, the author's own artwork, which has no credit.) In play it is the way into 「出典・権利の一覧」 (`onAllCredits`;
 * from ゲームの設定 until 2026-11-20), at its foot, so it is on ≡メニュー on every screen, saying so when the screen shows no
 * credited photo. While a quiz's explanation shows, its sources (`factSources`) come first, under 「解説の出典」, with the
 * answer chosen and the right one (`answer`) over them (2026-11-20 user decisions: the explanation shows no sources of its
 * own, and a right answer no 「選んだ答え ✓ 正解」). Where the screen's clue book can be opened (a visit, a reasoning quiz),
 * the sources of the clues it shows (`clues`, 「手がかりの根拠と解釈」) come after the photo (2026-11-20 user decision:
 * 「根拠と解釈を確認する」 off the clue book).
 */
export function ScreenCredits({ scenePhoto, photos, factSources = [], answer, clues = [], onAllCredits, onClose }: {
  scenePhoto?: TourismAsset; photos: ShownPhoto[];
  /** The sources of the quiz explanation on screen. */
  factSources?: QuizQuestion["sources"];
  /** The answer of that explanation's question: said over its sources (2026-11-20 user decision). */
  answer?: ScreenAnswer;
  /** The clues the screen's clue book shows, with their sources (2026-11-20 user decision). */
  clues?: readonly TourismClue[];
  /** Opens 「出典・権利の一覧」 over this dialog (closing it comes back here). */
  onAllCredits: () => void;
  onClose: () => void;
}) {
  const className = [scenePhoto && "date-background-viewer", photos.length > 0 && "photo-credits-modal", "screen-credits"]
    .filter(Boolean).join(" ");
  const right = answer && answer.optionId === answer.correctOptionId;
  return <Modal labelledBy="screen-credits-title" className={className} onClose={onClose} closeOnBackdrop>
    <ModalTitle id="screen-credits-title" onClose={onClose}>画面の出典</ModalTitle>
    {factSources.length > 0 && <section className="fact-sources" aria-labelledby="fact-sources-title" data-testid="fact-sources">
      <h3 id="fact-sources-title">解説の出典</h3>
      {answer && <p className="screen-credits-choice" data-testid="screen-credits-answer">
        選んだ答え <b>{answer.optionId}</b>{right ? " ✓ 正解" : <>　✓ 正解 <b>{answer.correctOptionId}</b></>}
      </p>}
      <ul>
        {factSources.map((source, index) => <li key={`${source.url}:${index}`}>
          <a href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}</a>
        </li>)}
      </ul>
    </section>}
    {scenePhoto && <>
      <img src={`${import.meta.env.BASE_URL}${scenePhoto.path}`} alt={scenePhoto.altJa} />
      <div className="background-credit">
        <ImageCredit asset={scenePhoto} />
      </div>
    </>}
    {clues.length > 0 && <section className="screen-credits-sources" aria-labelledby="screen-credits-clues" data-testid="screen-credits-clues">
      <h3 id="screen-credits-clues">手がかりの根拠と解釈</h3>
      {clues.map((clue) => <div key={clue.id} className="screen-credits-clue">
        <h4>{clue.titleJa}</h4>
        <SourceNotes sources={clue.sources} />
      </div>)}
    </section>}
    {photos.length > 0 && <PhotoCreditList photos={photos} />}
    {!scenePhoto && photos.length === 0 && factSources.length === 0 && clues.length === 0 && <p>いまの画面には、出典を示す写真はありません。</p>}
    <div className="settings-data-links screen-credits-all">
      <button type="button" className="text-button credits-entry" onClick={onAllCredits}>出典・権利の一覧</button>
    </div>
  </Modal>;
}
