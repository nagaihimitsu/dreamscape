import { prepareIndiaRelease, type IndiaReleaseCity } from "./promote-india";

const args = process.argv.slice(2);
const usage = "Usage: npx tsx scripts/release-india.ts --check|--apply [--through delhi|agra|jaipur] [--narrative path] [--translations path]";
if (!args.length || !["--check", "--apply"].includes(args[0])) throw new Error(usage);
let through: IndiaReleaseCity = "jaipur";
let narrative: string | undefined;
let translations: string | undefined;
const seen = new Set<string>();
for (let index = 1; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (!value || seen.has(flag)) throw new Error(usage);
  seen.add(flag);
  if (flag === "--through" && ["delhi", "agra", "jaipur"].includes(value)) through = value as IndiaReleaseCity;
  else if (flag === "--narrative") narrative = value;
  else if (flag === "--translations") translations = value;
  else throw new Error(usage);
}
if (translations && !narrative) throw new Error("--translations requires --narrative");
await prepareIndiaRelease(process.cwd(), args[0] === "--apply", through, narrative, translations);
console.log(args[0] === "--apply"
  ? "India release markers updated after full content validation."
  : "India release preview passed full content validation; no files were changed.");
