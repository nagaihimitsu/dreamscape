import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { glossaryTerms, localWords, tourismAssets } from "../../content";
import { photoNote, termSubtitle } from "../../content/glossary";
import { playCue } from "../../audio/sound-effects";
import { DOUBLE_TAP_WINDOW_MS } from "../../components/double-tap";
import { HOLDS_READING_ATTRIBUTE } from "../../components/dialogueObstructed";
import { Icon, type IconName } from "../../components/icons";
import { itemFlight } from "../../components/item-show";
import { holdPhotoTurn } from "../../components/photo-turn";
import { DIALOGUE_LINE_ATTRIBUTE } from "../../components/scene-tap";
import { focusQuietly } from "../../components/scene-focus";
import "./glossary.css";
import { FitText } from "../../components/FitText";

/** A card a line brings: a term it has just put in 旅の図鑑 (`# term:`), or a word of the country it has just taught (`# local_word:`). */
export type LineCard = { kind: "term" | "word"; id: string };

/**
 * The cards of a line over the story (2026-11-27 user decision: 旅の図鑑, 旅のことば and the large photo work alike): the
 * terms a line's `# term:` has just put in 旅の図鑑 (GameApp: termsAdded on an action, not during 高速送り; 2026-11-13) and
 * the words its `# local_word:` has just taught (useLocalWords, not during 高速送り nor on a load; until 2026-11-27 a notice
 * under the header), one card after another (the terms first), over the scene without changing screens: the middle of the
 * screen darkens, and a card shows a small 「旅の図鑑」 or 「旅のことば」 (with 1 / 2 when the line brought more) and, for a
 * term, its photo, its name with its reading or other name and its one line; for a word, the word in its own script, its
 * reading, its meaning and its note. The cards have their own turn before the line (as a large photo's: photo-turn.ts): the
 * line under them writes nothing and its voice and sounds wait until the last card goes. A tap anywhere, Esc, Enter or
 * Space puts the card away (the next one comes); it has no 「閉じる」 button (2026-11-25 user decision: the dimmed page is
 * enough): the card shrinks and flies into ≡メニュー, where 旅の図鑑 and 旅のことば are (it fades where it is without the
 * button, and goes at once under reduced motion), and the line starts as the last one goes. The window holds the scene's
 * reading (HOLDS_READING_ATTRIBUTE: auto mode waits, a tap or a key reads nothing). Each card rings as it shows (card_new
 * for a term, local_word for a word; not on a quiet line), takes no tap for the moment of a double tap
 * (DOUBLE_TAP_WINDOW_MS: the tap that brought the line must not close it unseen), and comes in softly (not under reduced
 * motion). A dialog: the focus goes to the card (no ring) and back where it was; readers hear the name and the line. A card
 * the content does not have shows nothing. `cards` may grow while the window is open (a line's words come a moment after
 * its terms); the cards already shown stay as they are.
 */
/** How long a card takes to fly into ≡メニュー, or to fade where it is (glossary.css). */
const GLOSSARY_STOW_MS = 560;
const GLOSSARY_FADE_MS = 240;

/** ≡メニュー's button, where 旅の図鑑 is. */
const menuBox = (): DOMRect | undefined => document.querySelector<HTMLElement>(".journey-hud [data-testid='hud-menu']")?.getBoundingClientRect();

const reducedMotion = (element: Element) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!element.closest(".reduce-motion");

/** What a card shows (null for one the content does not have). */
function cardContent(card: LineCard | undefined) {
  if (card?.kind === "term") {
    const term = glossaryTerms.find((item) => item.id === card.id);
    if (!term) return null;
    const asset = tourismAssets.find((item) => item.id === term.imageId);
    return { mark: "旅の図鑑", icon: "lens" as IconName, sound: "card_new" as const, name: term.nameJa, subtitle: termSubtitle(term), line: term.lineJa,
      note: null, photo: asset ? { asset, note: photoNote(term) } : null };
  }
  if (card?.kind === "word") {
    const word = localWords.find((item) => item.id === card.id);
    if (!word) return null;
    return { mark: "旅のことば", icon: "book" as IconName, sound: "local_word" as const, name: word.word, subtitle: word.reading, line: word.meaningJa,
      note: word.noteJa ?? null, photo: null };
  }
  return null;
}

