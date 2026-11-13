import { GLOSSARY_CATEGORIES, GLOSSARY_CATEGORY_LABELS_JA, type GlossaryCategory, type ListedTerm } from "../../content/glossary";

// 「旅の図鑑」 (⚙設定, 2026-11-13 user decision; GlossaryDialog): a journey's terms as a grid of cards by group, the ones
// the save has met and the ones it has not, and how far it has come. Pure, so it is tested without a browser.

/** One card of 旅の図鑑: its term, whether the save has met it, and whether it came since 旅の図鑑 was last opened. */
export type GlossaryCard = { term: ListedTerm; met: boolean; isNew: boolean };
/** A group of cards under its heading (食べ物, 生き物…), with how many of them are met. */
export type GlossaryGroup = { category: GlossaryCategory; titleJa: string; cards: GlossaryCard[]; met: number };
/** 旅の図鑑 of a journey: its groups, and how many of its terms are met of how many. */
export type GlossaryBook = { groups: GlossaryGroup[]; met: number; total: number };

/**
 * 旅の図鑑 of a journey's terms (`terms`, in its glossary/terms.json order): one group per category in GLOSSARY_CATEGORIES'
 * order (食べ物, 生き物, もの, 建物, ならわし, 人, 乗り物; a category without a term of the journey left out), each with
 * its terms in the catalog's order, so a card keeps its place whether it is met or not. `met`: the save's 旅の図鑑;
 * `newIds`: the terms met since 旅の図鑑 was last opened (their 「NEW」). A met ID the journey does not have counts for nothing.
 */
export function glossaryBook(terms: readonly ListedTerm[], met: readonly string[], newIds: readonly string[] = []): GlossaryBook {
  const metIds = new Set(met);
  const fresh = new Set(newIds);
  const groups = GLOSSARY_CATEGORIES.flatMap((category): GlossaryGroup[] => {
    const cards = terms.filter((term) => term.category === category)
      .map((term) => ({ term, met: metIds.has(term.id), isNew: metIds.has(term.id) && fresh.has(term.id) }));
    return cards.length ? [{ category, titleJa: GLOSSARY_CATEGORY_LABELS_JA[category], cards, met: cards.filter((card) => card.met).length }] : [];
  });
  return { groups, met: groups.reduce((sum, group) => sum + group.met, 0), total: terms.length };
}

/** How far 旅の図鑑 has come, as its head shows it: 「12 / 30」. */
export const glossaryProgress = (book: Pick<GlossaryBook, "met" | "total">) => `${book.met} / ${book.total}`;
/** The same, as a reader hears it. */
export const glossaryProgressSpoken = (book: Pick<GlossaryBook, "met" | "total">) => `${book.total}語のうち${book.met}語に出会いました`;
