import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type Ref } from "react";
import { getAlbumImage } from "../content";
import { photoShowsLarge, type StoryPhoto } from "../content/tags";
import { playCue, useSceneFastForward } from "../audio/sound-effects";
import { CardFlight } from "./ItemShow";
import type { Box } from "./item-show";
import { holdPhotoTurn } from "./photo-turn";
import "./photo-show.css";

// A line's `# photo:` shown large (2026-11-12; the default since 2026-11-25, `# photo_show: small` keeps it to the small
// card): the picture as a print in the middle of the scene, at the same size on every line (2026-11-27 user decision:
// no smaller print beside the faces of whoever speaks). The print has its own turn before its line (photo-turn.ts,
// 2026-11-27 user decision): the line waits while it is up, and a tap anywhere on the scene (the print too) takes it
// quickly away and starts the line. A photo just put in the album flies into ≡メニュー as the print goes
// (PhotoShowFlight, drawn by JourneyHud). Presentation only, on every reading of the line: the album takes the photo once
// (src/domain/album.ts). The photo card's status region (AlbumPhotoNotice) says the photo is taken.

/**
 * What GameApp tells the prints: the photo the player's last action has just put in the album (`fresh`; its print is
 * taken: a flash, the album sound unless `sound` is false, and it develops), and the stamp of a photo of the album (its
 * place and 「n日目 hh:mm」), which the print shows under its caption. `held`: 旅の図鑑's card is over the scene (or about to
 * open for the line), so the print waits and comes once the card has closed, not under it (a photo just taken is taken then);
 * its turn holds the line all the same. `done`: the line's photo whose turn has ended (`onDone` says so), so it is not up
 * again on that line.
 */
export type PhotoShowCue = {
  fresh?: { imageId: string; sound: boolean };
  stampOf?: (imageId: string) => string | undefined;
  held?: boolean;
  done?: StoryPhoto | null;
  onDone?: (photo: StoryPhoto) => void;
};
export const PhotoShowContext = createContext<PhotoShowCue>({});

/** How long the print takes to go when its turn ends (photo-show.css .photo-show-leaving): quickly. */
const PHOTO_LEAVE_MS = 160;

/** Where the print on screen is (its box in the window, without its coming-in scale): its flight starts there. */
let shownPrint: { imageId: string; box: Box } | null = null;

/** The photo whose print was on screen last, if it is `imageId` (GameApp: the print that flies into ≡メニュー as it goes). */
export const shownPrintOf = (imageId: string): Box | undefined => (shownPrint?.imageId === imageId ? shownPrint.box : undefined);

const reducedMotion = (element: Element | null) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!element?.closest(".reduce-motion");

/**
 * The line's photo (`photo`, the frame's) large, unless the line keeps it small: over the portraits (dimmed by a veil)
 * and under the window, for its turn. Not while 高速送り runs past the line (a line it stops at shows it), nor while 旅の図鑑's
 * card is open (it comes as the card closes; its turn has begun).
 */
export function PhotoShowLayer({ photo }: { photo?: StoryPhoto }) {
  const fast = useSceneFastForward();
  const { held, done, onDone, fresh } = useContext(PhotoShowContext);
  // The photo whose turn has ended here, and whether its print is still going.
  const [ended, setEnded] = useState<{ photo: StoryPhoto; leaving: boolean } | null>(null);
  const up = photoShowsLarge(photo) && photo !== done && !(ended?.photo === photo && !ended.leaving) ? photo : undefined;
  const image = up ? getAlbumImage(up.imageId) : undefined;
  const turn = !!up && !!image && !fast && ended?.photo !== up;
  const endRef = useRef(() => {});
  endRef.current = () => {
    if (!up) return;
    // A photo just taken flies from where it is (GameApp, PhotoShowFlight) or becomes its card: no fading first.
    const quick = fresh?.imageId === up.imageId || reducedMotion(document.querySelector(".photo-show-layer"));
    setEnded({ photo: up, leaving: !quick });
    if (quick) onDone?.(up);
  };
  useLayoutEffect(() => {
    if (!turn) return;
    return holdPhotoTurn({ end: () => endRef.current() });
  }, [turn]);
  const leaving = !!ended && ended.photo === up && ended.leaving;
  useEffect(() => {
    if (!leaving || !up) return;
    const timer = window.setTimeout(() => {
      setEnded({ photo: up, leaving: false });
      onDone?.(up);
    }, PHOTO_LEAVE_MS);
    return () => window.clearTimeout(timer);
  // Once, as the print begins to go.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving]);
  // 高速送り took the print away: it has no place to fly from.
  useEffect(() => {
    if (fast) shownPrint = null;
  }, [fast]);
  if (!image || !up || fast || held) return null;
  return <PhotoPrint key={image.id} imageId={image.id} path={image.path} caption={up.caption} leaving={leaving} />;
}

function PhotoPrint({ imageId, path, caption, leaving }: { imageId: string; path: string; caption?: string; leaving: boolean }) {
  const { fresh, stampOf } = useContext(PhotoShowContext);
  // Taken now (read once, as the print appears): a re-reading of the line, a load's scene, shows the print as it is.
  const [taken] = useState(() => fresh?.imageId === imageId);
  const stamp = stampOf?.(imageId);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (taken && fresh?.sound) playCue("album_photo");
  // Once, as the print appears.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      // Its own size about the middle it shows (the coming-in scale left out).
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
  }, [imageId]);
  return <div className={`photo-show-layer${leaving ? " photo-show-leaving" : ""}`} data-testid="photo-show" data-taken={taken || undefined}>
    <PrintBody ref={ref} path={path} caption={caption} stamp={stamp} />
    {taken && <span className="photo-show-flash" aria-hidden="true" />}
  </div>;
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

/** A photo just taken whose print has just gone (GameApp): where the print was, to fly from. */
export type PrintFlight = { key: number; imageId: string; caption?: string; box: Box };

/**
 * The print of a photo just taken that has just gone (its turn ended; GameApp), in the header's own layer over the screen: from where it was, it
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
