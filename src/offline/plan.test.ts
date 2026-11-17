import { describe, expect, it } from "vitest";
import { fontFileUrls, fontStylesheetUrl, isFontKey } from "./fonts";
import type { OfflineFile, OfflineList } from "./list";
import {
  AUTO_UPDATE_LIMIT_BYTES, autoRun, bytesOf, classifyList, downloadConcurrency, garbageKeys, journeySizes, keptFiles, missingFiles, partialJourneys,
  referencedKeys, runFiles, storeFacts,
} from "./plan";
import { formatOfflineSize, formatProgress, progressPercent } from "./sizes";
import { completeTarget, fileUrl, listKey, offlineKey, removeJourney, startTarget, stateKey, type OfflineState } from "./state";

// The page's sums for 「オフラインで遊ぶ」 (user decisions 2026-11-17): what a journey costs, what is left to load after
// a run that stopped, what may be removed, and when a newer build's files load by themselves.
const scope = "https://example.github.io/dreamscape/";
const sha = (text: string) => text.padEnd(16, "0").slice(0, 16);
const file = (path: string, bytes: number, version = "a"): OfflineFile => [path, bytes, sha(`${version}${bytes}`)];
const key = ([path, , hash]: OfflineFile) => offlineKey(scope, path, hash);

/** A build: the page and its code (changed with every build), one shared tune, and two journeys' own files. */
function list(build: string, release: number, change: { milanoPhoto?: string } = {}): OfflineList {
  return {
    schemaVersion: 1, build: sha(`b${build}`), release, entry: `assets/index-${build}.js`,
    shared: [file("assets/bgm/shared.mp3", 3_000_000), file(`assets/index-${build}.js`, 500_000, build), file("index.html", 2_000, build)],
    journeys: {
      milano: [file("assets/milano/duomo.webp", 4_000_000, change.milanoPhoto ?? "a"), file("assets/milano/voice.mp3", 1_000_000)],
      golden_triangle: [file("assets/gt/movie.mp4", 60_000_000), file("assets/gt/taj.webp", 40_000_000)],
    },
  };
}
const keysOf = (...files: OfflineFile[]) => new Set(files.map(key));
const pageOf = (build: string) => fileUrl(scope, `assets/index-${build}.js`);
const lists = (...all: OfflineList[]) => new Map(all.map((one) => [one.build, one]));

