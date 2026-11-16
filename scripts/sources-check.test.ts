import { describe, expect, it } from "vitest";
import {
  checkPageTitles, compareTitles, decodePage, formatSourcesReport, groupsOfJourney, normalizeTitle, pageTitleOf, registeredSources,
  titlesWithSeveralUrls, urlsWithSeveralTitles, type Fetcher, type SourceFile,
} from "./sources-check";

const quiz: SourceFile = {
  file: "content/journeys/alpha/quizzes/alpha_quiz.json", journey: "alpha",
  text: JSON.stringify({ id: "alpha_quiz", questions: [{ id: "alpha_q1", sources: [
    { publisher: "City", title: "Old Gate", url: "https://city.example/gate" },
    { publisher: "City", title: "Old Gate — history", url: "https://city.example/gate" },
  ] }] }, null, 2),
};
const travel: SourceFile = {
  file: "content/journeys/beta/travel/beta.json", journey: "beta",
  text: JSON.stringify({ places: [{ id: "beta_gate", sources: [
    { publisher: "Museum", title: "Old Gate", url: "https://museum.example/gate" },
    { publisher: "Dreamscape ゲーム編集", title: "門 ゲーム用代表点", url: "https://city.example/gate" },
  ] }], routes: [{ sources: [{ publisher: "Map", title: "Walking", url: "https://map.example" }] }] }, null, 2),
};
const credits: SourceFile = {
  file: "content/presentation/music.json",
  text: JSON.stringify({ sources: [{ id: "track", titleJa: "Morning", url: "https://music.example/morning" }],
    assets: [{ id: "photo", titleJa: "写真の題", sourceUrl: "https://commons.example/photo" }] }, null, 2),
};

describe("registeredSources", () => {
  it("collects every object with a url (title, else titleJa) or an image credit's sourceUrl (no title), with its line and nearest id", () => {
    const sources = registeredSources([quiz, travel, credits]);
    expect(sources.map((source) => [source.url, source.title, source.id])).toEqual([
      ["https://city.example/gate", "Old Gate", "alpha_q1"],
      ["https://city.example/gate", "Old Gate — history", "alpha_q1"],
      ["https://museum.example/gate", "Old Gate", "beta_gate"],
      ["https://city.example/gate", "門 ゲーム用代表点", "beta_gate"],
      ["https://map.example", "Walking", undefined],
      ["https://music.example/morning", "Morning", "track"],
      ["https://commons.example/photo", undefined, "photo"],
    ]);
    expect(sources[0]).toMatchObject({ file: quiz.file, journey: "alpha", path: "questions[0].sources[0]", line: 7 });
    expect(sources[5].journey).toBeUndefined();
  });

  it("names the file that is not JSON", () => {
    expect(() => registeredSources([{ file: "content/x.json", text: "{" }])).toThrow("content/x.json を JSON として読めません");
  });
});

describe("the offline notes", () => {
  const sources = registeredSources([quiz, travel, credits]);

  it("finds a URL with more than one title, leaving out the game's own records (a publisher naming Dreamscape)", () => {
    const groups = urlsWithSeveralTitles(sources);
    expect(groups.map((group) => [group.key, group.values.map((item) => item.value)])).toEqual([
      ["https://city.example/gate", ["Old Gate", "Old Gate — history"]],
    ]);
  });

  it("finds a title used for more than one URL, and keeps to the groups of a journey when asked", () => {
    const groups = titlesWithSeveralUrls(sources);
    expect(groups.map((group) => [group.key, group.values.map((item) => item.value)])).toEqual([
      ["Old Gate", ["https://city.example/gate", "https://museum.example/gate"]],
    ]);
    expect(groupsOfJourney(groups, "beta")).toHaveLength(1);
    expect(groupsOfJourney(urlsWithSeveralTitles(sources), "beta")).toHaveLength(0);
  });

  it("prints the counts, then each group with its files and lines (no fetch: says how to compare with the pages)", () => {
    const lines = formatSourcesReport({ sources, urlTitles: urlsWithSeveralTitles(sources), titleUrls: titlesWithSeveralUrls(sources) });
    expect(lines[0]).toBe("出典の点検（sources:check）：content/ の出典 7件（URL 5個）。データは変えません。");
    expect(lines).toContain("- 同じ URL に、違う題が2つ以上：1件");
    expect(lines).toContain("（ページの題とは比べていません。比べるときは -- --fetch を付けます。）");
    expect(lines).toContain("    content/journeys/alpha/quizzes/alpha_quiz.json:7 questions[0].sources[0]（alpha_q1）");
  });
});

