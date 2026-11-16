import { jsonValueLines, nearestId } from "./json-lines";

// npm run sources:check (2026-11-16, on demand; never part of content:build): the sources registered in the content
// (every object of a content JSON file with a `url`, or an image credit's `sourceUrl`: quiz questions, scenes, landmarks,
// tourism images, tours, travel places and routes, transit ledgers, date facts, local words, music, sounds, ambience,
// the voice credits of a manifest), and two notes about their titles: one URL registered with more than one title, and
// one title used for different URLs. With `--fetch`, each page's <title> is compared with the registered titles after
// normalising (normalizeTitle). It never changes a file. Pure: the caller passes the files' text and, for the fetch, a
// fetcher (sources-check-cli.ts fetches through the environment's network).

/** A content JSON file as read: its path from the repository root, its journey (none for the shared content/ files) and text. */
export type SourceFile = { file: string; journey?: string; text: string };

/** One registered source: where it is, its URL and its title (`title`, else `titleJa` beside a `url`; an image credit has none). */
export type RegisteredSource = {
  file: string;
  journey?: string;
  line: number;
  /** Its JSON path in the file (`places[3].sources[1]`). */
  path: string;
  /** The nearest `id` at or above it (the landmark, question, scene, place …), if any. */
  id?: string;
  url: string;
  title?: string;
  publisher?: string;
};

/**
 * A record of the game's own (a publisher naming Dreamscape: an editorial model, an estimate, the author's notes from
 * the place) cites a page for what it builds on: its title names the record, not the page, so the title checks leave it out.
 */
export const isOwnRecord = (source: Pick<RegisteredSource, "publisher">) => /dreamscape/iu.test(source.publisher ?? "");

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Every registered source of the files, in file order. Throws, naming the file, for a file that is not JSON. */
export function registeredSources(files: readonly SourceFile[]): RegisteredSource[] {
  return files.flatMap((source) => {
    let data: unknown;
    let lines: Map<string, number>;
    try {
      data = JSON.parse(source.text);
      lines = jsonValueLines(source.text);
    } catch (error) {
      throw new Error(`${source.file} を JSON として読めません。`, { cause: error });
    }
    const found: RegisteredSource[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) { value.forEach((item, index) => walk(item, `${path}[${index}]`)); return; }
      if (!isObject(value)) return;
      const url = typeof value.url === "string" ? value.url : typeof value.sourceUrl === "string" ? value.sourceUrl : undefined;
      if (url !== undefined) {
        // Beside a `sourceUrl` (an image's credit, a learning topic's reference) a `titleJa` is the entry's own title, not its source's.
        const title = typeof value.url !== "string" ? undefined : typeof value.title === "string" ? value.title
          : typeof value.titleJa === "string" ? value.titleJa : undefined;
        const id = nearestId(data, path);
        const publisher = typeof value.publisher === "string" ? value.publisher : undefined;
        found.push({ file: source.file, ...(source.journey ? { journey: source.journey } : {}), line: lines.get(path) ?? 1, path, ...(id ? { id } : {}),
          url, ...(title !== undefined ? { title } : {}), ...(publisher !== undefined ? { publisher } : {}) });
      }
      for (const [key, item] of Object.entries(value)) walk(item, path ? `${path}.${key}` : key);
    };
    walk(data, "");
    return found;
  });
}

/** Where a source is, as a message prints it: `file:line path（id）`. */
export const sourcePlace = (source: Pick<RegisteredSource, "file" | "line" | "path" | "id">) =>
  `${source.file}:${source.line} ${source.path}${source.id ? `（${source.id}）` : ""}`;

/** The registrations of one value (a title, a URL) inside a group. */
export type Registrations = { value: string; at: RegisteredSource[] };
/** One URL registered with more than one title, or one title used for more than one URL. */
export type SourceGroup = { key: string; values: Registrations[] };

