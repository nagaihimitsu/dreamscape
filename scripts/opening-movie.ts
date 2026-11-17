import type { Journey } from "../src/content/journey-catalog";
import type { ContentWarning } from "./content-report";

// content:build's opening movie credits (2026-11-17; a manifest's openingMovie.credits, src/content/journey-catalog.ts):
// the works inside a journey's opening movie (photos, music), shown in 「出典・権利の一覧」 (src/content/credits.ts
// movieCredits). A movie is one picture made from them, changed and shipped with the game, so it takes only works made
// for Dreamscape, CC0, public domain or CC BY: never a share-alike (SA), non-commercial (NC) or no-derivatives (ND)
// licence. That the movie file is there is checked with the other served files (content-validation.ts). Pure checks of
// the parsed journeys (no file is read). Light module (no content loading).

type MovieJourney = Pick<Journey, "id" | "openingMovie">;

/** A licence name with SA, NC or ND (「CC BY-SA 4.0」, 「CC BY-NC-ND 3.0」, 「Attribution-ShareAlike」). */
const REFUSED_NAME = /(?:^|[^a-z])(?:sa|nc|nd)(?:[^a-z]|$)|share[-\s]?alike|non[-\s]?commercial|no[-\s]?deriv/iu;
/** A Creative Commons licence page with SA, NC or ND (`https://creativecommons.org/licenses/by-sa/4.0/`). */
const REFUSED_PAGE = /\/licenses\/by-(?:sa|nc|nd)\b/iu;

/** Whether a movie may take a work under this licence (its name and its page): not SA, NC or ND. */
export function movieLicenseAllowed(license: string, licenseUrl: string): boolean {
  return !REFUSED_NAME.test(license) && !REFUSED_PAGE.test(licenseUrl);
}

/**
 * Throws at the first credit of a journey's opening movie whose licence is share-alike, non-commercial or
 * no-derivatives. `manifestFile` is the journey's manifest as messages show it. Japanese first, English after.
 */
export function checkOpeningMovieCredits(journey: MovieJourney, manifestFile: string): void {
  (journey.openingMovie?.credits ?? []).forEach((credit, index) => {
    if (movieLicenseAllowed(credit.license, credit.licenseUrl)) return;
    throw new Error(`オープニングムービーに使えないライセンスです：${manifestFile} の openingMovie.credits の${index + 1}番目` +
      `（${credit.useJa}）は「${credit.license}」です。ムービーの中の素材は、自作・CC0・パブリックドメイン・CC BY のものだけにします。` +
      `同じライセンスで配る決まりのあるもの（SA）、営利で使えないもの（NC）、変えてはいけないもの（ND）は使えません。素材を替えてください` +
      `（Opening movie credit under a share-alike, non-commercial or no-derivatives licence: ${journey.id} openingMovie.credits[${index}] "${credit.license}"）。`);
  });
}

/**
 * A note for each opening movie without credits: 「出典・権利の一覧」 then lists nothing of what is in it. Fine for a
 * movie made only of Dreamscape's own pictures and sounds, so the build goes on. `manifestFile` gives each journey's
 * manifest as messages show it.
 */
export function openingMovieWarnings(journeys: readonly MovieJourney[], manifestFile: (journeyId: string) => string): ContentWarning[] {
  return journeys.filter((journey) => journey.openingMovie && !journey.openingMovie.credits).map((journey) => ({
    kind: "opening-movie",
    message: `オープニングムービーの出典がありません：${manifestFile(journey.id)} の openingMovie に credits がないので、` +
      `「出典・権利の一覧」にムービーの中の写真・音楽が出ません。使った素材を credits に書いてください（すべて自作なら、このままでかまいません）` +
      `（Opening movie without credits: ${journey.id} openingMovie has no credits）。`,
  }));
}
