import { journeyReleaseSummary } from "./journey-cli";
import { prepareJourneyRelease } from "./promote-journey";

try {
  const args = process.argv.slice(2);
  const usage = "Usage: npx tsx scripts/release-journey.ts --check|--apply --journey ID [--through CITY] [--narrative path] [--translations path]";
  // The mode may follow other options (e.g. `npm run india:release -- --check`).
  const modeIndex = args.findIndex((arg) => arg === "--check" || arg === "--apply");
  if (modeIndex < 0) throw new Error(usage);
  const [mode] = args.splice(modeIndex, 1);
  let through: string | undefined;
  let journeyId: string | undefined;
  let narrative: string | undefined;
  let translations: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!value || seen.has(flag)) throw new Error(usage);
    seen.add(flag);
    if (flag === "--journey") journeyId = value;
    else if (flag === "--through") through = value;
    else if (flag === "--narrative") narrative = value;
    else if (flag === "--translations") translations = value;
    else throw new Error(usage);
  }
  if (!journeyId) throw new Error(usage);
  if (translations && !narrative) throw new Error("--translations requires --narrative");
  const apply = mode === "--apply";
  const result = await prepareJourneyRelease(process.cwd(), journeyId, apply, through, narrative, translations);
  for (const line of journeyReleaseSummary(result, apply)) console.log(line);
} catch (error) {
  // The message only: a stack trace would bury it.
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