export function LineCardWindow({ cards, quiet = false, onDone }: { cards: readonly LineCard[]; quiet?: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];
  const content = cardContent(card);
  const windowRef = useRef<HTMLDivElement>(null);
  const [settling, setSettling] = useState(true);
  const ids = useId();
  const nameId = `${ids}-name`;
  const lineId = `${ids}-line`;
  const markId = `${ids}-mark`;
  const cardRef = useRef<HTMLDivElement>(null);
  const last = index + 1 >= cards.length;
  // The card on its way into ≡メニュー (`fly`, with where it goes) or fading where it is (`fade`).
  const [stowing, setStowing] = useState<{ mode: "fly" | "fade"; style?: CSSProperties } | null>(null);
  const next = () => {
    if (last) onDone();
    else setIndex(index + 1);
  };
  const close = () => {
    if (stowing) return;
    const card = cardRef.current;
    if (!card || reducedMotion(card)) {
      next();
      return;
    }
    const menu = menuBox();
    const fly = menu && menu.width > 0 && menu.height > 0 ? itemFlight(card.getBoundingClientRect(), menu) : undefined;
    setStowing(fly ? { mode: "fly", style: { "--dx": `${fly.dx}px`, "--dy": `${fly.dy}px`, "--to-scale": fly.scale } as CSSProperties } : { mode: "fade" });
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  const nextRef = useRef(next);
  nextRef.current = next;
  // The cards' turn before the line: from the first card till the last one starts to go.
  const turnOn = !(last && stowing);
  useLayoutEffect(() => {
    if (!turnOn) return;
    return holdPhotoTurn({ end: () => closeRef.current() });
  }, [turnOn]);
  // As the card has gone: the next card, or the window closes.
  useEffect(() => {
    if (!stowing) return;
    const timer = window.setTimeout(() => {
      setStowing(null);
      nextRef.current();
    }, stowing.mode === "fly" ? GLOSSARY_STOW_MS : GLOSSARY_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [stowing]);
  // The focus: on the window while the cards show, then back where it was; where it was lost (the line it was on gave way to
  // the new line under the card), on the line on screen, so a key reads on from there (its ring only after a key).
  useEffect(() => {
    const before = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    return () => {
      if (before?.isConnected) before.focus({ preventScroll: true });
      else {
        const line = document.querySelector<HTMLElement>(`[${DIALOGUE_LINE_ATTRIBUTE}]`);
        if (line) focusQuietly(line);
      }
    };
  }, []);
  // Each card: its sound, the focus on the window, and the moment it takes no tap.
  useEffect(() => {
    if (!content) {
      closeRef.current();
      return;
    }
    if (!quiet) playCue(content.sound);
    if (windowRef.current) focusQuietly(windowRef.current);
    setSettling(true);
    const timer = window.setTimeout(() => setSettling(false), DOUBLE_TAP_WINDOW_MS);
    return () => window.clearTimeout(timer);
  // Once a card (the line's quiet is read as it shows).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);
  // Esc, Enter or Space closes the card before anything else hears it (a guide's Esc would close the guide; the line's
  // Enter would read on); a key held down closes no more than one. Tab stays on the window.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        if (!event.repeat) closeRef.current();
      } else if (event.key === "Tab") {
        event.preventDefault();
        windowRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
  if (!content || !card) return null;
  // A tap in the moment of a double tap is ignored.
  const tap = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (settling) return;
    close();
  };
  return (
    <div ref={windowRef} className="glossary-term-window" role="dialog" aria-modal="true" aria-labelledby={nameId} aria-describedby={`${lineId} ${markId}`}
      tabIndex={-1} data-testid="glossary-term-window" data-tap-settling={settling || undefined} data-leaving={(last && stowing) || undefined}
      {...{ [HOLDS_READING_ATTRIBUTE]: "" }} onClick={tap}>
      <div key={`${card.kind}-${card.id}`} ref={cardRef} className="glossary-term-card" data-kind={card.kind} data-stowing={stowing?.mode} style={stowing?.style}>
        <p className="glossary-term-mark" id={markId}><Icon name={content.icon} />{content.mark}
          {cards.length > 1 && <span className="glossary-term-count">{index + 1} / {cards.length}</span>}</p>
        {content.photo && <img className="glossary-term-photo" src={`${import.meta.env.BASE_URL}${content.photo.asset.path}`} alt={content.photo.asset.altJa}
          width={content.photo.asset.width} height={content.photo.asset.height} decoding="async" />}
        {content.photo?.note && <p className="glossary-term-photo-note" data-testid="glossary-term-photo-note">{content.photo.note}</p>}
        <h2 className="glossary-term-name" id={nameId}><FitText text={content.name} /></h2>
        {content.subtitle && <p className="glossary-term-subtitle">{content.subtitle}</p>}
        <p className="glossary-term-line" id={lineId}>{content.line}</p>
        {content.note && <p className="glossary-term-note">{content.note}</p>}
      </div>
    </div>
  );
}
