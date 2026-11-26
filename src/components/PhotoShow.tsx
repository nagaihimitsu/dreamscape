import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type Ref } from "react";
import { getAlbumImage } from "../content";
import { photoShowsLarge, type StoryPhoto } from "../content/tags";
import { playCue, useSceneFastForward } from "../audio/sound-effects";
import { CardFlight } from "./ItemShow";
import { useFiguresTop } from "./figures-top";
import { Icon } from "./icons";
import type { Box } from "./item-show";
import { Modal } from "./Modal";
import { holdTaps } from "./tap-hold";
import "./photo-show.css";

// A line's `# photo:` shown large (2026-11-12; the default since 2026-11-25, `# photo_show: small` keeps it to the small
// card): the picture as a print in the middle of the scene while its line is on screen (PhotoShowLayer), and, for a photo
// just put in the album, its way into ≡メニュー as the line goes (PhotoShowFlight, drawn by JourneyHud). Presentation only,
// on every reading of the line: the album takes the photo once (src/domain/album.ts). A tap on the print (2026-11-25 user
// request) opens it larger over the scene (PhotoViewer), which closes on any tap; it reads nothing on, and the line waits
// while it is open (a modal: dialogueObstructed). The photo card's status region (AlbumPhotoNotice) says the photo is taken.

/**
 * What GameApp tells the prints: the photo the player's last action has just put in the album (`fresh`; its print is
 * taken: a flash, the shutter unless `sound` is false, and it develops), and the stamp of a photo of the album (its
 * place and 「n日目 hh:mm」), which the print shows under its caption. `held`: 旅の図鑑's card is over the scene (or about to
 * open for the line), so the print waits and comes once the card has closed, not under it (a photo just taken is taken then).
 */
export type PhotoShowCue = { fresh?: { imageId: string; sound: boolean }; stampOf?: (imageId: string) => string | undefined; held?: boolean };
export const PhotoShowContext = createContext<PhotoShowCue>({});

/** Where the print on screen is (its box in the window, without its coming-in tilt and scale): its flight starts there. */
let shownPrint: { imageId: string; box: Box } | null = null;

/** The photo whose print was on screen last, if it is `imageId` (GameApp: the print that flies into ≡メニュー as its line goes). */
export const shownPrintOf = (imageId: string): Box | undefined => (shownPrint?.imageId === imageId ? shownPrint.box : undefined);

/**
 * The line's photo (`photo`, the frame's) large, unless the line keeps it small: over the portraits (dimmed by a veil)
 * and under the window. Not while 高速送り runs past the line (a line it stops at shows it), nor while 旅の図鑑's card is
 * open (it comes as the card closes).
 */
export function PhotoShowLayer({ photo, aboveHeads = false }: {
  photo?: StoryPhoto;
  /** The line is someone's (keepsAboveHeads): the print keeps above the heads on stage (figures-top.ts). */
  aboveHeads?: boolean;
}) {
  const fast = useSceneFastForward();
  const { held } = useContext(PhotoShowContext);
  const image = photoShowsLarge(photo) ? getAlbumImage(photo.imageId) : undefined;
  // 高速送り took the print away: it has no place to fly from.
  useEffect(() => {
    if (fast) shownPrint = null;
  }, [fast]);
  if (!image || !photo || fast || held) return null;
  return <PhotoPrint key={image.id} imageId={image.id} path={image.path} caption={photo.caption} aboveHeads={aboveHeads} />;
}

