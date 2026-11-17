import { describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { checkOpeningMovieCredits, movieLicenseAllowed, openingMovieWarnings } from "./opening-movie";

// The opening movie's credits (2026-11-17; manifest openingMovie.credits): the schema of an entry, the licences a movie
// may not take (share-alike, non-commercial, no derivatives) and the note for a movie without credits.
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

describe("the licences an opening movie may take", () => {
  it("allows CC BY, CC0, public domain and other licence names", () => {
    for (const [license, url] of [["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/"], ["CC BY 2.0", "https://creativecommons.org/licenses/by/2.0/"],
      ["CC0 1.0", "https://creativecommons.org/publicdomain/zero/1.0/"], ["Public domain", "https://creativecommons.org/publicdomain/mark/1.0/"],
      ["Standard License", "https://incompetech.com/music/royalty-free/licenses/"]])
      expect(movieLicenseAllowed(license, url), license).toBe(true);
  });

  it("refuses share-alike, non-commercial and no-derivatives licences, by name or by their page", () => {
    for (const [license, url] of [["CC BY-SA 4.0", credit.licenseUrl], ["CC BY-NC 4.0", credit.licenseUrl], ["CC BY-ND 2.0", credit.licenseUrl],
      ["CC BY-NC-SA 3.0", credit.licenseUrl], ["Attribution-ShareAlike 4.0", credit.licenseUrl], ["cc by-sa 3.0", credit.licenseUrl],
      ["NonCommercial", credit.licenseUrl], ["NoDerivatives", credit.licenseUrl],
      ["CC BY 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"], ["CC BY 4.0", "https://creativecommons.org/licenses/by-nc-nd/4.0/"]])
      expect(movieLicenseAllowed(license, url), `${license} ${url}`).toBe(false);
  });

  it("stops the build at a share-alike credit with a Japanese message naming the manifest, the entry and the licence", () => {
    const journey = { id: "ta_trip", openingMovie: movie([credit, { ...credit, useJa: "写真：試験の塔", license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" }]) };
    expect(() => checkOpeningMovieCredits(journey, "content/journeys/ta_trip/manifest.json")).toThrow(
      "オープニングムービーに使えないライセンスです：content/journeys/ta_trip/manifest.json の openingMovie.credits の2番目（写真：試験の塔）は「CC BY-SA 4.0」です。" +
      "ムービーの中の素材は、自作・CC0・パブリックドメイン・CC BY のものだけにします。");
    expect(() => checkOpeningMovieCredits({ id: "ta_trip", openingMovie: movie([{ ...credit, license: "CC BY-NC 4.0" }]) }, "m.json"))
      .toThrow("openingMovie.credits[0] \"CC BY-NC 4.0\"");
    expect(() => checkOpeningMovieCredits({ id: "ta_trip", openingMovie: movie([credit]) }, "m.json")).not.toThrow();
    expect(() => checkOpeningMovieCredits({ id: "ta_trip" }, "m.json")).not.toThrow();
  });
});

describe("the note for an opening movie without credits", () => {
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
});