/** Groups of `key` whose sources have more than one distinct `value` (trimmed), in first-seen order. */
function groupsWithSeveral(sources: readonly RegisteredSource[], key: (source: RegisteredSource) => string, value: (source: RegisteredSource) => string): SourceGroup[] {
  const groups = new Map<string, Map<string, RegisteredSource[]>>();
  for (const source of sources) {
    const values = groups.get(key(source)) ?? new Map<string, RegisteredSource[]>();
    groups.set(key(source), values);
    values.set(value(source), [...(values.get(value(source)) ?? []), source]);
  }
  return [...groups].filter(([, values]) => values.size > 1)
    .map(([name, values]) => ({ key: name, values: [...values].map(([text, at]) => ({ value: text, at })) }));
}

/** The sources whose title is the page's (a title, and not a record of the game's own: isOwnRecord). */
const titled = (sources: readonly RegisteredSource[]) => sources.filter((source) => source.title !== undefined && source.title.trim() !== "" && !isOwnRecord(source));

/** One URL registered with more than one title (titles compared as written, without surrounding spaces). */
export const urlsWithSeveralTitles = (sources: readonly RegisteredSource[]) =>
  groupsWithSeveral(titled(sources), (source) => source.url, (source) => source.title!.trim());

/** One title used for more than one URL (URLs compared as written). */
export const titlesWithSeveralUrls = (sources: readonly RegisteredSource[]) =>
  groupsWithSeveral(titled(sources), (source) => source.title!.trim(), (source) => source.url);

/** The groups with at least one registration in `journey` (all groups without one). */
export const groupsOfJourney = (groups: readonly SourceGroup[], journey: string | undefined) =>
  journey === undefined ? [...groups] : groups.filter((group) => group.values.some((item) => item.at.some((source) => source.journey === journey)));

// ── The page titles (--fetch) ─────────────────────────────────────────────────

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", middot: "·",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", bull: "•", copy: "©", reg: "®", trade: "™",
};

/** HTML character references in a text, decoded (the named ones of ENTITIES and every numeric one). */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? Number.parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isSafeInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name.toLowerCase()] ?? whole;
  });
}

/** The text of a page's first <title> (entities decoded, spaces collapsed), or undefined when it has none. */
export function pageTitleOf(html: string): string | undefined {
  const match = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/iu.exec(html);
  const title = match && decodeEntities(match[1]).replace(/\s+/gu, " ").trim();
  return title || undefined;
}

