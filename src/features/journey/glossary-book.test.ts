import { describe, expect, it } from "vitest";
import type { GlossaryCategory, ListedTerm } from "../../content/glossary";
import { glossaryBook, glossaryProgress, glossaryProgressSpoken } from "./glossary-book";

// 「旅の図鑑」's grid (2026-11-13): a journey's terms by group in the categories' order, met or not, with 「NEW」 on the
// ones met since 旅の図鑑 was last opened, and how far it has come.

const term = (id: string, category: GlossaryCategory): ListedTerm =>
  ({ id, nameJa: id, category, lineJa: "説明。", imageId: `${id}_img`, journeyId: "golden_triangle" });
const terms = [term("blackbuck", "creature"), term("golgappa", "food"), term("tonga", "transport"), term("kachori", "food")];

describe("旅の図鑑's book", () => {
  it("groups the terms by category in the categories' order (none for an empty one), each group in the catalog's order", () => {
    const book = glossaryBook(terms, []);
    expect(book.groups.map((group) => [group.titleJa, group.cards.map((card) => card.term.id)])).toEqual([
      ["食べ物", ["golgappa", "kachori"]], ["生き物", ["blackbuck"]], ["乗り物", ["tonga"]],
    ]);
    expect(book.groups.every((group) => group.cards.every((card) => !card.met && !card.isNew))).toBe(true);
    expect(glossaryProgress(book)).toBe("0 / 4");
  });

  it("marks the terms met, 「NEW」 only on a met one since the last opening, and counts them", () => {
    const book = glossaryBook(terms, ["kachori", "blackbuck", "gt_term_gone"], ["kachori", "tonga"]);
    const cards = book.groups.flatMap((group) => group.cards).map((card) => [card.term.id, card.met, card.isNew]);
    expect(cards).toEqual([["golgappa", false, false], ["kachori", true, true], ["blackbuck", true, false], ["tonga", false, false]]);
    expect(book.groups.map((group) => group.met)).toEqual([1, 1, 0]);
    expect(glossaryProgress(book)).toBe("2 / 4");
    expect(glossaryProgressSpoken(book)).toBe("4語のうち2語に出会いました");
  });

  it("is empty for a journey without terms", () => {
    expect(glossaryBook([], [])).toEqual({ groups: [], met: 0, total: 0 });
  });
});
