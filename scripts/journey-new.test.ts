import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { journeyCatalogSchema } from "../src/content/journey-catalog";
import { MIRROR_DIRECTORY, journeyDirectory, journeysDirectory } from "./content-layout";
import { buildContent } from "./content-pipeline";
import { idWithPrefix } from "./content-report";
import { listFiles, loadContentSources, readJourneyManifests } from "./content-sources";
import { inspectJourneyReadiness, loadJourneyReadiness } from "./journey-readiness";
import { applyCityBundle, exportEditableCityBundle } from "./city-bundle";
import { loadJourneyScaffold } from "./journey-scaffold";
import { inspectJourneyTransit } from "./journey-transit-review";
import { CHECKLIST_FILE, CHECKLIST_TEMPLATE, checkNewJourneyOptions, createJourney, parseNewJourneyArgs, scaffoldJourney } from "./journey-new";
import { prepareJourneyRelease } from "./promote-journey";
import { readSampleJourney } from "./sample-journey";

// `npm run journey:new` copies the sample journey into a new preparing
// journey; journey:readiness and journey:release refuse it until the sample's
// sources, images and texts are replaced.

const repository = path.resolve(".");
const sample = readSampleJourney();
const checklist = readFileSync(path.join(repository, CHECKLIST_TEMPLATE), "utf8");
const reserved = { journeyId: "sample_trip", prefix: "smp", cityId: "mihon" };
const kyoto = { journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", prefix: "ky" };
const json = (files: ReadonlyMap<string, Buffer>, file: string) => JSON.parse(files.get(file)!.toString("utf8"));
const optionalFiles = sample.readme.optional.flatMap((part) => part.files);

describe("journey:new command line", () => {
  it("reads the journey ID, the names, the city, the prefix and --with-optional", () => {
    expect(parseNewJourneyArgs(["kyoto_trip", "--name", "京都の旅", "--city", "kyoto", "--city-name", "京都"]))
      .toEqual({ journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", withOptional: false });
    expect(parseNewJourneyArgs(["--with-optional", "--prefix", "ky", "--city-name", "京都", "--city", "kyoto", "--name", "京都の旅", "kyoto_trip"]))
      .toEqual({ journeyId: "kyoto_trip", nameJa: "京都の旅", cityId: "kyoto", cityNameJa: "京都", prefix: "ky", withOptional: true });
  });

  it("requires the Japanese names and refuses unknown, repeated or empty arguments", () => {
    const base = ["kyoto_trip", "--name", "京都の旅", "--city", "kyoto", "--city-name", "京都"];
    expect(() => parseNewJourneyArgs(base.filter((_, index) => index !== 1 && index !== 2))).toThrow("--name（旅行編の日本語名）を指定してください。");
    expect(() => parseNewJourneyArgs(base.slice(0, 5))).toThrow("--city-name（都市の日本語名）を指定してください。");
    expect(() => parseNewJourneyArgs(base.slice(1))).toThrow("旅行編IDを指定してください。");
    expect(() => parseNewJourneyArgs([...base, "--order", "5"])).toThrow("知らない指定です: --order");
    expect(() => parseNewJourneyArgs([...base, "--name", "別名"])).toThrow("--name が2回指定されています。");
    expect(() => parseNewJourneyArgs([...base, "osaka"])).toThrow("旅行編IDは1つだけ指定してください: kyoto_trip と osaka");
    expect(() => parseNewJourneyArgs(["kyoto_trip", "--name", "--city", "kyoto"])).toThrow("--name の値がありません。");
    expect(() => parseNewJourneyArgs(base.slice(1))).toThrow("使い方: npm run journey:new --");
  });

  it("checks the IDs, the reserved sample names and that the names are Japanese", () => {
    expect(checkNewJourneyOptions({ ...kyoto, prefix: undefined }, reserved)).toMatchObject({ prefix: "kyoto_trip", withOptional: false });
    expect(checkNewJourneyOptions({ ...kyoto, prefix: "ky_" }, reserved).prefix).toBe("ky");
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "Kyoto" }, reserved)).toThrow("旅行編ID「Kyoto」は使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "kyoto-city" }, reserved)).toThrow("都市ID「kyoto-city」は使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, prefix: "9k" }, reserved)).toThrow("IDの接頭辞「9k」は使えません。");
    // Without --prefix the prefix comes from the journey ID, and the message says so.
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "kyoto__", prefix: undefined }, reserved)).toThrow(
      "IDの接頭辞「kyoto_」（--prefix を省いたので旅行編ID「kyoto__」から作りました）は使えません。--prefix で、英小文字で始め、英小文字・数字・_ だけの接頭辞を指定してください。");
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "sample_trip" }, reserved)).toThrow("旅行編ID「sample_trip」は見本の編のために予約されています。");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "mihon" }, reserved)).toThrow("都市ID「mihon」は見本の編のために予約されています。");
    expect(() => checkNewJourneyOptions({ ...kyoto, prefix: "smp_" }, reserved)).toThrow("IDの接頭辞「smp」は見本の編のために予約されています。");
    // Every sample name in every role, also as a part of an ID (it would stay in the copy's IDs and paths).
    for (const name of ["sample_trip", "smp", "mihon"]) {
      expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: name }, reserved)).toThrow(`旅行編ID「${name}」は見本の編のために予約されています。`);
      expect(() => checkNewJourneyOptions({ ...kyoto, cityId: name }, reserved)).toThrow(`都市ID「${name}」は見本の編のために予約されています。`);
      expect(() => checkNewJourneyOptions({ ...kyoto, prefix: name }, reserved)).toThrow(`IDの接頭辞「${name}」は見本の編のために予約されています。`);
    }
    expect(() => checkNewJourneyOptions({ ...kyoto, journeyId: "old_sample_trip" }, reserved)).toThrow("旅行編ID「old_sample_trip」は見本の編の名前「sample_trip」を含むため使えません。");
    // dist:check looks for the sample's journey ID anywhere in the production build.
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "my_sample_trips" }, reserved)).toThrow("都市ID「my_sample_trips」は見本の編の名前「sample_trip」を含むため使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityId: "mihon_new" }, reserved)).toThrow("都市ID「mihon_new」は見本の編の名前「mihon」を含むため使えません。");
    expect(() => checkNewJourneyOptions({ ...kyoto, prefix: "ky_smp" }, reserved)).toThrow("IDの接頭辞「ky_smp」は見本の編の名前「smp」を含むため使えません。");
    // Other words that only share letters with them are fine.
    expect(checkNewJourneyOptions({ ...kyoto, journeyId: "sample", cityId: "mihonia", prefix: "smpx" }, reserved)).toMatchObject({ cityId: "mihonia", prefix: "smpx" });
    expect(() => checkNewJourneyOptions({ ...kyoto, nameJa: "Kyoto Trip" }, reserved)).toThrow("--name には日本語の名前を1行で指定してください");
    expect(() => checkNewJourneyOptions({ ...kyoto, cityNameJa: " 京都" }, reserved)).toThrow("--city-name には日本語の名前を1行で指定してください");
  });
});