describe("what a journey needs and what is left to load", () => {
  const c = list("c", 5);

  it("keeps the shared files once, then each kept journey's own", () => {
    expect(keptFiles(c, ["milano"]).map(([path]) => path)).toEqual(
      ["assets/bgm/shared.mp3", "assets/index-c.js", "index.html", "assets/milano/duomo.webp", "assets/milano/voice.mp3"]);
    expect(bytesOf(keptFiles(c, ["milano"]))).toBe(8_502_000);
    expect(bytesOf(keptFiles(c, ["milano", "golden_triangle"]))).toBe(108_502_000);
    // A journey the list has not (it left the site) adds nothing.
    expect(keptFiles(c, ["tokyo"])).toEqual(c.shared);
  });

  it("loads only what the device lacks after a run that stopped", () => {
    const stored = keysOf(c.shared[0], c.shared[2], c.journeys.milano[1]);
    expect(missingFiles(keptFiles(c, ["milano"]), stored, scope).map(([path]) => path)).toEqual(["assets/index-c.js", "assets/milano/duomo.webp"]);
    expect(missingFiles(keptFiles(c, ["milano"]), keysOf(...keptFiles(c, ["milano"])), scope)).toEqual([]);
  });

  it("counts a second journey as its own files only, once the shared ones are there", () => {
    const sizes = journeySizes(c, keysOf(...keptFiles(c, ["milano"])), scope);
    expect(sizes).toEqual({
      shared: 3_502_000, sharedMissing: 0, held: 0,
      journeys: { milano: { own: 5_000_000, ownMissing: 0 }, golden_triangle: { own: 100_000_000, ownMissing: 100_000_000 } },
    });
    expect(journeySizes(c, new Set(), scope).sharedMissing).toBe(3_502_000);
  });

  it("counts a run toward what it is for: not the files the installed build already holds", () => {
    const d = list("d", 6, { milanoPhoto: "new" });
    const milano = keptFiles(c, ["milano"]);
    const stored = keysOf(...milano);
    const paths = (files: OfflineFile[]) => files.map(([path]) => path);
    // A device's first journey: everything, also what an earlier run of it left on the device.
    expect(runFiles(milano, [], keysOf(c.shared[0]), scope)).toEqual(milano);
    // A journey added to a kept build: its own files.
    expect(paths(runFiles(keptFiles(c, ["milano", "golden_triangle"]), milano, stored, scope))).toEqual(["assets/gt/movie.mp4", "assets/gt/taj.webp"]);
    // …also when part of it is there already (left midway): the whole of what the run is for stays the same.
    expect(paths(runFiles(keptFiles(c, ["milano", "golden_triangle"]), milano, keysOf(...milano, c.journeys.golden_triangle[0]), scope)))
      .toEqual(["assets/gt/movie.mp4", "assets/gt/taj.webp"]);
    // A newer build: the files it changed.
    expect(paths(runFiles(keptFiles(d, ["milano"]), milano, stored, scope))).toEqual(["assets/index-d.js", "index.html", "assets/milano/duomo.webp"]);
    // Files that went missing: those.
    expect(paths(runFiles(milano, milano, keysOf(...milano.slice(1)), scope))).toEqual(["assets/bgm/shared.mp3"]);
    // The sizes the screens get say how much that leaves out: the kept journeys' files the installed build holds.
    const installed = { files: milano, journeys: ["milano"] };
    expect(journeySizes(c, stored, scope, installed).held).toBe(8_502_000);
    expect(journeySizes(d, stored, scope, installed).held).toBe(4_000_000);
    expect(journeySizes(c, keysOf(...milano.slice(1)), scope, installed).held).toBe(5_502_000);
  });

  it("names the journeys whose loading was stopped by the files they left on the device", () => {
    expect(partialJourneys(c, [], keysOf(c.shared[0], c.journeys.golden_triangle[1]), scope)).toEqual(["golden_triangle"]);
    // Shared files alone say nothing of a journey, and an installed journey is not "stopped".
    expect(partialJourneys(c, [], keysOf(...c.shared), scope)).toEqual([]);
    expect(partialJourneys(c, ["golden_triangle"], keysOf(c.journeys.golden_triangle[1]), scope)).toEqual([]);
  });
});

describe("what may be removed from the store", () => {
  const c = list("c", 5);
  const d = list("d", 6, { milanoPhoto: "new" });
  const both = startTarget(null, c, ["milano", "golden_triangle"])!;
  const installed = completeTarget(both);
  const everything = keysOf(...keptFiles(c, ["milano", "golden_triangle"]));
  const stored = new Set([...everything, stateKey(scope), listKey(scope, c.build)]);

  it("keeps the state, the lists of the builds it names and every file they need", () => {
    expect(garbageKeys(stored, referencedKeys(installed, lists(c), [], scope))).toEqual([]);
  });

  it("removes a journey's own files and leaves the shared ones while another journey stays", () => {
    const left = removeJourney(installed, "golden_triangle")!;
    expect(garbageKeys(stored, referencedKeys(left, lists(c), [], scope)).sort()).toEqual(c.journeys.golden_triangle.map(key).sort());
  });

  it("drops what only a target that was replaced needed, and shares the files two builds have in common", () => {
    // Milano is installed of build C; an update to D was begun (its new photo is stored), then the site moved on to E.
    const milano = completeTarget(startTarget(null, c, ["milano"])!);
    const e = list("e", 7, { milanoPhoto: "newer" });
    const toE = startTarget(startTarget(milano, d, [])!, e, [])!;
    const all = new Set([...keysOf(...keptFiles(c, ["milano"]), d.journeys.milano[0], d.shared[1]), stateKey(scope), listKey(scope, c.build), listKey(scope, d.build), listKey(scope, e.build)]);
    expect(garbageKeys(all, referencedKeys(toE, lists(c, d, e), [], scope)).sort())
      .toEqual([key(d.journeys.milano[0]), key(d.shared[1]), listKey(scope, d.build)].sort());
    // The tune and the voice have the same bytes in C, D and E: one key each, kept.
    expect(key(c.shared[0])).toBe(key(e.shared[0]));
  });

  it("keeps the previous build's files until the next switch", () => {
    const onD = completeTarget(startTarget(installed, d, [])!);
    expect(onD.previous).toEqual({ build: c.build, journeys: ["milano", "golden_triangle"] });
    const all = new Set([...stored, ...keysOf(...keptFiles(d, ["milano", "golden_triangle"])), listKey(scope, d.build)]);
    expect(garbageKeys(all, referencedKeys(onD, lists(c, d), [], scope))).toEqual([]);
    // The switch after that names D as previous: C's own files (its page, its code, its photo) can go.
    const e = list("e", 7, { milanoPhoto: "new" });
    const onE = completeTarget(startTarget(onD, e, [])!);
    const more = new Set([...all, ...keysOf(...keptFiles(e, ["milano", "golden_triangle"])), listKey(scope, e.build)]);
    expect(garbageKeys(more, referencedKeys(onE, lists(c, d, e), [], scope)).sort())
      .toEqual([key(c.shared[1]), key(c.shared[2]), key(c.journeys.milano[0]), listKey(scope, c.build)].sort());
  });

  it("never removes the kept fonts with a build", () => {
    const font = "https://fonts.gstatic.com/s/notosansjp/v57/a.0.woff2";
    expect(isFontKey(font)).toBe(true);
    expect(isFontKey("https://fonts.googleapis.com/css2?family=Noto+Sans+JP")).toBe(true);
    expect(isFontKey(key(c.shared[0]))).toBe(false);
    expect(garbageKeys([font, "https://example.com/x"], referencedKeys(installed, lists(c), [font], scope))).toEqual(["https://example.com/x"]);
  });
});