/** The character set of a page: its Content-Type's, else a <meta> charset near its top, else UTF-8. */
export function pageCharset(contentType: string | undefined, head: string): string {
  const declared = /charset\s*=\s*["']?([\w.:-]+)/iu.exec(contentType ?? "")?.[1] ?? /<meta[^>]+charset\s*=\s*["']?([\w.:-]+)/iu.exec(head)?.[1];
  return (declared ?? "utf-8").toLowerCase();
}

/** A page's bytes as text, in its character set (pageCharset; UTF-8 when the name is unknown). */
export function decodePage(bytes: Uint8Array, contentType: string | undefined): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 4096));
  try {
    return new TextDecoder(pageCharset(contentType, head)).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Separators between a page's own title and its site's name (`Agra Metro - Wikipedia`, `Getting Around | Asia for Visitors`). */
const SITE_SEPARATOR = /\s+[-|·•:»–—]\s+/u;

/**
 * A title for comparing: Unicode-normalised (full-width letters, digits and spaces as half-width), dashes as `-`,
 * curly quotes as straight, a note in full-width brackets at its end left out (`Agra Metro（2026-10-28編集の版）`, the
 * repository's way of noting the version or page of a source), spaces collapsed, lower case.
 */
export function normalizeTitle(title: string): string {
  return title.replace(/[（][^（）]*[）]\s*$/u, "").normalize("NFKC").replace(/[‐‑‒–—―−]/gu, "-").replace(/[‘’‚‛]/gu, "'").replace(/[“”„‟]/gu, "\"")
    .replace(/\s+/gu, " ").trim().toLowerCase();
}

/** A title's parts between site separators, normalised (normalizeTitle). */
const titleParts = (title: string) => normalizeTitle(title).split(SITE_SEPARATOR).filter(Boolean);

/** A page title's readings: whole, without the last part (the site's name after it), without the first (the site's name before it). */
function pageReadings(page: string): string[] {
  const parts = titleParts(page);
  return [...new Set([parts.join(" - "), ...(parts.length > 1 ? [parts.slice(0, -1).join(" - "), parts.slice(1).join(" - ")] : [])].filter(Boolean))];
}

export type TitleVerdict = "same" | "partial" | "different";

/** The shortest reading that `partial` compares (shorter ones, such as 「a」, would be found in nearly any title). */
const PARTIAL_MIN_LENGTH = 4;

/**
 * How a registered title compares with a page's <title> (normalizeTitle, and the page's site name left out, before or
 * after it): the same; one contains the other (`partial`: a section's title, an added word); or different.
 */
export function compareTitles(registered: string, page: string): TitleVerdict {
  const mine = titleParts(registered).join(" - ");
  const readings = pageReadings(page);
  if (readings.includes(mine)) return "same";
  const contains = (longer: string, shorter: string) => shorter.length >= PARTIAL_MIN_LENGTH && longer.includes(shorter);
  return readings.some((reading) => contains(reading, mine) || contains(mine, reading)) ? "partial" : "different";
}

/** What a fetcher returns for a URL: the response (its status, Content-Type and text), or why there is none. */
export type FetchedPage = { status: number; contentType?: string; text?: string } | { error: string };
export type Fetcher = (url: string) => Promise<FetchedPage>;

/** The result for one URL and one of its registered titles. */
export type TitleCheck = {
  url: string;
  title: string;
  at: RegisteredSource[];
  /** The page's <title>, when one was read. */
  page?: string;
  verdict: TitleVerdict | "unverified";
  /** Why the title could not be checked (unverified). */
  reasonJa?: string;
};

/** Why a fetched page gives no title to compare (undefined: it does), in Japanese. */
function unverifiedReason(page: FetchedPage): string | undefined {
  if ("error" in page) return `読み込めませんでした（${page.error}）`;
  if (page.status >= 400) return `サイトが HTTP ${page.status} を返しました（ロボットを断るサイトもあります）`;
  if (!/html/iu.test(page.contentType ?? "")) return `HTML のページではありません（${page.contentType ?? "種類の分からないファイル"}）`;
  if (!pageTitleOf(page.text ?? "")) return "ページに <title> がありません";
  return undefined;
}

/**
 * Fetch each URL that has a registered title once (at most `concurrency` at a time) and compare its <title> with each
 * distinct title registered for it. A page that cannot be read gives `unverified` with the reason, never an error.
 */
export async function checkPageTitles(sources: readonly RegisteredSource[], fetcher: Fetcher, options: { concurrency?: number } = {}): Promise<TitleCheck[]> {
  const byUrl = new Map<string, Map<string, RegisteredSource[]>>();
  for (const source of titled(sources)) {
    const titles = byUrl.get(source.url) ?? new Map<string, RegisteredSource[]>();
    byUrl.set(source.url, titles);
    titles.set(source.title!.trim(), [...(titles.get(source.title!.trim()) ?? []), source]);
  }
  const urls = [...byUrl.keys()];
  const pages = new Map<string, FetchedPage>();
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        pages.set(url, await fetcher(url));
      } catch (error) {
        pages.set(url, { error: error instanceof Error ? error.message : String(error) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency ?? 6, urls.length)) }, worker));
  return urls.flatMap((url) => {
    const page = pages.get(url)!;
    const reason = unverifiedReason(page);
    const pageTitle = reason ? undefined : pageTitleOf((page as { text?: string }).text ?? "");
    return [...byUrl.get(url)!].map(([title, at]): TitleCheck => reason
      ? { url, title, at, verdict: "unverified", reasonJa: reason }
      : { url, title, at, page: pageTitle, verdict: compareTitles(title, pageTitle!) });
  });
}