describe("journey:new copy of the sample", () => {
  it("changes only the release state, the placeholders and the checklist when the sample's own names are given", () => {
    const files = scaffoldJourney(sample, { journeyId: "sample_trip", nameJa: "見本の旅", cityId: "mihon", cityNameJa: "見本の街", prefix: "smp", withOptional: true, order: 9000 }, checklist);
    expect([...files.keys()].sort()).toEqual([...sample.files.keys(), CHECKLIST_FILE].sort());
    const changed = [...sample.files].filter(([file, bytes]) => !files.get(file)!.equals(bytes)).map(([file]) => file);
    expect(changed.sort()).toEqual(["cities/mihon.json", "manifest.json", "tourism/catalog.json"]);
    expect(json(files, "manifest.json")).toEqual({ ...json(sample.files, "manifest.json"), status: "preparing" });
    expect(json(files, "cities/mihon.json")).toEqual({ ...json(sample.files, "cities/mihon.json"), productionStatus: "prototype" });
    const tourism = json(sample.files, "tourism/catalog.json");
    for (const asset of tourism.assets) asset.isPlaceholder = true;
    expect(json(files, "tourism/catalog.json")).toEqual(tourism);
  });

  it("replaces the sample's journey ID, prefix and city everywhere, without the optional parts unless asked", () => {
    const options = { ...kyoto, withOptional: false, order: 50 };
    const minimal = scaffoldJourney(sample, options, checklist);
    const full = scaffoldJourney(sample, { ...options, withOptional: true }, checklist);
    expect(minimal.size).toBe(sample.readme.core.length + 1);
    expect(full.size).toBe(sample.files.size + 1);
    expect([...minimal.keys()]).toContain("stories/battles/ky_kyoto_finale.ink");
    expect([...minimal.keys()]).toContain("public/assets/tourism/kyoto_trip/kyoto_clock_tower.png");
    expect([...full.keys()]).toContain("quizzes/ky_kyoto_market_b_quiz.json");
    // No name of the sample is left as an ID, a part of one or a path (English names such as "Mihon Inn" are text to rewrite).
    const left = /(?<![A-Za-z0-9])(sample_trip|smp|mihon)(?![A-Za-z0-9])/u;
    for (const [file, bytes] of full) {
      expect(file, file).not.toMatch(left);
      if (file !== CHECKLIST_FILE && !file.startsWith("public/")) expect(bytes.toString("utf8"), file).not.toMatch(left);
    }
    expect(json(minimal, "manifest.json")).toMatchObject({
      id: "kyoto_trip", nameJa: "京都の旅", order: 50, status: "preparing", cities: [{ id: "kyoto", nameJa: "京都" }],
      authoring: { eventPrefix: "ky", observationFile: "authoring/journeys/kyoto_trip/drafts/observation-cards.json", imageDirectory: "assets/tourism/kyoto_trip" },
    });
    expect(json(minimal, "cities/kyoto.json")).toMatchObject({ id: "kyoto", nameJa: "京都", productionStatus: "prototype", landmarkIdsPlanned: ["kyoto_clock_tower"] });
    expect(json(minimal, "tourism/catalog.json").assets.map((asset: { isPlaceholder: boolean }) => asset.isPlaceholder)).toEqual([true]);
    // The images are the sample's bytes (journey:readiness reports them until replaced).
    expect(minimal.get("public/assets/tourism/kyoto_trip/kyoto_clock_tower.png")!.equals(sample.files.get("public/assets/tourism/sample_trip/mihon_clock_tower.png")!)).toBe(true);
    const list = minimal.get(CHECKLIST_FILE)!.toString("utf8");
    expect(list).not.toContain("{{");
    expect(list).toContain("# 京都の旅（kyoto_trip）の置き換えチェックリスト");
    expect(list).toContain("- [ ] `stories/battles/ky_kyoto_finale.ink` — 都市フィナーレの会話");
    for (const file of minimal.keys()) if (file !== CHECKLIST_FILE) expect(list, file).toContain(`\`${file}\``);
    expect(full.get(CHECKLIST_FILE)!.toString("utf8")).toContain("- [ ] `quizzes/ky_kyoto_market_b_quiz.json` — 任意の部分「特殊戦B（矛盾追及）」");
    expect(optionalFiles.length).toBe(full.size - minimal.size);
  });

  it("replaces the sample's names only where they stand alone or between separators", () => {
    const words = { a: "smp_mihon_x", b: "epilogues/mihon", c: "smpx", d: "mihonia", e: "xmihon", f: "sample_trips", g: "Mihon Inn", h: "assets/tourism/sample_trip/a-mihon.png" };
    const files = scaffoldJourney({ ...sample, files: new Map([...sample.files, ["extra.json", Buffer.from(JSON.stringify(words))]]) },
      { ...kyoto, withOptional: true, order: 50 }, checklist);
    expect(json(files, "extra.json")).toEqual({ ...words, a: "ky_kyoto_x", b: "epilogues/kyoto", h: "assets/tourism/kyoto_trip/a-kyoto.png" });
  });
});