describe("how a list from the site stands to what is kept", () => {
  const c = list("c", 5);
  const milano = completeTarget(startTarget(null, c, ["milano"])!);

  it("lets a first journey load only on the page of the list's own build", () => {
    expect(classifyList(c, null, pageOf("c"), scope)).toBe("first-ok");
    expect(classifyList(c, null, pageOf("b"), scope)).toBe("first-reload");
    // A loading that was stopped has nothing installed either.
    expect(classifyList(c, startTarget(null, c, ["milano"]), pageOf("c"), scope)).toBe("first-ok");
  });

  it("never goes back: a list of a lower release is an old copy", () => {
    expect(classifyList(list("b", 4), milano, pageOf("c"), scope)).toBe("stale");
    expect(classifyList(c, milano, pageOf("c"), scope)).toBe("current");
    expect(classifyList(list("d", 6), milano, pageOf("c"), scope)).toBe("newer");
    // A local build has no release number (0): another build is taken as newer.
    expect(classifyList(list("d", 5), milano, pageOf("c"), scope)).toBe("newer");
  });
});

describe("when a run starts by itself", () => {
  it("loads a newer build's files or missing ones by itself only when small, and never a journey", () => {
    expect(AUTO_UPDATE_LIMIT_BYTES).toBe(30_000_000);
    expect(autoRun("update", 30_000_000, undefined)).toBe(true);
    expect(autoRun("update", 30_000_001, undefined)).toBe(false);
    expect(autoRun("repair", 1, { effectiveType: "4g" })).toBe(true);
    expect(autoRun("first", 1, undefined)).toBe(false);
    expect(autoRun("add", 1, undefined)).toBe(false);
  });

  it("waits for the player while the browser saves data or the link is slow", () => {
    expect(autoRun("update", 1, { saveData: true })).toBe(false);
    for (const effectiveType of ["slow-2g", "2g", "3g"]) expect(autoRun("update", 1, { effectiveType })).toBe(false);
  });

  it("loads two files at once, one on a slow link", () => {
    expect(downloadConcurrency(undefined)).toBe(2);
    expect(downloadConcurrency({ effectiveType: "4g" })).toBe(2);
    expect(downloadConcurrency({ effectiveType: "3g" })).toBe(1);
    expect(downloadConcurrency({ saveData: true })).toBe(1);
  });
});