// ── The report ────────────────────────────────────────────────────────────────

/** What sources:check found, for formatSourcesReport. */
export type SourcesReport = {
  journey?: string;
  sources: readonly RegisteredSource[];
  urlTitles: readonly SourceGroup[];
  titleUrls: readonly SourceGroup[];
  /** The page titles (--fetch), or undefined without it. */
  pages?: readonly TitleCheck[];
};

/** The report in Japanese: the counts, then each note with its files and lines. */
export function formatSourcesReport(report: SourcesReport): string[] {
  const { sources } = report;
  const titledCount = titled(sources).length;
  const own = sources.filter(isOwnRecord).length;
  const urls = new Set(sources.map((source) => source.url)).size;
  const scope = report.journey ? `旅行編 ${report.journey} の` : "content/ の";
  const out = [
    `出典の点検（sources:check）：${scope}出典 ${sources.length}件（URL ${urls}個）。データは変えません。`,
    `  題を比べるもの ${titledCount}件。比べないもの：ゲームの記録（publisher に Dreamscape とある推定・モデル・現地のメモ。題はページの題ではない）${own}件、` +
      `写真の出典など題のないもの ${sources.length - titledCount - own}件。`,
    `- 同じ URL に、違う題が2つ以上：${report.urlTitles.length}件`,
    `- 同じ題が、違う URL に使われている：${report.titleUrls.length}件`,
  ];
  const pages = report.pages;
  if (pages) {
    const count = (verdict: TitleCheck["verdict"]) => pages.filter((item) => item.verdict === verdict).length;
    out.push(`- ページの題と違う：${count("different")}件、一部だけ同じ：${count("partial")}件、同じ：${count("same")}件、確かめられなかった：${count("unverified")}件`);
  } else out.push("（ページの題とは比べていません。比べるときは -- --fetch を付けます。）");
  const listed = (group: SourceGroup, label: (value: string) => string) =>
    group.values.flatMap((item) => [`  ${label(item.value)}`, ...item.at.map((source) => `    ${sourcePlace(source)}`)]);
  if (report.urlTitles.length) {
    out.push("", `■ 同じ URL に、違う題が2つ以上（${report.urlTitles.length}件）。題を1つに決めて、ほかの所もそろえます。`);
    for (const group of report.urlTitles) out.push(group.key, ...listed(group, (title) => `「${title}」`));
  }
  if (report.titleUrls.length) {
    out.push("", `■ 同じ題が、違う URL に使われている（${report.titleUrls.length}件）。別のページならそのままでかまいません。同じページを指すなら、URL を1つにそろえます。`);
    for (const group of report.titleUrls) out.push(`「${group.key}」`, ...listed(group, (url) => url));
  }
  if (pages) {
    const section = (verdict: TitleCheck["verdict"], heading: string) => {
      const items = pages.filter((item) => item.verdict === verdict);
      if (!items.length) return;
      out.push("", `■ ${heading}（${items.length}件）`);
      for (const item of items) out.push(item.url, `  登録の題「${item.title}」${item.page !== undefined ? `　ページの題「${item.page}」` : ""}${item.reasonJa ? `　${item.reasonJa}` : ""}`,
        ...item.at.map((source) => `    ${sourcePlace(source)}`));
    };
    section("different", "ページの題と違う。ページを開いて、題を直すか確かめます");
    section("partial", "ページの題と一部だけ同じ（節の題や、言葉を足した題）。そのままでよいか確かめます");
    section("unverified", "確かめられなかった（エラーではありません。必要ならブラウザで開いて確かめます）");
  }
  return out;
}
