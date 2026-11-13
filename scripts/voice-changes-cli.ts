import { errorText } from "./cli-error";
import { displayPath, loadContentSources } from "./content-sources";
import { compareVoiceScripts, formatVoiceChanges, readLatestVoiceScript, voiceScriptsFolder } from "./voice-changes";
import { voiceScript, voiceScriptInput } from "./voice-script";

// npm run voice:changes -- --journey <journeyId>: the heroine lines of content/ as it is now (no content:build needed)
// against the latest voice script sent (authoring/journeys/<journeyId>/voice/<date>/entries.json): the lines whose text
// changed (recorded ones first: they need recording again), the lines removed and the new lines (voice-changes.ts).
// It changes no file.
const usage = "使い方: npm run voice:changes -- --journey 旅行編ID";
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--journey" || args[1].startsWith("--")) throw new Error(usage);
  const journeyId = args[1];
  const root = process.cwd();
  const input = voiceScriptInput(loadContentSources(root), journeyId);
  const script = readLatestVoiceScript(root, journeyId);
  if (!script) throw new Error(`渡した声の台本がありません：${voiceScriptsFolder(journeyId)}<日付>/entries.json。` +
    "npm run voice:script で作った台本を渡したら、そのフォルダに日付のフォルダを作って置きます。");
  const changes = compareVoiceScripts(script.lines, voiceScript(input).lines, input.cities.map((city) => city.id), input.recordings);
  console.log(formatVoiceChanges(changes, script, { id: journeyId, nameJa: input.nameJa }, displayPath(root, script.file)).join("\n"));
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