/**
 * A rewrite that keeps the structure: a mark in every Japanese text, another
 * word in every English quiz text (the same in the quizzes and their
 * translations; "now" is in the shared word meanings), other source URLs,
 * new images, no placeholders.
 */
async function replaceSampleContent(folder: string): Promise<void> {
  const mark = (text: string) => text.replace(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, "$&改").replaceAll("Mihon", "Kyoto");
  const english = (text: string) => text.replace(/[.?!]?$/u, " now$&");
  const rewrite = (value: unknown, key?: string): unknown => {
    if (typeof value === "string")
      return value.startsWith("https://example.com/") ? "https://dreamscape-check.jp/source" : key === "questionEn" || key === "textEn" ? english(value) : mark(value);
    if (Array.isArray(value)) return value.map((item) => rewrite(item, key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([name, item]) => [name, name === "isPlaceholder" ? false : rewrite(item, name)]));
    return value;
  };
  for (const file of listFiles(folder)) {
    const absolute = path.join(folder, file);
    if (file.startsWith("public/")) {
      const { width, height } = await sharp(absolute).metadata();
      writeFileSync(absolute, await sharp({ create: { width: width!, height: height!, channels: 3, background: "#2f6b5e" } }).png().toBuffer());
    } else if (file === "learning/word-meanings.json") {
      // Glosses are shared phrasing; a word other journeys define must keep their exact meaning.
    } else if (file.endsWith(".json")) writeFileSync(absolute, `${JSON.stringify(rewrite(JSON.parse(readFileSync(absolute, "utf8"))), null, 2)}\n`);
    else if (file.endsWith(".ink"))
      writeFileSync(absolute, readFileSync(absolute, "utf8").split("\n").map((line) => (line.trim().startsWith("//") ? line : mark(line))).join("\n"));
  }
}

