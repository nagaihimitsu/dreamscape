import { validateJourneyScenario } from "./journey-scenario-validation";
import { errorText } from "./cli-error";

try {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  const usage = "使い方: npm run journey:scenario -- --journey 旅行編ID --directory 下書きのフォルダ [--city 都市ID]";
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!["--journey", "--directory", "--city"].includes(flag) || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
    options[flag] = value;
  }
  if (!options["--journey"] || !options["--directory"]) throw new Error(usage);
  console.log(JSON.stringify(await validateJourneyScenario(process.cwd(), options["--journey"], options["--directory"], options["--city"]), null, 2));
  console.log("脚本の検証が完了しました。クイズ・和訳・本番統合の公開判定は journey:release で別途行います。");
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
