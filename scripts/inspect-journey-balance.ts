import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { errorText } from "./cli-error";
import { formatJourneyBalance, journeyBalance } from "./journey-balance";
import { balanceInputs } from "./journey-balance-input";

// npm run balance:report -- [--journey <journeyId>] [--out <file>]: every source and sink of money, AP and the
// relationship values of a journey (all journeys without --journey), city by city, from the last content:build
// (src/content/generated/; the sample: content:build -- --with-sample). A developer tool for the balance pass
// (journey-balance.ts); it checks nothing. Markdown on the standard output, or into the --out file.
const usage = "使い方: npm run balance:report -- [--journey 旅行編ID] [--out 書き出すファイル]（先に npm run content:build）";
try {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = [args[index], args[index + 1]];
    if ((flag !== "--journey" && flag !== "--out") || !value || value.startsWith("--") || options[flag]) throw new Error(usage);
    options[flag] = value;
  }
  const lines = balanceInputs(process.cwd(), options["--journey"]).flatMap((input) => [...formatJourneyBalance(input, journeyBalance(input)), ""]);
  const text = lines.join("\n");
  if (options["--out"]) {
    const file = path.resolve(process.cwd(), options["--out"]);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text);
    console.log(`書き出しました: ${file}`);
  } else console.log(text);
} catch (error) {
  // The message and what caused it, without a stack trace that would bury them.
  console.error(errorText(error));
  process.exitCode = 1;
}