function PhotoPrint({ imageId, path, caption, aboveHeads }: { imageId: string; path: string; caption?: string; aboveHeads: boolean }) {
  const { fresh, stampOf } = useContext(PhotoShowContext);
  // Taken now (read once, as the print appears): a re-reading of the line, a load's scene, shows the print as it is.
  const [taken] = useState(() => fresh?.imageId === imageId);
  const stamp = stampOf?.(imageId);
  const layer = useRef<HTMLDivElement>(null);
  // Above the heads on stage (figures-top.ts), measured before the print's own box is.
  useFiguresTop(layer, aboveHeads);
  const ref = useRef<HTMLElement>(null);
  const [viewing, setViewing] = useState(false);
  useEffect(() => {
    if (taken && fresh?.sound) playCue("camera_shutter");
  // Once, as the print appears.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      // Its own size about the middle it shows (the tilt and the coming-in scale left out).
      const rect = element.getBoundingClientRect();
      const width = element.offsetWidth;
      const height = element.offsetHeight;
      shownPrint = { imageId, box: { left: rect.left + rect.width / 2 - width / 2, top: rect.top + rect.height / 2 - height / 2, width, height } };
    };
    measure();
    const image = element.querySelector("img");
    image?.addEventListener("load", measure);
    window.addEventListener("resize", measure);
    return () => {
      image?.removeEventListener("load", measure);
      window.removeEventListener("resize", measure);
    };
  }, [imageId, aboveHeads]);
  const open = () => setViewing(true);
  return <div className="photo-show-layer" ref={layer} data-testid="photo-show" data-taken={taken || undefined}>
    <PrintBody ref={ref} path={path} caption={caption} stamp={stamp} role="button" tabIndex={0} aria-label="写真を大きく見る"
      onClick={open} onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open();
      }} />
    {taken && <span className="photo-show-flash" aria-hidden="true" />}
    {viewing && <PhotoViewer path={path} caption={caption} stamp={stamp} onClose={() => setViewing(false)} />}
  </div>;
}

/**
 * The print opened larger (a tap on it): over the dimmed scene, as large as the screen allows, with its caption and stamp.
 * A tap anywhere closes it (on the print, around it, or its 「閉じる」), as Esc does; the tap that closes it reads nothing on.
 */
function PhotoViewer({ path, caption, stamp, onClose }: { path: string; caption?: string; stamp?: string; onClose: () => void }) {
  const close = () => {
    holdTaps();
    onClose();
  };
  return <Modal labelledBy="photo-show-viewer-title" className="photo-show-viewer" onClose={onClose} closeOnBackdrop>
    <h2 id="photo-show-viewer-title" className="sr-only">{caption ?? "写真"}</h2>
    <button type="button" className="modal-close photo-show-viewer-close" data-testid="photo-show-viewer-close" onClick={close}>
      <Icon name="close" />閉じる
    </button>
    <PrintBody path={path} caption={caption} stamp={stamp} onClick={close} data-testid="photo-show-large" />
  </Modal>;
}

type PrintProps = Omit<ComponentPropsWithoutRef<"figure">, "children" | "className"> & { "data-testid"?: string };

/** The print itself: the picture in its white frame, the caption written in the margin under it, and its stamp. */
function PrintBody({ ref, path, caption, stamp, ...props }: PrintProps & { ref?: Ref<HTMLElement>; path: string; caption?: string; stamp?: string }) {
  return <figure className="photo-print" ref={ref} {...props}>
    <img src={`${import.meta.env.BASE_URL}${path}`} alt="" decoding="async" />
    {(caption || stamp) && <figcaption className="photo-print-margin">
      {caption && <span className="photo-print-caption">{caption}</span>}
      {stamp && <span className="photo-print-stamp">{stamp}</span>}
    </figcaption>}
  </figure>;
}

/** The box of ≡メニュー, where a print flies in. */
const menuBox = (): DOMRect | undefined => document.querySelector<HTMLElement>(".journey-hud [data-testid='hud-menu']")?.getBoundingClientRect();

/** A photo just taken whose print's line has just gone (GameApp): where the print was, to fly from. */
export type PrintFlight = { key: number; imageId: string; caption?: string; box: Box };

/**
 * The print of a line that has just gone (GameApp), in the header's own layer over the screen: from where it was, it
 * shrinks and flies into ≡メニュー, where the album is (`toMenu`: the header shows it), or else it fades where it was.
 * Fading only under reduced motion (photo-show.css).
 */
export function PhotoShowFlight({ flight, toMenu }: { flight: PrintFlight; toMenu: boolean }) {
  const image = getAlbumImage(flight.imageId);
  if (!image) return null;
  return <CardFlight box={flight.box} toBag={toMenu} target={menuBox} className="photo-print photo-print-leaving">
    <img src={`${import.meta.env.BASE_URL}${image.path}`} alt="" decoding="async" />
    {flight.caption && <span className="photo-print-margin"><span className="photo-print-caption">{flight.caption}</span></span>}
  </CardFlight>;
}
