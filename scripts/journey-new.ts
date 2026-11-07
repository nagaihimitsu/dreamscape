import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { CONTENT_DIRECTORY, JOURNEYS_DIRECTORY, MANIFEST_FILE, SAMPLE_JOURNEY_DIRECTORY, journeyDirectory, journeysDirectory } from "./content-layout";
import { idWithPrefix } from "./content-report";
import { contentSourcesFromTree, displayPath, loadContentSources } from "./content-sources";
import { validateContent } from "./content-validation";
import { createParentDirectories, removeCreatedDirectories } from "./created-directories";
import { jsonText, readSampleJourney, withoutOptionalParts, type SampleReadme } from "./sample-journey";
import { chooseStoryCache, type StoryValidationCache } from "./story-validation-cache";

// `npm run journey:new`: a new journey folder copied from the sample journey
// (authoring/templates/sample_trip/). The sample's IDs, prefix, city and
// paths are replaced, the journey starts as preparing with a prototype city
// and placeholder images, and a CHECKLIST.md lists what to replace. The
// sample's fictional sources, images and texts stay until the author replaces
// them; journey:readiness reports them and journey:release refuses them
// (sample-journey.ts sampleLeftovers).

export type NewJourneyOptions = {
  journeyId: string;
  /** The journey's Japanese name (manifest nameJa). */
  nameJa: string;
  cityId: string;
  /** The city's Japanese name (manifest cities[].nameJa and the city file's nameJa). */
  cityNameJa: string;
  /** The ID prefix (authoring.eventPrefix) without its `_`; default: the journey ID. */
  prefix?: string;
  /** Copy the sample's optional parts too (special battles B and C, encounters with an item). */
  withOptional?: boolean;
};

export const NEW_JOURNEY_USAGE = "使い方: npm run journey:new -- <旅行編ID> --name <旅行編の日本語名> --city <都市ID> --city-name <都市の日本語名> [--prefix <IDの接頭辞>] [--with-optional]";
/** The checklist written as CHECKLIST.md into the new journey ({{…}} are replaced). */
export const CHECKLIST_TEMPLATE = "authoring/templates/journey-new-checklist.md";
export const CHECKLIST_FILE = "CHECKLIST.md";

const idPattern = /^[a-z][a-z0-9_]*$/u;
const prefixPattern = /^[a-z](?:[a-z0-9_]*[a-z0-9])?$/u;
const japanese = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;

/** The command line of journey:new as options; a missing, repeated or unknown argument is an error with the usage. */
export function parseNewJourneyArgs(args: readonly string[]): NewJourneyOptions {
  const fail = (message: string): never => { throw new Error(`${message}\n${NEW_JOURNEY_USAGE}`); };
  const values = new Map<string, string>();
  let journeyId: string | undefined;
  let withOptional = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--with-optional") {
      if (withOptional) fail("--with-optional が2回指定されています。");
      withOptional = true;
    } else if (["--name", "--city", "--city-name", "--prefix"].includes(arg)) {
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--")) fail(`${arg} の値がありません。`);
      if (values.has(arg)) fail(`${arg} が2回指定されています。`);
      values.set(arg, value);
      index += 1;
    } else if (arg.startsWith("-")) fail(`知らない指定です: ${arg}`);
    else if (journeyId !== undefined) fail(`旅行編IDは1つだけ指定してください: ${journeyId} と ${arg}`);
    else journeyId = arg;
  }
  if (journeyId === undefined) fail("旅行編IDを指定してください。");
  const required = (flag: string, label: string) => values.get(flag) ?? fail(`${flag}（${label}）を指定してください。`);
  return {
    journeyId: journeyId!,
    nameJa: required("--name", "旅行編の日本語名"),
    cityId: required("--city", "都市ID"),
    cityNameJa: required("--city-name", "都市の日本語名"),
    ...(values.has("--prefix") ? { prefix: values.get("--prefix") } : {}),
    withOptional,
  };
}

/** The sample's own journey ID, prefix and city ID: the names journey:new replaces. */
function sampleNames(files: ReadonlyMap<string, Buffer>): { journeyId: string; prefix: string; cityId: string; order: number } {
  const manifest = JSON.parse(files.get(MANIFEST_FILE)!.toString("utf8"));
  return { journeyId: manifest.id, prefix: manifest.authoring.eventPrefix, cityId: manifest.cities[0].id, order: manifest.order };
}

/**
 * The sample name a new journey ID, city ID or prefix would carry into the
 * copy's IDs and paths, if any: the sample's journey ID anywhere in it
 * (dist:check refuses that text in a production build), its prefix or city
 * ID as a part between `_` (as the copy's IDs join them: `ky_mihon_finale`).
 */
function sampleNameIn(value: string, reserved: { journeyId: string; prefix: string; cityId: string }): string | undefined {
  if (value.includes(reserved.journeyId)) return reserved.journeyId;
  return [reserved.prefix, reserved.cityId].find((name) => new RegExp(`(?<![a-z0-9])${name}(?![a-z0-9])`, "u").test(value));
}

