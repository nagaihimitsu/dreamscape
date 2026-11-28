import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ComponentPropsWithoutRef, type Ref, type RefObject } from "react";
import { getAlbumImage } from "../content";
import { photoShowsLarge, type StoryPhoto } from "../content/tags";
import { playCue, useSceneFastForward } from "../audio/sound-effects";
import { CardFlight } from "./ItemShow";
import type { Box } from "./item-show";
import { DIALOGUE_WINDOW_ATTRIBUTE } from "./DialogueText";
import "./photo-show.css";

// A line's `# photo:` shown on the scene (2026-11-12; the default since 2026-11-25, `# photo_show: small` keeps it to the
// small card): the picture on its pane of glass, smaller than the scene (2026-11-28 user decision: the photo goes with
// the line, as a part of the words, not a turn of its own before them), right above the dialogue window, while its line
// is on screen; the line writes itself on and reads on as any other, and a tap anywhere reads on. A photo just put in
// the album flies into ≡メニュー as its line goes (PhotoShowFlight, drawn by JourneyHud). Presentation only, on every
// reading of the line: the album takes the photo once (src/domain/album.ts). The photo card's status region
// (AlbumPhotoNotice) says the photo is taken.

/**
 * What GameApp tells the prints: the photo the player's last action has just put in the album (`fresh`; its print is
 * taken: a flash, the album sound unless `sound` is false, and it develops), and the stamp of a photo of the album (its
 * place and 「n日目 hh:mm」), which the print shows under its caption. `held`: the episode's title card or a ride's art
 * covers the screen, so the print waits and comes once it has gone (a photo just taken is taken then).
 */
export type PhotoShowCue = {
  fresh?: { imageId: string; sound: boolean };
  stampOf?: (imageId: string) => string | undefined;
  held?: boolean;
};
export const PhotoShowContext = createContext<PhotoShowCue>({});

/** Where the print on screen is (its box in the window, without its coming-in scale): its flight starts there. */
let shownPrint: { imageId: string; box: Box } | null = null;

/** The photo whose print was on screen last, if it is `imageId` (GameApp: the print that flies into ≡メニュー as its line goes). */
export const shownPrintOf = (imageId: string): Box | undefined => (shownPrint?.imageId === imageId ? shownPrint.box : undefined);

/**
 * The line's photo (`photo`, the frame's) on the scene, unless the line keeps it small: over the portraits and right
 * above the dialogue window. Not while 高速送り runs past the line (a line it stops at shows it), nor while the episode's
 * title card or a ride's art covers the screen.
 */
export function PhotoShowLayer({ photo }: { photo?: StoryPhoto }) {
  const fast = useSceneFastForward();
  const { held } = useContext(PhotoShowContext);
  const image = photoShowsLarge(photo) ? getAlbumImage(photo.imageId) : undefined;
  // 高速送り took the print away: it has no place to fly from.
  useEffect(() => {
    if (fast) shownPrint = null;
  }, [fast]);
  if (!image || !photo || fast || held) return null;
  return <PhotoPrint key={image.id} imageId={image.id} path={image.path} caption={photo.caption} />;
}

/**
 * Keeps the print above the dialogue window: the room under the print (`--photo-bottom`, from the layer's foot to the
 * window's top, its choices included) and the room it has above that (`--photo-room`, down from where the print may
 * begin under the header), in px, measured as the window grows or moves (a line's cards under it, its choices above it)
 * and as the screen changes. A scene without a window keeps the print at its foot.
 */
function useAboveWindow(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const layer = ref.current;
    const scene = layer?.parentElement;
    if (!layer || !scene) return;
    const measure = () => {
      const dialogue = scene.querySelector(`[${DIALOGUE_WINDOW_ATTRIBUTE}]`)?.getBoundingClientRect();
      const box = layer.getBoundingClientRect();
      const top = Number.parseFloat(getComputedStyle(layer).paddingTop) || 0;
      const windowTop = dialogue && dialogue.height > 0 ? dialogue.top : box.bottom;
      layer.style.setProperty("--photo-bottom", `${Math.max(0, Math.round(box.bottom - windowTop))}px`);
      layer.style.setProperty("--photo-room", `${Math.max(0, Math.round(windowTop - box.top - top))}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(layer);
    const dialogue = scene.querySelector(`[${DIALOGUE_WINDOW_ATTRIBUTE}]`);
    if (dialogue) observer.observe(dialogue);
    return () => observer.disconnect();
  }, [ref]);
}

function PhotoPrint({ imageId, path, caption }: { imageId: string; path: string; caption?: string }) {
  const { fresh, stampOf } = useContext(PhotoShowContext);
  // Taken now (read once, as the print appears): a re-reading of the line, a load's scene, shows the print as it is.
  const [taken] = useState(() => fresh?.imageId === imageId);
  const stamp = stampOf?.(imageId);
  const layer = useRef<HTMLDivElement>(null);
  useAboveWindow(layer);
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
    // Its size and place change with its picture's loading and with the window it keeps above.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [imageId]);
  return <div ref={layer} className="photo-show-layer" data-testid="photo-show" data-taken={taken || undefined}>
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

/** The box of one of the header's tools, where a print flies in: 「旅の記録」 (its 📱) or ≡メニュー. */
const toolBox = (testId: string) => (): DOMRect | undefined =>
  document.querySelector<HTMLElement>(`.journey-hud [data-testid='${testId}']`)?.getBoundingClientRect();
const menuBox = toolBox("hud-menu");
const recordsBox = toolBox("hud-records");

/** A photo just taken whose print has just gone (GameApp): where the print was, to fly from. */
export type PrintFlight = { key: number; imageId: string; caption?: string; box: Box };

/**
 * The print of a photo just taken that has just gone with its line (GameApp), in the header's own layer over the screen: from where it was, it
 * shrinks and flies to where the album is, 「旅の記録」 (`intoRecords`: its 📱 shows, 2026-11-28) or ≡メニュー (`toMenu`: the
 * header shows it), or else it fades where it was. Fading only under reduced motion (photo-show.css).
 */
export function PhotoShowFlight({ flight, toMenu, intoRecords = false }: { flight: PrintFlight; toMenu: boolean; intoRecords?: boolean }) {
  const image = getAlbumImage(flight.imageId);
  if (!image) return null;
  return <CardFlight box={flight.box} toBag={toMenu} target={intoRecords ? recordsBox : menuBox} className="photo-print photo-print-leaving">
    <img src={`${import.meta.env.BASE_URL}${image.path}`} alt="" decoding="async" />
    {flight.caption && <span className="photo-print-margin"><span className="photo-print-caption">{flight.caption}</span></span>}
  </CardFlight>;
}
