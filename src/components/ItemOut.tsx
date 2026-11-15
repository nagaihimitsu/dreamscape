import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { DEFAULT_ITEM_ICON } from "../content/code-images";
import { encounters } from "../content/encounters";
import type { ItemOutTag } from "../content/tags";
import type { GameState } from "../domain/game";
import { itemLines } from "../domain/item-lines";
import { playCue } from "../audio/sound-effects";
import { DIALOGUE_WINDOW_ATTRIBUTE } from "./DialogueText";
import { DOUBLE_TAP_WINDOW_MS } from "./double-tap";
import { bagBox, CardFlight } from "./ItemShow";
import { isVectorIcon, itemFlight, type Box } from "./item-show";
import { itemOutAnnouncement, itemOutFit, itemOutStep, itemOutText, type ItemOutText } from "./item-out";
import "./item-out.css";

// A line's `# item_out: <item ID> [<n>]` (2026-11-15 user decision, 「品物を取り出す」): the item, taken out of the bag, on
// a quiet card with what is written on it, in the scene's free area between the header and the dialogue window, while
// the line is on screen (ItemOutLayer, in the five story screens); as the line goes, back into the header's bag
// (ItemOutFlight, drawn by JourneyHud). Presentation only, on every reading of the line: the card gives, uses and moves
// nothing, takes no focus and no presses but the scroll of a long list, and is aria-hidden (a status region says it).

/** A line's card as the screen shows it: its tag, its item, what is written on it now, and whether the item is held. */
export type ItemOutCard = { tag: ItemOutTag; id: string; name: string; iconPath: string; text: ItemOutText; held: boolean };

/**
 * The card of a frame's `itemOut` in the game `state`: the item's lines as the held items' detail shows them now
 * (itemLines: a conditional line only while it holds), else its description. None for an item the catalog lacks.
 */
export function itemOutCard(state: Readonly<GameState>, tag: ItemOutTag | undefined): ItemOutCard | undefined {
  const item = tag && encounters.items.find((entry) => entry.id === tag.itemId);
  if (!tag || !item) return undefined;
  return { tag, id: item.id, name: item.nameJa, iconPath: item.iconPath ?? DEFAULT_ITEM_ICON, held: state.inventory[item.id] === "held",
    text: itemOutText(itemLines(state, item.linesJa), item.descriptionJa, tag.line) };
}

/**
 * The card on screen, as its flight starts from it: where it is (without its coming-in motion), what it shows, its list's
 * scroll, and whether it waits hidden under the window (it then simply goes).
 */
let shownCard: { itemId: string; box: Box; card: ItemOutCard; scrollTop: number; hidden: boolean } | null = null;

/** The words of the status region a moment after the region is on the page (screen readers then announce them). */
const ANNOUNCE_AFTER_MS = 100;

/**
 * The line's card (`card`, from itemOutCard; none without `# item_out:`) over the portraits and under the window (z-index
 * as `# item_show:`), with its status region, which stays on the page through the scene (empty without a card) so its
 * words are announced: 「（品物名）を取り出した。」 and the highlighted line or the lines as the card comes, the line as the
 * highlight moves (itemOutAnnouncement). The same item on the next line keeps the card where it is (keyed by item).
 */
export function ItemOutLayer({ card, quiet = false }: { card?: ItemOutCard; quiet?: boolean }) {
  const words = useItemOutWords(card);
  return <>
    <p className="sr-only" role="status" data-testid="item-out-words">{words}</p>
    {card && <div className="item-out-layer" aria-hidden="true">
      <ItemOutSheet key={card.id} card={card} quiet={quiet} />
    </div>}
  </>;
}

