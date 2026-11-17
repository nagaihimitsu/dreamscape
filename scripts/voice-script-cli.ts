import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { loadContentSources } from "./content-sources";
import { checkVoiceCast, ENGINES, formatCastRequest, requestLines, uncastVoices, VOICE_ENGINES } from "./voice-cast";
import { CAST_FILE, readVoiceCast, readVoiceHistory, voiceRecordsFolder } from "./voice-records";
import { formatVoiceScript, HEROINE_VOICE, heroineLines, voiceScript, voiceScriptInput } from "./voice-script";

// npm run voice:script -- --journey <journeyId> [--out <folder>]: the voice script of a journey's spoken lines
// (voice-script.ts), read from content/ as it is now (no content:build needed). Writes heroine_lines.txt (the heroine's
// lines, for the people who make her voice) and entries.json (every spoken line as data, which voice:changes compares)
// into the folder, by default artifacts/voice/<journeyId>/ (not committed). With the journey's cast of the other voices
// (authoring/journeys/<journeyId>/voice/cast.json, 2026-11-17), it also writes the request of each engine (Aibishub.txt,
// voicevox.txt: voice-cast.ts). A script that is sent is kept in authoring/journeys/<journeyId>/voice/<date>/
// (voice-records.ts); its IDs stay those of the scripts sent before.
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
  const history = readVoiceHistory(root, journeyId);
  const script = voiceScript(voiceScriptInput(loadContentSources(root), journeyId, history));
  const cast = readVoiceCast(root, journeyId);
  const checked = cast && checkVoiceCast(cast, journeyId, script.lines);
  if (checked?.errors.length)
    throw new Error([`声の配役に直すところがあります：${voiceRecordsFolder(journeyId)}${CAST_FILE}`, ...checked.errors.map((error) => `  - ${error}`)].join("\n"));
  const folder = path.resolve(root, options["--out"] ?? path.join("artifacts", "voice", journeyId));
  mkdirSync(folder, { recursive: true });
  const date = today();
  writeFileSync(path.join(folder, "heroine_lines.txt"), formatVoiceScript(script, date));
  writeFileSync(path.join(folder, "entries.json"), `${JSON.stringify(script.lines, null, 2)}\n`);
  if (cast) for (const engine of VOICE_ENGINES) writeFileSync(path.join(folder, ENGINES[engine].file), formatCastRequest(script, cast, engine, history.recorded, date));
  const relative = path.relative(root, folder);
  const shown = relative.startsWith("..") || path.isAbsolute(relative) ? folder : relative || ".";
  const heroine = heroineLines(script).length;
  const others = script.lines.length - heroine;
  const skipped = [...script.skipped.values()].reduce((sum, count) => sum + count, 0);
  const uncast = uncastVoices(script, cast);
  const voiceCount = new Set(script.lines.filter((line) => line.voice !== HEROINE_VOICE).map((line) => line.voice)).size;
  console.log([
    `台詞 ${script.lines.length}行を書き出しました（ヒロイン ${heroine}行・ほかの人物 ${voiceCount}人 ${others}行。` +
      `声を付けないメッセージ・手紙の行 ${skipped}行（うちヒロイン ${script.skipped.get(HEROINE_VOICE) ?? 0}行）は入れていません）：`,
    `  ${shown}/heroine_lines.txt（ヒロインの声を作る人に渡す台本）`,
    `  ${shown}/entries.json（全部の台詞のデータ）`,
    ...(cast ? VOICE_ENGINES.map((engine) => {
      const parts = requestLines(script, cast, engine, history.recorded);
      const record = parts.flatMap((part) => part.record);
      const named = parts.reduce((sum, part) => sum + part.named.length, 0);
      return `  ${shown}/${ENGINES[engine].file}（${ENGINES[engine].nameJa} の依頼：${parts.length}人、録る台詞 ${record.length}行` +
        `（うち録り直し ${record.filter((item) => item.recorded !== undefined).length}行）${named ? `。名前が入るので入れない台詞 ${named}行` : ""}）`;
    }) : [`  ほかの人物の依頼書は書いていません（配役 ${voiceRecordsFolder(journeyId)}${CAST_FILE} がありません）`]),
    ...(checked?.warnings.length ? ["配役の注意：", ...checked.warnings.map((warning) => `  - ${warning}`)] : []),
    ...(cast && uncast.length ? [`配役のない声（${uncast.length}人。どちらの依頼書にも入っていません）：`,
      ...uncast.map((item) => `  - ${item.voice}（${item.speakerJa}）${item.lines}行`)] : []),
  ].join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
