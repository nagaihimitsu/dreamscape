import { describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { movieLicenseProblem, openingMovieWarnings } from "./opening-movie";

// The opening movie's credits (2026-11-17; manifest openingMovie.credits): the schema of an entry, the licences a movie
// takes (CC BY, CC0, public domain) and the notes for any other licence and for a movie without credits.
const credit = {
  useJa: "写真：試験の門", titleJa: "Test gate.jpg", author: "ta", license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/", checkedAt: "2026-11-17",
  url: "https://commons.wikimedia.org/wiki/File:Test_gate.jpg",
};
const movie = (credits?: (typeof credit)[]) => ({ videoPath: "assets/movies/ta_opening.mp4", ...(credits ? { credits } : {}) });

describe("the opening movie's credits in the manifest", () => {
  const catalog = (openingMovie: unknown) => ({
    schemaVersion: 1,
    journeys: [{ id: "ta_trip", nameJa: "ta編", status: "available", cities: [{ id: "ta_city", nameJa: "ta市" }],
      currency: { code: "EUR", symbol: "€", unitJa: "ユーロ", unit: "whole" }, intercityModes: [], transportModes: [], openingMovie }],
  });

  it("takes a movie with or without credits, each credit with its optional credit line and changes", () => {
    expect(journeyCatalogSchema.safeParse(catalog(movie())).success).toBe(true);
    const full = { ...credit, creditJa: "© ta", changesJa: "切り抜き、縮小。" };
    const parsed = journeyCatalogSchema.parse(catalog(movie([credit, full])));
    expect(parsed.journeys[0].openingMovie?.credits).toEqual([credit, full]);
  });

  it("refuses an empty list, a missing field, an unknown field, a page that is not https and a bad date", () => {
    const { licenseUrl: _licenseUrl, ...withoutLicensePage } = credit;
    for (const bad of [[], [withoutLicensePage], [{ ...credit, note: "x" }], [{ ...credit, url: "http://example.com/a" }],
      [{ ...credit, checkedAt: "2026-13-01" }], [{ ...credit, useJa: " " }]])
      expect(journeyCatalogSchema.safeParse(catalog({ videoPath: "assets/movies/ta_opening.mp4", credits: bad })).success, JSON.stringify(bad)).toBe(false);
  });
});

describe("the licences an opening movie takes", () => {
  it("takes CC BY of any version, CC0 and public domain, when the name and the page say the same", () => {
    for (const [license, url] of [["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"], ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"],
      ["CC BY 3.0", "https://creativecommons.org/licenses/by/3.0"], ["CC BY 2.0 fr", "https://creativecommons.org/licenses/by/2.0/fr/deed.en"],
      ["Attribution 4.0 International", "https://creativecommons.org/licenses/by/4.0/"], ["表示 4.0 国際", "https://creativecommons.org/licenses/by/4.0/deed.ja"],
      ["CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"], ["CC0 1.0 Universal Public Domain Dedication", "https://creativecommons.org/publicdomain/zero/1.0/"],
      ["Public domain", "https://creativecommons.org/publicdomain/mark/1.0/"], ["パブリックドメイン", "https://creativecommons.org/publicdomain/mark/1.0/"],
      ["PD-self", "https://commons.wikimedia.org/wiki/Template:PD-self"]])
      expect(movieLicenseProblem(license, url), `${license} ${url}`).toBeNull();
  });

  it("names share-alike, non-commercial and no-derivatives licences, by name or by their page", () => {
    for (const license of ["CC BY-SA 4.0", "CC BY-NC 4.0", "CC BY-ND 2.0", "CC BY-NC-SA 3.0", "Attribution-ShareAlike 4.0", "cc by-sa 3.0",
      "NonCommercial", "NoDerivatives", "表示-継承 4.0 国際", "表示-非営利 4.0", "表示-改変禁止 4.0"])
      expect(movieLicenseProblem(license, credit.licenseUrl), license).toBe(`ライセンスの名前「${license}」が SA・NC・ND のものです`);
    expect(movieLicenseProblem("CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"))
      .toBe("ライセンスのページ（https://creativecommons.org/licenses/by-sa/4.0/）が SA・NC・ND のものです");
    // Only the page is SA or NC-ND: the note names the page and says that the name does not match it.
    expect(movieLicenseProblem("CC BY 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"))
      .toBe("ライセンスのページ（https://creativecommons.org/licenses/by-sa/4.0/）が SA・NC・ND のものです。名前の「CC BY 4.0」とも食い違っています");
    expect(movieLicenseProblem("CC BY 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/")).toContain("SA・NC・ND のもの");
  });

  it("names any other licence, and a name that does not match its page", () => {
    // GFDL (the other licence of the Agra inlay photo), all rights reserved, a paid music licence: not CC BY, CC0 or public domain.
    expect(movieLicenseProblem("GFDL 1.2", "https://www.gnu.org/licenses/old-licenses/fdl-1.2.html"))
      .toBe("ライセンスのページ（https://www.gnu.org/licenses/old-licenses/fdl-1.2.html）が CC0・パブリックドメイン・CC BY のものではありません");
    for (const [license, url] of [["All rights reserved", "https://www.flickr.com/help/general/"], ["GPL 3.0", "https://www.gnu.org/licenses/gpl-3.0.html"],
      ["ODbL 1.0", "https://opendatacommons.org/licenses/odbl/1-0/"], ["Standard License", "https://incompetech.com/music/royalty-free/licenses/"]])
      expect(movieLicenseProblem(license, url), license).toBe(`ライセンスのページ（${url}）が CC0・パブリックドメイン・CC BY のものではありません`);
    for (const [license, url] of [["GFDL 1.2", "https://creativecommons.org/licenses/by/3.0/"], ["All rights reserved", "https://creativecommons.org/licenses/by/4.0/"],
      ["CC0 1.0", "https://creativecommons.org/licenses/by/4.0/"], ["CC BY 4.0", "https://creativecommons.org/publicdomain/zero/1.0/"]])
      expect(movieLicenseProblem(license, url), license).toBe(`ライセンスの名前「${license}」とページ（${url}）が食い違っています`);
  });
});

describe("the notes for an opening movie", () => {
  it("names each journey whose movie lists no credits, and none without a movie or with credits", () => {
    const warnings = openingMovieWarnings([
      { id: "ta_trip", openingMovie: movie() },
      { id: "tb_trip" },
      { id: "tc_trip", openingMovie: movie([credit]) },
    ], (id) => `content/journeys/${id}/manifest.json`);
    expect(warnings).toEqual([{ kind: "opening-movie", message: "オープニングムービーの出典がありません：content/journeys/ta_trip/manifest.json の " +
      "openingMovie に credits がないので、「出典・権利の一覧」にムービーの中の写真・音楽が出ません。使った素材を credits に書いてください" +
      "（すべて自作なら、このままでかまいません）（Opening movie without credits: ta_trip openingMovie has no credits）。" }]);
  });

  it("names each credit whose licence is not CC BY, CC0 or public domain, with the manifest, the entry, the reason and the page", () => {
    const gfdl = { ...credit, useJa: "写真：試験の塔", license: "GFDL 1.2", licenseUrl: "https://www.gnu.org/licenses/old-licenses/fdl-1.2.html" };
    const shareAlikePage = { ...credit, useJa: "写真：試験の橋", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" };
    const warnings = openingMovieWarnings([{ id: "ta_trip", openingMovie: movie([credit, gfdl, shareAlikePage]) }], () => "m.json");
    expect(warnings.map((warning) => warning.kind)).toEqual(["opening-movie", "opening-movie"]);
    expect(warnings[0].message).toBe("オープニングムービーの素材のライセンスを確かめてください：m.json の openingMovie.credits の2番目（写真：試験の塔）。" +
      "ライセンスのページ（https://www.gnu.org/licenses/old-licenses/fdl-1.2.html）が CC0・パブリックドメイン・CC BY のものではありません。" +
      "ムービーは素材を変えて1つの絵にし、ゲームと一緒に配ります。そのため素材は、自作・CC0・パブリックドメイン・CC BY のものを使います。" +
      "SA は変えた作品を同じライセンスで配る決まり、NC は営利で使えない決まり、ND は変えてはいけない決まりです。" +
      "使えるか確かめ、使えなければ素材を替えてください（Opening movie credit outside CC BY, CC0 and public domain: " +
      "ta_trip openingMovie.credits[1] \"GFDL 1.2\" https://www.gnu.org/licenses/old-licenses/fdl-1.2.html）。");
    expect(warnings[1].message).toContain("openingMovie.credits の3番目（写真：試験の橋）。ライセンスのページ（https://creativecommons.org/licenses/by-sa/4.0/）が " +
      "SA・NC・ND のものです。名前の「CC BY 4.0」とも食い違っています。");
    expect(openingMovieWarnings([{ id: "ta_trip", openingMovie: movie([credit, { ...credit, license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/" }]) }], () => "m.json")).toEqual([]);
  });
});
