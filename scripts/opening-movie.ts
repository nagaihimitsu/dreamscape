import type { Journey } from "../src/content/journey-catalog";
import type { ContentWarning } from "./content-report";

// content:build's notes on opening movie credits (2026-11-17; a manifest's openingMovie.credits,
// src/content/journey-catalog.ts): the works inside a journey's opening movie (photos, music), shown in 「出典・権利の一覧」
// (src/content/credits.ts movieCredits). A movie is one picture made from them, changed and shipped with the game, so it
// should take works made for Dreamscape (they need no credit), CC0, public domain or CC BY. A credit under any other
// licence (share-alike, non-commercial, no derivatives, GFDL, all rights reserved…) gets a note, and so does a movie
// without credits. Notes only: a licence breaks neither the game nor a save, so the build goes on (AGENTS.md 第一原則).
// That the movie file is there is checked with the other served files (content-validation.ts). Pure checks of the parsed
// journeys (no file is read). Light module (no content loading).

type MovieJourney = Pick<Journey, "id" | "openingMovie">;

/** The licences a movie takes: CC BY (any version), CC0 and public domain. */
type MovieLicense = "CC BY" | "CC0" | "public domain";

/** A licence name with SA, NC or ND (「CC BY-SA 4.0」, 「CC BY-NC-ND 3.0」, 「Attribution-ShareAlike」, 「表示-継承 4.0 国際」). */
const REFUSED_NAME = /(?:^|[^a-z])(?:sa|nc|nd)(?:[^a-z]|$)|share[-\s]?alike|non[-\s]?commercial|no[-\s]?deriv|継承|非営利|改変禁止/iu;
/** A Creative Commons licence page with SA, NC or ND (`https://creativecommons.org/licenses/by-sa/4.0/`). */
const REFUSED_PAGE = /\/licenses\/by-(?:sa|nc|nd)\b/iu;

/** What a licence page is, when it is one a movie takes: a CC BY licence, CC0, the public domain mark or a Commons PD tag. */
function pageLicense(licenseUrl: string): MovieLicense | null {
  if (/^https:\/\/creativecommons\.org\/licenses\/by\/\d/iu.test(licenseUrl)) return "CC BY";
  if (/^https:\/\/creativecommons\.org\/publicdomain\/zero\//iu.test(licenseUrl)) return "CC0";
  if (/^https:\/\/(?:creativecommons\.org\/publicdomain\/mark\/|commons\.wikimedia\.org\/wiki\/Template:PD-)/iu.test(licenseUrl)) return "public domain";
  return null;
}

/** What a licence name is, when it names one a movie takes (「CC BY 4.0」, 「Attribution 4.0」, 「CC0 1.0」, 「パブリックドメイン」). */
function nameLicense(license: string): MovieLicense | null {
  if (/(?:^|[^a-z])cc0(?:[^a-z0-9]|$)|cc[-\s]?zero/iu.test(license)) return "CC0";
  if (/public[-\s]?domain|パブリック・?ドメイン|^PD(?:[^a-z]|$)/iu.test(license)) return "public domain";
  if (/(?:^|[^a-z])cc[-\s]?by(?:[^a-z]|$)|(?:^|[^a-z])attribution(?:[^a-z]|$)|^表示/iu.test(license)) return "CC BY";
  return null;
}

/**
 * Why a movie should not take a work under this licence (its name and its page), in Japanese, or null when it may:
 * CC BY, CC0 or public domain, its name and its page saying the same.
 */
export function movieLicenseProblem(license: string, licenseUrl: string): string | null {
  const name = nameLicense(license);
  if (REFUSED_PAGE.test(licenseUrl))
    return `ライセンスのページ（${licenseUrl}）が SA・NC・ND のものです` +
      (REFUSED_NAME.test(license) ? "" : `。名前の「${license}」とも食い違っています`);
  if (REFUSED_NAME.test(license)) return `ライセンスの名前「${license}」が SA・NC・ND のものです`;
  const page = pageLicense(licenseUrl);
  if (!page) return `ライセンスのページ（${licenseUrl}）が CC0・パブリックドメイン・CC BY のものではありません`;
  if (name !== page) return `ライセンスの名前「${license}」とページ（${licenseUrl}）が食い違っています`;
  return null;
}

/**
 * A note for each opening movie without credits (「出典・権利の一覧」 then lists nothing of what is in it; fine for a movie
 * made only of Dreamscape's own pictures and sounds), and for each credit whose licence is not CC BY, CC0 or public domain
 * (movieLicenseProblem). The build goes on. `manifestFile` gives each journey's manifest as messages show it. Japanese
 * first, English after.
 */
export function openingMovieWarnings(journeys: readonly MovieJourney[], manifestFile: (journeyId: string) => string): ContentWarning[] {
  return journeys.flatMap((journey): ContentWarning[] => {
    const movie = journey.openingMovie;
    if (!movie) return [];
    if (!movie.credits) return [{
      kind: "opening-movie",
      message: `オープニングムービーの出典がありません：${manifestFile(journey.id)} の openingMovie に credits がないので、` +
        `「出典・権利の一覧」にムービーの中の写真・音楽が出ません。使った素材を credits に書いてください（すべて自作なら、このままでかまいません）` +
        `（Opening movie without credits: ${journey.id} openingMovie has no credits）。`,
    }];
    return movie.credits.flatMap((credit, index): ContentWarning[] => {
      const problem = movieLicenseProblem(credit.license, credit.licenseUrl);
      return problem ? [{
        kind: "opening-movie",
        message: `オープニングムービーの素材のライセンスを確かめてください：${manifestFile(journey.id)} の openingMovie.credits の` +
          `${index + 1}番目（${credit.useJa}）。${problem}。ムービーは素材を変えて1つの絵にし、ゲームと一緒に配ります。` +
          `そのため素材は、自作・CC0・パブリックドメイン・CC BY のものを使います。` +
          `SA は変えた作品を同じライセンスで配る決まり、NC は営利で使えない決まり、ND は変えてはいけない決まりです。` +
          `使えるか確かめ、使えなければ素材を替えてください（Opening movie credit outside CC BY, CC0 and public domain: ` +
          `${journey.id} openingMovie.credits[${index}] "${credit.license}" ${credit.licenseUrl}）。`,
      }] : [];
    });
  });
}
