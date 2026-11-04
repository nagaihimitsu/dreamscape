import { validateJourneyScenario } from "./journey-scenario-validation";

const args = process.argv.slice(2);
const options: Record<string, string> = {};
const usage = "Usage: npm run journey:scenario -- --journey ID --directory PATH [--city CITY]";
for (let index = 0; index < args.length; index += 2) {
  const flag = args[index];
  const value = args[index + 1];
  if (!["--journey", "--directory", "--city"].includes(flag) || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
  options[flag] = value;
}
if (!options["--journey"] || !options["--directory"]) throw new Error(usage);
console.log(JSON.stringify(await validateJourneyScenario(process.cwd(), options["--journey"], options["--directory"], options["--city"]), null, 2));
console.log("脚本の検証が完了しました。クイズ・和訳・本番統合の公開判定は journey:release で別途行います。");
