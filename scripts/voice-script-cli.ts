import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { loadContentSources } from "./content-sources";
import { readVoiceHistory } from "./voice-records";
import { formatVoiceScript, voiceScript, voiceScriptInput } from "./voice-script";

// npm run voice:script -- --journey <journeyId> [--out <folder>]: the voice script of a journey's heroine lines
// (voice-script.ts), read from content/ as it is now (no content:build needed). Writes heroine_lines.txt (for the
// people who make the voices) and entries.json (the same lines as data, which voice:changes compares) into the
// folder, by default artifacts/voice/<journeyId>/ (not committed). A script that is sent is kept in
// authoring/journeys/<journeyId>/voice/<date>/ (voice-records.ts); its IDs stay those of the scripts sent before.
const usage = "使い方: npm run voice:script -- --journey 旅行編ID [--out 書き出すフォルダ]";

/** Today as YYYY-MM-DD in local time. */
function today(): string {
  const now = new Date();
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
}

try {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = [args[index], args[index + 1]];
    if ((flag !== "--journey" && flag !== "--out") || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
    options[flag] = value;
  }
  const journeyId = options["--journey"];
  if (!journeyId) throw new Error(usage);
  const root = process.cwd();
  const script = voiceScript(voiceScriptInput(loadContentSources(root), journeyId, readVoiceHistory(root, journeyId)));
  const folder = path.resolve(root, options["--out"] ?? path.join("artifacts", "voice", journeyId));
  mkdirSync(folder, { recursive: true });
  writeFileSync(path.join(folder, "heroine_lines.txt"), formatVoiceScript(script, today()));
  writeFileSync(path.join(folder, "entries.json"), `${JSON.stringify(script.lines, null, 2)}\n`);
  const relative = path.relative(root, folder);
  const shown = relative.startsWith("..") || path.isAbsolute(relative) ? folder : relative || ".";
  console.log(`ヒロインの台詞 ${script.lines.length}行を書き出しました（声を付けないメッセージ・手紙の行 ${script.skipped}行は入れていません）：` +
    `${shown}/heroine_lines.txt（声を作る人に渡す台本）、${shown}/entries.json（同じ台詞のデータ）`);
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
