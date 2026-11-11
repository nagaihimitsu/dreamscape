import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cityContents, presentation, tourismAssets } from "../../content";
import { getJourneyForCity } from "../../content/journeys";
import { albumImageAsset } from "../../content/photo-choice";
import { ImageCredit } from "../../components/ImageCredit";
import { Modal, ModalTitle } from "../../components/Modal";
import type { AlbumPhoto } from "../../domain/album-state";
import { albumPages, albumSwipeStep, initialAlbumPage, type AlbumContent, type AlbumPhotoView } from "./album-pages";
import "./album.css";

/** The journey's cities in order and the credited photos, from the generated content. */
function journeyAlbumContent(currentCityId: string): AlbumContent {
  const cityIds = getJourneyForCity(currentCityId)?.cities.map((city) => city.id) ?? [currentCityId];
  return {
    cities: cityIds.flatMap((id) => {
      const content = cityContents[id];
      return content ? [{ id, nameJa: content.city.nameJa, hotelPlaceId: content.travelSettings.hotelPlaceId, places: content.travel.places }] : [];
    }),
    assetOf: (imageId) => albumImageAsset({ assets: tourismAssets, backgrounds: presentation.backgrounds }, imageId),
  };
}

const CREDIT_SUMMARY_JA = "画像の説明・出典と利用条件";
const imageSource = (photo: AlbumPhotoView) => `${import.meta.env.BASE_URL}${photo.asset.path}`;

/**
 * 「アルバム」 (⚙設定, 2026-11-11 user decision): the photos the lines' `# photo:` took, one page per city in the
 * journey's order (album-pages.ts), each with its caption, 「n日目 hh:mm」, its place and its credit (ImageCredit, as
 * the scenes' 背景画像 shows it). 「前の街」「次の街」, a sideways swipe on the page and the arrow keys turn the pages;
 * a photo opens larger in its own dialog. Opened from ⚙設定's panel, it takes no press for a moment (settlePresses).
 * It shows no relationship value.
 */
export function AlbumDialog({ album, currentCityId, onClose }: { album: readonly AlbumPhoto[]; currentCityId: string; onClose: () => void }) {
  const pages = useMemo(() => albumPages(album, journeyAlbumContent(currentCityId)), [album, currentCityId]);
  const [index, setIndex] = useState(() => initialAlbumPage(pages, currentCityId));
  const [turn, setTurn] = useState<"next" | "back" | null>(null);
  const [enlarged, setEnlarged] = useState<AlbumPhotoView | null>(null);
  const book = useRef<HTMLDivElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const last = pages.length - 1;
  const shown = Math.min(index, Math.max(0, last));
  const page = pages[shown];
  const go = (step: -1 | 1) => {
    const target = Math.max(0, Math.min(last, shown + step));
    if (target === shown) return;
    setTurn(step > 0 ? "next" : "back");
    setIndex(target);
  };
  const goRef = useRef(go);
  goRef.current = go;
  // A page button the turn disables (on the first or last page) hands the focus to the other one.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (active === previousButton.current && shown === 0) nextButton.current?.focus({ preventScroll: true });
    else if (active === nextButton.current && shown === last) previousButton.current?.focus({ preventScroll: true });
  }, [shown, last]);
  // ←/→ turn the pages wherever the focus is in the album (not in the enlarged photo, nor with a modifier key).
  useEffect(() => {
    if (enlarged || pages.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "ArrowLeft" && event.key !== "ArrowRight") || event.defaultPrevented ||
          event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const dialog = book.current?.closest("dialog");
      const target = event.target instanceof Element ? event.target : null;
      if (!dialog || !target || target.closest("dialog") !== dialog) return;
      event.preventDefault();
      goRef.current(event.key === "ArrowRight" ? 1 : -1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enlarged, pages.length]);

  return <>
    <Modal labelledBy="album-title" className="album-modal" onClose={onClose} settlePresses>
      <ModalTitle id="album-title" onClose={onClose} closeTestId="album-close">アルバム</ModalTitle>
      {!page ? <p className="album-empty" data-testid="album-empty">まだ写真はありません。</p> : <div className="album-book" ref={book}>
        <section
          key={page.cityId}
          className="album-page"
          data-turn={turn ?? undefined}
          data-testid="album-page"
          aria-labelledby="album-page-title"
          onPointerDown={(event) => {
            swiped.current = false;
            swipe.current = event.isPrimary && event.pointerType !== "mouse" ? { pointerId: event.pointerId, x: event.clientX, y: event.clientY } : null;
          }}
          onPointerUp={(event) => {
            const start = swipe.current;
            swipe.current = null;
            if (!start || start.pointerId !== event.pointerId) return;
            const step = albumSwipeStep(event.clientX - start.x, event.clientY - start.y);
            if (!step) return;
            // The click this release may still fire would land on the next page's photo.
            swiped.current = true;
            go(step);
          }}
          onPointerCancel={() => { swipe.current = null; }}
          onClickCapture={(event) => {
            const afterSwipe = swiped.current;
            swiped.current = false;
            // A key's click (detail 0) is never the swipe's.
            if (!afterSwipe || event.detail === 0) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <h3 id="album-page-title">{page.cityJa}</h3>
          <ul className="album-photos">
            {page.photos.map((photo) => <li key={photo.imageId}>
              <figure>
                <button type="button" className="album-photo" aria-label={`${photo.caption ?? photo.placeJa}の写真を大きく見る`}
                  onClick={() => setEnlarged(photo)}>
                  <img src={imageSource(photo)} alt="" width={photo.asset.width} height={photo.asset.height} loading="lazy" decoding="async" />
                </button>
                <figcaption>
                  {photo.caption !== undefined && <p className="album-caption">{photo.caption}</p>}
                  <p className="album-meta">{photo.whenJa} · {photo.placeJa}{photo.asset.isPlaceholder ? " · 仮画像" : ""}</p>
                  <details className="album-credit">
                    <summary>{CREDIT_SUMMARY_JA}</summary>
                    <ImageCredit asset={photo.asset} />
                  </details>
                </figcaption>
              </figure>
            </li>)}
          </ul>
        </section>
        {pages.length > 1 && <nav className="album-pager" aria-label="アルバムのページ">
          <button ref={previousButton} type="button" className="album-page-button" disabled={shown === 0} onClick={() => go(-1)}>前の街</button>
          <p className="album-page-count" aria-live="polite">
            {shown + 1} / {pages.length}<span className="sr-only">ページ、{page.cityJa}</span>
          </p>
          <button ref={nextButton} type="button" className="album-page-button" disabled={shown === last} onClick={() => go(1)}>次の街</button>
        </nav>}
      </div>}
    </Modal>
    {enlarged && <Modal labelledBy="album-photo-title" className="album-photo-viewer" onClose={() => setEnlarged(null)}>
      <ModalTitle id="album-photo-title">{enlarged.caption ?? enlarged.placeJa}</ModalTitle>
      <img src={imageSource(enlarged)} alt={enlarged.asset.altJa} data-testid="album-photo-large" />
      <p className="album-meta">{enlarged.whenJa} · {enlarged.placeJa}{enlarged.asset.isPlaceholder ? " · 仮画像" : ""}</p>
      <details>
        <summary>{CREDIT_SUMMARY_JA}</summary>
        <ImageCredit asset={enlarged.asset} />
      </details>
      <button type="button" className="secondary" onClick={() => setEnlarged(null)}>閉じる</button>
    </Modal>}
  </>;
}
