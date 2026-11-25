import { Parser, jaModel } from "budoux";

// The way a heading's words sit (2026-11-25 user decision, docs/02_TECH_ARCHITECTURE.md「見出しの字の収め方」): a name
// that a writer gives (a place, a term, an item, a chapter) breaks only between its phrases, never inside a word
// (「（内謁の／間）」), and takes the largest size that keeps it to the fewest lines: first one line down to a smaller
// size, then two lines at the full size, as a game's auto-size (Unity's TextMeshPro Auto Size and the like). Pure parts;
// FitText.tsx measures and renders.

const parser = new Parser(jaModel);
const OPENING = "（「『【〈《〔［｛(\[{";
const CLOSING = "）」』】〉》〕］｝)\]}";

/**
 * The phrases of a heading, at whose ends the line may break (BudouX's Japanese model, which runs the same in every
 * browser, where `word-break: auto-phrase` is Chrome's only). Also after 「・」 (between a name's words); never inside
 * brackets (「（内謁の間）」 stays one, as 「…（内謁の／間）」 would read as a broken word). Joined, they are the text.
 */
export function headingPhrases(text: string): string[] {
  if (text.length === 0) return [];
  const pieces = parser.parse(text).flatMap((phrase) => phrase.split(/(?<=・)(?=.)/u));
  const phrases: string[] = [];
  let depth = 0;
  for (const piece of pieces) {
    if (depth > 0 && phrases.length > 0) phrases[phrases.length - 1] += piece;
    else phrases.push(piece);
    for (const char of piece) {
      if (OPENING.includes(char)) depth += 1;
      else if (CLOSING.includes(char) && depth > 0) depth -= 1;
    }
  }
  return phrases;
}

/**
 * The scale (of the heading's own size, 1) its words take: the largest that keeps them to one line, down to `minScale`;
 * failing that, the largest that keeps them to two, and so on to `maxLines`; failing all, the smallest. `linesAt` says
 * how many lines the words take at a scale (fewer, or as many, as the scale falls). The scales tried are whole pixels
 * of `basePx`, so a heading moves by a pixel at a time and is measured a few times only (a binary search).
 */
export function fitScale(basePx: number, linesAt: (scale: number) => number, { minScale, maxLines }: { minScale: number; maxLines: number }): number {
  const smallest = Math.min(basePx, Math.max(1, Math.ceil(basePx * minScale)));
  const scales: number[] = [];
  for (let px = Math.floor(basePx); px >= smallest; px -= 1) scales.push(px / basePx);
  if (scales.length === 0 || scales[0] !== 1) scales.unshift(1);
  const measured = new Map<number, number>();
  const lines = (index: number) => {
    const known = measured.get(index);
    if (known !== undefined) return known;
    const counted = linesAt(scales[index]);
    measured.set(index, counted);
    return counted;
  };
  const last = scales.length - 1;
  for (let allowed = 1; allowed <= maxLines; allowed += 1) {
    if (lines(last) > allowed) continue;
    let low = 0;
    let high = last;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (lines(middle) <= allowed) high = middle;
      else low = middle + 1;
    }
    return scales[low];
  }
  return scales[last];
}

/**
 * How many lines a set of boxes (a range's client rects, one or more per line) lie on: boxes whose tops are within
 * half a line of each other share a line. Empty boxes (a <wbr>) are left out. 0 when nothing is laid out.
 */
export function countLines(boxes: ReadonlyArray<{ top: number; width: number; height: number }>): number {
  const tops = boxes.filter((box) => box.width > 0 && box.height > 0).map((box) => ({ top: box.top, half: box.height / 2 }))
    .sort((a, b) => a.top - b.top);
  let count = 0;
  let lineTop = Number.NEGATIVE_INFINITY;
  for (const { top, half } of tops) {
    if (top - lineTop >= half) {
      count += 1;
      lineTop = top;
    }
  }
  return count;
}
