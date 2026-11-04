import { prepareJourneyRelease } from "./promote-journey";

const args = process.argv.slice(2);
const usage = "Usage: npx tsx scripts/release-journey.ts --check|--apply --journey ID [--through CITY] [--narrative path] [--translations path]";
if (!args.length || !["--check", "--apply"].includes(args[0])) throw new Error(usage);
let through: string | undefined;
let journeyId: string | undefined;
let narrative: string | undefined;
let translations: string | undefined;
const seen = new Set<string>();
for (let index = 1; index < args.length; index += 2) {
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
await prepareJourneyRelease(process.cwd(), journeyId, args[0] === "--apply", through, narrative, translations);
console.log(args[0] === "--apply"
  ? "Journey release markers updated after full content validation."
  : "Journey release preview passed full content validation; no files were changed.");