/** Checked options with the prefix resolved (no `_` at the end); format errors only, see createJourney for collisions. */
export function checkNewJourneyOptions(options: NewJourneyOptions, reserved: { journeyId: string; prefix: string; cityId: string }): Required<NewJourneyOptions> {
  const notSample = (value: string, label: string) => {
    const name = sampleNameIn(value, reserved);
    if (name === value) throw new Error(`${label}「${value}」は見本の編のために予約されています。別の名前にしてください。`);
    if (name) throw new Error(`${label}「${value}」は見本の編の名前「${name}」を含むため使えません。別の名前にしてください。`);
  };
  const id = (value: string, label: string) => {
    if (!idPattern.test(value)) throw new Error(`${label}「${value}」は使えません。英小文字で始め、英小文字・数字・_ だけで書いてください。`);
    notSample(value, label);
  };
  const name = (value: string, flag: string, example: string) => {
    if (value.trim() !== value || !value || /[\r\n]/u.test(value) || !japanese.test(value))
      throw new Error(`${flag} には日本語の名前を1行で指定してください（例：${example}）。`);
  };
  id(options.journeyId, "旅行編ID");
  id(options.cityId, "都市ID");
  name(options.nameJa, "--name", "京都の旅");
  name(options.cityNameJa, "--city-name", "京都");
  const prefix = (options.prefix ?? options.journeyId).replace(/_$/u, "");
  if (!prefixPattern.test(prefix))
    throw new Error(options.prefix === undefined
      ? `IDの接頭辞「${prefix}」（--prefix を省いたので旅行編ID「${options.journeyId}」から作りました）は使えません。--prefix で、英小文字で始め、英小文字・数字・_ だけの接頭辞を指定してください。`
      : `IDの接頭辞「${options.prefix}」は使えません。英小文字で始め、英小文字・数字・_ だけで書いてください（最後の _ は付けなくてよい）。`);
  notSample(prefix, "IDの接頭辞");
  return { ...options, prefix, withOptional: options.withOptional ?? false };
}

/**
 * The files of a new journey folder (path inside it → contents) from the
 * sample's files: the optional parts left out unless asked for, the sample's
 * journey ID, prefix and city ID replaced wherever they stand as a name or a
 * part of one (`smp_mihon_finale`, `epilogues/mihon`, `assets/tourism/sample_trip/…`,
 * paths included; letters and digits around them keep them apart from other
 * words), the manifest preparing with the given names and order, the city a
 * prototype with the city name, every tourism image a placeholder, and the
 * checklist (the template with its {{…}} filled) as CHECKLIST.md.
 */
export function scaffoldJourney(
  sample: { files: ReadonlyMap<string, Buffer>; readme: SampleReadme },
  options: Required<NewJourneyOptions> & { order: number },
  checklistTemplate: string,
): Map<string, Buffer> {
  const names = sampleNames(sample.files);
  const replacement: Record<string, string> = { [names.journeyId]: options.journeyId, [names.prefix]: options.prefix, [names.cityId]: options.cityId };
  const tokens = new RegExp(`(?<![A-Za-z0-9])(${Object.keys(replacement).sort((a, b) => b.length - a.length).join("|")})(?![A-Za-z0-9])`, "gu");
  const rename = (text: string) => text.replace(tokens, (token) => replacement[token]);
  const source = options.withOptional ? new Map(sample.files) : withoutOptionalParts(sample.files, sample.readme);
  const files = new Map<string, Buffer>();
  for (const [file, bytes] of source) files.set(rename(file), file.startsWith("public/") ? bytes : Buffer.from(rename(bytes.toString("utf8"))));
  const edit = (file: string, change: (value: any) => void) => {
    const value = JSON.parse(files.get(file)!.toString("utf8"));
    change(value);
    files.set(file, Buffer.from(jsonText(value)));
  };
  edit(MANIFEST_FILE, (manifest) => {
    manifest.order = options.order;
    manifest.nameJa = options.nameJa;
    manifest.status = "preparing";
    manifest.cities[0].nameJa = options.cityNameJa;
  });
  edit(`cities/${options.cityId}.json`, (city) => {
    city.nameJa = options.cityNameJa;
    city.productionStatus = "prototype";
  });
  edit("tourism/catalog.json", (tourism) => {
    for (const asset of tourism.assets) asset.isPlaceholder = true;
  });
  const roles = new Map([
    ...sample.readme.core.map((item): [string, string] => [rename(item.file), item.role]),
    ...sample.readme.optional.flatMap((part) => part.files.map((file): [string, string] => [rename(file), `任意の部分「${part.title}」`])),
  ]);
  const list = [...files.keys()].sort().map((file) => `- [ ] \`${file}\`${roles.has(file) ? ` — ${roles.get(file)}` : ""}`).join("\n");
  const fields: Record<string, string> = {
    journeyId: options.journeyId, nameJa: options.nameJa, cityId: options.cityId, cityNameJa: options.cityNameJa,
    prefix: options.prefix, order: String(options.order), files: list,
  };
  files.set(CHECKLIST_FILE, Buffer.from(checklistTemplate.replace(/\{\{(\w+)\}\}/gu, (match, key: string) => fields[key] ?? match)));
  return files;
}

