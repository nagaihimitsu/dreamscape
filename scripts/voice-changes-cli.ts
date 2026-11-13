import path from "node:path";
import { errorText } from "./cli-error";
import { displayPath, loadContentSources } from "./content-sources";
import { formatVoiceChanges, voiceChanges } from "./voice-changes";
import { RECORDED_FILE, readVoiceHistory, voiceRecordsFolder } from "./voice-records";
import { voiceScript, voiceScriptInput } from "./voice-script";

// npm run voice:changes -- --journey <journeyId>: the heroine lines of content/ as it is now (no content:build needed)
// against their records in authoring/journeys/<journeyId>/voice/ (voice-changes.ts): the recorded lines against what
// their clips say (recorded.json; they need recording again), the others against the newest script sent. It changes
// no file.
const usage = "使い方: npm run voice:changes -- --journey 旅行編ID";
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--journey" || args[1].startsWith("--")) throw new Error(usage);
  const journeyId = args[1];
  const root = process.cwd();
  const history = readVoiceHistory(root, journeyId);
  const [newest] = history.scripts;
  if (!newest) throw new Error(`渡した声の台本がありません：${voiceRecordsFolder(journeyId)}<日付>/entries.json。` +
    "npm run voice:script で作った台本を渡したら、そのフォルダに日付のフォルダを作って置きます。");
  const script = voiceScript(voiceScriptInput(loadContentSources(root), journeyId, history));
  console.log(formatVoiceChanges(voiceChanges(script, newest, history.recorded), script,
    { date: newest.date, count: newest.lines.length, file: displayPath(root, newest.file) },
    { count: history.recorded.size, file: displayPath(root, path.join(root, voiceRecordsFolder(journeyId), RECORDED_FILE)) }).join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