describe("what the screens are told of the store", () => {
  const c = list("c", 5);
  const d = list("d", 6, { milanoPhoto: "new" });
  const facts = (state: OfflineState | null, stored: Set<string>, latest: OfflineList | null, page = "c", known = lists(c)) =>
    storeFacts({ state, lists: known, latest, storedKeys: stored, scope, pageEntry: pageOf(page) });

  it("knows nothing kept, with the sizes of the site's list", () => {
    expect(facts(null, new Set(), c, "c", new Map())).toEqual({
      installed: [], partial: [], newer: false, pending: 0, switched: false, storedBytes: 0, storedBy: { shared: 0, journeys: {} },
      sizes: { shared: 3_502_000, sharedMissing: 3_502_000, held: 0, journeys: { milano: { own: 5_000_000, ownMissing: 5_000_000 }, golden_triangle: { own: 100_000_000, ownMissing: 100_000_000 } } },
    });
    // Offline with nothing kept: no list, no sizes.
    expect(facts(null, new Set(), null, "c", new Map()).sizes).toBeNull();
  });

  it("names a journey left midway, by the target or by its files", () => {
    const begun = startTarget(null, c, ["milano"])!;
    const stored = keysOf(c.shared[0]);
    expect(facts(begun, stored, c)).toMatchObject({ installed: [], partial: ["milano"], storedBytes: 3_000_000 });
    // Milano installed, the golden triangle begun but in no target (an update ran in between).
    const milano = completeTarget(begun);
    const more = keysOf(...keptFiles(c, ["milano"]), c.journeys.golden_triangle[0]);
    expect(facts(milano, more, c)).toMatchObject({ installed: ["milano"], partial: ["golden_triangle"], pending: 0, newer: false, storedBytes: 68_502_000 });
  });

  it("counts a newer build's changed files, and files that went missing", () => {
    const milano = completeTarget(startTarget(null, c, ["milano"])!);
    const stored = keysOf(...keptFiles(c, ["milano"]));
    // D changed the page, its code and one Milano photo.
    expect(facts(milano, stored, d)).toMatchObject({ newer: true, pending: 4_502_000, switched: false });
    // The same build, but the browser dropped the tune.
    const without = keysOf(...keptFiles(c, ["milano"]).slice(1));
    expect(facts(milano, without, c)).toMatchObject({ newer: false, pending: 3_000_000 });
    // Offline: the kept build's own list.
    expect(facts(milano, stored, null)).toMatchObject({ newer: false, pending: 0, sizes: { sharedMissing: 0 } });
    // An old copy of the list from the network is not used.
    expect(facts(milano, stored, list("b", 4))).toMatchObject({ newer: false, pending: 0 });
  });

  it("says when the installed build is not the page's any more", () => {
    const milano = completeTarget(startTarget(null, c, ["milano"])!);
    const onD = completeTarget(startTarget(milano, d, [])!);
    const stored = keysOf(...keptFiles(c, ["milano"]), ...keptFiles(d, ["milano"]));
    expect(facts(onD, stored, d, "c", lists(c, d))).toMatchObject({ switched: true, newer: false, pending: 0, installed: ["milano"] });
    expect(facts(onD, stored, d, "d", lists(c, d))).toMatchObject({ switched: false });
    // Two builds side by side share the tune and the voice: counted once.
    expect(facts(onD, stored, d, "d", lists(c, d)).storedBytes).toBe(8_502_000 + 4_502_000);
  });

  it("says what the device holds by group, whatever list a run would load: what a removal takes away", () => {
    const milano = completeTarget(startTarget(null, c, ["milano"])!);
    const stored = keysOf(...keptFiles(c, ["milano"]));
    // The site has a newer build, of which the device holds only the unchanged files: the removal still takes all of build c.
    const offered = facts(milano, stored, d);
    expect(offered.storedBy).toEqual({ shared: 3_502_000, journeys: { milano: 5_000_000 } });
    expect(offered.storedBytes).toBe(8_502_000);
    // (The sizes a run would load are the newer list's: 4 MB of the kept files stay as they are.)
    expect(offered.sizes).toMatchObject({ sharedMissing: 502_000, held: 4_000_000, journeys: { milano: { ownMissing: 4_000_000 } } });
    // Two builds side by side, and a second journey left midway: each file once, in its group.
    const onD = completeTarget(startTarget(milano, d, [])!);
    const both = keysOf(...keptFiles(c, ["milano"]), ...keptFiles(d, ["milano"]), d.journeys.golden_triangle[1]);
    expect(facts(onD, both, d, "d", lists(c, d)).storedBy).toEqual({ shared: 3_502_000 + 502_000, journeys: { milano: 5_000_000 + 4_000_000, golden_triangle: 40_000_000 } });
  });
});

