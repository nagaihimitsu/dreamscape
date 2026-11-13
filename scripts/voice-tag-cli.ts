import { readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { displayPath, loadContentSources } from "./content-sources";
import { readVoiceHistory, voiceRecordsFolder, writeRecordedClips } from "./voice-records";
import { deliveredIds, insertVoiceTags, planVoiceTags } from "./voice-tag";
import { voiceScript, voiceScriptInput } from "./voice-script";

// npm run voice:tag -- --journey <journeyId> --from <folder>: the clips delivered in <folder> (<ID>.mp3 or <ID>.wav, as
// the voice makers name them) get their `# voice:` in the journey's Ink files, and recorded.json records what each
// says (voice-tag.ts). Run it on the delivered files, after their MP3 are in the journey's public/assets/voice/.
// Exits 1 when a clip is refused (the others are still tagged and recorded).
const usage = "使い方: npm run voice:tag -- --journey 旅行編ID --from 届いた声のフォルダ";
try {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = [args[index], args[index + 1]];
    if ((flag !== "--journey" && flag !== "--from") || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
    options[flag] = value;
  }
  const journeyId = options["--journey"];
  const from = options["--from"];
  if (!journeyId || !from) throw new Error(usage);
  const root = process.cwd();
  const sources = loadContentSources(root);
  const history = readVoiceHistory(root, journeyId);
  if (!history.scripts.length) throw new Error(`渡した声の台本がありません：${voiceRecordsFolder(journeyId)}<日付>/entries.json`);
  const input = voiceScriptInput(sources, journeyId, history);
  const script = voiceScript(input);
  const delivered = deliveredIds(readdirSync(path.resolve(root, from)));
  const plan = planVoiceTags(script, history.scripts, delivered.ids, input.voiceFiles);
  const files = [...new Set(plan.tag.map((line) => line.file))];
  for (const file of files) {
    const story = sources.storyFiles.find((item) => item.layer === journeyId && `${item.id}.ink` === file)!;
    writeFileSync(story.file, insertVoiceTags(story.source, plan.tag.filter((line) => line.file === file)));
  }
  const recordedFile = plan.record.length ? writeRecordedClips(root, journeyId, new Map([...history.recorded, ...plan.record])) : undefined;
  const refused = [...delivered.refused, ...plan.refused];
  console.log([
    `届いた声 ${delivered.ids.length}本（${from}）：# voice: を付けた行 ${plan.tag.length}行（${files.length}ファイル）、` +
      `録音した文を記録 ${plan.record.length}本${recordedFile ? `（${displayPath(root, recordedFile)}）` : ""}、付けなかった声 ${refused.length}本`,
    ...refused.map((clip) => `  [${clip.id}] ${clip.reasonJa}`),
  ].join("\n"));
  if (refused.length) process.exitCode = 1;
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
