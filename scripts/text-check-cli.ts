import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { displayPath, journeyFileOf, loadContentSources } from "./content-sources";
import { allTerms, dataPieces, formatTextReport, inkPieces, parseTermLedger, textNotes, type Term } from "./text-check";

// npm run text:check [-- --journey <journeyId>]: notes on the player-facing text of content/ as it is now (no
// content:build needed) and the variants each journey's terms ledger (authoring/journeys/<journeyId>/terms.json) says
// to avoid (text-check.ts). Notes only: it changes no file and exits 0 (1 when it cannot run, e.g. a ledger of the
// wrong shape).
const usage = "使い方: npm run text:check -- [--journey 旅行編ID]";
const help = [
  usage,
  "遊ぶ人に見える文（Ink の行・選択肢・# title: などの札の字、データの …Ja の欄。ID・札・コメントは見ない）の注意を出します。ファイルは変えません。",
  "(a) 勝ち負けの言葉 (b)「旅の風景」の名札のまま人が話していそうな行 (c) 名札の出ない声 (d) 用語の台帳 authoring/journeys/<旅行編ID>/terms.json で避ける言い方。",
  "Ink は書いたとおりに読みます（# speaker: は次の札まで続く。場面は地の文で始まる。手伝いの knot の最初の行の話し手は、呼んだ場面のものなので (b)(c) では見ない）。",
  "content:build の注意がもう見るもの（日本語の欄に日本語がない data-language、図鑑の語 glossary、録音後に変わった声 voice-changed）は繰り返しません。",
].join("\n");
const CORE = "core";

try {
  const args = process.argv.slice(2);
  if (args.includes("--help")) { console.log(help); process.exit(0); }
  if (args.length && (args.length !== 2 || args[0] !== "--journey" || args[1].startsWith("--"))) throw new Error(usage);
  const journey = args[1];
  const root = process.cwd();
  const sources = loadContentSources(root);
  if (journey && !sources.manifests.some((manifest) => manifest.id === journey))
    throw new Error(`旅行編がありません：${journey}（content/journeys/ のフォルダ名を書いてください。あるもの：${sources.manifests.map((item) => item.id).join("、")}）。`);
  const journeys = sources.manifests.map((manifest) => manifest.id).filter((id) => !journey || id === journey);
  // The ledgers: authoring/journeys/<journeyId>/terms.json, outside content/ (the game never reads them).
  const ledgers = new Map<string, { file: string; terms: Term[] }>();
  for (const id of sources.manifests.map((manifest) => manifest.id)) {
    const file = path.posix.join("authoring", "journeys", id, "terms.json");
    if (existsSync(path.join(root, file))) ledgers.set(id, { file, terms: parseTermLedger(file, readFileSync(path.join(root, file), "utf8")) });
  }
  // The shared files are shown in every journey: they are read with every journey's terms (with --journey, that journey's).
  const shared = allTerms(journeys.map((id) => ledgers.get(id)?.terms ?? []));
  const termsOf = (owner: string) => (owner === CORE ? shared : ledgers.get(owner)?.terms ?? []);
  const kept = (owner: string) => owner === CORE || journeys.includes(owner);
  const pieces = [
    ...sources.storyFiles.filter((story) => kept(story.layer))
      .flatMap((story) => inkPieces({ storyId: story.id, file: displayPath(root, story.file), journey: story.layer, source: story.source })),
    // A transit ledger (travel/<city>-transit.json) never reaches the game.
    ...[...sources.tree.files].filter(([file, bytes]) => file.endsWith(".json") && !file.endsWith("-transit.json") && bytes)
      .map(([file, bytes]) => ({ file, journey: journeyFileOf(sources.tree, file)?.journey ?? CORE, text: bytes!.toString("utf8") }))
      .filter((data) => kept(data.journey)).flatMap(dataPieces),
  ];
  console.log(formatTextReport(textNotes(pieces, termsOf), {
    journeys: [...journeys, CORE],
    ledgers: journeys.flatMap((id) => (ledgers.has(id) ? [{ journey: id, file: ledgers.get(id)!.file, count: ledgers.get(id)!.terms.length }] : [])),
  }).join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