describe("sizes on screen", () => {
  it("writes sizes in the megabytes phones show", () => {
    expect(formatOfflineSize(0)).toBe("0.1 MB未満");
    expect(formatOfflineSize(99_999)).toBe("0.1 MB未満");
    expect(formatOfflineSize(100_000)).toBe("約0.1 MB");
    expect(formatOfflineSize(4_540_000)).toBe("約4.5 MB");
    expect(formatOfflineSize(7_300_000)).toBe("約7.3 MB");
    expect(formatOfflineSize(9_960_000)).toBe("約10 MB");
    expect(formatOfflineSize(44_900_000)).toBe("約45 MB");
    expect(formatOfflineSize(170_800_000)).toBe("約171 MB");
    expect(formatOfflineSize(999_600_000)).toBe("約1.0 GB");
    expect(formatOfflineSize(1_234_000_000)).toBe("約1.2 GB");
  });

  it("writes how far a run is in the unit of its whole", () => {
    expect(formatProgress(76_400_000, 170_800_000)).toBe("76 / 171 MB");
    expect(formatProgress(3_240_000, 7_300_000)).toBe("3.2 / 7.3 MB");
    expect(formatProgress(400_000_000, 1_234_000_000)).toBe("0.4 / 1.2 GB");
    expect(formatProgress(0, 44_900_000)).toBe("0 / 45 MB");
  });

  it("never says 100% before the last file", () => {
    expect(progressPercent(0, 100)).toBe(0);
    expect(progressPercent(45, 100)).toBe(45);
    expect(progressPercent(999, 1000)).toBe(99);
    expect(progressPercent(1000, 1000)).toBe(100);
    expect(progressPercent(0, 0)).toBe(100);
  });
});

describe("the web fonts", () => {
  const rule = (family: string, weight: number, fileName: string) => `@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url(https://fonts.gstatic.com/s/${fileName}.woff2) format('woff2');
  unicode-range: U+25ee8, U+25f23, U+2f9de-2f9df, U+2f9f4;
}
`;

  it("finds each font file of the stylesheet once (the three weights of a family share their files)", () => {
    // The shape of Google Fonts' answer for the page's two families (2026-11-17: 744 rules, 248 files).
    const css = [["Noto Sans JP", "notosansjp/v57/-F62fjtqLzI2JPCgQBnw7HFow2oe2EcP5pp0erwTqsSWs9Jezazjcb4"], ["Noto Serif JP", "notoserifjp/v33/xn7mYHs72GKoTvER4Gn3b5eMXNikYkY0T84"]]
      .flatMap(([family, name]) => [400, 500, 600].flatMap((weight) => Array.from({ length: 124 }, (_, part) => rule(family, weight, `${name}.${part}`)))).join("");
    expect(css.match(/@font-face/gu)).toHaveLength(744);
    const urls = fontFileUrls(css);
    expect(urls).toHaveLength(248);
    expect(urls[0]).toBe("https://fonts.gstatic.com/s/notosansjp/v57/-F62fjtqLzI2JPCgQBnw7HFow2oe2EcP5pp0erwTqsSWs9Jezazjcb4.0.woff2");
    expect(new Set(urls).size).toBe(248);
  });

  it("reads quoted addresses and leaves other hosts' out", () => {
    expect(fontFileUrls(`src: url("https://fonts.gstatic.com/a.woff2"), url('https://fonts.gstatic.com/b.woff2'), url(https://example.com/c.woff2), url(data:font/woff2;base64,AA==);`))
      .toEqual(["https://fonts.gstatic.com/a.woff2", "https://fonts.gstatic.com/b.woff2"]);
    expect(fontFileUrls("")).toEqual([]);
  });

  it("takes the stylesheet's address from the page's own link", () => {
    const asked: string[] = [];
    const page = { querySelector: (selector: string) => { asked.push(selector); return { href: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP" }; } };
    expect(fontStylesheetUrl(page as unknown as Document)).toBe("https://fonts.googleapis.com/css2?family=Noto+Sans+JP");
    expect(asked).toEqual(['link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]']);
    expect(fontStylesheetUrl({ querySelector: () => null } as unknown as Document)).toBeNull();
  });
});
