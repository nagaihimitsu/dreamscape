import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { glossaryTerms, localWords, tourismAssets } from "../content";
import { LINE_CARDS_SHOWN, photoNote, termSubtitle } from "../content/glossary";
import { useSceneFastForward } from "../audio/sound-effects";
import { Icon, type IconName } from "./icons";
import "./line-cards.css";

/** A card a line brings: a term it has just put in 旅の図鑑 (`# term:`), or a word of the country it has just taught (`# local_word:`). */
export type LineCard = { kind: "term" | "word"; id: string };

/**
 * What the line on screen shows under its window (GameApp): its cards (the terms its action put in 旅の図鑑, then the words
 * it taught: 2026-11-28 user decision), its tabs (`mentions`: the terms met and words learned before that its text names,
 * src/content/mentions.ts; 2026-11-28 user decision: looked up again the moment they come up), and what a press on one
 * does (`onOpen`: the entry opens larger, LineEntryDialog). Empty on every other line.
 */
export type LineCardsCue = { cards: readonly LineCard[]; mentions: readonly LineCard[]; onOpen?: (card: LineCard) => void };
export const LineCardsContext = createContext<LineCardsCue>({ cards: [], mentions: [] });

type CardContent = { mark: string; icon: IconName; name: string; subtitle: string | null; line: string; note: string | null;
  photo: { path: string; alt: string } | null };

/** What a card or a tab shows (null for one the content does not have). */
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

const shownOf = (cards: readonly LineCard[]) => cards.flatMap((card) => {
  const content = cardContent(card);
  return content ? [{ card, content }] : [];
}).slice(0, LINE_CARDS_SHOWN);

/**
 * The line's cards and tabs under the dialogue window (2026-11-28 user decisions). A card (at most two, LINE_CARDS_SHOWN,
 * the terms first) is small, with the line, as a note on its words: a term's photo small beside its name (with its
 * reading or other name), its one line and, where the photo stands in for it, what the photo shows; a word's script, its
 * reading, its meaning and its note. A tab (at most two) is one line: the mark and the name of a term met or a word
 * learned before that the line names again; not while 高速送り runs. A mark tells which (a lens for 旅の図鑑, a book for
 * 旅のことば; their names for readers). Each is a button: a press opens the entry larger (`onOpen`), and the line waits
 * under it; a press elsewhere reads on as before. They go with their line. Put in the window (its last child, `.vn-window`
 * or the battle's `.battle-window`), they hang under it, and the window keeps room for them below (--line-cards-h,
 * line-cards.css). The cards are in a status region, always there, so readers hear them as they come; the tabs are not
 * said (they come on many lines).
 */
export function LineCards() {
  const { cards, mentions, onOpen } = useContext(LineCardsContext);
  const fast = useSceneFastForward();
  const shown = shownOf(cards);
  const tabs = fast ? [] : shownOf(mentions);
  const ref = useRef<HTMLDivElement>(null);
  // Their height, on the window they hang under (its room below them).
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
    <div ref={ref} className="line-cards" data-empty={(!shown.length && !tabs.length) || undefined}>
      <div className="line-cards-new" role="status" data-testid="line-cards">
        {shown.map(({ card, content }) => (
          <button key={`${card.kind}-${card.id}`} type="button" className="line-card" data-kind={card.kind} data-testid="line-card"
            onClick={() => onOpen?.(card)}>
            {content.photo && <img className="line-card-photo" src={`${import.meta.env.BASE_URL}${content.photo.path}`} alt={content.photo.alt}
              decoding="async" />}
            <span className="line-card-words">
              <span className="line-card-head">
                <Icon name={content.icon} />
                <span className="sr-only">{content.mark}：</span>
                <span className="line-card-name">{content.name}</span>
                {content.subtitle && <span className="line-card-subtitle"><span className="sr-only">（</span>{content.subtitle}<span className="sr-only">）</span></span>}
              </span>
              <span className="line-card-line">{content.line}{content.note && <span className="line-card-note">{content.note}</span>}</span>
            </span>
          </button>
        ))}
      </div>
      {tabs.length > 0 && <div className="line-mentions">
        {tabs.map(({ card, content }) => (
          <button key={`${card.kind}-${card.id}`} type="button" className="line-mention" data-kind={card.kind} data-testid="line-mention"
            aria-label={`${content.mark}：${content.name}`} onClick={() => onOpen?.(card)}>
            <Icon name={content.icon} />
            <span className="line-mention-name">{content.name}</span>
            {card.kind === "word" && content.subtitle && <span className="line-card-subtitle">{content.subtitle}</span>}
          </button>
        ))}
      </div>}
    </div>
  );
}
