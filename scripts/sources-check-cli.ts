import { errorText } from "./cli-error";
import { journeyFileOf, readContentTree } from "./content-sources";
import {
  checkPageTitles, decodePage, formatSourcesReport, groupsOfJourney, registeredSources, titlesWithSeveralUrls, urlsWithSeveralTitles,
  type Fetcher, type SourceFile,
} from "./sources-check";

// npm run sources:check [-- --journey <journeyId>] [--fetch]: the titles of the sources registered in content/
// (sources-check.ts). On demand only: content:build already stops a scene or quiz without sources and notes a tour's
// or a route's missing sources (tour-note, transit-route-unsourced), but checks no title. Prints notes and exits 0;
// exits 1 only when it cannot run. It changes no file.
const usage = "使い方: npm run sources:check -- [--journey 旅行編ID] [--fetch]";
const help = [
  usage,
  "content/ の JSON に書いた出典（url と title。写真の出典 sourceUrl は題がないので数だけ）を集め、同じ URL に違う題、同じ題に違う URL を出します。データは変えません。",
  "--fetch：ページを読み込み、<title> と登録の題を比べます（空白・大文字小文字・記号・サイト名・末尾の（…）の注記をそろえて）。読めないページは「確かめられなかった」と出します。",
  "  プロキシを通す環境で読み込めないときは、NODE_USE_ENV_PROXY=1 を付けて実行します。",
  "publisher に Dreamscape とある記録（ゲームの推定・モデル・現地のメモ）は、題がページの題ではないので比べません。",
  "content:build がもう見るもの（出典のない場面を止める B4、ツアーの出典の注意 tour-note、出典のない経路の注意 transit-route-unsourced）は繰り返しません。題はビルドでは見ません。",
].join("\n");

/** Fetch a page through the environment's network (a proxy that the session sets up), as text in its character set. */
const fetchPage: Fetcher = async (url) => {
  try {
    const response = await fetch(url, {
      redirect: "follow", signal: AbortSignal.timeout(20_000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; sources-check)", accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5" },
    });
    const contentType = response.headers.get("content-type") ?? undefined;
    if (!/html/iu.test(contentType ?? "")) {
      await response.body?.cancel();
      return { status: response.status, ...(contentType ? { contentType } : {}) };
    }
    return { status: response.status, ...(contentType ? { contentType } : {}), text: decodePage(new Uint8Array(await response.arrayBuffer()), contentType) };
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : "";
    return { error: error instanceof Error && error.name === "TimeoutError" ? "20秒で応答がない" : `${error instanceof Error ? error.message : String(error)}${cause}` };
  }
};

try {
  const args = process.argv.slice(2);
  if (args.includes("--help")) { console.log(help); process.exit(0); }
  const journeyAt = args.indexOf("--journey");
  const journey = journeyAt >= 0 ? args[journeyAt + 1] : undefined;
  if (journeyAt >= 0 && (!journey || journey.startsWith("--"))) throw new Error(`--journey の後に旅行編IDを書いてください。${usage}`);
  const unknown = args.filter((arg, index) => arg !== "--fetch" && (journeyAt < 0 || (index !== journeyAt && index !== journeyAt + 1)));
  if (unknown.length) throw new Error(`分からない引数です：${unknown.join(" ")}。${usage}`);
  const root = process.cwd();
  const tree = readContentTree(root);
  if (journey && !tree.journeyFolders.includes(journey))
    throw new Error(`旅行編がありません：${journey}（content/journeys/ のフォルダ名を書いてください。あるもの：${tree.journeyFolders.join("、")}）。`);
  const files: SourceFile[] = [...tree.files].filter(([file, bytes]) => file.endsWith(".json") && bytes)
    .map(([file, bytes]) => {
      const owner = journeyFileOf(tree, file)?.journey;
      return { file, ...(owner ? { journey: owner } : {}), text: bytes!.toString("utf8") };
    });
  const all = registeredSources(files);
  const mine = journey ? all.filter((source) => source.journey === journey) : all;
  const pages = args.includes("--fetch") ? await (async () => {
    console.error(`ページの題を読み込みます（URL ${new Set(mine.filter((source) => source.title).map((source) => source.url)).size}個。数分かかることがあります）…`);
    return checkPageTitles(mine, fetchPage, { concurrency: 6 });
  })() : undefined;
  console.log(formatSourcesReport({
    ...(journey ? { journey } : {}), sources: mine,
    urlTitles: groupsOfJourney(urlsWithSeveralTitles(all), journey), titleUrls: groupsOfJourney(titlesWithSeveralUrls(all), journey),
    ...(pages ? { pages } : {}),
  }).join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