/** The next free order for a new journey: the next multiple of 10 above every journey's, skipping the sample's reserved order. */
function nextOrder(orders: readonly number[], reserved: number): number {
  let order = Math.floor(Math.max(0, ...orders) / 10) * 10 + 10;
  while (order === reserved || orders.includes(order)) order += 10;
  return order;
}

export type CreatedJourney = { journeyId: string; prefix: string; cityId: string; order: number; folder: string; files: string[] };

/**
 * Create `content/journeys/<journeyId>/` in `root` from the sample journey of
 * `root` (SAMPLE_JOURNEY_DIRECTORY). Refuses an invalid or reserved name, a
 * journey ID or city ID that exists, a prefix another journey declares or
 * that existing IDs already start with (`<prefix>_`), and a
 * result that the content validation (content:build) would not accept, all
 * before anything is written; the folder is written under a dot name (which
 * the loader skips) and then renamed, and removed again on failure.
 */
export function createJourney(root: string, options: NewJourneyOptions, { storyCache }: { storyCache?: StoryValidationCache | null } = {}): CreatedJourney {
  const sample = readSampleJourney(path.join(root, SAMPLE_JOURNEY_DIRECTORY));
  const reserved = sampleNames(sample.files);
  const checked = checkNewJourneyOptions(options, reserved);
  const { journeyId, cityId, prefix } = checked;
  const sources = loadContentSources(root);
  const target = journeyDirectory(root, journeyId);
  if (existsSync(target) || sources.manifests.some((manifest) => manifest.id === journeyId))
    throw new Error(`旅行編「${journeyId}」はすでにあります: ${displayPath(root, target)}`);
  const city = sources.cities.find((item) => item.id === cityId);
  if (city) throw new Error(`都市ID「${cityId}」はすでに使われています: ${displayPath(root, city.file)}。都市IDはすべての旅行編で重ならないようにします。`);
  for (const manifest of sources.manifests) {
    const authoring = manifest.data.authoring as { eventPrefix?: unknown } | undefined;
    if (authoring?.eventPrefix === prefix)
      throw new Error(`IDの接頭辞「${prefix}」は旅行編「${manifest.id}」が使っています（${displayPath(root, manifest.file)} の authoring.eventPrefix）。--prefix で別の接頭辞を指定してください。`);
  }
  // Also the ID families of journeys that declare no prefix (e.g. Milano's milano_…) and of the shared data.
  const family = idWithPrefix(sources, prefix);
  if (family)
    throw new Error(`IDの接頭辞「${prefix}」で始まるIDがすでにあります（${family.where} の「${family.id}」）。--prefix で別の接頭辞を指定してください。`);
  const order = nextOrder(sources.manifests.map((manifest) => manifest.order), reserved.order);
  const files = scaffoldJourney(sample, { ...checked, order }, readFileSync(path.join(root, CHECKLIST_TEMPLATE), "utf8"));
  // The same validation as content:build, on the content with the new folder added, before anything is written.
  const folder = `${CONTENT_DIRECTORY}/${JOURNEYS_DIRECTORY}/${journeyId}`;
  try {
    validateContent(contentSourcesFromTree({
      ...sources.tree,
      journeyFolders: [...sources.tree.journeyFolders, journeyId].sort(),
      files: new Map([...sources.tree.files, ...[...files].map(([file, bytes]): [string, Buffer | null] =>
        [`${folder}/${file}`, file.startsWith("public/") || !/\.(json|ink)$/u.test(file) ? null : bytes])]),
    }), { storyCache: chooseStoryCache(storyCache) });
  } catch (error) {
    throw new Error(`作った旅行編が内容の検証を通らなかったため、何も書き込んでいません: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
  const staging = path.join(journeysDirectory(root), `.new-${journeyId}-${process.pid}-${Date.now()}`);
  const created = createParentDirectories(root, [path.relative(root, path.join(staging, MANIFEST_FILE))]);
  let done = false;
  try {
    for (const [file, bytes] of files) {
      mkdirSync(path.dirname(path.join(staging, file)), { recursive: true });
      writeFileSync(path.join(staging, file), bytes, { flag: "wx" });
    }
    if (existsSync(target)) throw new Error(`旅行編「${journeyId}」が作成中に別の手順で作られました: ${displayPath(root, target)}`);
    renameSync(staging, target);
    done = true;
  } finally {
    if (!done) {
      rmSync(staging, { recursive: true, force: true });
      removeCreatedDirectories(root, created);
    }
  }
  return { journeyId, prefix, cityId, order, folder, files: [...files.keys()].sort() };
}
