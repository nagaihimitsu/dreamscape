import { TERM_LINE_ADVISED, TERM_LINE_MAX, textLength, type GlossaryTerm, type ListedTerm } from "../src/content/glossary";
import type { ContentWarning } from "./content-report";
import { displayPath, type ContentSources } from "./content-sources";
import { layerOfFile } from "./image-rights";
import { taggedLines } from "./line-tag-text";

// content:build's 旅の図鑑 (2026-11-13 user decision; src/content/glossary.ts): the terms of every journey's
// glossary/terms.json with their journeys, and the `# term:` tags of the journeys' stories, read statically from the Ink
// source (line-tag-text.ts: a line in a branch no walk takes counts too). It stops what would break the card or the
// save (a term the tag names that is not there or is another journey's, a picture that is not registered, a line too long
// for the card, an ID twice) and warns about the rest. A term's picture of another journey is content-ownership.ts's.
// Light module (no content loading): unit tests use it directly. Japanese first, English after.

const CATALOG = "glossary/terms.json";

/**
 * Every term of the loaded catalogs, with the journey whose folder lists it (in the order of the merged catalog).
 * Throws one error listing every problem: an ID twice (in one journey or two: a tag names one term of the whole
 * build), a line over TERM_LINE_MAX characters, and a picture (`imageId`) that tourism/catalog.json `assets` does not have.
 */
export function glossaryTermsOf(sources: Pick<ContentSources, "root" | "layers" | "catalogs">, terms: readonly GlossaryTerm[],
  assetIds: ReadonlySet<string>): ListedTerm[] {
  const files = sources.catalogs[CATALOG]?.provenance.items.terms ?? [];
  const show = (index: number) => (files[index] ? displayPath(sources.root, files[index]) : CATALOG);
  const errors: string[] = [];
  const firstOf = new Map<string, number>();
  const listed: ListedTerm[] = [];
  terms.forEach((term, index) => {
    const where = `${show(index)} の "${term.id}"`;
    const first = firstOf.get(term.id);
    if (first !== undefined) {
      errors.push(`同じIDの言葉が2つあります：${show(first)} と ${show(index)} の "${term.id}"。ID はすべての旅行編で1つだけにします` +
        `（Duplicate term ID: ${term.id}）。`);
      return;
    }
    firstOf.set(term.id, index);
    const length = textLength(term.lineJa);
    if (length > TERM_LINE_MAX)
      errors.push(`言葉の説明が長すぎます：${where} の lineJa が${length}字です。小窓に収まるよう${TERM_LINE_MAX}字まで（目安は${TERM_LINE_ADVISED}字）にしてください` +
        `（Term line over ${TERM_LINE_MAX} characters: ${term.id}, ${length}）。`);
    if (!assetIds.has(term.imageId))
      errors.push(`言葉の写真が登録されていません：${where} の imageId "${term.imageId}" が tourism/catalog.json の assets にありません。` +
        "写真は出典つきで、自作の絵も出典（自作の旨）を書いて、同じ旅行編の tourism/catalog.json の assets に登録してください" +
        `（Unregistered term image: ${term.imageId} is not an asset of tourism/catalog.json）。`);
    listed.push({ ...term, journeyId: files[index] ? layerOfFile(sources.layers, files[index]).id : "core" });
  });
  if (errors.length) throw new Error(errors.join("\n"));
  return listed;
}

/**
 * The `# term:` tags of an Ink source with the lines they belong to (taggedLines). A tag inside a choice's brackets
 * (`* [Spicy? # term: x]`) ends at the bracket, as Ink reads it.
 */
export const termTagsOf = (source: string) =>
  taggedLines(source, ["term"]).map((tag) => ({ ...tag, value: tag.value.replace(/\].*$/u, "").trim() }));

/**
 * Throws at the first `# term:` of a story of the journey `journeyId` that names no term of that journey: an empty tag,
 * an ID that no journey's glossary/terms.json has (`termJourneys`: term ID → its journey), or another journey's term (a
 * journey folder must stay removable on its own).
 */
export function checkTermTags(source: string, journeyId: string, termJourneys: ReadonlyMap<string, string>): void {
  for (const { value, line, knot } of termTagsOf(source)) {
    const where = `${knot ? `knot ${knot} の` : ""}${line}行目の # term:${value ? ` ${value}` : ""}`;
    if (!value)
      throw new Error(`言葉の ID がありません：${where}。# term: <言葉のID>（glossary/terms.json の terms）と書いてください（# term: without an ID）。`);
    const owner = termJourneys.get(value);
    if (owner === undefined)
      throw new Error(`旅の図鑑の言葉がありません：${where} の言葉が、この旅行編の glossary/terms.json にありません。先に terms に書いてください` +
        `（Unknown term in # term: ${value}）。`);
    if (owner !== journeyId)
      throw new Error(`ほかの旅行編の言葉です：${where} は、旅行編 ${owner} の言葉です。この旅行編の glossary/terms.json に書いた言葉を使ってください` +
        `（Term of another journey in # term: ${value} is a term of ${owner}）。`);
  }
}

/**
 * The notes that do not stop the build (kind "glossary"): a term's line over TERM_LINE_ADVISED characters, a term no
 * `# term:` of its journey's stories names (it can never be met), the same term tagged twice in one scene (a knot, or a
 * file without knots: fine when each branch has its own), and a tag on a choice (it shows with the line after the choice).
 */
export function glossaryWarnings(sources: Pick<ContentSources, "root" | "storyFiles">, terms: readonly ListedTerm[]): ContentWarning[] {
  const notes: string[] = [];
  const tagged = new Set<string>();
  for (const story of sources.storyFiles) {
    const file = displayPath(sources.root, story.file);
    const inScene = new Set<string>();
    for (const { value, line, knot, choice } of termTagsOf(story.source)) {
      if (!value) continue;
      tagged.add(`${story.layer}\u0000${value}`);
      const where = `${file} の${knot ? `knot ${knot} の` : ""}${line}行目の # term: ${value}`;
      const scene = `${knot ?? ""}\u0000${value}`;
      if (inScene.has(scene))
        notes.push(`同じ場面に同じ言葉の札がもう1つあります：${where}。言葉の小窓は最初の1回しか出ません。分かれ道のそれぞれに置いたのなら、そのままで構いません` +
          `（Term tagged twice in one scene: ${value}）。`);
      inScene.add(scene);
      if (choice)
        notes.push(`選択肢に言葉の札があります：${where}。選択肢の文には置かず、その言葉が出る台詞か地の文の行の前に置いてください（選んだ後の行で小窓が出ます）` +
          `（# term: on a choice: ${value}）。`);
    }
  }
  for (const term of terms) {
    const length = textLength(term.lineJa);
    if (length > TERM_LINE_ADVISED)
      notes.push(`言葉の説明が${TERM_LINE_ADVISED}字を超えています：旅行編 ${term.journeyId} の "${term.id}" の lineJa（${length}字）。小窓では短いほど読みやすくなります` +
        `（Term line over ${TERM_LINE_ADVISED} characters: ${term.id}, ${length}）。`);
    if (!tagged.has(`${term.journeyId}\u0000${term.id}`))
      notes.push(`どの行にも札のない言葉です：旅行編 ${term.journeyId} の "${term.id}"。# term: ${term.id} を、その言葉が初めて出る行の前に置いてください` +
        `（Term without a # term: tag: ${term.id}）。`);
  }
  return notes.map((message) => ({ kind: "glossary", message }));
}
