import { useEffect, useId, useRef, useState } from "react";
import { glossaryTerms, tourismAssets } from "../../content";
import { photoNote, termSubtitle } from "../../content/glossary";
import { playCue } from "../../audio/sound-effects";
import { DOUBLE_TAP_WINDOW_MS } from "../../components/double-tap";
import { HOLDS_READING_ATTRIBUTE } from "../../components/dialogueObstructed";
import { Icon } from "../../components/icons";
import { DIALOGUE_LINE_ATTRIBUTE } from "../../components/scene-tap";
import { focusQuietly } from "../../components/scene-focus";
import "./glossary.css";
import { FitText } from "../../components/FitText";

/**
 * 旅の図鑑's card in the story (2026-11-13 user decision): the terms a line's `# term:` has just put in 旅の図鑑 (GameApp:
 * termsAdded on an action, not during 高速送り), one card after another, over the scene without changing screens: the
 * middle of the screen darkens, and a card shows the term's photo, its name with its reading or other name, its one line
 * and a small 「旅の図鑑に追加」 (with 1 / 2 when the line named more). A tap anywhere, Esc, Enter or Space closes the card
 * (the next one, if the line named more); it has no 「閉じる」 button (2026-11-25 user decision: the dimmed page is enough)
 * without reading on: the window holds the scene's reading (HOLDS_READING_ATTRIBUTE: auto mode waits, a tap or a key
 * reads nothing), while the line goes on writing itself under it and its voice plays on. Each card rings card_new as it
 * shows (not on a quiet line), takes no tap for the moment of a double tap (DOUBLE_TAP_WINDOW_MS: the tap that brought the
 * line must not close it unseen), and comes in softly (not under reduced motion). A dialog: the focus goes to the card
 * (no ring) and back where it was; readers hear the name and the line. A term the content does not have shows nothing.
 */
export function GlossaryTermWindow({ termIds, quiet = false, onDone }: { termIds: readonly string[]; quiet?: boolean; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const term = glossaryTerms.find((item) => item.id === termIds[index]);
  const asset = term && tourismAssets.find((item) => item.id === term.imageId);
  const windowRef = useRef<HTMLDivElement>(null);
  const [settling, setSettling] = useState(true);
  const ids = useId();
  const nameId = `${ids}-name`;
  const lineId = `${ids}-line`;
  const markId = `${ids}-mark`;
  const close = () => {
    if (index + 1 < termIds.length) setIndex(index + 1);
    else onDone();
  };
  const closeRef = useRef(close);
  closeRef.current = close;
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
    if (!term) {
      closeRef.current();
      return;
    }
    if (!quiet) playCue("card_new");
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
  if (!term) return null;
  const subtitle = termSubtitle(term);
  // A tap in the moment of a double tap is ignored.
  const tap = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (settling) return;
    close();
  };
  return (
    <div ref={windowRef} className="glossary-term-window" role="dialog" aria-modal="true" aria-labelledby={nameId} aria-describedby={`${lineId} ${markId}`}
      tabIndex={-1} data-testid="glossary-term-window" data-tap-settling={settling || undefined} {...{ [HOLDS_READING_ATTRIBUTE]: "" }} onClick={tap}>
      <div key={term.id} className="glossary-term-card">
        <p className="glossary-term-mark" id={markId}><Icon name="lens" />旅の図鑑に追加
          {termIds.length > 1 && <span className="glossary-term-count">{index + 1} / {termIds.length}</span>}</p>
        {asset && <img className="glossary-term-photo" src={`${import.meta.env.BASE_URL}${asset.path}`} alt={asset.altJa} width={asset.width}
          height={asset.height} decoding="async" />}
        {asset && photoNote(term) && <p className="glossary-term-photo-note" data-testid="glossary-term-photo-note">{photoNote(term)}</p>}
        <h2 className="glossary-term-name" id={nameId}><FitText text={term.nameJa} /></h2>
        {subtitle && <p className="glossary-term-subtitle">{subtitle}</p>}
        <p className="glossary-term-line" id={lineId}>{term.lineJa}</p>
      </div>
    </div>
  );
}