function useItemOutWords(card: ItemOutCard | undefined): string {
  const [words, setWords] = useState("");
  // The tag whose words the region has (or that had none to say): a card whose words a quick next line cut off is
  // announced whole with that line.
  const said = useRef<ItemOutTag | undefined>(undefined);
  const key = card ? `${card.id} ${card.tag.line ?? ""}` : "";
  useEffect(() => {
    if (!card) {
      said.current = undefined;
      setWords("");
      return;
    }
    const next = itemOutAnnouncement(card.name, card.text, itemOutStep(said.current, card.tag));
    if (!next) {
      said.current = card.tag;
      return;
    }
    const timer = window.setTimeout(() => {
      said.current = card.tag;
      setWords(next);
    }, ANNOUNCE_AFTER_MS);
    return () => window.clearTimeout(timer);
  // Once per card and highlight: its words as they come.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return words;
}

function ItemOutSheet({ card, quiet }: { card: ItemOutCard; quiet: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  // What it shows now (a line of the same item may move the highlight), for a fit or a scroll that remembers it later.
  const latest = useRef(card);
  latest.current = card;
  const remember = useRef(() => {
    const element = ref.current;
    if (element) shownCard = { itemId: latest.current.id, box: boxOf(element), card: latest.current, scrollTop: list.current?.scrollTop ?? 0,
      hidden: element.hasAttribute("data-cramped") };
  }).current;
  // ui_page, soft, once as the card appears: not on a quiet line, nor for a scene a load brought back, nor during 高速送り
  // (playCue). The same card on the next line plays nothing.
  useEffect(() => {
    if (!quiet) playCue("ui_page");
  // Once, as the card appears: the line's quiet is read then.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Its room: down to the window's top (it grows with the window's choices), its list scrolling inside beyond that;
  // where it is, for its flight; and, before its first paint, its way out of the bag when the item is held.
  useLayoutEffect(() => {
    const element = ref.current;
    const layer = element?.parentElement;
    if (!element || !layer) return;
    const scene = layer.parentElement;
    const dialogueWindow = scene?.querySelector(`[${DIALOGUE_WINDOW_ATTRIBUTE}]`);
    const fit = () => {
      const area = layer.getBoundingClientRect();
      // A window the player has hidden (隠す) leaves the card the whole scene.
      const windowBox = dialogueWindow && getComputedStyle(dialogueWindow).visibility !== "hidden" ? dialogueWindow.getBoundingClientRect() : undefined;
      const fitted = itemOutFit(area.top + element.offsetTop, windowBox && windowBox.height > 0 ? windowBox.top : undefined, area.bottom);
      element.style.maxHeight = `${fitted.maxHeight}px`;
      element.toggleAttribute("data-cramped", fitted.hidden);
      markScroll(list.current);
      remember();
    };
    fit();
    const box = boxOf(element);
    const bag = card.held ? bagBox() : undefined;
    const rise = bag && bag.width > 0 && bag.height > 0 ? itemFlight(box, bag) : undefined;
    if (rise) {
      element.style.setProperty("--from-dx", `${rise.dx}px`);
      element.style.setProperty("--from-dy", `${rise.dy}px`);
      element.style.setProperty("--from-scale", String(rise.scale));
    }
    element.dataset.enter = rise ? "bag" : "here";
    window.addEventListener("resize", fit);
    const resized = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    if (dialogueWindow) resized?.observe(dialogueWindow);
    resized?.observe(layer);
    // The window hidden or shown again (the scene's data-dialogue-hidden, DialogueWindowVisibility).
    const hidden = scene && typeof MutationObserver !== "undefined" ? new MutationObserver(fit) : null;
    if (scene) hidden?.observe(scene, { attributes: true, attributeFilter: ["data-dialogue-hidden"] });
    return () => {
      window.removeEventListener("resize", fit);
      resized?.disconnect();
      hidden?.disconnect();
    };
  // Once per card (it is keyed by its item); what it shows is remembered after each render below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // What it shows now (its list may have changed), for its flight.
  useLayoutEffect(() => {
    markScroll(list.current);
    remember();
  });
  // The highlighted line in view of a list that scrolls.
  const highlight = "lines" in card.text ? card.text.highlight : undefined;
  useLayoutEffect(() => {
    const lines = list.current;
    const line = highlight === undefined ? null : lines?.children[highlight - 1];
    if (!lines || !(line instanceof HTMLElement)) return;
    if (line.offsetTop < lines.scrollTop) lines.scrollTop = line.offsetTop;
    else if (line.offsetTop + line.offsetHeight > lines.scrollTop + lines.clientHeight) lines.scrollTop = line.offsetTop + line.offsetHeight - lines.clientHeight;
    markScroll(lines);
    remember();
  }, [highlight, remember]);
  // A tap that stops or ends a scroll of the list does not read on: the list is a near miss (`data-no-advance`,
  // scene-tap.ts) while it scrolls and for the moment of a double tap after.
  const settle = useRef(0);
  useEffect(() => () => window.clearTimeout(settle.current), []);
  function scrolled() {
    const lines = list.current;
    if (!lines) return;
    lines.setAttribute("data-no-advance", "");
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => lines.removeAttribute("data-no-advance"), DOUBLE_TAP_WINDOW_MS);
    markScroll(lines);
    remember();
  }
  return <div className="item-out-card" ref={ref} data-testid="item-out">
    <SheetBody card={card} list={list} onScroll={scrolled} />
  </div>;
}

/**
 * Marks a list longer than its room: it scrolls under the finger, so only then does it take presses (`data-scrolls`), and
 * while lines are above or below its room its top or foot fades (`data-before`, `data-more`; item-out.css).
 */
function markScroll(lines: HTMLElement | null) {
  if (!lines) return;
  lines.toggleAttribute("data-scrolls", lines.scrollHeight > lines.clientHeight + 1);
  lines.toggleAttribute("data-before", lines.scrollTop > 1);
  lines.toggleAttribute("data-more", lines.scrollTop + lines.clientHeight < lines.scrollHeight - 1);
}

/** Where the card is in the window, without its coming-in motion (from its layer's box: the card's transform moves neither). */
function boxOf(element: HTMLElement): Box {
  const area = element.parentElement?.getBoundingClientRect();
  return { left: (area?.left ?? 0) + element.offsetLeft, top: (area?.top ?? 0) + element.offsetTop, width: element.offsetWidth, height: element.offsetHeight };
}

/**
 * The card's paper: the item's picture and name, then what is written on it, numbered as the held items' detail numbers
 * it, the highlighted line in ink on a soft marker band and the others a little quieter; or its description.
 */
function SheetBody({ card, list, onScroll, scrollTop }: {
  card: ItemOutCard; list?: RefObject<HTMLOListElement | null>; onScroll?: () => void; scrollTop?: number;
}) {
  const own = useRef<HTMLOListElement>(null);
  const lines = list ?? own;
  // A copy on its way into the bag shows the list where it was scrolled to.
  useLayoutEffect(() => {
    if (scrollTop === undefined || !lines.current) return;
    lines.current.scrollTop = scrollTop;
    markScroll(lines.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { text } = card;
  return <>
    <div className="item-out-head">
      <span className="item-out-picture">
        <img src={`${import.meta.env.BASE_URL}${card.iconPath}`} alt="" decoding="async" data-vector={isVectorIcon(card.iconPath) || undefined} />
      </span>
      <span className="item-out-name">{card.name}</span>
    </div>
    {"lines" in text
      ? <ol className="item-out-lines" ref={lines} onScroll={onScroll} data-highlight={text.highlight !== undefined || undefined}>
        {text.lines.map((line, index) => <li key={index} data-highlighted={text.highlight === index + 1 || undefined}><span>{line}</span></li>)}
      </ol>
      : <p className="item-out-description">{text.description}</p>}
  </>;
}

/**
 * The card of a line that has just gone (GameApp: useItemShowLeave on the frame's `itemOut`), in the header's own layer:
 * as it was, it goes back into the held items' button (`toBag`: the item is held and the header shows its held items),
 * or else it fades where it was. Under reduced motion it simply goes (item-out.css).
 */
export function ItemOutFlight({ itemId, toBag }: { itemId: string; toBag: boolean }) {
  const shown = shownCard?.itemId === itemId && !shownCard.hidden ? shownCard : null;
  if (!shown) return null;
  return <CardFlight box={shown.box} toBag={toBag} className="item-out-card item-out-leaving">
    <SheetBody card={shown.card} scrollTop={shown.scrollTop} />
  </CardFlight>;
}