describe("the page titles", () => {
  it("reads a page's first <title>, decoding entities and spaces", () => {
    expect(pageTitleOf("<html><head><title>\n\tTickets &amp; Fees &#8211; Agra\n</title></head>")).toBe("Tickets & Fees – Agra");
    expect(pageTitleOf("<html><body>no title</body>")).toBeUndefined();
  });

  it("decodes a page in the character set its header or <meta> names", () => {
    const latin = Uint8Array.from([0x3c, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x3e, 0x43, 0x61, 0x66, 0xe9, 0x3c, 0x2f, 0x74, 0x69, 0x74, 0x6c, 0x65, 0x3e]);
    expect(pageTitleOf(decodePage(latin, "text/html; charset=ISO-8859-1"))).toBe("Café");
    expect(pageTitleOf(decodePage(new TextEncoder().encode("<title>Café</title>"), "text/html"))).toBe("Café");
  });

  it("compares after normalising: spaces, case, dashes, a site name before or after, a note in full-width brackets", () => {
    expect(normalizeTitle("  Agra  Metro（2026-10-28編集の版）")).toBe("agra metro");
    expect(compareTitles("Agra Metro（2026-10-28編集の版）", "Agra Metro - Wikipedia")).toBe("same");
    expect(compareTitles("Getting Around | Asia for Visitors", "Getting Around | Asia for Visitors")).toBe("same");
    expect(compareTitles("Bicycle Horn", "OpenGameArt.org | Bicycle Horn")).toBe("same");
    expect(compareTitles("History — 1776", "History - Teatro alla Scala")).toBe("partial");
    expect(compareTitles("Old Gate", "New Bridge | City")).toBe("different");
  });

  it("fetches each URL once and reports a page it cannot read as unverified, not as an error", async () => {
    const asked: string[] = [];
    const fetcher: Fetcher = async (url) => {
      asked.push(url);
      if (url === "https://city.example/gate") return { status: 200, contentType: "text/html", text: "<title>Old Gate | City</title>" };
      if (url === "https://museum.example/gate") return { status: 403, contentType: "text/html", text: "" };
      if (url === "https://map.example") return { status: 200, contentType: "application/pdf" };
      if (url === "https://music.example/morning") throw new Error("offline");
      return { error: "timeout" };
    };
    const checks = await checkPageTitles(registeredSources([quiz, travel, credits]), fetcher, { concurrency: 2 });
    expect(asked.sort()).toEqual(["https://city.example/gate", "https://map.example", "https://museum.example/gate", "https://music.example/morning"]);
    expect(checks.map((check) => [check.title, check.verdict])).toEqual([
      ["Old Gate", "same"], ["Old Gate — history", "partial"], ["Old Gate", "unverified"], ["Walking", "unverified"], ["Morning", "unverified"],
    ]);
    expect(checks[2].reasonJa).toContain("HTTP 403");
    expect(checks[3].reasonJa).toContain("HTML のページではありません");
    expect(checks[4].reasonJa).toContain("offline");
    const lines = formatSourcesReport({ sources: registeredSources([quiz]), urlTitles: [], titleUrls: [], pages: checks });
    expect(lines).toContain("- ページの題と違う：0件、一部だけ同じ：1件、同じ：1件、確かめられなかった：3件");
    expect(lines.some((line) => line.startsWith("■ 確かめられなかった"))).toBe(true);
  });
});
