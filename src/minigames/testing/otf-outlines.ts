// A small reader of an OpenType font file with PostScript outlines (a CFF table), for a game's tests that must measure
// what a bundled font really draws (the mehndi's decorations: marks.test.ts checks its table of ink bounds against the
// glyphs in the file). It reads a letter's glyph through the cmap (format 4), its advance (hmtx) and the exact bounds of
// its outline (the charstring's lines and curves, with each curve's extremes). Only what a plain, unhinted font uses is
// read (moves, lines, curves, hints skipped); anything else (subroutines, flex, a CID-keyed font) throws, so a font it
// cannot measure fails the test instead of passing unmeasured. Test support only: never in a play.

/** A glyph as measured: its advance and the bounds of its ink, in the font's units (y up from the baseline). */
export interface OtfGlyph {
  advance: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
}
export interface OtfFont {
  unitsPerEm: number;
  /** The glyph the font draws for a character (through its cmap); throws for one it does not map or draws nothing for. */
  glyph(character: string): OtfGlyph;
}

export function readOtf(file: Uint8Array): OtfFont {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  const tables = new Map<string, number>();
  for (let index = 0; index < view.getUint16(4); index += 1) {
    const at = 12 + index * 16;
    tables.set(String.fromCharCode(...file.subarray(at, at + 4)), view.getUint32(at + 8));
  }
  const table = (tag: string) => {
    const offset = tables.get(tag);
    if (offset === undefined) throw new Error(`the font has no ${tag.trim()} table`);
    return offset;
  };
  const unitsPerEm = view.getUint16(table("head") + 18);
  const metrics = view.getUint16(table("hhea") + 34);
  const advance = (glyph: number) => view.getUint16(table("hmtx") + 4 * Math.min(glyph, metrics - 1));

  // cmap: the Unicode subtable in format 4 (segments of the basic plane).
  const cmap = table("cmap");
  let segments = -1;
  for (let index = 0; index < view.getUint16(cmap + 2); index += 1) {
    const sub = cmap + view.getUint32(cmap + 8 + index * 8);
    if (view.getUint16(sub) === 4) segments = sub;
  }
  if (segments < 0) throw new Error("the font's cmap has no format 4 subtable");
  const count = view.getUint16(segments + 6) / 2;
  const glyphOf = (code: number): number => {
    for (let index = 0; index < count; index += 1) {
      const end = view.getUint16(segments + 14 + index * 2);
      if (end < code) continue;
      const start = view.getUint16(segments + 16 + count * 2 + index * 2);
      if (start > code) return 0;
      const delta = view.getUint16(segments + 16 + count * 4 + index * 2);
      const rangeAt = segments + 16 + count * 6 + index * 2;
      const range = view.getUint16(rangeAt);
      if (!range) return (code + delta) & 0xffff;
      const glyph = view.getUint16(rangeAt + range + (code - start) * 2);
      return glyph ? (glyph + delta) & 0xffff : 0;
    }
    return 0;
  };

  // CFF: the header, then four INDEXes (names, top DICTs, strings, global subroutines); the top DICT says where the
  // charstrings are.
  const cff = table("CFF ");
  const indexAt = (start: number): { items: [number, number][]; end: number } => {
    const length = view.getUint16(start);
    if (!length) return { items: [], end: start + 2 };
    const size = file[start + 2];
    const offset = (index: number) => {
      let value = 0;
      for (let byte = 0; byte < size; byte += 1) value = value * 256 + file[start + 3 + index * size + byte];
      return value;
    };
    const base = start + 3 + (length + 1) * size - 1;
    return { items: Array.from({ length }, (_, index) => [base + offset(index), base + offset(index + 1)]), end: base + offset(length) };
  };
  const names = indexAt(cff + file[cff + 2]);
  const tops = indexAt(names.end);
  const strings = indexAt(tops.end);
  const globalSubrs = indexAt(strings.end);
  /** A DICT's operands by operator (two-byte operators as 1200 + the second byte). */
  const dict = ([start, end]: [number, number]) => {
    const entries = new Map<number, number[]>();
    let operands: number[] = [];
    for (let at = start; at < end;) {
      const byte = file[at++];
      if (byte <= 21) {
        entries.set(byte === 12 ? 1200 + file[at++] : byte, operands);
        operands = [];
      } else if (byte === 28) {
        operands.push(view.getInt16(at));
        at += 2;
      } else if (byte === 29) {
        operands.push(view.getInt32(at));
        at += 4;
      } else if (byte === 30) {
        // A real number in nibbles: only skipped (no measure here reads one).
        while ((file[at] & 0xf) !== 0xf && file[at] >> 4 !== 0xf) at += 1;
        at += 1;
        operands.push(Number.NaN);
      } else if (byte <= 246) operands.push(byte - 139);
      else if (byte <= 250) operands.push((byte - 247) * 256 + file[at++] + 108);
      else operands.push(-(byte - 251) * 256 - file[at++] - 108);
    }
    return entries;
  };
  const top = dict(tops.items[0]);
  if (top.has(1230)) throw new Error("a CID-keyed font is not read");
  if (globalSubrs.items.length) throw new Error("a font with subroutines is not read");
  const charStrings = indexAt(cff + top.get(17)![0]).items;

  /** The exact bounds of a glyph's outline (Type 2 charstring: moves, lines, curves; hints skipped). */
  const bounds = ([start, end]: [number, number]): Omit<OtfGlyph, "advance"> => {
    const box = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
    const add = (x: number, y: number) => {
      box.left = Math.min(box.left, x);
      box.right = Math.max(box.right, x);
      box.bottom = Math.min(box.bottom, y);
      box.top = Math.max(box.top, y);
    };
    /** A cubic curve's extremes along one axis: where its derivative is 0 between its ends. */
    const extremes = (p0: number, p1: number, p2: number, p3: number): number[] => {
      const a = -p0 + 3 * p1 - 3 * p2 + p3;
      const b = 2 * (p0 - 2 * p1 + p2);
      const c = p1 - p0;
      const roots = Math.abs(a) < 1e-12 ? (Math.abs(b) < 1e-12 ? [] : [-c / b])
        : b * b - 4 * a * c < 0 ? [] : [(-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a), (-b - Math.sqrt(b * b - 4 * a * c)) / (2 * a)];
      return roots.filter((t) => t > 0 && t < 1).map((t) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3);
    };
    let x = 0;
    let y = 0;
    let stack: number[] = [];
    let widthRead = false;
    let stems = 0;
    /** The first operator that empties the stack may carry the glyph's width before its own operands. */
    const operands = (most: number | "even") => {
      if (!widthRead && (most === "even" ? stack.length % 2 === 1 : stack.length > most)) stack.shift();
      widthRead = true;
    };
    const move = (dx: number, dy: number) => {
      x += dx;
      y += dy;
    };
    for (let at = start; at < end;) {
      const byte = file[at++];
      if (byte === 28) {
        stack.push(view.getInt16(at));
        at += 2;
      } else if (byte === 255) {
        stack.push(view.getInt32(at) / 65536);
        at += 4;
      } else if (byte >= 32) {
        stack.push(byte <= 246 ? byte - 139 : byte <= 250 ? (byte - 247) * 256 + file[at++] + 108 : -(byte - 251) * 256 - file[at++] - 108);
      } else {
        if (byte === 1 || byte === 3 || byte === 18 || byte === 23 || byte === 19 || byte === 20) {
          // Hints: counted (a hint mask is as many bits as there are stems), not drawn.
          operands("even");
          stems += stack.length >> 1;
          if (byte === 19 || byte === 20) at += (stems + 7) >> 3;
        } else if (byte === 21) {
          operands(2);
          move(stack[0], stack[1]);
        } else if (byte === 22) {
          operands(1);
          move(stack[0], 0);
        } else if (byte === 4) {
          operands(1);
          move(0, stack[0]);
        } else if (byte === 5) {
          add(x, y);
          for (let index = 0; index + 1 < stack.length; index += 2) {
            move(stack[index], stack[index + 1]);
            add(x, y);
          }
        } else if (byte === 8) {
          for (let index = 0; index + 5 < stack.length; index += 6) {
            const [x0, y0] = [x, y];
            const [x1, y1] = [x0 + stack[index], y0 + stack[index + 1]];
            const [x2, y2] = [x1 + stack[index + 2], y1 + stack[index + 3]];
            x = x2 + stack[index + 4];
            y = y2 + stack[index + 5];
            add(x0, y0);
            add(x, y);
            for (const value of extremes(x0, x1, x2, x)) add(value, y0);
            for (const value of extremes(y0, y1, y2, y)) add(x0, value);
          }
        } else if (byte === 14) {
          operands(0);
          break;
        } else throw new Error(`a charstring operator this reader does not draw: ${byte}`);
        stack = [];
      }
    }
    return box;
  };

  return {
    unitsPerEm,
    glyph(character) {
      const id = glyphOf(character.codePointAt(0) ?? 0);
      if (!id) throw new Error(`the font maps no glyph to ${JSON.stringify(character)}`);
      const box = bounds(charStrings[id]);
      if (!Number.isFinite(box.left)) throw new Error(`the font draws nothing for ${JSON.stringify(character)}`);
      return { advance: advance(id), ...box };
    },
  };
}
