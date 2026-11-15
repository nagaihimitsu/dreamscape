import type { ItemOutTag } from "../content/tags";

// A line's `# item_out: <item ID>` / `# item_out: <item ID> <n>` (2026-11-15 user decision, 「品物を取り出す」): the item,
// taken out of the bag, on a quiet card with what is written on it while the line is on screen (ItemOut.tsx). Pure
// rules, apart from the component. Presentation only: the card never gives, uses or moves the item.

/**
 * What the card shows under the item's name: its lines as the held items' detail shows them now (`lines`, from
 * itemLines: a conditional line only while it holds), the `n`th of them highlighted (`highlight`, from 1; none when the
 * line has no `<n>` or fewer lines show now), or the item's description when no line is written on it or none shows.
 */
export type ItemOutText = { lines: readonly string[]; highlight?: number } | { description: string };

export function itemOutText(lines: readonly string[] | undefined, description: string, line: number | undefined): ItemOutText {
  if (!lines?.length) return { description };
  return line !== undefined && Number.isInteger(line) && line >= 1 && line <= lines.length ? { lines, highlight: line } : { lines };
}

/** The highlighted line's text, if any. */
export const highlightedLine = (text: ItemOutText): string | undefined =>
  "lines" in text && text.highlight !== undefined ? text.lines[text.highlight - 1] : undefined;

/**
 * What a line's `# item_out:` (`now`) does to the card of the line before it (`before`): `enter` a new card (none before,
 * or another item's: that one leaves as this comes), `stay` the same card as it was, `move` the same card with its
 * highlight on another line (it does not come in again), `leave` the card goes, `none` no card either side.
 */
export type ItemOutStep = "none" | "enter" | "stay" | "move" | "leave";

export function itemOutStep(before: ItemOutTag | undefined, now: ItemOutTag | undefined): ItemOutStep {
  if (!now) return before ? "leave" : "none";
  if (!before || before.itemId !== now.itemId) return "enter";
  return before.line === now.line ? "stay" : "move";
}

/** A line read aloud as a sentence of its own: 。 after it unless it ends a sentence already. */
const sentence = (text: string) => (/[。．.！!？?…」』）)]$/u.test(text) ? text : `${text}。`);

/**
 * What screen readers hear (the card itself is aria-hidden), once: as the card comes, 「（品物名）を取り出した。」 and the
 * highlighted line, or else every line shown (or the description); as the highlight moves to another line, that line;
 * nothing while the card stays as it was or goes.
 */
export function itemOutAnnouncement(name: string, text: ItemOutText, step: ItemOutStep): string {
  const highlighted = highlightedLine(text);
  if (step === "move") return highlighted ? sentence(highlighted) : "";
  if (step !== "enter") return "";
  const body = highlighted ?? ("lines" in text ? text.lines.map(sentence).join("") : text.description);
  return `${name}を取り出した。${sentence(body)}`;
}

/** The space kept between the card and the dialogue window under it (CSS px). */
export const ITEM_OUT_GAP_PX = 10;
/** The least room the card shows in (CSS px): its heading, the item's picture and name. */
export const ITEM_OUT_LEAST_PX = 72;

/**
 * How the card fits above the dialogue window: at most from its top (`top`) to the window's top (`windowTop`; none when
 * the scene shows no window, or the player hid it) less ITEM_OUT_GAP_PX, within the scene (`bottom`), its list scrolling
 * inside beyond that (`maxHeight`, CSS px). Where not even its heading fits (the window's choices fill a short screen),
 * it waits `hidden` under the window until it has room again: the next line, or the window hidden (隠す).
 */
export function itemOutFit(top: number, windowTop: number | undefined, bottom: number): { maxHeight: number; hidden: boolean } {
  const end = windowTop === undefined ? bottom : Math.min(windowTop, bottom);
  const room = Math.floor(end - ITEM_OUT_GAP_PX - top);
  return room < ITEM_OUT_LEAST_PX ? { maxHeight: ITEM_OUT_LEAST_PX, hidden: true } : { maxHeight: room, hidden: false };
}
