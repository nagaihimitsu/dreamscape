import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { glossaryTerms, localWords, tourismAssets } from "../content";
import { LINE_CARDS_SHOWN, photoNote, termSubtitle } from "../content/glossary";
import { Icon, type IconName } from "./icons";
import "./line-cards.css";

/** A card a line brings: a term it has just put in 旅の図鑑 (`# term:`), or a word of the country it has just taught (`# local_word:`). */
export type LineCard = { kind: "term" | "word"; id: string };

/**
 * The cards of the line on screen (GameApp, 2026-11-28 user decision): the terms the player's last action put in 旅の図鑑,
 * then the words it taught, while that line is on screen. Empty on every other line.
 */
export const LineCardsContext = createContext<readonly LineCard[]>([]);

type CardContent = { mark: string; icon: IconName; name: string; subtitle: string | null; line: string; note: string | null;
  photo: { path: string; alt: string } | null };

/** What a card shows (null for one the content does not have). */
function cardContent(card: LineCard): CardContent | null {
  if (card.kind === "term") {
    const term = glossaryTerms.find((item) => item.id === card.id);
    if (!term) return null;
    const asset = tourismAssets.find((item) => item.id === term.imageId);
    return { mark: "旅の図鑑", icon: "lens", name: term.nameJa, subtitle: termSubtitle(term), line: term.lineJa, note: photoNote(term),
      photo: asset ? { path: asset.path, alt: asset.altJa } : null };
  }
  const word = localWords.find((item) => item.id === card.id);
  if (!word) return null;
  return { mark: "旅のことば", icon: "book", name: word.word, subtitle: word.reading, line: word.meaningJa, note: word.noteJa ?? null, photo: null };
}

/**
 * The line's cards of 旅の図鑑 and 旅のことば (2026-11-28 user decision: small, under the dialogue window, with the line, as
 * a note on its words; until then each card had a turn of its own over the scene before the line): at most two
 * (LINE_CARDS_SHOWN), the terms first. A term's card has its photo small beside its name (with its reading or other
 * name), its one line and, where the photo stands in for it, what the photo shows; a word's, the word in its own script,
 * its reading, its meaning and its note. A mark tells which (a lens for 旅の図鑑, a book for 旅のことば, their names for
 * readers only). They take no tap of their own (a tap on them reads on, as anywhere on the scene) and go with their
 * line. Put in the window (its last child, `.vn-window` or the battle's `.battle-window`), they hang under it, and the
 * window keeps room for them below (--line-cards-h, line-cards.css): on a phone held upright that is the room the window
 * keeps under it anyway, so it moves up only for what does not fit there. A status region, always there, so readers hear
 * the cards as they come.
 */
export function LineCards() {
  const cards = useContext(LineCardsContext);
  const shown = cards.flatMap((card) => {
    const content = cardContent(card);
    return content ? [{ card, content }] : [];
  }).slice(0, LINE_CARDS_SHOWN);
  const ref = useRef<HTMLDivElement>(null);
  // The cards' height, on the window they hang under (its room below them).
  useLayoutEffect(() => {
    const element = ref.current;
    const window = element?.parentElement;
    if (!element || !window) return;
    const write = (height: number) => window.style.setProperty("--line-cards-h", `${Math.ceil(height)}px`);
    write(element.getBoundingClientRect().height);
    const observer = new ResizeObserver(([entry]) => write(entry.borderBoxSize?.[0]?.blockSize ?? element.getBoundingClientRect().height));
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.style.removeProperty("--line-cards-h");
    };
  }, []);
  return (
    <div ref={ref} className="line-cards" role="status" data-testid="line-cards">
      {shown.map(({ card, content }) => (
        <div key={`${card.kind}-${card.id}`} className="line-card" data-kind={card.kind} data-testid="line-card">
          {content.photo && <img className="line-card-photo" src={`${import.meta.env.BASE_URL}${content.photo.path}`} alt={content.photo.alt}
            decoding="async" />}
          <div className="line-card-words">
            <p className="line-card-head">
              <Icon name={content.icon} />
              <span className="sr-only">{content.mark}：</span>
              <span className="line-card-name">{content.name}</span>
              {content.subtitle && <span className="line-card-subtitle"><span className="sr-only">（</span>{content.subtitle}<span className="sr-only">）</span></span>}
            </p>
            <p className="line-card-line">{content.line}{content.note && <span className="line-card-note">{content.note}</span>}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