describe("journey:new in a copy of the repository", () => {
  let root: string;
  const journeyFolders = () => readdirSync(journeysDirectory(root)).sort();
  // The copy holds whatever journeys the repository has (also ones made by
  // journey:new), so the new names are chosen among the unused ones.
  let before: string[];
  let orders: number[];
  let first: typeof kyoto;
  let second: { journeyId: string; nameJa: string; cityId: string; cityNameJa: string };
  let unused: { journeyId: string; prefix: string };
  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "dreamscape-journey-new-"));
    // A real copy (journey:release refuses the linked images of prepareContentFixture), with the sample and the checklist.
    for (const folder of ["content", "public", "authoring/templates"])
      cpSync(path.join(repository, folder), path.join(root, folder), { recursive: true });
    before = journeyFolders();
    const manifests = readJourneyManifests(root);
    orders = manifests.map((manifest) => manifest.order);
    const used = new Set([...before, ...manifests.flatMap((manifest) => [manifest.id,
      ...(manifest.data.cities as { id: string }[]).map((city) => city.id),
      String((manifest.data.authoring as { eventPrefix?: unknown } | undefined)?.eventPrefix)])]);
    // Names no existing ID starts with either (journey:new refuses a prefix of an existing ID family).
    const sources = loadContentSources(root);
    const free = (name: string) => {
      let candidate = name;
      for (let index = 2; used.has(candidate) || idWithPrefix(sources, candidate); index += 1) candidate = `${name}${index}`;
      used.add(candidate);
      return candidate;
    };
    first = { ...kyoto, journeyId: free(kyoto.journeyId), cityId: free(kyoto.cityId), prefix: free(kyoto.prefix) };
    const nara = free("nara");
    second = { journeyId: nara, nameJa: "奈良の旅", cityId: nara, cityNameJa: "奈良" };
    unused = { journeyId: free("osaka"), prefix: free("os") };
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));
  /** The order journey:new gives (docs/02): the next multiple of 10 above every journey's, never the sample's 9000. */
  const nextOrder = (taken: readonly number[]) => {
    const order = Math.floor(Math.max(0, ...taken) / 10) * 10 + 10;
    return order === 9000 ? 9010 : order;
  };

  it("creates preparing journeys that content:build accepts, the minimal one and one with the optional parts", async () => {
    const { journeyId: k, cityId: kc, prefix: kp } = first;
    const created = createJourney(root, first);
    const order = nextOrder(orders);
    expect(created).toMatchObject({ journeyId: k, prefix: kp, cityId: kc, order, folder: `content/journeys/${k}` });
    expect(created.files).toHaveLength(sample.readme.core.length + 1);
    const n = second.journeyId;
    expect(createJourney(root, { ...second, withOptional: true }))
      .toMatchObject({ prefix: n, order: nextOrder([...orders, order]), files: expect.arrayContaining([`stories/encounters/${n}_${n}_bookmark_gift.ink`]) });
    expect(journeyFolders()).toEqual([...before, k, n].sort());
    const result = await buildContent(root);
    const catalog = journeyCatalogSchema.parse(JSON.parse(readFileSync(path.join(root, MIRROR_DIRECTORY, "journeys/catalog.json"), "utf8")));
    expect(catalog.journeys.filter((journey) => journey.id === k || journey.id === n).map((journey) => [journey.id, journey.status, journey.nameJa]))
      .toEqual([[k, "preparing", "京都の旅"], [n, "preparing", "奈良の旅"]]);
    expect(result.journeyContents.find((journey) => journey.id === n)).toMatchObject({ status: "preparing" });
    // Every ID follows the new prefix and every file is used: no warning names the new journeys.
    expect(result.warnings.filter((warning) => [k, kc, kp, n].some((name) => warning.message.includes(name)))).toEqual([]);
  });

  it("works with city:bundle at once; journey:scaffold and journey:transit say what they need first", async () => {
    const { journeyId: k, cityId: kc } = first;
    // The city's editable bundle goes back unchanged (city:bundle export, then check).
    await expect(applyCityBundle(root, exportEditableCityBundle(root, kc))).resolves.toEqual({ changedFiles: [] });
    expect(() => loadJourneyScaffold(root, k)).toThrow(`観察資料がありません: authoring/journeys/${k}/drafts/observation-cards.json（manifest.json の authoring.observationFile）。`);
    expect(() => inspectJourneyTransit(root, k)).toThrow(`都市「${kc}」の交通判断台帳がありません（${k} の manifest.json の authoring に transitDirectory がありません）。`);
  });

  it("refuses an existing journey, city or prefix and content that would not build, writing nothing", () => {
    const current = journeyFolders();
    const { journeyId: k, cityId: kc, prefix: kp } = first;
    const other = { journeyId: unused.journeyId, cityId: unused.journeyId, prefix: unused.prefix };
    expect(() => createJourney(root, { ...first, cityId: other.cityId })).toThrow(`旅行編「${k}」はすでにあります: content/journeys/${k}`);
    expect(() => createJourney(root, { ...first, journeyId: other.journeyId, prefix: other.prefix }))
      .toThrow(`都市ID「${kc}」はすでに使われています: content/journeys/${k}/cities/${kc}.json`);
    expect(() => createJourney(root, { ...first, ...other, prefix: kp })).toThrow(`IDの接頭辞「${kp}」は旅行編「${k}」が使っています`);
    // A journey that declares no prefix (like Milano) still owns the IDs that start with it.
    const manifestFile = path.join(journeyDirectory(root, k), "manifest.json");
    const manifest = readFileSync(manifestFile, "utf8");
    writeFileSync(manifestFile, JSON.stringify({ ...JSON.parse(manifest), authoring: undefined }));
    try {
      expect(() => createJourney(root, { ...first, ...other, prefix: kp }))
        .toThrow(new RegExp(`^IDの接頭辞「${kp}」で始まるIDがすでにあります（content/journeys/${k}/[^）]+ の「(?:[a-z_]+/)?${kp}_[a-z0-9_]+」）。--prefix で別の接頭辞を指定してください。$`, "u"));
    } finally { writeFileSync(manifestFile, manifest); }
    expect(() => createJourney(root, { ...first, ...other, nameJa: "" })).toThrow("--name には日本語の名前を1行で指定してください");
    // A story ID of another journey that the copy would define again (its epilogue `epilogues/<cityId>`).
    const taken = path.join(journeyDirectory(root, k), `stories/epilogues/${other.cityId}.ink`);
    writeFileSync(taken, "// taken\n-> END\n");
    try {
      expect(() => createJourney(root, { ...first, ...other }))
        .toThrow(new RegExp(`^作った旅行編が内容の検証を通らなかったため、何も書き込んでいません: .*epilogues/${other.cityId}`, "u"));
    } finally { rmSync(taken); }
    expect(journeyFolders()).toEqual(current);
  });

  it("is reported by journey:readiness and refused by journey:release until the sample content is replaced", async () => {
    const { journeyId: k, cityId: kc, prefix: kp } = first;
    const report = inspectJourneyReadiness(loadJourneyReadiness(root, k));
    const left = report.issues.filter((issue) => issue.code === "sample_content_left").map((issue) => issue.detail);
    expect(left).toEqual(expect.arrayContaining([
      `見本の出典（example.com）が残っています: content/journeys/${k}/quizzes/${kp}_${kc}_clock_tower_quiz.json（3件）`,
      `見本の画像のままです: content/journeys/${k}/public/assets/tourism/${k}/${kc}_clock_tower.png`,
      `見本の文章が残っています: content/journeys/${k}/stories/tourism/${kp}_${kc}_clock_tower_guide.ink（6か所）`,
    ]));
    expect(report).toMatchObject({ ready: false, readyForPromotion: false });
    await expect(prepareJourneyRelease(root, k, false)).rejects.toThrow(/^見本の内容が残っているため公開できません。[\s\S]*見本の画像のままです/u);

    await replaceSampleContent(journeyDirectory(root, k));
    const replaced = inspectJourneyReadiness(loadJourneyReadiness(root, k));
    expect(replaced.issues.map((issue) => issue.detail)).toEqual(["旅行編は準備中です。"]);
    expect(replaced.readyForPromotion).toBe(true);
    // The release preview validates the released state in a copy and changes nothing.
    const manifest = readFileSync(path.join(journeyDirectory(root, k), "manifest.json"), "utf8");
    await prepareJourneyRelease(root, k, false);
    expect(readFileSync(path.join(journeyDirectory(root, k), "manifest.json"), "utf8")).toBe(manifest);
  }, 120_000);
});
